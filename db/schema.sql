-- ============================================================
-- QuizNet Edu - Database Schema
-- Run: mysql -u root -p < db/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS quiznet_edu CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE quiznet_edu;

-- --------------------------------------------------------
-- Tabel: users
-- Menyimpan data akun pengguna
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,           -- bcrypt hash
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Tabel: rooms
-- Menyimpan state room kuis (aktif / selesai)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_code   VARCHAR(10)  NOT NULL UNIQUE,   -- contoh: EDU123
  host_id     INT NOT NULL,
  quiz_id     INT,                            -- kuis yang sedang/digunakan
  status      ENUM('waiting','active','finished') DEFAULT 'waiting',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (host_id) REFERENCES users(id)
);

-- --------------------------------------------------------
-- Tabel: quizzes
-- Kumpulan set soal
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(100) NOT NULL,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- --------------------------------------------------------
-- Tabel: questions
-- Bank soal per kuis
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id       INT NOT NULL,
  question_text TEXT NOT NULL,
  option_a      VARCHAR(255) NOT NULL,
  option_b      VARCHAR(255) NOT NULL,
  option_c      VARCHAR(255) NOT NULL,
  option_d      VARCHAR(255) NOT NULL,
  correct_answer ENUM('a','b','c','d') NOT NULL,
  time_limit    INT DEFAULT 20,               -- detik
  order_num     INT NOT NULL,                 -- urutan soal
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabel: scores
-- Skor per user per sesi room
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS scores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_id     INT NOT NULL,
  user_id     INT NOT NULL,
  username    VARCHAR(50) NOT NULL,           -- cache username buat leaderboard
  score       INT DEFAULT 0,
  correct     INT DEFAULT 0,                  -- jumlah jawaban benar
  wrong       INT DEFAULT 0,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
);

-- --------------------------------------------------------
-- Tabel: history
-- Log aktivitas kuis yang telah selesai
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_id     INT NOT NULL,
  room_code   VARCHAR(10) NOT NULL,
  quiz_title  VARCHAR(100),
  total_players INT,
  winner_name VARCHAR(50),
  winner_score INT,
  finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- --------------------------------------------------------
-- Seed Data: contoh soal untuk testing
-- --------------------------------------------------------
INSERT INTO users (username, password) VALUES
  ('admin', '$2b$10$placeholder_hash_admin');  -- ganti dengan hash bcrypt asli

INSERT INTO quizzes (title, created_by) VALUES
  ('Jaringan Komputer Dasar', 1);

INSERT INTO questions (quiz_id, question_text, option_a, option_b, option_c, option_d, correct_answer, time_limit, order_num) VALUES
  (1, 'Protokol apa yang digunakan WebRTC untuk signaling?', 
      'HTTP', 'Socket.IO / WebSocket', 'FTP', 'SMTP', 'b', 20, 1),
  (1, 'Apa kepanjangan dari P2P?', 
      'Port to Port', 'Peer to Peer', 'Protocol to Protocol', 'Packet to Packet', 'b', 15, 2),
  (1, 'Layer berapa TCP/IP bekerja untuk transmisi data?', 
      'Application Layer', 'Network Layer', 'Transport Layer', 'Data Link Layer', 'c', 20, 3);
