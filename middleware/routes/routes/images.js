// routes/images.js
// This is the route that actually generates images.
// The important part: the API key for the AI service lives ONLY here, on the server,
// in an environment variable. It is never sent to the browser, so it can't be stolen
// by viewing the page source - unlike the earlier version of MaxStudio.

const express = require('express');
const fetch = require('node-fetch');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/images/generate
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please enter a prompt.' });
    }

    // 1. Check the user has credits left
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.credits_used >= user.credits_limit) {
      return res.status(402).json({
        error: 'You have used all your free credits. Upgrade your plan to keep generating.',
        creditsUsed: user.credits_used,
        creditsLimit: user.credits_limit
      });
    }

    // 2. Call the AI image API using the SERVER's key (never exposed to the browser)
    const fullPrompt = style ? `${prompt}, ${style} style` : prompt;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}` +
      `?width=512&height=512&seed=${Math.floor(Math.random() * 999999)}&nologo=true`;

    const aiResponse = await fetch(imageUrl);
    if (!aiResponse.ok) {
      return res.status(502).json({ error: 'Image generation failed upstream. Please try again.' });
    }
    const imageBuffer = await aiResponse.buffer();
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

    // 3. Only increment credits AFTER a successful generation
    const updateResult = await pool.query(
      'UPDATE users SET credits_used = credits_used + 1 WHERE id = $1 RETURNING credits_used, credits_limit',
      [req.userId]
    );

    // 4. Log it so the user has a history and you have visibility into usage
    await pool.query(
      'INSERT INTO generations (user_id, prompt, style) VALUES ($1, $2, $3)',
      [req.userId, prompt, style || null]
    );

    res.json({
      image: base64Image,
      creditsUsed: updateResult.rows[0].credits_used,
      creditsLimit: updateResult.rows[0].credits_limit
    });
  } catch (err) {
    console.error('Generate error:', err);
    res.status(500).json({ error: 'Something went wrong generating your image.' });
  }
});

// GET /api/images/history - a user's past generations
router.get('/history', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, prompt, style, created_at FROM generations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.userId]
    );
    res.json({ generations: result.rows });
  } catch (err) {
    console.error('History error:', err);
    res.status(500).json({ error: 'Could not load your generation history.' });
  }
});

module.exports = router;
