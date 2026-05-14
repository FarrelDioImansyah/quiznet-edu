// server/socket/quizHandler.js

const db = require('../config/db');
const TIMER_INTERVAL = 1000;

module.exports = (io, socket, rooms) => {

  socket.on('start-quiz', async () => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.hostId !== socket.id) return;
    if (Object.keys(room.players).length === 0) {
      return socket.emit('error-message', { msg: 'Belum ada player yang join!' });
    }

    room.status   = 'active';
    room.currentQ = 0;

    // Pakai soal dari import JSON jika ada, fallback ke DB
    if (!room.questions || room.questions.length === 0) {
      try {
        const [questions] = await db.execute(
          'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num ASC',
          [room.quizId]
        );
        room.questions = questions;
      } catch (e) {
        room.questions = [
          { id: 1, question_text: 'Contoh soal?', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D', correct_answer: 'a', time_limit: 20 }
        ];
      }
    }

    if (room.questions.length === 0) {
      return socket.emit('error-message', { msg: 'Tidak ada soal! Import dulu via JSON.' });
    }

    // Broadcast ke PLAYER saja (host sudah di room tapi tidak ikut main)
    sendQuestion(io, code, room);
  });

  socket.on('submit-answer', ({ answer }) => {
    const code = socket.roomCode;
    const room = rooms[code];
    if (!room || room.status !== 'active') return;
    if (socket.id === room.hostId) return; // host tidak bisa jawab

    const player   = room.players[socket.id];
    const question = room.questions[room.currentQ];
    if (!player || !question) return;
    if (player.answered) return;

    player.answered = true;

    if (answer === question.correct_answer) {
      const points   = 100 + ((room.timeLeft || 0) * 5);
      player.score  += points;
      player.correct += 1;
      socket.emit('answer-result', { correct: true, points });
    } else {
      player.wrong += 1;
      socket.emit('answer-result', { correct: false, points: 0 });
    }

    broadcastLeaderboard(io, code, room);
    const allAnswered = Object.values(room.players)
  .every(p => p.answered);

if (allAnswered) {
  clearInterval(room.timer);

  io.to(code).emit('question-ended', {
    correctAnswer: question.correct_answer
  });

  setTimeout(() => {
    room.currentQ++;
    sendQuestion(io, code, room);
  }, 1500);
}
  });
};

function sendQuestion(io, code, room) {
  const q = room.questions[room.currentQ];
  if (!q) return endGame(io, code, room);

  Object.values(room.players).forEach(p => p.answered = false);
  room.timeLeft = q.time_limit || 20;

  // Kirim ke semua (host bisa lihat soal tapi tidak bisa jawab)
  io.to(code).emit('new-question', {
    index:    room.currentQ + 1,
    total:    room.questions.length,
    question: q.question_text,
    options:  { a: q.option_a, b: q.option_b, c: q.option_c, d: q.option_d },
    timeLimit: room.timeLeft
  });

  if (room.timer) clearInterval(room.timer);
  room.timer = setInterval(() => {
    room.timeLeft--;
    io.to(code).emit('timer-tick', { timeLeft: room.timeLeft });

    if (room.timeLeft <= 0) {
      clearInterval(room.timer);
      io.to(code).emit('question-ended', { correctAnswer: q.correct_answer });
      setTimeout(() => {
        room.currentQ++;
        sendQuestion(io, code, room);
      }, 2000);
    }
  }, TIMER_INTERVAL);
}

function broadcastLeaderboard(io, code, room) {
  const leaderboard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score }));
  io.to(code).emit('leaderboard-update', { leaderboard });
}

function endGame(io, code, room) {
  room.status = 'finished';
  const finalBoard = Object.values(room.players)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, username: p.username, score: p.score, correct: p.correct, wrong: p.wrong }));
  io.to(code).emit('game-over', { leaderboard: finalBoard });
  console.log(`[Quiz] 🏆 Game over di room ${code}`);
}
