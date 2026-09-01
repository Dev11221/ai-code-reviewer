const express = require('express');
const router = express.Router();
const { reviewEvents } = require('../../lib/events');

// GET /api/events -> Server-Sent Events stream. The dashboard subscribes to
// this once and refreshes the reviews list / tables / chart whenever a
// review is created or deleted, instead of polling on a timer.
router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Initial ping so the client knows the stream is alive immediately.
  send({ type: 'connected' });

  const onChange = (payload) => send(payload);
  reviewEvents.on('change', onChange);

  // Keep the connection alive through proxies that kill idle sockets.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    reviewEvents.off('change', onChange);
  });
});

module.exports = router;
