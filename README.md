# ⚡ QuizNet Edu — Setup Guide

Platform kuis multiplayer realtime + voice chat berbasis WebSocket & WebRTC.

---

## 🚀 Quick Start (Development)

### 1. Clone & Install
```bash
cd quiznet-edu
npm install
```

### 2. Setup Database
```bash
# Login MySQL
mysql -u root -p

# Jalankan schema
source db/schema.sql
# atau: mysql -u root -p < db/schema.sql
```

### 3. Konfigurasi .env
```bash
cp .env.example .env
# Edit .env sesuai config MySQL kamu
```

### 4. Jalankan Server
```bash
npm run dev        # development (nodemon auto-reload)
# atau
npm start          # production
```

Buka browser: `http://localhost:3000`

---

## 🏗 Struktur Folder

```
quiznet-edu/
├── server/
│   ├── config/db.js          ← MySQL connection pool
│   ├── socket/
│   │   ├── roomHandler.js    ← create/join/leave room
│   │   ├── quizHandler.js    ← game engine (soal, timer, skor)
│   │   └── rtcHandler.js     ← WebRTC signaling relay
│   ├── routes/api.js         ← REST API
│   └── index.js              ← Entry point
├── client/
│   ├── index.html            ← Landing page
│   ├── quiz.html             ← Quiz dashboard
│   ├── css/style.css
│   └── js/
│       ├── socket-client.js  ← Socket.IO events
│       ├── webrtc-client.js  ← RTCPeerConnection + audio
│       └── quiz-ui.js        ← DOM manipulation
├── db/schema.sql             ← DDL + seed data
└── ecosystem.config.js       ← PM2 deployment
```

---

## 📡 Socket.IO Events Reference

| Event | Arah | Keterangan |
|-------|------|------------|
| `create-room` | Client → Server | Host buat room baru |
| `join-room` | Client → Server | Player masuk room |
| `room-created` | Server → Client | Konfirmasi room dibuat |
| `room-joined` | Server → Client | Konfirmasi berhasil join |
| `player-list-update` | Server → Room | Broadcast daftar player |
| `start-quiz` | Client → Server | Host mulai kuis |
| `new-question` | Server → Room | Broadcast soal baru |
| `timer-tick` | Server → Room | Update timer setiap detik |
| `submit-answer` | Client → Server | Kirim jawaban |
| `answer-result` | Server → Client | Hasil jawaban (benar/salah) |
| `question-ended` | Server → Room | Tampilkan jawaban benar |
| `leaderboard-update` | Server → Room | Update skor realtime |
| `game-over` | Server → Room | Kuis selesai + hasil akhir |
| `webrtc-offer` | Client → Server → Client | WebRTC signaling |
| `webrtc-answer` | Client → Server → Client | WebRTC signaling |
| `webrtc-ice` | Client → Server → Client | ICE candidates |

---

## 🚢 Deployment (Ubuntu Server)

```bash
# Install PM2 globally
npm install -g pm2

# Start aplikasi
pm2 start ecosystem.config.js

# Auto-start saat reboot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs quiznet-edu
```

---

## 🎯 Konsep Jaringan yang Didemonstrasikan

1. **Client-Server via Socket.IO** — Untuk sinkronisasi state (soal, timer, skor)
2. **P2P via WebRTC** — Untuk transmisi audio langsung antar browser
3. **Signaling** — Socket.IO bertindak sebagai "perantara" WebRTC (bukan carrier audio)
4. **Room-based Broadcasting** — `io.to(roomCode).emit()` untuk multi-client sync
5. **Connection Lifecycle** — Cleanup saat disconnect
