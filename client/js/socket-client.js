// client/js/socket-client.js

const socket = io();

const state = {
  roomCode: null,
  username: null,
  isHost:   false,
  maxTime:  20,
};

// ── Room Created → redirect host ke host panel ────────────────
socket.on('room-created', ({ roomCode }) => {
  state.roomCode = roomCode;
  state.isHost   = true;
  state.username = document.getElementById('host-username')?.value.trim();
  sessionStorage.setItem('quiznet_state', JSON.stringify(state));
  window.location.href = '/host.html';  // Host ke panel khusus
});

// ── Room Joined → player ke quiz dashboard ────────────────────
socket.on('room-joined', ({ roomCode, isHost }) => {
  state.roomCode = roomCode;
  state.isHost   = isHost;
  state.username = document.getElementById('username')?.value.trim();
  sessionStorage.setItem('quiznet_state', JSON.stringify(state));
  if (!isHost) window.location.href = '/quiz.html';
});

socket.on('error-message', ({ msg }) => {
  if (typeof showError === 'function') showError(msg);
  else alert(msg);
});

socket.on('player-list-update', ({ players }) => {
  if (typeof updatePlayerList === 'function') updatePlayerList(players);
});

socket.on('new-question', (data) => {
  if (typeof renderQuestion === 'function') renderQuestion(data);
});

socket.on('timer-tick', ({ timeLeft }) => {
  if (typeof updateTimer === 'function') updateTimer(timeLeft);
});

socket.on('answer-result', ({ correct, points }) => {
  if (typeof showAnswerFeedback === 'function') showAnswerFeedback(correct, points);
});

socket.on('question-ended', ({ correctAnswer }) => {
  if (typeof showCorrectAnswer === 'function') showCorrectAnswer(correctAnswer);
});

socket.on('leaderboard-update', ({ leaderboard }) => {
  if (typeof renderLeaderboard === 'function') renderLeaderboard(leaderboard);
});

socket.on('game-over', ({ leaderboard }) => {
  if (typeof showGameOver === 'function') showGameOver(leaderboard);
});

socket.on('room-closed', ({ msg }) => {
  alert(msg);
  sessionStorage.clear();
  window.location.href = '/';
});

// Auto rejoin saat reconnect (untuk player di quiz.html)
socket.on('connect', () => {
  const saved = JSON.parse(sessionStorage.getItem('quiznet_state') || '{}');
  if (saved.roomCode && saved.username && !saved.isHost) {
    socket.emit('rejoin-room', {
      username: saved.username,
      roomCode: saved.roomCode,
      isHost:   false
    });
  }
});

function submitAnswer(answer) {
  socket.emit('submit-answer', { answer });
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
}
