// server/routes/api.js
// REST API untuk data yang tidak perlu realtime

const express = require('express');
const router  = express.Router();
const db      = require('../config/db');

// GET /api/quizzes — daftar semua kuis (untuk dropdown host)
router.get('/quizzes', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, title FROM quizzes');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// GET /api/history — 10 riwayat kuis terakhir
router.get('/history', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM history ORDER BY finished_at DESC LIMIT 10'
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, msg: e.message });
  }
});

// GET /api/ping — health check
router.get('/ping', (req, res) => {
  res.json({ success: true, msg: 'QuizNet Edu is alive 🚀' });
});

module.exports = router;
