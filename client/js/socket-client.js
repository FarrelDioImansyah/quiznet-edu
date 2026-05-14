// client/js/socket-client.js
// ============================================================
// Mengelola semua event Socket.IO dari sisi client
// ============================================================

const socket = io();  // Auto-connect ke server
window.addEventListener('DOMContentLoaded', () => {

  const saved = JSON.parse(
    sessionStorage.getItem('quiznet_state') || '{}'
  );

  if (saved.isHost && saved.roomCode) {

    socket.emit('rejoin-host', {
      roomCode: saved.roomCode
    });

  }
});
// ── STATE ─────────────────────────────────────────────────────
const state = {
  roomCode: null,
  username: null,
  isHost:   false,
  maxTime:  20,
};

// ── EVENT: Room Created (untuk Host) ─────────────────────────
socket.on('room-created', ({ roomCode }) => {
  state.roomCode = roomCode;
  state.isHost   = true;
  state.username = document.getElementById('host-username').value.trim();
  // Redirect ke halaman quiz
  sessionStorage.setItem('quiznet_state', JSON.stringify(state));
  window.location.href = '/quiz.html';
});
socket.on('rejoin-room', ({ username, roomCode, isHost }) => {
  const room = rooms[roomCode];
  if (!room) return socket.emit('error-message', { msg: 'Room sudah tidak ada.' });

  // Update socket ID (karena socket lama sudah putus)
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

// ── EVENT: Room Joined (untuk Player) ────────────────────────
socket.on('room-joined', ({ roomCode, isHost }) => {
  state.roomCode = roomCode;
  state.isHost   = isHost;
  state.username = document.getElementById('username').value.trim();
  sessionStorage.setItem('quiznet_state', JSON.stringify(state));
  window.location.href = '/quiz.html';
});

// ── EVENT: Error dari Server ──────────────────────────────────
socket.on('error-message', ({ msg }) => {
  // Coba panggil fungsi showError jika ada di halaman
  if (typeof showError === 'function') showError(msg);
  else alert(msg);
});

// ── EVENT: Player list update ─────────────────────────────────
socket.on('player-list-update', ({ players }) => {
  if (typeof updatePlayerList === 'function') updatePlayerList(players);
});

// ── EVENT: New Question ───────────────────────────────────────
socket.on('new-question', (data) => {
  if (typeof renderQuestion === 'function') renderQuestion(data);
});

// ── EVENT: Timer tick ─────────────────────────────────────────
socket.on('timer-tick', ({ timeLeft }) => {
  if (typeof updateTimer === 'function') updateTimer(timeLeft);
});

// ── EVENT: Answer Result ──────────────────────────────────────
socket.on('answer-result', ({ correct, points }) => {
  if (typeof showAnswerFeedback === 'function') showAnswerFeedback(correct, points);
});

// ── EVENT: Question Ended (tampilkan jawaban benar) ───────────
socket.on('question-ended', ({ correctAnswer }) => {
  if (typeof showCorrectAnswer === 'function') showCorrectAnswer(correctAnswer);
});

// ── EVENT: Leaderboard Update ────────────────────────────────
socket.on('leaderboard-update', ({ leaderboard }) => {
  if (typeof renderLeaderboard === 'function') renderLeaderboard(leaderboard);
});

// ── EVENT: Game Over ──────────────────────────────────────────
socket.on('game-over', ({ leaderboard }) => {
  if (typeof showGameOver === 'function') showGameOver(leaderboard);
});

// ── EVENT: Room Closed ────────────────────────────────────────
socket.on('room-closed', ({ msg }) => {
  alert(msg);
  window.location.href = '/';
});

// ── ACTIONS ───────────────────────────────────────────────────
function startQuiz() {
  socket.emit('start-quiz');
}

function submitAnswer(answer) {
  socket.emit('submit-answer', { answer });
  // Disable semua tombol setelah jawab
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
}
// Tambahkan di bagian paling bawah socket-client.js
socket.on('connect', () => {
  const saved = JSON.parse(sessionStorage.getItem('quiznet_state') || '{}');
  if (saved.roomCode && saved.username) {
    // Re-join room setelah reconnect / pindah halaman
    socket.emit('rejoin-room', {
      username: saved.username,
      roomCode: saved.roomCode,
      isHost:   saved.isHost
    });
  }
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  
  const saved = JSON.parse(sessionStorage.getItem('quiznet_state') || '{}');
  console.log('[Socket] Saved state:', saved); // debug
  
  if (saved.roomCode && saved.username) {
    console.log('[Socket] Emitting rejoin-room...'); // debug
    socket.emit('rejoin-room', {
      username: saved.username,  // TYPO ASLI - lihat bawah
      roomCode: saved.roomCode,
      isHost:   saved.isHost
    });
  }
});
