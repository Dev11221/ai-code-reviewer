const express = require('express');
const router = express.Router();
const { listTableNames, getTableRows } = require('../../findings/db');

// GET /api/tables -> ['reviews', 'findings']
router.get('/tables', (req, res) => {
  res.json(listTableNames());
});

// GET /api/tables/:name -> { columns: [...], rows: [...] }
router.get('/tables/:name', async (req, res) => {
  try {
    const data = await getTableRows(req.params.name);
    if (!data) {
      return res.status(404).json({ error: `Unknown table "${req.params.name}"` });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
