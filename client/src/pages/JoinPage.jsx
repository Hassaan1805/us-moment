import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../lib/socket';
import useRoomStore from '../store/useRoomStore';
import { Tv, Lock, ArrowRight } from 'lucide-react';

export default function JoinPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const { setRoom, setMySocketId, setNickname: saveNickname, setIsHost, setMessages } = useRoomStore();

  useEffect(() => {
    const socket = connectSocket();
    const check = () => {
      socket.emit('room:check', { roomId }, (res) => {
        setLoading(false);
        if (res.exists) {
          setRoomInfo(res);
        } else {
          setError('Room not found');
        }
      });
    };
    if (socket.connected) check();
    else socket.on('connect', check);

    return () => { socket.off('connect', check); };
  }, [roomId]);

  const handleJoin = () => {
    if (!nickname.trim()) return setError('Enter a nickname');
    setJoining(true);
    setError('');

    const socket = getSocket();
    setMySocketId(socket.id);
    saveNickname(nickname.trim());

    socket.emit(
      'room:join',
      { roomId, nickname: nickname.trim(), password: password || undefined },
      (res) => {
        setJoining(false);
        if (res.success) {
          setRoom(res.room);
          setIsHost(res.room.hostId === socket.id);
          setMessages(res.room.messages || []);
          navigate(`/room/${res.room.id}`);
        } else {
          setError(res.error || 'Failed to join');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 flex items-center justify-center px-4">
      <div className="glass-panel p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Join Room</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="animate-spin w-8 h-8 border-3 border-primary-400 border-t-transparent rounded-full" />
          </div>
        ) : error && !roomInfo ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="btn-secondary">
              Go Home
            </button>
          </div>
        ) : (
          <>
            <div className="bg-surface-800 rounded-xl p-4 mb-6">
              <p className="text-surface-400 text-sm">Room</p>
              <p className="text-white font-medium text-lg">{roomInfo?.name || roomId}</p>
              <p className="text-surface-400 text-sm mt-1">
                {roomInfo?.participantCount || 0} participant(s)
                {roomInfo?.hasPassword && (
                  <span className="inline-flex items-center gap-1 ml-2 text-yellow-400">
                    <Lock className="w-3 h-3" /> Password Protected
                  </span>
                )}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-surface-400 mb-1.5">Your Nickname</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your nickname..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
              />
            </div>

            {roomInfo?.hasPassword && (
              <div className="mb-6">
                <label className="block text-sm text-surface-400 mb-1.5">Room Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Enter room password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button onClick={handleJoin} disabled={joining} className="btn-primary w-full flex items-center justify-center gap-2">
              {joining ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Join Room <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {error && <p className="mt-4 text-red-400 text-sm text-center">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
