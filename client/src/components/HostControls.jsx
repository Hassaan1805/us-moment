import { getSocket } from '../lib/socket';
import { X, UserMinus, MicOff, Crown, Play, Pause, SkipForward } from 'lucide-react';
import useRoomStore from '../store/useRoomStore';

export default function HostControls({ room, mySocketId, onClose, sendPlaybackUpdate }) {
  const playbackState = useRoomStore((s) => s.playbackState);

  const kickUser = (socketId) => {
    if (socketId === mySocketId) return;
    if (confirm('Remove this participant?')) {
      getSocket().emit('host:kick', { targetSocketId: socketId });
    }
  };

  const muteUser = (socketId) => {
    if (socketId === mySocketId) return;
    getSocket().emit('host:mute-user', { targetSocketId: socketId });
  };

  const togglePlay = () => {
    sendPlaybackUpdate({ playing: !playbackState.playing });
  };

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 glass-panel p-5 w-[420px] max-h-[60vh] overflow-y-auto z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" />
          Host Controls
        </h3>
        <button onClick={onClose} className="text-surface-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Playback Controls */}
      <div className="mb-5">
        <h4 className="text-xs text-surface-400 uppercase tracking-wider mb-2">Playback Sync</h4>
        <div className="flex items-center gap-2">
          <button onClick={togglePlay} className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
            {playbackState.playing ? (
              <>
                <Pause className="w-4 h-4" /> Pause All
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Play All
              </>
            )}
          </button>
          <button
            onClick={() => sendPlaybackUpdate({ timestamp: 0, playing: false })}
            className="btn-secondary flex items-center gap-2 text-sm py-2 px-4"
          >
            <SkipForward className="w-4 h-4" /> Reset
          </button>
        </div>
        <p className="text-xs text-surface-500 mt-2">
          These controls sync playback state to all participants.
        </p>
      </div>

      {/* Participants */}
      <div>
        <h4 className="text-xs text-surface-400 uppercase tracking-wider mb-2">
          Participants ({room.participants.length})
        </h4>
        <div className="space-y-2">
          {room.participants.map((p) => (
            <div
              key={p.socketId}
              className="flex items-center justify-between bg-surface-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                  {p.nickname?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm text-white truncate">{p.nickname}</span>
                {p.isHost && <Crown className="w-3 h-3 text-yellow-400 flex-shrink-0" />}
              </div>

              {p.socketId !== mySocketId && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => muteUser(p.socketId)}
                    className="w-7 h-7 rounded-md bg-surface-700 hover:bg-surface-600 flex items-center justify-center transition-colors"
                    title="Mute"
                  >
                    <MicOff className="w-3.5 h-3.5 text-surface-300" />
                  </button>
                  <button
                    onClick={() => kickUser(p.socketId)}
                    className="w-7 h-7 rounded-md bg-red-600/20 hover:bg-red-600/40 flex items-center justify-center transition-colors"
                    title="Kick"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
