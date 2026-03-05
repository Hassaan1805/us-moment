import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket } from '../lib/socket';
import useRoomStore from '../store/useRoomStore';
import {
  Play,
  Users,
  Monitor,
  MessageCircle,
  Tv,
  ArrowRight,
  Link2,
} from 'lucide-react';
import SupportBot from '../components/SupportBot';

export default function HomePage() {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [activeTab, setActiveTab] = useState('create');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { setRoom, setMySocketId, setNickname: saveNickname, setIsHost, setMessages } = useRoomStore();

  const handleCreate = () => {
    if (!nickname.trim()) return setError('Enter a nickname');
    setLoading(true);
    setError('');

    const socket = connectSocket();

    const doCreate = () => {
      setMySocketId(socket.id);
      saveNickname(nickname.trim());
      socket.emit(
        'room:create',
        { name: roomName.trim() || undefined, password: password || undefined, nickname: nickname.trim() },
        (res) => {
          setLoading(false);
          if (res.success) {
            setRoom(res.room);
            setIsHost(true);
            setMessages(res.room.messages || []);
            navigate(`/room/${res.room.id}`);
          } else {
            setError(res.error || 'Failed to create room');
          }
        }
      );
    };

    if (socket.connected) {
      doCreate();
    } else {
      socket.once('connect', doCreate);
    }
  };

  const handleJoin = () => {
    if (!nickname.trim()) return setError('Enter a nickname');
    if (!joinRoomId.trim()) return setError('Enter a room ID');
    setLoading(true);
    setError('');

    const socket = connectSocket();

    const doJoin = () => {
      setMySocketId(socket.id);
      saveNickname(nickname.trim());
      socket.emit(
        'room:join',
        { roomId: joinRoomId.trim(), nickname: nickname.trim(), password: joinPassword || undefined },
        (res) => {
          setLoading(false);
          if (res.success) {
            setRoom(res.room);
            setIsHost(res.room.hostId === socket.id);
            setMessages(res.room.messages || []);
            navigate(`/room/${res.room.id}`);
          } else {
            setError(res.error || 'Failed to join room');
          }
        }
      );
    };

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Tv className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
            us-moment
          </h1>
        </div>
        <p className="text-surface-400 text-lg mb-10">Watch movies together, in real time.</p>

        {/* Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-2xl w-full">
          {[
            { icon: Monitor, label: 'Screen Share' },
            { icon: Users, label: 'Video Chat' },
            { icon: Play, label: 'Synced Playback' },
            { icon: MessageCircle, label: 'Live Chat' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="glass-panel p-4 flex flex-col items-center gap-2 hover:border-primary-500/30 transition-colors"
            >
              <Icon className="w-6 h-6 text-primary-400" />
              <span className="text-sm text-surface-300">{label}</span>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-panel p-8 max-w-md w-full">
          {/* Tabs */}
          <div className="flex gap-1 bg-surface-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setActiveTab('create'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'create'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              Create Room
            </button>
            <button
              onClick={() => { setActiveTab('join'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'join'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              Join Room
            </button>
          </div>

          {/* Nickname */}
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

          {activeTab === 'create' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm text-surface-400 mb-1.5">Room Name (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Movie Night 🎬"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={40}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-surface-400 mb-1.5">Password (optional)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Set a room password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button onClick={handleCreate} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Create Room <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm text-surface-400 mb-1.5">Room ID</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter room ID..."
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm text-surface-400 mb-1.5">Password (if required)</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Room password..."
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />
              </div>
              <button onClick={handleJoin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? (
                  <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Join Room <Link2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {error && (
            <p className="mt-4 text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 text-surface-500 text-sm">
        us-moment — Because movies are better together.
      </footer>

      {/* Support Bot */}
      <SupportBot />
    </div>
  );
}
