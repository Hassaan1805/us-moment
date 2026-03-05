const { v4: uuidv4 } = require('uuid');

/**
 * In-memory room store
 * rooms: Map<roomId, RoomState>
 *
 * RoomState = {
 *   id: string,
 *   name: string,
 *   password: string | null,
 *   hostId: string,
 *   createdAt: number,
 *   participants: Map<socketId, Participant>,
 *   playbackState: { playing: boolean, timestamp: number, updatedAt: number },
 *   messages: Array<{ id, sender, senderName, text, timestamp }>
 * }
 *
 * Participant = {
 *   socketId: string,
 *   nickname: string,
 *   isHost: boolean,
 *   isMuted: boolean,
 *   isCameraOff: boolean,
 *   isScreenSharing: boolean,
 * }
 */

const rooms = new Map();

function createRoom({ name, password, hostSocketId, hostNickname }) {
  const id = uuidv4().slice(0, 8);
  const room = {
    id,
    name: name || `Room ${id}`,
    password: password || null,
    hostId: hostSocketId,
    createdAt: Date.now(),
    participants: new Map(),
    playbackState: {
      playing: false,
      timestamp: 0,
      updatedAt: Date.now(),
    },
    messages: [],
  };

  room.participants.set(hostSocketId, {
    socketId: hostSocketId,
    nickname: hostNickname || 'Host',
    isHost: true,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
  });

  rooms.set(id, room);
  return room;
}

function joinRoom({ roomId, socketId, nickname, password }) {
  const room = rooms.get(roomId);
  if (!room) return { error: 'Room not found' };
  if (room.password && room.password !== password) return { error: 'Incorrect password' };
  if (room.participants.size >= 10) return { error: 'Room is full (max 10)' };

  room.participants.set(socketId, {
    socketId,
    nickname: nickname || `User-${socketId.slice(0, 4)}`,
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isScreenSharing: false,
  });

  return { room };
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) return null;

  room.participants.delete(socketId);

  // If host left, assign new host or destroy room
  if (room.hostId === socketId) {
    if (room.participants.size > 0) {
      const newHost = room.participants.values().next().value;
      newHost.isHost = true;
      room.hostId = newHost.socketId;
      return { room, newHostId: newHost.socketId };
    } else {
      rooms.delete(roomId);
      return { destroyed: true };
    }
  }

  if (room.participants.size === 0) {
    rooms.delete(roomId);
    return { destroyed: true };
  }

  return { room };
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function getRoomSerialized(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  return {
    id: room.id,
    name: room.name,
    hasPassword: !!room.password,
    hostId: room.hostId,
    createdAt: room.createdAt,
    participants: Array.from(room.participants.values()),
    playbackState: room.playbackState,
    messages: room.messages.slice(-100), // last 100 messages
  };
}

function addMessage(roomId, { sender, senderName, text }) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const message = {
    id: uuidv4(),
    sender,
    senderName,
    text,
    timestamp: Date.now(),
  };
  room.messages.push(message);
  // Keep max 500 messages
  if (room.messages.length > 500) {
    room.messages = room.messages.slice(-500);
  }
  return message;
}

function updatePlaybackState(roomId, state) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.playbackState = {
    ...room.playbackState,
    ...state,
    updatedAt: Date.now(),
  };
  return room.playbackState;
}

function kickParticipant(roomId, targetSocketId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  room.participants.delete(targetSocketId);
  return room;
}

function updateParticipant(roomId, socketId, updates) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const participant = room.participants.get(socketId);
  if (!participant) return null;
  Object.assign(participant, updates);
  return participant;
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getRoomSerialized,
  addMessage,
  updatePlaybackState,
  kickParticipant,
  updateParticipant,
};
