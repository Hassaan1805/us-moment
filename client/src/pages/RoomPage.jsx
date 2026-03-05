import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, connectSocket } from '../lib/socket';
import useRoomStore from '../store/useRoomStore';
import {
  createPeerConnection,
  createOffer,
  handleOffer,
  handleAnswer,
  handleIceCandidate,
  getUserMedia,
  getDisplayMedia,
} from '../lib/webrtc';
import MainVideo from '../components/MainVideo';
import ParticipantGrid from '../components/ParticipantGrid';
import ChatPanel from '../components/ChatPanel';
import ControlBar from '../components/ControlBar';
import RoomHeader from '../components/RoomHeader';
import HostControls from '../components/HostControls';
import DeviceSettings from '../components/DeviceSettings';
import SupportBot from '../components/SupportBot';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [showHostControls, setShowHostControls] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  const {
    room, mySocketId, isHost, nickname,
    localStream, screenStream, isMuted, isCameraOff, isScreenSharing,
    peers, remoteStreams, remoteScreenStream, screenSharerSocketId,
    setRoom, setMySocketId, setIsHost, setNickname: saveNickname,
    setLocalStream, setScreenStream, setRemoteScreenStream, setScreenSharerSocketId,
    setIsMuted, setIsCameraOff, setIsScreenSharing,
    addRemoteStream, removeRemoteStream,
    setPeer, removePeer,
    addParticipant, removeParticipant, updateParticipant, setHostId,
    addMessage, setMessages,
    setPlaybackState,
    reset,
  } = useRoomStore();

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Keep refs in sync
  useEffect(() => { peersRef.current = peers; }, [peers]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);
  useEffect(() => { screenStreamRef.current = screenStream; }, [screenStream]);

  // ─── Initialize Room Connection ───
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();

    if (!room) {
      // Navigated directly; redirect to join page
      navigate(`/join/${roomId}`);
      return;
    }

    // Setup socket event handlers
    setupSocketListeners(socket);

    // Initialize local media
    initLocalMedia(socket);

    return () => {
      cleanup(socket);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setupSocketListeners = useCallback((socket) => {
    socket.on('room:user-joined', ({ participant }) => {
      addParticipant(participant);
      // Create peer connection for new user
      setTimeout(() => createPeerForUser(socket, participant.socketId), 500);
    });

    socket.on('room:user-left', ({ socketId, participants }) => {
      removeParticipant(socketId);
      removePeer(socketId);
      removeRemoteStream(socketId);
      if (socketId === useRoomStore.getState().screenSharerSocketId) {
        setRemoteScreenStream(null);
        setScreenSharerSocketId(null);
      }
    });

    socket.on('room:new-host', ({ hostId }) => {
      setHostId(hostId);
    });

    socket.on('room:kicked', () => {
      alert('You have been removed from the room.');
      navigate('/');
    });

    socket.on('host:muted-you', () => {
      setIsMuted(true);
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = false));
      }
    });

    socket.on('participant:updated', ({ socketId, updates }) => {
      updateParticipant(socketId, updates);
    });

    // ─── WebRTC Signaling ───

    socket.on('webrtc:offer', async ({ senderSocketId, offer }) => {
      let pc = peersRef.current[senderSocketId];
      if (!pc) {
        pc = createPeerForUser(socket, senderSocketId, false);
      }
      try {
        await handleOffer(pc, socket, senderSocketId, offer);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    });

    socket.on('webrtc:answer', async ({ senderSocketId, answer }) => {
      const pc = peersRef.current[senderSocketId];
      if (pc) {
        try {
          await handleAnswer(pc, answer);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    });

    socket.on('webrtc:ice-candidate', async ({ senderSocketId, candidate }) => {
      const pc = peersRef.current[senderSocketId];
      if (pc) {
        try {
          await handleIceCandidate(pc, candidate);
        } catch (err) {
          console.error('Error handling ICE candidate:', err);
        }
      }
    });

    // ─── Screen Share ───

    socket.on('stream:started', ({ socketId }) => {
      setScreenSharerSocketId(socketId);
      updateParticipant(socketId, { isScreenSharing: true });
    });

    socket.on('stream:stopped', ({ socketId }) => {
      if (socketId === useRoomStore.getState().screenSharerSocketId) {
        setRemoteScreenStream(null);
        setScreenSharerSocketId(null);
      }
      updateParticipant(socketId, { isScreenSharing: false });
    });

    // ─── Playback Sync ───

    socket.on('playback:sync', (state) => {
      setPlaybackState(state);
    });

    // ─── Chat ───

    socket.on('chat:message', (msg) => {
      addMessage(msg);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createPeerForUser = useCallback((socket, targetSocketId, initiator = true) => {
    const pc = createPeerConnection({
      socket,
      targetSocketId,
      localStream: localStreamRef.current,
      screenStream: screenStreamRef.current,
      onRemoteStream: (sid, stream) => {
        addRemoteStream(sid, stream);
      },
      onRemoteScreenStream: (sid, stream) => {
        setRemoteScreenStream(stream);
        setScreenSharerSocketId(sid);
      },
    });

    setPeer(targetSocketId, pc);
    peersRef.current[targetSocketId] = pc;

    if (initiator) {
      createOffer(pc, socket, targetSocketId);
    }

    return pc;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initLocalMedia = useCallback(async (socket) => {
    let stream = null;

    // 1. Try audio + video
    {
      const result = await getUserMedia({ audio: true, video: true });
      if (result.stream) {
        stream = result.stream;
        setIsCameraOff(false);
        setIsMuted(false);
      } else if (result.error?.name === 'NotAllowedError' || result.error?.name === 'PermissionDeniedError') {
        // Permissions denied for everything
        setMediaError('denied');
      } else {
        // Camera may not exist — retry with audio only
        const audioResult = await getUserMedia({ audio: true, video: false });
        if (audioResult.stream) {
          stream = audioResult.stream;
          setIsCameraOff(true);
          setIsMuted(false);
        } else if (audioResult.error?.name === 'NotAllowedError' || audioResult.error?.name === 'PermissionDeniedError') {
          setMediaError('denied');
        } else {
          setMediaError('unavailable');
        }
      }
    }

    if (stream) {
      setLocalStream(stream);
      localStreamRef.current = stream;
    }

    // Connect to existing participants regardless of media state
    const currentRoom = useRoomStore.getState().room;
    if (currentRoom) {
      currentRoom.participants.forEach((p) => {
        if (p.socketId !== socket.id) {
          createPeerForUser(socket, p.socketId, true);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cleanup = useCallback((socket) => {
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());

    // Close all peer connections
    Object.values(peersRef.current).forEach((pc) => pc.close());

    // Remove listeners
    socket.off('room:user-joined');
    socket.off('room:user-left');
    socket.off('room:new-host');
    socket.off('room:kicked');
    socket.off('host:muted-you');
    socket.off('participant:updated');
    socket.off('webrtc:offer');
    socket.off('webrtc:answer');
    socket.off('webrtc:ice-candidate');
    socket.off('stream:started');
    socket.off('stream:stopped');
    socket.off('playback:sync');
    socket.off('chat:message');

    socket.emit('room:leave');
    reset();
  }, [reset]);

  // ─── Media Controls ───

  const toggleMute = useCallback(() => {
    if (localStream) {
      const newMuted = !isMuted;
      localStream.getAudioTracks().forEach((t) => (t.enabled = !newMuted));
      setIsMuted(newMuted);
      getSocket().emit('participant:toggle-audio', { isMuted: newMuted });
    }
  }, [localStream, isMuted, setIsMuted]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const newOff = !isCameraOff;
      localStream.getVideoTracks().forEach((t) => (t.enabled = !newOff));
      setIsCameraOff(newOff);
      getSocket().emit('participant:toggle-video', { isCameraOff: newOff });
    }
  }, [localStream, isCameraOff, setIsCameraOff]);

  const toggleScreenShare = useCallback(async () => {
    const socket = getSocket();

    if (isScreenSharing) {
      // Stop sharing
      screenStream?.getTracks().forEach((t) => t.stop());
      setScreenStream(null);
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      socket.emit('stream:stop');

      // Renegotiate with peers — remove screen tracks
      // For simplicity, we'll recreate peer connections
      renegotiateAllPeers(socket);
    } else {
      // Start sharing
      const stream = await getDisplayMedia();
      if (!stream) return;

      setScreenStream(stream);
      screenStreamRef.current = stream;
      setIsScreenSharing(true);
      socket.emit('stream:start');

      // Handle user stopping via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        screenStreamRef.current = null;
        setIsScreenSharing(false);
        socket.emit('stream:stop');
        renegotiateAllPeers(socket);
      };

      // Renegotiate with peers — add screen tracks
      renegotiateAllPeers(socket);
    }
  }, [isScreenSharing, screenStream, setScreenStream, setIsScreenSharing]);

  const renegotiateAllPeers = useCallback((socket) => {
    const currentRoom = useRoomStore.getState().room;
    if (!currentRoom) return;

    // Close old peers
    Object.values(peersRef.current).forEach((pc) => pc.close());
    peersRef.current = {};

    // Recreate peers
    currentRoom.participants.forEach((p) => {
      if (p.socketId !== socket.id) {
        createPeerForUser(socket, p.socketId, true);
      }
    });
  }, [createPeerForUser]);

  const leaveRoom = useCallback(() => {
    const socket = getSocket();
    cleanup(socket);
    navigate('/');
  }, [cleanup, navigate]);

  const retryMedia = useCallback(() => {
    setMediaError(null);
    const socket = getSocket();
    initLocalMedia(socket);
  }, [initLocalMedia]);

  // Handle device change from DeviceSettings panel
  const handleDeviceChange = useCallback(({ type, newStream }) => {
    if ((type === 'mic' || type === 'camera') && newStream) {
      // Update the ref immediately so WebRTC callbacks use the new stream
      localStreamRef.current = newStream;
      // Update store — newStream is a real MediaStream so this is safe
      setLocalStream(newStream);
    }
  }, [setLocalStream]);

  // ─── Host Playback Controls ───

  const sendPlaybackUpdate = useCallback((state) => {
    if (!isHost) return;
    getSocket().emit('playback:update', state);
  }, [isHost]);

  if (!room) return null;

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden">
      {/* Header */}
      <RoomHeader
        room={room}
        isHost={isHost}
        onToggleChat={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
        onToggleHostControls={() => setShowHostControls(!showHostControls)}
        showHostControls={showHostControls}
      />

      {/* Media permission error banner */}
      {mediaError && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2.5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300 flex-1">
            {mediaError === 'denied'
              ? 'Microphone/camera access was denied. Click your browser\'s address bar lock icon → allow camera & microphone, then retry.'
              : 'No microphone or camera detected. Check your device connections and retry.'}
          </p>
          <button
            onClick={retryMedia}
            className="flex items-center gap-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-xs px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main Video + Participants */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Video Area */}
          <div className="flex-1 p-3 pb-0">
            <MainVideo
              screenStream={isScreenSharing ? screenStream : remoteScreenStream}
              isHostSharing={isScreenSharing}
              screenSharerSocketId={screenSharerSocketId}
              room={room}
            />
          </div>

          {/* Participant Video Grid */}
          <div className="px-3 py-2">
            <ParticipantGrid
              participants={room.participants}
              localStream={localStream}
              remoteStreams={remoteStreams}
              mySocketId={mySocketId}
              isHost={isHost}
            />
          </div>
        </div>

        {/* Right: Chat Panel */}
        {chatOpen && (
          <div className="w-80 border-l border-surface-800 flex flex-col">
            <ChatPanel messages={useRoomStore.getState().messages} />
          </div>
        )}
      </div>

      {/* Host Controls Panel */}
      {showHostControls && isHost && (
        <HostControls
          room={room}
          mySocketId={mySocketId}
          onClose={() => setShowHostControls(false)}
          sendPlaybackUpdate={sendPlaybackUpdate}
        />
      )}

      {/* Control Bar */}
      <ControlBar
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        isHost={isHost}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onLeave={leaveRoom}
        onOpenSettings={() => setShowDeviceSettings(true)}
      />

      {/* Device Settings Modal */}
      {showDeviceSettings && (
        <DeviceSettings
          onClose={() => setShowDeviceSettings(false)}
          localStream={localStream}
          peers={peers}
          onDeviceChange={handleDeviceChange}
        />
      )}

      {/* Support Bot */}
      <SupportBot />
    </div>
  );
}
