import { useRef, useEffect } from 'react';
import { MonitorOff, Monitor } from 'lucide-react';

export default function MainVideo({ screenStream, isHostSharing, screenSharerSocketId, room }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      if (screenStream) {
        videoRef.current.srcObject = screenStream;
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  const sharerName = screenSharerSocketId
    ? room?.participants?.find((p) => p.socketId === screenSharerSocketId)?.nickname
    : null;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-surface-900 border border-surface-800 relative flex items-center justify-center">
      {screenStream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain bg-black"
          />
          {sharerName && (
            <div className="absolute top-3 left-3 bg-surface-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary-400" />
              <span className="text-sm text-white">{isHostSharing ? 'You are sharing' : `${sharerName} is sharing`}</span>
            </div>
          )}
          <div className="absolute bottom-3 left-3 bg-red-600/90 px-3 py-1 rounded-lg">
            <span className="text-xs font-medium text-white flex items-center gap-1.5">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 text-surface-500">
          <MonitorOff className="w-16 h-16" />
          <div className="text-center">
            <p className="text-lg font-medium">No one is sharing their screen</p>
            <p className="text-sm text-surface-600 mt-1">
              The host can start sharing to begin the watch party
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
