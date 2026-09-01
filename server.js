require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const webhookRouter = require('./trigger/webhook-handler');
app.use('/webhook', webhookRouter);

const repoViewRouter = require('./dashboard/api/repo-view');
const prDrilldownRouter = require('./dashboard/api/pr-drilldown');
const analyticsRouter = require('./dashboard/api/analytics');
const githubRouter = require('./dashboard/api/github');
const tablesRouter = require('./dashboard/api/tables');
const eventsRouter = require('./dashboard/api/events');
app.use('/api', repoViewRouter);
app.use('/api', prDrilldownRouter);
app.use('/api', analyticsRouter);
app.use('/api', githubRouter);
app.use('/api', tablesRouter);
app.use('/api', eventsRouter);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server running');
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function shutdown() {
  console.log('\nShutting down...');
  server.close(() => process.exit(0));
  // Force-exit if something hangs (e.g. an open DB pool/EventSource)
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);