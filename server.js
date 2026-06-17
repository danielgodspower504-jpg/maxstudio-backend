// server.js
// This is the entry point - the file that actually starts your backend running.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const imageRoutes = require('./routes/images');

const app = express();

app.use(cors()); // allows your Netlify frontend to talk to this backend
app.use(express.json());

// Health check - useful to confirm the server is alive
app.get('/', (req, res) => {
  res.json({ status: 'MaxStudio backend is running.' });
});

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`MaxStudio backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server - database setup error:', err);
    process.exit(1);
  });
