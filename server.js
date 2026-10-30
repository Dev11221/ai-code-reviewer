
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(
  cors({
    origin: process.env.DASHBOARD_URL || 'http://localhost:5173',
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Webhook router
// ---------------------------------------------------------------------------

const webhookRouter = require('./trigger/webhook-handler');
app.use('/webhook', webhookRouter);

// ---------------------------------------------------------------------------
// API routers
// ---------------------------------------------------------------------------

const repoViewRouter = require('./dashboard/api/repo-view');
const prDrilldownRouter = require('./dashboard/api/pr-drilldown');
const analyticsRouter = require('./dashboard/api/analytics');
const githubRouter = require('./dashboard/api/github');
const tablesRouter = require('./dashboard/api/tables');
const eventsRouter = require('./dashboard/api/events');
const quickReviewRouter = require('./dashboard/api/quick-review');

app.use('/api', repoViewRouter);
app.use('/api', prDrilldownRouter);
app.use('/api', analyticsRouter);
app.use('/api', githubRouter);
app.use('/api', tablesRouter);
app.use('/api', eventsRouter);
app.use('/api', quickReviewRouter);

// ---------------------------------------------------------------------------
// Dashboard frontend (Vite production build)
// ---------------------------------------------------------------------------

const clientDist = path.join(
  __dirname,
  'dashboard',
  'client',
  'dist'
);

// Serve static frontend assets.
app.use(express.static(clientDist));

// Serve the dashboard at the root URL.
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// ---------------------------------------------------------------------------
// Embedded Smee client
// ---------------------------------------------------------------------------

let smeeEvents;

if (process.env.SMEE_URL) {
  (async () => {
    try {
      const { default: SmeeClient } = await import('smee-client');

      const webhookPath =
        process.env.WEBHOOK_PATH || '/webhook/github';

      const smeeClient = new SmeeClient({
        source: process.env.SMEE_URL,
        target: `http://localhost:${PORT}${webhookPath}`,
        logger: {
          info: (msg) => console.log(`[smee] ${msg}`),
          error: (msg) => console.error(`[smee] ${msg}`),
        },
      });

      smeeEvents = smeeClient.start();

      console.log(
        `[smee] forwarding ${process.env.SMEE_URL} -> http://localhost:${PORT}${webhookPath}`
      );
    } catch (err) {
      console.error('[smee] Failed to start client:', err.message);
    }
  })();
} else {
  console.log(
    '[smee] SMEE_URL not set in .env — skipping embedded webhook forwarding.'
  );
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function shutdown() {
  console.log('\nShutting down...');

  if (smeeEvents && typeof smeeEvents.close === 'function') {
    smeeEvents.close();
  }

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

