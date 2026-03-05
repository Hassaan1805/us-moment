import { create } from 'zustand';

const useRoomStore = create((set, get) => ({
  // Room data
  room: null,
  mySocketId: null,
  nickname: '',
  isHost: false,

  // Media state
  isMuted: false,
  isCameraOff: true,
  isScreenSharing: false,

  // Streams
  localStream: null,         // webcam/mic
  screenStream: null,         // host's screen share
  remoteStreams: {},           // { socketId: MediaStream }
  remoteScreenStream: null,   // screen stream from host
  screenSharerSocketId: null,

  // Peers
  peers: {},                  // { socketId: RTCPeerConnection }

  // Chat
  messages: [],

  // Playback
  playbackState: { playing: false, timestamp: 0, updatedAt: Date.now() },

  // Actions
  setRoom: (room) => set({ room }),
  setMySocketId: (id) => set({ mySocketId: id }),
  setNickname: (nickname) => set({ nickname }),
  setIsHost: (isHost) => set({ isHost }),

  setIsMuted: (isMuted) => set({ isMuted }),
  setIsCameraOff: (isCameraOff) => set({ isCameraOff }),
  setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setRemoteScreenStream: (stream) => set({ remoteScreenStream: stream }),
  setScreenSharerSocketId: (id) => set({ screenSharerSocketId: id }),

  addRemoteStream: (socketId, stream) =>
    set((s) => ({ remoteStreams: { ...s.remoteStreams, [socketId]: stream } })),
  removeRemoteStream: (socketId) =>
    set((s) => {
      const copy = { ...s.remoteStreams };
      delete copy[socketId];
      return { remoteStreams: copy };
    }),

  setPeer: (socketId, peer) =>
    set((s) => ({ peers: { ...s.peers, [socketId]: peer } })),
  removePeer: (socketId) =>
    set((s) => {
      const copy = { ...s.peers };
      if (copy[socketId]) {
        copy[socketId].close();
        delete copy[socketId];
      }
      return { peers: copy };
    }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
  setMessages: (messages) => set({ messages }),

  setPlaybackState: (playbackState) => set({ playbackState }),

  updateParticipant: (socketId, updates) =>
    set((s) => {
      if (!s.room) return {};
      const participants = s.room.participants.map((p) =>
        p.socketId === socketId ? { ...p, ...updates } : p
      );
      return { room: { ...s.room, participants } };
    }),

  addParticipant: (participant) =>
    set((s) => {
      if (!s.room) return {};
      return {
        room: {
          ...s.room,
          participants: [...s.room.participants, participant],
        },
      };
    }),

  removeParticipant: (socketId) =>
    set((s) => {
      if (!s.room) return {};
      return {
        room: {
          ...s.room,
          participants: s.room.participants.filter((p) => p.socketId !== socketId),
        },
      };
    }),

  setHostId: (hostId) =>
    set((s) => {
      if (!s.room) return {};
      const isHost = hostId === s.mySocketId;
      const participants = s.room.participants.map((p) => ({
        ...p,
        isHost: p.socketId === hostId,
      }));
      return { room: { ...s.room, hostId, participants }, isHost };
    }),

  // Reset
  reset: () =>
    set({
      room: null,
      mySocketId: null,
      isHost: false,
      isMuted: false,
      isCameraOff: true,
      isScreenSharing: false,
      localStream: null,
      screenStream: null,
      remoteStreams: {},
      remoteScreenStream: null,
      screenSharerSocketId: null,
      peers: {},
      messages: [],
      playbackState: { playing: false, timestamp: 0, updatedAt: Date.now() },
    }),
}));

export default useRoomStore;
