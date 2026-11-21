'use strict';
const { runStaticAnalysis } = require('../review-engine/static-analyzer');
const { analyzeDiff } = require('../review-engine/llm-analyzer');
const { retrieveContext } = require('../review-engine/repository-context');
const { mergeFindings } = require('../review-engine/merge-findings');
const { normalizeFindings } = require('../findings/validate');

function buildDiff(files) {
  return files.map((f) => `diff --git a/${f.path} b/${f.path}\n--- a/${f.path}\n+++ b/${f.path}\n${String(f.content).split('\n').map((line) => `+${line}`).join('\n')}`).join('\n');
}
function key(f) { return `${String(f.filePath || f.file_path || '').toLowerCase()}|${String(f.category || '').toLowerCase()}|${String(f.issue || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 8).join(' ')}`; }
function metrics(expected, actual) {
  const e = expected.map(key); const a = actual.map(key); const matched = new Set();
  let tp = 0; for (const k of a) { const ix = e.findIndex((expectedKey, index) => expectedKey === k && !matched.has(index)); if (ix >= 0) { matched.add(ix); tp += 1; } }
  const precision = a.length ? tp / a.length : (e.length ? 0 : 1);
  const recall = e.length ? tp / e.length : (a.length ? 0 : 1);
  return { truePositives: tp, falsePositives: a.length - tp, falseNegatives: e.length - tp, precision, recall, f1: precision + recall ? 2 * precision * recall / (precision + recall) : 0 };
}
async function runCase(testCase) {
  const started = Date.now();
  const files = Array.isArray(testCase.input_files) ? testCase.input_files : [];
  const diff = buildDiff(files);
  const staticFindings = await runStaticAnalysis(diff).catch(() => []);
  const context = retrieveContext(files, diff);
  let aiFindings = [];
  try { aiFindings = await analyzeDiff(diff, staticFindings, context); } catch (err) {
    if (!staticFindings.length) throw err;
    console.warn('[evaluation] AI analysis unavailable; reporting static findings only:', err.message);
  }
  const findings = normalizeFindings(mergeFindings(staticFindings, aiFindings)).map((f) => ({ ...f, contextFiles: context.map((c) => c.path) }));
  return { findings, durationMs: Date.now() - started, metrics: metrics(testCase.expected_findings || [], findings) };
}
module.exports = { buildDiff, metrics, runCase };
