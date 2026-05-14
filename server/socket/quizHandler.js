// server/socket/quizHandler.js
// ============================================================
// Engine kuis: start, jawab, timer, leaderboard, end game
// ============================================================

const db = require('../config/db');

const TIMER_INTERVAL = 1000;  // 1 detik

module.exports = (io, socket, rooms) => {

  // ── START QUIZ ─────────────────────────────────────────────
  socket.on('start-quiz', async () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.hostId !== socket.id) return;

    room.status   = 'active';
    room.currentQ = 0;

    // Ambil semua soal dari DB
    try {
      const [questions] = await db.execute(
        'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num ASC',
        [room.quizId]
      );
      room.questions = questions;
    } catch (e) {
      // Fallback: pakai soal dummy jika belum ada DB
      room.questions = [
        { id: 1, question_text: 'Contoh soal 1?', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct_answer: 'a', time_limit: 20 }
      ];
    }

    sendQuestion(io, code, room);
  });

  // ── SUBMIT ANSWER ──────────────────────────────────────────
  socket.on('submit-answer', ({ answer }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.status !== 'active') return;

    const player  = room.players[socket.id];
    const question = room.questions[room.currentQ];
    if (!player || !question) return;
    if (player.answered) return; // cegah double submit

    player.answered = true;

    if (answer === question.correct_answer) {
      // Skor berbasis kecepatan: lebih cepat = lebih banyak poin
      const timeBonus = room.timeLeft || 0;
      const points    = 100 + (timeBonus * 5);
      player.score  += points;
      player.correct += 1;
      socket.emit('answer-result', { correct: true, points });
    } else {
      player.wrong += 1;
      socket.emit('answer-result', { correct: false, points: 0 });
    }

    // Broadcast leaderboard terbaru
    broadcastLeaderboard(io, code, room);
  });
};

// ── HELPER: Kirim soal ke semua player ──────────────────────
function sendQuestion(io, code, room) {
  const q = room.questions[room.currentQ];
  if (!q) return endGame(io, code, room);

  // Reset flag answered untuk ronde baru
  Object.values(room.players).forEach(p => p.answered = false);
  room.timeLeft = q.time_limit;

  // Kirim soal (TANPA correct_answer agar tidak curang)
  io.to(code).emit('new-question', {
    index:    room.currentQ + 1,
    total:    room.questions.length,
    question: q.question_text,
    options:  { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
    timeLimit: q.time_limit
  });

  // Jalankan timer di server
  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(code).emit('timer-tick', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      // Pindah ke soal berikutnya setelah jeda 2 detik
      io.to(code).emit('question-ended', { correctAnswer: q.correct_answer });
      setTimeout(() => {
        room.currentQ++;
        sendQuestion(io, code, room);
      }, 2000);
    }
  }, TIMER_INTERVAL);
}

// ── HELPER: Broadcast leaderboard ───────────────────────────
function broadcastLeaderboard(io, code, room) {
  const leaderboard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score }));

  io.to(code).emit('leaderboard-update', { leaderboard });
}

// ── HELPER: End game ─────────────────────────────────────────
function endGame(io, code, room) {
  room.status = 'finished';
  const finalBoard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score, correct: p.correct, wrong: p.wrong }));

  io.to(code).emit('game-over', { leaderboard: finalBoard });
  console.log(`[Quiz] 🏆 Game over di room ${code}. Pemenang: ${finalBoard[0]?.username}`);
}
