const { EventEmitter } = require('events');

// Single shared emitter used to notify SSE clients (the dashboard) whenever
// something changes in the database (new review saved, review deleted, etc).
// Kept deliberately tiny — no queue, no persistence, just an in-process bus.
const reviewEvents = new EventEmitter();
reviewEvents.setMaxListeners(50);

module.exports = { reviewEvents };
