import { useRef, useEffect, memo } from 'react';
import { MicOff, VideoOff, Crown } from 'lucide-react';
import clsx from 'clsx';

const VideoTile = memo(function VideoTile({ stream, nickname, isMuted, isCameraOff, isHost, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-surface-800 rounded-xl overflow-hidden border border-surface-700/50 aspect-video flex items-center justify-center group">
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={clsx('w-full h-full object-cover', isLocal && 'transform -scale-x-100')}
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center text-white text-lg font-bold">
          {nickname?.[0]?.toUpperCase() || '?'}
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          {isHost && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
          <span className="text-xs text-white font-medium truncate max-w-[100px]">
            {isLocal ? `${nickname} (You)` : nickname}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isMuted && (
            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
          {isCameraOff && (
            <div className="w-5 h-5 rounded-full bg-surface-600 flex items-center justify-center">
              <VideoOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default function ParticipantGrid({ participants, localStream, remoteStreams, mySocketId, isHost }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {participants.map((p) => {
        const isLocal = p.socketId === mySocketId;
        const stream = isLocal ? localStream : remoteStreams[p.socketId];
        // Wider tile when camera is active so video is actually visible
        const tileWidth = p.isCameraOff ? 'w-32' : 'w-52';

        return (
          <div key={p.socketId} className={`flex-shrink-0 ${tileWidth} transition-all duration-300`}>
            <VideoTile
              stream={stream}
              nickname={p.nickname}
              isMuted={p.isMuted}
              isCameraOff={p.isCameraOff}
              isHost={p.isHost}
              isLocal={isLocal}
            />
          </div>
        );
      })}
    </div>
  );
}
