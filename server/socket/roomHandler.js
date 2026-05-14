// server/socket/roomHandler.js

const db = require('../config/db');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = (io, socket, rooms) => {

  socket.on('create-room', async ({ username, quizId }) => {
    let roomCode;
    do { roomCode = generateRoomCode(); } while (rooms[roomCode]);

    rooms[roomCode] = {
      hostId:   socket.id,
      hostName: username,
      quizId,
      status:   'waiting',
      players:  {},       // hanya player, BUKAN host
      currentQ: 0,
      timer:    null,
      questions: [],
      _hostDisconnectTimer: null
    };

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isHost   = true;

    try {
      await db.execute(
        'INSERT INTO rooms (room_code, host_id, quiz_id) VALUES (?, 1, ?)',
        [roomCode, quizId || null]
      );
    } catch (e) {
      console.warn('[Room] DB insert skip:', e.message);
    }

    socket.emit('room-created', { roomCode });
    console.log(`[Room] ✅ Room ${roomCode} dibuat oleh HOST ${username}`);
  });

  socket.on('join-room', ({ username, roomCode }) => {
    const room = rooms[roomCode];

    if (!room) return socket.emit('error-message', { msg: 'Room tidak ditemukan.' });
    if (room.status !== 'waiting') return socket.emit('error-message', { msg: 'Kuis sudah dimulai.' });
    if (Object.keys(room.players).length >= 10) return socket.emit('error-message', { msg: 'Room penuh (maks 10).' });

    room.players[socket.id] = { username, score: 0, correct: 0, wrong: 0 };
    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.isHost   = false;

    socket.emit('room-joined', { roomCode, isHost: false });
    io.to(roomCode).emit('player-list-update', {
      players: Object.values(room.players)
    });
    socket.to(roomCode).emit('peer-rejoin', {
  peerId: socket.id
});

    console.log(`[Room] 👤 ${username} join ${roomCode}`);
  });

  socket.on('rejoin-room', ({ username, roomCode, isHost }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error-message', { msg: 'Room sudah tidak ada.' });

    if (isHost && room._hostDisconnectTimer) {
      clearTimeout(room._hostDisconnectTimer);
      room._hostDisconnectTimer = null;
    }

    if (isHost) {
      room.hostId   = socket.id;
      socket.isHost = true;
      // Host tidak masuk players
    } else {
      room.players[socket.id] = { username, score: 0, correct: 0, wrong: 0 };
      socket.isHost = false;
    }

    socket.join(roomCode);
    socket.roomCode = roomCode;

    socket.emit('room-rejoined', { roomCode, isHost });
    io.to(roomCode).emit('player-list-update', {
      players: Object.values(room.players)
    });

socket.to(roomCode).emit('peer-rejoin', {
  peerId: socket.id
});

    console.log(`[Room] 🔄 ${username} rejoin ${roomCode} (isHost: ${isHost})`);
  });

  // Host upload pertanyaan via JSON
  socket.on('import-questions', ({ roomCode, questions }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit('error-message', { msg: 'Room tidak ditemukan.' });
    if (room.hostId !== socket.id) return socket.emit('error-message', { msg: 'Hanya host yang bisa import soal.' });

    // Validasi format
    const valid = questions.every(q =>
      q.question_text && q.option_a && q.option_b &&
      q.option_c && q.option_d && ['a','b','c','d'].includes(q.correct_answer)
    );

    if (questions.length < 5) {
  return socket.emit('error-message', {
    msg: 'Minimal 5 soal.'
  });
}
    if (!valid) return socket.emit('error-message', { msg: 'Format JSON tidak valid. Cek template.' });

    room.questions = questions.map((q, i) => ({ ...q, id: i + 1, order_num: i + 1, time_limit: q.time_limit || 20 }));
    socket.emit('questions-imported', { count: room.questions.length });
    console.log(`[Room] 📋 ${room.questions.length} soal diimport ke room ${roomCode}`);
  });

socket.on('leave-room', () => {

  const code = socket.roomCode;

  if (!code || !rooms[code]) return;

  // host tidak boleh pakai leave-room
  if (rooms[code].hostId === socket.id) return;

  delete rooms[code].players[socket.id];

  socket.leave(code);

  io.to(code).emit('player-list-update', {
    players: Object.values(rooms[code].players)
  });

  console.log(`[Room] 🚪 Player keluar dari ${code}`);
});

  socket.on('disconnect', () => {
    const code = socket.roomCode;
    if (!code || !rooms[code]) return;

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
      delete rooms[code].players[socket.id];
      io.to(code).emit('player-list-update', {
        players: Object.values(rooms[code].players)
      });
    }
  });

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
