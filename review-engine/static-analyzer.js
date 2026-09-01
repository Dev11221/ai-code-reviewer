const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

function runSemgrep(filePath) {
  return new Promise((resolve) => {
    execFile(
      'semgrep',
      ['--config', 'auto', filePath, '--json', '--no-git-ignore', '--quiet'],
      { maxBuffer: 1024 * 1024 * 10 },
      (error, stdout) => {
        if (!stdout) {
          console.error('Semgrep produced no output:', error?.message);
          return resolve([]);
        }
        try {
          const parsed = JSON.parse(stdout);
          const findings = (parsed.results || []).map((r) => {
            const fullMessage = r.extra.message || 'Issue detected by static analysis.';
            const autofix = r.extra.fix;
            const ruleLink = r.extra.metadata?.source || `https://semgrep.dev/r/${r.check_id}`;
            return {
              filePath: r.path,
              severity: r.extra.severity === 'ERROR' ? 'blocking' : 'warning',
              category: 'security',
              issue: fullMessage,
              suggestion: autofix ? `Suggested fix: ${autofix}` : `Learn more: ${ruleLink}`,
            };
          });
          resolve(findings);
        } catch (parseErr) {
          console.error('Failed to parse Semgrep JSON output:', parseErr.message);
          resolve([]);
        }
      }
    );
  });
}

function splitDiffByFile(diff) {
  const fileBlocks = [];
  const lines = diff.split('\n');
  let currentFile = null;
  let currentLines = [];

  for (const line of lines) {
    const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (match) {
      if (currentFile) {
        fileBlocks.push({ fileName: currentFile, addedLines: currentLines.join('\n') });
      }
      currentFile = match[2];
      currentLines = [];
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      currentLines.push(line.slice(1));
    }
  }
  if (currentFile) {
    fileBlocks.push({ fileName: currentFile, addedLines: currentLines.join('\n') });
  }

  return fileBlocks;
}

async function analyzeFile(fileName, addedLines) {
  if (!addedLines.trim()) return [];

  const ext = path.extname(fileName) || '.txt';
  const tempFilePath = path.join(os.tmpdir(), `semgrep-check-${Date.now()}-${crypto.randomUUID()}${ext}`);
  fs.writeFileSync(tempFilePath, addedLines);

  try {
    const findings = await runSemgrep(tempFilePath);
    return findings.map((f) => ({ ...f, filePath: fileName }));
  } finally {
    fs.unlinkSync(tempFilePath);
  }
}

async function runStaticAnalysis(diff) {
  const fileBlocks = splitDiffByFile(diff);

  const resultsPerFile = await Promise.all(
    fileBlocks.map(({ fileName, addedLines }) => analyzeFile(fileName, addedLines))
  );

  return resultsPerFile.flat();
}

module.exports = { runStaticAnalysis };