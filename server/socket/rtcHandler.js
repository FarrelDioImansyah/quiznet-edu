// server/socket/rtcHandler.js
// ============================================================
// WebRTC Signaling Server
// Server TIDAK memproses audio — hanya meneruskan (relay)
// pesan antara dua peer agar mereka bisa membangun koneksi P2P.
//
// Flow:
//   A → [webrtc-offer]   → Server → B
//   B → [webrtc-answer]  → Server → A
//   * → [webrtc-ice]     → Server → *
// ============================================================

module.exports = (io, socket, rooms) => {

  // ── OFFER (dari Initiator ke Peer) ─────────────────────────
  socket.on('webrtc-offer', ({ offer, targetId }) => {
    console.log(`[WebRTC] 📤 Offer dari ${socket.id} → ${targetId}`);
    // Relay langsung ke target peer
    io.to(targetId).emit('webrtc-offer', {
      offer,
      fromId: socket.id
    });
  });

  // ── ANSWER (dari Peer balik ke Initiator) ──────────────────
  socket.on('webrtc-answer', ({ answer, targetId }) => {
    console.log(`[WebRTC] 📥 Answer dari ${socket.id} → ${targetId}`);
    io.to(targetId).emit('webrtc-answer', {
      answer,
      fromId: socket.id
    });
  });

  // ── ICE CANDIDATE (dua arah) ───────────────────────────────
  socket.on('webrtc-ice', ({ candidate, targetId }) => {
    io.to(targetId).emit('webrtc-ice', {
      candidate,
      fromId: socket.id
    });
  });

  // ── Notifikasi peer baru masuk room (trigger offer) ────────
  // Saat user baru join, beritahu semua peer lain untuk mulai signaling
 socket.on('request-peers', () => {

    const code = socket.roomCode;
    const room = rooms[code];

    if (!room) return;

    const existingPeers = [
      room.hostId,
      ...Object.keys(room.players)
    ].filter(id => id && id !== socket.id);

    socket.emit('existing-peers', {
      peers: existingPeers
    });

  });
};
