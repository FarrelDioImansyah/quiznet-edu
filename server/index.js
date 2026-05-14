// server/index.js
// ============================================================
// Entry point utama QuizNet Edu
// Menginisialisasi Express, Socket.IO, dan semua handler
// ============================================================

require('dotenv').config();
const express   = require('express');
const fs     = require('fs');
const http      = require('https');
const { Server } = require('socket.io');
const cors      = require('cors');
const path      = require('path');


// Baca sertifikat SSL
const sslOptions = {
  key:  fs.readFileSync('./ssl/key.pem'),
  cert: fs.readFileSync('./ssl/cert.pem')
};


// Import handler (dipisah biar rapi & mudah dipelajari)
const roomHandler = require('./socket/roomHandler');
const quizHandler = require('./socket/quizHandler');
const rtcHandler  = require('./socket/rtcHandler');
const apiRoutes   = require('./routes/api');

// ── App Setup ────────────────────────────────────────────────
const app    = express();
const server = http.createServer(sslOptions, app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));  // Serve frontend

// ── REST API Routes ──────────────────────────────────────────
app.use('/api', apiRoutes);

// ── In-Memory Room Store ─────────────────────────────────────
// Menyimpan state room yang sedang aktif di memori server.
// Key: roomCode, Value: { hostId, players: {}, quizId, currentQ, timer }
const rooms = {};

// ── Socket.IO Connection ──────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] 🔌 Client connect: ${socket.id}`);

  // Teruskan context ke masing-masing handler
  roomHandler(io, socket, rooms);
  quizHandler(io, socket, rooms);
  rtcHandler(io, socket, rooms);

  socket.on('disconnect', () => {
    console.log(`[Socket] 🔌 Client disconnect: ${socket.id}`);
  });
});

// ── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 QuizNet Edu Server running at http://localhost:${PORT}\n`);
});
