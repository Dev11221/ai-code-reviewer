"""
ULTIMATE AUTOMATED QA & BUG DETECTION FRAMEWORK
Version: 1.0
Purpose: Software testing, bug detection and reporting

Install:
pip install pytest requests psutil bandit ruff
"""

import os
import sys
import ast
import json
import time
import logging
import traceback
import subprocess
import importlib.util
from pathlib import Path
from datetime import datetime

try:
    import psutil
except ImportError:
    psutil = None

try:
    import requests
except ImportError:
    requests = None


# ==========================================
# CONFIGURATION
# ==========================================

PROJECT_PATH = Path(".")
REPORT_PATH = Path("bug_report.json")
LOG_PATH = Path("testing.log")

RESULTS = {
    "start_time": str(datetime.now()),
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "warnings": 0,
    "bugs": [],
    "system_info": {}
}


# ==========================================
# LOGGING SYSTEM
# ==========================================

logging.basicConfig(
    filename=LOG_PATH,
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)


def record_bug(category, message, severity="MEDIUM"):
    bug = {
        "category": category,
        "message": str(message),
        "severity": severity,
        "timestamp": str(datetime.now())
    }

    RESULTS["bugs"].append(bug)
    RESULTS["failed"] += 1

    logging.error(
        "[%s] %s: %s",
        severity,
        category,
        message
    )


def record_pass(message):
    RESULTS["passed"] += 1
    logging.info("[PASS] %s", message)


def record_warning(message):
    RESULTS["warnings"] += 1
    logging.warning(message)


# ==========================================
# TEST EXECUTION ENGINE
# ==========================================

def run_test(name, function):
    RESULTS["total_tests"] += 1

    try:
        function()
        record_pass(name)

    except Exception as error:
        record_bug(
            "TEST FAILURE",
            f"{name}: {error}\n{traceback.format_exc()}"
        )


# ==========================================
# SYSTEM INFORMATION
# ==========================================

def test_system():
    RESULTS["system_info"] = {
        "python_version": sys.version,
        "platform": sys.platform,
        "working_directory": os.getcwd()
    }

    if psutil:
        RESULTS["system_info"]["cpu_percent"] = (
            psutil.cpu_percent(interval=1)
        )

        RESULTS["system_info"]["memory_percent"] = (
            psutil.virtual_memory().percent
        )

    else:
        record_warning("psutil not installed; memory monitoring skipped")


# ==========================================
# FILE SYSTEM TESTING
# ==========================================

def test_file_system():
    assert PROJECT_PATH.exists(), "Project directory missing"
    assert PROJECT_PATH.is_dir(), "Project path is not a directory"

    files = list(PROJECT_PATH.rglob("*"))

    for file in files:
        if file.is_file():
            try:
                file.stat()
            except OSError as error:
                record_bug(
                    "FILE SYSTEM",
                    f"{file}: {error}"
                )


# ==========================================
# PYTHON SYNTAX TESTING
# ==========================================

def test_python_syntax():
    for file in PROJECT_PATH.rglob("*.py"):

        if any(
            part in {".venv", "venv", "__pycache__", ".git"}
            for part in file.parts
        ):
            continue

        try:
            source = file.read_text(encoding="utf-8")
            ast.parse(source, filename=str(file))

        except (SyntaxError, UnicodeDecodeError) as error:
            record_bug(
                "SYNTAX ERROR",
                f"{file}: {error}",
                "HIGH"
            )


# ==========================================
# EMPTY FILE DETECTION
# ==========================================

def test_empty_files():
    for file in PROJECT_PATH.rglob("*"):

        if not file.is_file():
            continue

        if file.suffix in {".py", ".js", ".html", ".css"}:
            if file.stat().st_size == 0:
                record_warning(f"Empty source file: {file}")


# ==========================================
# SECURITY SCANNING
# ==========================================

def test_security():
    dangerous_patterns = [
        "eval(",
        "exec(",
        "pickle.loads(",
        "shell=True",
        "verify=False",
        "os.system("
    ]

    for file in PROJECT_PATH.rglob("*.py"):

        if any(
            part in {".venv", "venv", "__pycache__", ".git"}
            for part in file.parts
        ):
            continue

        try:
            content = file.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            for pattern in dangerous_patterns:
                if pattern in content:
                    record_warning(
                        f"Potentially dangerous code "
                        f"{pattern} in {file}"
                    )

        except OSError as error:
            record_bug("SECURITY SCAN", error)


# ==========================================
# DEPENDENCY CHECK
# ==========================================

def test_dependencies():
    requirements = PROJECT_PATH / "requirements.txt"

    if not requirements.exists():
        record_warning("requirements.txt not found")
        return

    for line in requirements.read_text().splitlines():

        package = line.strip()

        if not package or package.startswith("#"):
            continue

        package_name = package.split("==")[0]
        package_name = package_name.split(">=")[0]

        if not package_name.replace("-", "_").isidentifier():
            record_warning(
                f"Check dependency specification: {package}"
            )


# ==========================================
# JSON VALIDATION
# ==========================================

def test_json_files():
    for file in PROJECT_PATH.rglob("*.json"):

        try:
            with file.open(
                "r",
                encoding="utf-8"
            ) as json_file:
                json.load(json_file)

        except (json.JSONDecodeError, OSError) as error:
            record_bug(
                "INVALID JSON",
                f"{file}: {error}"
            )


# ==========================================
# NETWORK CONNECTIVITY
# ==========================================

def test_network(url):
    if requests is None:
        record_warning("requests package not installed")
        return

    try:
        response = requests.get(
            url,
            timeout=10
        )

        if response.status_code >= 500:
            record_bug(
                "SERVER ERROR",
                f"HTTP {response.status_code}: {url}"
            )

        elif response.status_code >= 400:
            record_warning(
                f"HTTP {response.status_code}: {url}"
            )

        else:
            record_pass(f"Network endpoint: {url}")

    except requests.RequestException as error:
        record_bug("NETWORK FAILURE", error)


# ==========================================
# PERFORMANCE TEST
# ==========================================

def test_performance(function, iterations=1000):
    start = time.perf_counter()

    for _ in range(iterations):
        function()

    duration = time.perf_counter() - start

    average = duration / iterations

    logging.info(
        "Performance: %s iterations in %.4f seconds",
        iterations,
        duration
    )

    if average > 0.1:
        record_warning(
            f"Slow function: average {average:.4f}s"
        )

    return {
        "iterations": iterations,
        "total_seconds": duration,
        "average_seconds": average
    }


# ==========================================
# MEMORY TEST
# ==========================================

def test_memory():
    if not psutil:
        record_warning("Memory test skipped: psutil unavailable")
        return

    process = psutil.Process(os.getpid())

    memory = process.memory_info().rss / (1024 * 1024)

    RESULTS["system_info"]["process_memory_mb"] = round(
        memory, 2
    )

    if memory > 1000:
        record_warning(
            f"High process memory usage: {memory:.2f} MB"
        )


# ==========================================
# RUN EXTERNAL STATIC ANALYZERS
# ==========================================

def run_command(command):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=60,
            shell=False
        )

        return {
            "command": command,
            "returncode": result.returncode,
            "stdout": result.stdout[-10000:],
            "stderr": result.stderr[-10000:]
        }

    except (OSError, subprocess.TimeoutExpired) as error:
        record_warning(f"Could not execute {command}: {error}")
        return None


def test_ruff():
    result = run_command([
        sys.executable, "-m", "ruff", "check", "."
    ])

    if result and result["returncode"] != 0:
        record_warning("Ruff found potential code quality issues")


def test_bandit():
    result = run_command([
        sys.executable, "-m", "bandit",
        "-r", ".", "-x", ".venv,venv"
    ])

    if result and result["returncode"] != 0:
        record_warning("Bandit found potential security issues")


# ==========================================
# BUG REPORT GENERATOR
# ==========================================

def generate_report():

    RESULTS["end_time"] = str(datetime.now())

    RESULTS["summary"] = {
        "total": RESULTS["total_tests"],
        "passed": RESULTS["passed"],
        "failed": RESULTS["failed"],
        "warnings": RESULTS["warnings"]
    }

    with REPORT_PATH.open(
        "w",
        encoding="utf-8"
    ) as report:

        json.dump(
            RESULTS,
            report,
            indent=4,
            ensure_ascii=False
        )

    print("\n" + "=" * 50)
    print("       AUTOMATED QA TEST REPORT")
    print("=" * 50)

    print("Total tests:", RESULTS["total_tests"])
    print("Passed:", RESULTS["passed"])
    print("Failed:", RESULTS["failed"])
    print("Warnings:", RESULTS["warnings"])

    print("Report saved to:", REPORT_PATH)
    print("Log saved to:", LOG_PATH)

    print("=" * 50)


# ==========================================
# MAIN TEST CONTROLLER
# ==========================================

def main():

    logging.info("Starting automated QA framework")

    tests = [
        ("System information", test_system),
        ("File system", test_file_system),
        ("Python syntax", test_python_syntax),
        ("Empty files", test_empty_files),
        ("Security scan", test_security),
        ("Dependencies", test_dependencies),
        ("JSON validation", test_json_files),
        ("Memory monitoring", test_memory),
        ("Ruff analysis", test_ruff),
        ("Bandit security analysis", test_bandit)
    ]

    for name, function in tests:
        logging.info("Running: %s", name)
        run_test(name, function)

    generate_report()


if __name__ == "__main__":
    main()
