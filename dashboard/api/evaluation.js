'use strict';
const express = require('express');
const { z } = require('zod');
const pool = require('../../database/connection');
const { requireGithubUser } = require('../../middleware/auth');
const limits = require('../../middleware/rateLimits');
const { validate } = require('../../middleware/validate');
const { HttpError, wrap } = require('../../middleware/errors');
const { runCase } = require('../../evaluation/runner');

const router = express.Router();
const finding = z.object({ filePath: z.string().max(500), category: z.string().max(50), issue: z.string().max(1000) });
const files = z.array(z.object({ path: z.string().max(400), content: z.string().max(30000) })).min(1).max(20);
const createSchema = z.strictObject({ name: z.string().trim().min(1).max(160), files, expectedFindings: z.array(finding).max(100).default([]) });

router.get('/evaluation/cases', requireGithubUser, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, expected_findings, created_at FROM evaluation_cases WHERE owner_user_id = $1 ORDER BY created_at DESC', [req.ghUser.userId]);
  res.json(rows);
}));
router.post('/evaluation/cases', requireGithubUser, limits.quickReview(), validate({ body: createSchema }), wrap(async (req, res) => {
  const { name, files: inputFiles, expectedFindings } = req.body;
  const { rows } = await pool.query('INSERT INTO evaluation_cases (owner_user_id, name, input_files, expected_findings) VALUES ($1,$2,$3,$4) RETURNING id,name,expected_findings,created_at', [req.ghUser.userId, name, JSON.stringify(inputFiles), JSON.stringify(expectedFindings)]);
  res.status(201).json(rows[0]);
}));
router.post('/evaluation/cases/:id/run', requireGithubUser, limits.quickReview(), validate({ params: z.object({ id: z.coerce.number().int().positive() }) }), wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM evaluation_cases WHERE id = $1 AND owner_user_id = $2', [req.params.id, req.ghUser.userId]);
  const testCase = rows[0]; if (!testCase) throw new HttpError(404, 'Evaluation case not found');
  let result;
  try { result = await runCase(testCase); }
  catch (err) { throw new HttpError(503, `Evaluation run could not complete: ${String(err.message).slice(0, 240)}`); }
  const { rows: saved } = await pool.query('INSERT INTO evaluation_runs (case_id, owner_user_id, system_version, result_findings, duration_ms, metrics) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,created_at', [testCase.id, req.ghUser.userId, 'hybrid-rag-v1', JSON.stringify(result.findings), result.durationMs, JSON.stringify(result.metrics)]);
  res.json({ ...saved[0], ...result });
}));
router.get('/evaluation/runs', requireGithubUser, wrap(async (req, res) => {
  const { rows } = await pool.query('SELECT er.id, er.system_version, er.duration_ms, er.metrics, er.created_at, ec.name AS case_name FROM evaluation_runs er JOIN evaluation_cases ec ON ec.id = er.case_id WHERE er.owner_user_id = $1 ORDER BY er.created_at DESC LIMIT 100', [req.ghUser.userId]);
  res.json(rows);
}));
module.exports = router;
