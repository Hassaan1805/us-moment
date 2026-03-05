const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomSerialized,
  addMessage,
  updatePlaybackState,
  kickParticipant,
  updateParticipant,
  getRoom,
} = require('./rooms');

function setupSocketHandlers(io) {
  // Track which room each socket is in
  const socketRoomMap = new Map(); // socketId -> roomId

  io.on('connection', (socket) => {
    console.log(`✅ Connected: ${socket.id}`);

    // ─── Room Management ───

    socket.on('room:create', ({ name, password, nickname }, callback) => {
      const room = createRoom({
        name,
        password,
        hostSocketId: socket.id,
        hostNickname: nickname,
      });
      socket.join(room.id);
      socketRoomMap.set(socket.id, room.id);
      console.log(`🎬 Room created: ${room.id} by ${nickname}`);
      callback({ success: true, room: getRoomSerialized(room.id) });
    });

    socket.on('room:join', ({ roomId, nickname, password }, callback) => {
      const result = joinRoom({ roomId, socketId: socket.id, nickname, password });
      if (result.error) {
        return callback({ success: false, error: result.error });
      }

      socket.join(roomId);
      socketRoomMap.set(socket.id, roomId);

      const roomData = getRoomSerialized(roomId);
      console.log(`👤 ${nickname} joined room ${roomId}`);

      // Notify others in the room
      socket.to(roomId).emit('room:user-joined', {
        participant: {
          socketId: socket.id,
          nickname,
          isHost: false,
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
        },
        participantCount: roomData.participants.length,
      });

      callback({ success: true, room: roomData });
    });

    socket.on('room:check', ({ roomId }, callback) => {
      const room = getRoomSerialized(roomId);
      if (!room) return callback({ exists: false });
      callback({ exists: true, hasPassword: room.hasPassword, name: room.name, participantCount: room.participants.length });
    });

    socket.on('room:leave', () => {
      handleLeaveRoom(socket);
    });

    // ─── Host Controls ───

    socket.on('host:kick', ({ targetSocketId }) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || room.hostId !== socket.id) return;

      kickParticipant(roomId, targetSocketId);
      socketRoomMap.delete(targetSocketId);

      // Notify the kicked user
      io.to(targetSocketId).emit('room:kicked');
      // Make them leave the socket room
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) targetSocket.leave(roomId);

      // Notify others
      io.to(roomId).emit('room:user-left', {
        socketId: targetSocketId,
        participants: getRoomSerialized(roomId)?.participants || [],
      });
    });

    socket.on('host:mute-user', ({ targetSocketId }) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || room.hostId !== socket.id) return;

      updateParticipant(roomId, targetSocketId, { isMuted: true });
      io.to(targetSocketId).emit('host:muted-you');
      io.to(roomId).emit('participant:updated', {
        socketId: targetSocketId,
        updates: { isMuted: true },
      });
    });

    // ─── WebRTC Signaling ───

    socket.on('webrtc:offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('webrtc:offer', {
        senderSocketId: socket.id,
        offer,
      });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('webrtc:answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    // ─── Screen Sharing ───

    socket.on('stream:start', ({ streamId } = {}) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      updateParticipant(roomId, socket.id, { isScreenSharing: true });
      socket.to(roomId).emit('stream:started', { socketId: socket.id, streamId });
    });

    socket.on('stream:stop', () => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      updateParticipant(roomId, socket.id, { isScreenSharing: false });
      socket.to(roomId).emit('stream:stopped', { socketId: socket.id });
    });

    // ─── Synchronized Playback ───

    socket.on('playback:update', (state) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room || room.hostId !== socket.id) return;

      const newState = updatePlaybackState(roomId, state);
      socket.to(roomId).emit('playback:sync', newState);
    });

    socket.on('playback:request-sync', () => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      socket.emit('playback:sync', room.playbackState);
    });

    // ─── Participant Media State ───

    socket.on('participant:toggle-audio', ({ isMuted }) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      updateParticipant(roomId, socket.id, { isMuted });
      socket.to(roomId).emit('participant:updated', {
        socketId: socket.id,
        updates: { isMuted },
      });
    });

    socket.on('participant:toggle-video', ({ isCameraOff }) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      updateParticipant(roomId, socket.id, { isCameraOff });
      socket.to(roomId).emit('participant:updated', {
        socketId: socket.id,
        updates: { isCameraOff },
      });
    });

    // ─── Chat ───

    socket.on('chat:message', ({ text }) => {
      const roomId = socketRoomMap.get(socket.id);
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      const message = addMessage(roomId, {
        sender: socket.id,
        senderName: participant.nickname,
        text,
      });

      io.to(roomId).emit('chat:message', message);
    });

    // ─── Disconnect ───

    socket.on('disconnect', () => {
      console.log(`❌ Disconnected: ${socket.id}`);
      handleLeaveRoom(socket);
    });

    // ─── Helper ───

    function handleLeaveRoom(sock) {
      const roomId = socketRoomMap.get(sock.id);
      if (!roomId) return;

      const result = leaveRoom(roomId, sock.id);
      socketRoomMap.delete(sock.id);
      sock.leave(roomId);

      if (result?.destroyed) {
        console.log(`💥 Room ${roomId} destroyed`);
        return;
      }

      if (result?.newHostId) {
        io.to(roomId).emit('room:new-host', { hostId: result.newHostId });
      }

      io.to(roomId).emit('room:user-left', {
        socketId: sock.id,
        participants: getRoomSerialized(roomId)?.participants || [],
      });
    }
  });
}

module.exports = { setupSocketHandlers };
