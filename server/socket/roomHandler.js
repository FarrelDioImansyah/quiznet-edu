// server/socket/roomHandler.js

const db = require('../config/db');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = (io, socket, rooms) => {

  // ── CREATE ROOM ────────────────────────────────────────────
  socket.on('create-room', async ({ username, quizId }) => {
    let roomCode;
    do { roomCode = generateRoomCode(); } while (rooms[roomCode]);

    rooms[roomCode] = {
      hostId:   socket.id,
      hostName: username,
      quizId,
      status:   'waiting',
      players:  {},
      currentQ: 0,
      timer:    null,
      _hostDisconnectTimer: null
    };

    rooms[roomCode].players[socket.id] = { username, score: 0, correct: 0, wrong: 0 };

    socket.join(roomCode);
    socket.roomCode = roomCode;

    try {
      await db.execute(
        'INSERT INTO rooms (room_code, host_id, quiz_id) VALUES (?, 1, ?)',
        [roomCode, quizId || null]
      );
    } catch (e) {
      console.warn('[Room] DB insert skip:', e.message);
    }

    socket.emit('room-created', { roomCode });
    console.log(`[Room] ✅ Room ${roomCode} dibuat oleh ${username}`);
  });

  // ── JOIN ROOM ──────────────────────────────────────────────
  socket.on('join-room', ({ username, roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return socket.emit('error-message', { msg: 'Room tidak ditemukan.' });
    if (room.status !== 'waiting') return socket.emit('error-message', { msg: 'Kuis sudah dimulai.' });
    if (Object.keys(room.players).length >= 10) return socket.emit('error-message', { msg: 'Room penuh (maks 10).' });

    room.players[socket.id] = { username, score: 0, correct: 0, wrong: 0 };
    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('room-joined', { roomCode, isHost: false });
    io.to(roomCode).emit('player-list-update', {
      players: Object.values(room.players)
    });

    console.log(`[Room] 👤 ${username} join ${roomCode}`);
  });

  // ── REJOIN ROOM (setelah pindah halaman) ───────────────────
  socket.on('rejoin-room', ({ username, roomCode, isHost }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error-message', { msg: 'Room sudah tidak ada.' });

    if (isHost && room._hostDisconnectTimer) {
      clearTimeout(room._hostDisconnectTimer);
      room._hostDisconnectTimer = null;
      console.log(`[Room] ✅ Host reconnect, timer dibatalkan untuk ${roomCode}`);
    }

    if (isHost) room.hostId = socket.id;

    room.players[socket.id] = { username, score: 0, correct: 0, wrong: 0 };
    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('room-joined', { roomCode, isHost });
    io.to(roomCode).emit('player-list-update', {
      players: Object.values(room.players)
    });

    console.log(`[Room] 🔄 ${username} rejoin ${roomCode} (isHost: ${isHost})`);
  });

  // ── DISCONNECT ─────────────────────────────────────────────
  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

    delete rooms[code].players[socket.id];

    if (rooms[code].hostId === socket.id) {
      console.log(`[Room] ⏳ Host disconnect dari ${code}, menunggu 5 detik...`);
      rooms[code]._hostDisconnectTimer = setTimeout(() => {
        if (!rooms[code]) return;
        io.to(code).emit('room-closed', { msg: 'Host menutup room.' });
        if (rooms[code].timer) clearInterval(rooms[code].timer);
        delete rooms[code];
        console.log(`[Room] ❌ Room ${code} ditutup (host timeout)`);
      }, 5000);
    } else {
      io.to(code).emit('player-list-update', {
        players: Object.values(rooms[code].players)
      });
    }
  });

  // ── CLOSE ROOM (manual) ────────────────────────────────────
  socket.on('close-room', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;
    if (rooms[code].hostId !== socket.id) return;

    io.to(code).emit('room-closed', { msg: 'Room ditutup oleh host.' });
    if (rooms[code].timer) clearInterval(rooms[code].timer);
    delete rooms[code];
    console.log(`[Room] ❌ Room ${code} ditutup manual`);
  });
};
