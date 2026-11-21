'use strict';

// Small dependency-free retrieval for the changed files and repository guidance.
// It deliberately avoids indexing secrets, binaries, vendored code and huge files.
const path = require('path');
const MAX_FILES = 500;
const MAX_FILE_CHARS = 30000;
const MAX_CONTEXT_CHARS = 18000;
const SKIP = /(^|\/)(\.git|node_modules|vendor|dist|build|coverage)(\/|$)|(^|\/)(\.env([^/]*)?|.*\.(pem|key|p12|pfx))$/i;
const GUIDANCE = /(^|\/)(readme|contributing|architecture|security|agents)(\.[^/]*)?$/i;

function tokenize(value) {
  return new Set(String(value || '').toLowerCase().match(/[a-z0-9_]{3,}/g) || []);
}

function retrieveContext(files, diff, limit = 12) {
  if (!Array.isArray(files) || !files.length) return [];
  const changed = new Set([...String(diff || '').matchAll(/^diff --git a\/(.+?) b\/(.+)$/gm)].map((m) => m[2]));
  const changedTokens = tokenize(`${diff} ${[...changed].join(' ')}`);
  const eligible = files.slice(0, MAX_FILES).filter((f) => f && typeof f.path === 'string' && typeof f.content === 'string')
    .map((f) => ({ path: f.path.replace(/\\/g, '/'), content: f.content.slice(0, MAX_FILE_CHARS) }))
    .filter((f) => !SKIP.test(f.path) && !/\0/.test(f.content));
  const ranked = eligible.map((f) => {
    const words = tokenize(`${f.path} ${f.content}`);
    let overlap = 0;
    for (const word of changedTokens) if (words.has(word)) overlap += 1;
    const score = (GUIDANCE.test(path.posix.basename(f.path)) ? 8 : 0) + (changed.has(f.path) ? 3 : 0) + overlap / Math.max(8, changedTokens.size);
    return { ...f, score };
  }).filter((f) => f.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
  let used = 0;
  const selected = [];
  for (const f of ranked) {
    const content = f.content.slice(0, Math.max(0, Math.min(2500, MAX_CONTEXT_CHARS - used)));
    if (!content) break;
    used += content.length;
    selected.push({ path: f.path, content });
  }
  return selected;
}

module.exports = { retrieveContext };
