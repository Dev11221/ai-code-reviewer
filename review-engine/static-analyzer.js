const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
            // The message itself usually contains both the explanation AND the fix advice
            // (e.g. "...Instead, use a parameterized query...") - use it fully as the issue text
            const fullMessage = r.extra.message || 'Issue detected by static analysis.';

            // If Semgrep provides an actual autofix snippet, surface that as the suggestion
            const autofix = r.extra.fix;

            // Otherwise fall back to a reference link to the rule's documentation
            const ruleLink = r.extra.metadata?.source || `https://semgrep.dev/r/${r.check_id}`;

            return {
              filePath: r.path,
              severity: r.extra.severity === 'ERROR' ? 'blocking' : 'warning',
              category: 'security',
              issue: fullMessage,
              suggestion: autofix
                ? `Suggested fix: ${autofix}`
                : `Learn more: ${ruleLink}`,
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

async function runStaticAnalysis(diff) {
  const fileBlocks = splitDiffByFile(diff);
  let allFindings = [];

  for (const { fileName, addedLines } of fileBlocks) {
    if (!addedLines.trim()) continue;

    const ext = path.extname(fileName) || '.txt';
    const tempFilePath = path.join(os.tmpdir(), `semgrep-check-${Date.now()}${ext}`);
    fs.writeFileSync(tempFilePath, addedLines);

    try {
      const findings = await runSemgrep(tempFilePath);
      const relabeled = findings.map((f) => ({ ...f, filePath: fileName }));
      allFindings = allFindings.concat(relabeled);
    } finally {
      fs.unlinkSync(tempFilePath);
    }
  }

  return allFindings;
}

module.exports = { runStaticAnalysis };