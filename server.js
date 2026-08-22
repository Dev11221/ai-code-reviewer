require('dotenv').config();

const express = require('express');
const app = express();

app.use(express.json());

const webhookRouter = require('./trigger/webhook-handler');
app.use('/webhook', webhookRouter);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Server running');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});