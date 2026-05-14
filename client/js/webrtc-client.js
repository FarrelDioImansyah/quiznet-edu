// client/js/webrtc-client.js
// ============================================================
// Implementasi WebRTC untuk Voice Chat P2P
//
// Konsep kunci yang didemonstrasikan:
// 1. getUserMedia      → akses mikrofon
// 2. RTCPeerConnection → koneksi audio langsung antar browser
// 3. Signaling via Socket.IO → pertukaran offer/answer/ICE
// ============================================================

// Konfigurasi STUN server (gratis dari Google, untuk NAT traversal)
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

let localStream    = null;   // Audio stream dari mikrofon kita
let peerConnections = {};    // { peerId: RTCPeerConnection }
let micEnabled     = false;

// ── STEP 1: Aktifkan Mikrofon ─────────────────────────────────
async function toggleMic() {
  // MUTE
  if (micEnabled) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = false;
    });

    micEnabled = false;
    document.getElementById('btn-mic').textContent = 'Aktifkan Mikrofon';
    return;
  }

  // UNMUTE dari stream lama
  if (localStream) {
    localStream.getAudioTracks().forEach(track => {
      track.enabled = true;
    });

    micEnabled = true;
    document.getElementById('btn-mic').textContent = 'Matikan Mikrofon';
    return;
  }

  try {

    // pertama kali akses mic
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });

    micEnabled = true;

    document.getElementById('btn-mic').textContent =
      'Matikan Mikrofon';

    socket.emit('request-peers');

  } catch (err) {
    console.error(err);
  }
}

// ── STEP 2: Terima daftar peer yang sudah ada ─────────────────
socket.on('existing-peers', async ({ peers }) => {
  // Untuk setiap peer yang sudah ada, kita yang inisiasi koneksi
  for (const peerId of peers) {
    await createOffer(peerId);
  }
});

// ── STEP 3: Buat Offer (Initiator → Peer) ────────────────────
async function createOffer(targetId) {
  const pc = createPeerConnection(targetId);

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Kirim offer ke peer via socket (signaling)
  socket.emit('webrtc-offer', { offer, targetId });
  console.log(`[WebRTC] 📤 Offer dikirim ke ${targetId}`);
}

// ── STEP 4: Terima Offer & Kirim Answer (Peer → Initiator) ───
socket.on('webrtc-offer', async ({ offer, fromId }) => {
  console.log(`[WebRTC] 📥 Offer diterima dari ${fromId}`);
  const pc = createPeerConnection(fromId);

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('webrtc-answer', { answer, targetId: fromId });
});

// ── STEP 5: Terima Answer (Initiator menerima balasan) ────────
socket.on('webrtc-answer', async ({ answer, fromId }) => {
  console.log(`[WebRTC] ✅ Answer diterima dari ${fromId}`);
  const pc = peerConnections[fromId];
  if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
});

// ── STEP 6: Exchange ICE Candidates ──────────────────────────
socket.on('webrtc-ice', async ({ candidate, fromId }) => {
  const pc = peerConnections[fromId];
  if (pc && candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// ── HELPER: Buat RTCPeerConnection baru ──────────────────────
function createPeerConnection(peerId) {
  if (peerConnections[peerId]) return peerConnections[peerId];

  const pc = new RTCPeerConnection(RTC_CONFIG);
  peerConnections[peerId] = pc;

  // Tambahkan audio track lokal ke koneksi
  if (localStream) {
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  // Saat ICE candidate terbentuk, kirim ke peer via signaling
  pc.onicecandidate = ({ candidate }) => {
    if (candidate) {
      socket.emit('webrtc-ice', { candidate, targetId: peerId });
    }
  };

  // Saat audio dari peer tiba → tampilkan di UI
  pc.ontrack = ({ streams }) => {
    addRemoteAudio(peerId, streams[0]);
  };

  pc.onconnectionstatechange = () => {
    console.log(`[WebRTC] Koneksi dengan ${peerId}: ${pc.connectionState}`);
    if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
      removeRemoteAudio(peerId);
      delete peerConnections[peerId];
    }
  };

  return pc;
}

// ── HELPER: Tambah elemen audio untuk remote peer ─────────────
function addRemoteAudio(peerId, stream) {
  if (document.getElementById(`audio-${peerId}`)) return;

  const audio = document.createElement('audio');
  audio.id       = `audio-${peerId}`;
  audio.srcObject = stream;
  audio.autoplay  = true;

  const label = document.createElement('div');
  label.className = 'peer-label';
  label.textContent = `🔊 Peer: ${peerId.slice(0, 6)}...`;

  const container = document.getElementById('peer-audio-list');
  if (container) { container.appendChild(label); container.appendChild(audio); }

  console.log(`[WebRTC] 🔊 Audio dari ${peerId} aktif`);
}

function removeRemoteAudio(peerId) {

  const audio = document.getElementById(`audio-${peerId}`);
  if (audio) audio.remove();

  // hapus label peer juga
  document.querySelectorAll('.peer-label').forEach(el => {
    if (el.textContent.includes(peerId.slice(0, 6))) {
      el.remove();
    }
  });

  // cleanup rtc
  if (peerConnections[peerId]) {
    peerConnections[peerId].close();
    delete peerConnections[peerId];
  }
}
socket.on('peer-left', ({ peerId }) => {
  removeRemoteAudio(peerId);
});
socket.on('peer-rejoin', async ({ peerId }) => {

  // hanya user yang mic nya aktif
  if (!micEnabled || !localStream) return;

  try {

    // hapus koneksi lama
    if (peerConnections[peerId]) {
      peerConnections[peerId].close();
      delete peerConnections[peerId];
    }

    // buat ulang offer
    await createOffer(peerId);

  } catch (err) {
    console.error('[WebRTC] peer-rejoin error:', err);
  }
});

socket.on('peer-left', ({ peerId }) => {
  removeRemoteAudio(peerId);
});
