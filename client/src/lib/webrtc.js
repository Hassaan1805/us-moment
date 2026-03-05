/**
 * WebRTC utilities for us-moment
 * Manages peer connections for webcam/mic and screen sharing
 */

// STUN + free TURN servers from OpenRelay (openrelay.metered.ca)
// TURN is required for mobile (cellular) <-> desktop connections
// because strict NATs block STUN-only peer-to-peer paths.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

/**
 * Create a new RTCPeerConnection
 */
export function createPeerConnection({
  socket,
  targetSocketId,
  localStream,
  screenStream,
  remoteScreenStreamId,   // stream.id of the remote screen share, told via socket
  onRemoteStream,
  onRemoteScreenStream,
  onIceConnectionStateChange,
}) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // Add local webcam/mic tracks
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });
  }

  // Add screen share tracks with a different stream
  if (screenStream) {
    screenStream.getTracks().forEach((track) => {
      pc.addTrack(track, screenStream);
    });
  }

  // Handle incoming remote tracks.
  // We identify the screen share stream by the ID signaled via socket
  // (remoteScreenStreamId). Note: contentHint is a local-only property
  // and is NOT transmitted over the wire, so we can't rely on it.
  const receivedStreams = new Set();
  pc.ontrack = (event) => {
    const stream = event.streams[0];
    if (!stream) return;

    if (remoteScreenStreamId && stream.id === remoteScreenStreamId) {
      // This is the remote screen share stream
      onRemoteScreenStream?.(targetSocketId, stream);
    } else if (!receivedStreams.has(stream.id)) {
      receivedStreams.add(stream.id);
      onRemoteStream?.(targetSocketId, stream);
    }
  };

  // ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc:ice-candidate', {
        targetSocketId,
        candidate: event.candidate,
      });
    }
  };

  // Connection state
  pc.oniceconnectionstatechange = () => {
    onIceConnectionStateChange?.(pc.iceConnectionState);
  };

  return pc;
}

/**
 * Create offer and send to remote peer
 */
export async function createOffer(pc, socket, targetSocketId) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  socket.emit('webrtc:offer', { targetSocketId, offer });
}

/**
 * Handle incoming offer, create answer
 */
export async function handleOffer(pc, socket, senderSocketId, offer) {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('webrtc:answer', { targetSocketId: senderSocketId, answer });
}

/**
 * Handle incoming answer
 */
export async function handleAnswer(pc, answer) {
  await pc.setRemoteDescription(new RTCSessionDescription(answer));
}

/**
 * Handle incoming ICE candidate
 */
export async function handleIceCandidate(pc, candidate) {
  if (candidate) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
}

/**
 * Get user media (webcam + mic)
 * Returns { stream, error } — stream may be null if permissions denied.
 */
export async function getUserMedia({ audio = true, video = true } = {}) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: audio
        ? {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : false,
      video: video
        ? {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 24 },
          }
        : false,
    });
    return { stream, error: null };
  } catch (err) {
    console.warn('getUserMedia failed:', err.name, err.message);
    return { stream: null, error: err };
  }
}

/**
 * Get display media (screen/tab/window share)
 */
export async function getDisplayMedia() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    // Tag screen video tracks so receiving peers can distinguish them from webcam
    stream.getVideoTracks().forEach((t) => { t.contentHint = 'detail'; });
    return stream;
  } catch (err) {
    console.warn('getDisplayMedia failed:', err);
    return null;
  }
}

/**
 * Replace tracks in an existing peer connection
 */
export function replaceTracks(pc, newStream) {
  const senders = pc.getSenders();
  newStream.getTracks().forEach((newTrack) => {
    const sender = senders.find((s) => s.track?.kind === newTrack.kind);
    if (sender) {
      sender.replaceTrack(newTrack);
    } else {
      pc.addTrack(newTrack, newStream);
    }
  });
}

/**
 * Add screen share tracks to existing peer connections
 */
export function addScreenShareToPeers(peers, screenStream) {
  Object.values(peers).forEach((pc) => {
    screenStream.getTracks().forEach((track) => {
      pc.addTrack(track, screenStream);
    });
  });
}

/**
 * Remove screen share tracks from peer connections
 */
export function removeScreenShareFromPeers(peers, screenStream) {
  if (!screenStream) return;
  Object.values(peers).forEach((pc) => {
    const senders = pc.getSenders();
    screenStream.getTracks().forEach((track) => {
      const sender = senders.find((s) => s.track === track);
      if (sender) {
        pc.removeTrack(sender);
      }
    });
  });
}
