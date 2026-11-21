'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { retrieveContext } = require('../../review-engine/repository-context');
const { metrics } = require('../../evaluation/runner');

test('repository retrieval favors guidance and related files while excluding secrets and generated folders', () => {
  const files = [
    { path: 'README.md', content: 'Our application uses a payment service and validates all payment requests.' },
    { path: 'src/payment.js', content: 'function chargePayment() { return validatePayment(); }' },
    { path: 'src/.env.production', content: 'API_KEY=secret' },
    { path: 'node_modules/pkg/payment.js', content: 'payment implementation' },
  ];
  const out = retrieveContext(files, 'diff --git a/src/checkout.js b/src/checkout.js\n+chargePayment(request)');
  assert.deepEqual(out.map((f) => f.path), ['README.md', 'src/payment.js']);
  assert.ok(out.every((f) => !f.content.includes('secret')));
});

test('evaluation metrics account for precision, recall and empty cases', () => {
  const expected = [{ filePath: 'a.js', category: 'security', issue: 'SQL injection vulnerability' }];
  const actual = [...expected, { filePath: 'b.js', category: 'performance', issue: 'Repeated expensive computation' }];
  assert.deepEqual(metrics(expected, actual), { truePositives: 1, falsePositives: 1, falseNegatives: 0, precision: 0.5, recall: 1, f1: 2 / 3 });
  assert.deepEqual(metrics([], []), { truePositives: 0, falsePositives: 0, falseNegatives: 0, precision: 1, recall: 1, f1: 1 });
});
