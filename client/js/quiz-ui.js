// client/js/quiz-ui.js
// ============================================================
// Semua manipulasi DOM untuk Quiz Dashboard
// ============================================================

// Load state dari sessionStorage
const savedState = JSON.parse(sessionStorage.getItem('quiznet_state') || '{}');
Object.assign(state, savedState);

// ── INIT ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (!state.roomCode) {
    window.location.href = '/';  // Redirect kalau belum join
    return;
  }

  // Tampilkan room code
  document.getElementById('room-code-display').textContent   = state.roomCode;
  document.getElementById('room-code-waiting').textContent   = state.roomCode;

  // Tampilkan tombol Start hanya untuk host
  if (state.isHost) {
    document.getElementById('btn-start').classList.remove('hidden');
  }

  showScreen('waiting-screen');
});

// ── SCREEN MANAGEMENT ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ── UPDATE: Waiting room player list ─────────────────────────
function updatePlayerList(players) {
  const el = document.getElementById('player-list-waiting');
  el.innerHTML = players.map(p =>
    `<div class="player-chip">👤 ${p.username}</div>`
  ).join('');
}

// ── RENDER: Soal baru ─────────────────────────────────────────
function renderQuestion({ index, total, question, options, timeLimit }) {
  showScreen('question-screen');

  state.maxTime = timeLimit;

  document.getElementById('q-index').textContent      = index;
  document.getElementById('q-total').textContent      = total;
  document.getElementById('question-text').textContent = question;
  document.getElementById('timer-display').textContent = timeLimit;

  // Set teks opsi
  ['a', 'b', 'c', 'd'].forEach(key => {
    const btn = document.getElementById(`opt-${key}`);
    btn.textContent = `${key.toUpperCase()}. ${options[key]}`;
    btn.disabled    = false;
    btn.className   = 'opt';
  });

  // Reset feedback
  document.getElementById('answer-feedback').classList.add('hidden');

  // Reset timer bar
  const fill = document.getElementById('timer-fill');
  fill.style.transition = 'none';
  fill.style.width      = '100%';
}

// ── UPDATE: Timer ─────────────────────────────────────────────
function updateTimer(timeLeft) {
  document.getElementById('timer-display').textContent = timeLeft;
  const pct = (timeLeft / state.maxTime) * 100;
  const fill = document.getElementById('timer-fill');
  fill.style.transition = 'width 0.9s linear';
  fill.style.width      = `${pct}%`;
  fill.style.background = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
}

// ── FEEDBACK: Jawaban benar/salah ────────────────────────────
function showAnswerFeedback(correct, points) {
  const el = document.getElementById('answer-feedback');
  el.className = `feedback ${correct ? 'correct' : 'wrong'}`;
  el.textContent = correct ? `✅ Benar! +${points} poin` : '❌ Salah!';
  el.classList.remove('hidden');
}

// ── SHOW: Jawaban benar setelah waktu habis ───────────────────
function showCorrectAnswer(correctAnswer) {
  document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  const correctBtn = document.getElementById(`opt-${correctAnswer}`);
  if (correctBtn) correctBtn.classList.add('correct-answer');
}

// ── RENDER: Leaderboard ───────────────────────────────────────
function renderLeaderboard(leaderboard) {
  const el = document.getElementById('leaderboard-list');
  el.innerHTML = leaderboard.map(p =>
    `<li><span class="rank">#${p.rank}</span> ${p.username} <span class="score">${p.score}</span></li>`
  ).join('');
}

// ── GAME OVER ────────────────────────────────────────────────
function showGameOver(leaderboard) {
  showScreen('gameover-screen');
  const el = document.getElementById('final-leaderboard');
  el.innerHTML = leaderboard.map(p =>
    `<div class="final-row rank-${p.rank}">
      <span>#${p.rank}</span>
      <span>${p.username}</span>
      <span>${p.score} poin</span>
      <span>✅ ${p.correct} | ❌ ${p.wrong}</span>
    </div>`
  ).join('');
}
