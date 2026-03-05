import { useEffect, useRef, useState } from 'react';
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * MicLevel — small animated bars showing real-time microphone level.
 * Doubles as a "mic test" indicator: if the bars move, your mic is working.
 */
function MicLevel({ stream, isMuted }) {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const ctxRef = useRef(null);

  useEffect(() => {
    if (!stream || isMuted) {
      setLevel(0);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return;

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      ctxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.slice(0, 20).reduce((s, v) => s + v, 0) / 20;
        setLevel(Math.min(1, avg / 90)); // normalize 0‑1
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      // AudioContext not available (e.g. server-side)
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      ctxRef.current?.close().catch(() => {});
    };
  }, [stream, isMuted]);

  // 3 bars of increasing height
  const bars = [0.5, 1, 0.7];
  return (
    <div className="flex items-end gap-[2px] h-3">
      {bars.map((maxH, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-green-400 transition-all duration-75"
          style={{ height: `${Math.max(2, level * maxH * 12)}px`, opacity: level > 0.05 ? 1 : 0.25 }}
        />
      ))}
    </div>
  );
}

export default function ControlBar({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHost,
  localStream,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onOpenSettings,
}) {
  return (
    <div className="bg-surface-900/90 backdrop-blur-xl border-t border-surface-800 px-6 py-3">
      <div className="flex items-center justify-center gap-3">
        {/* Mic + live level indicator */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onToggleMute}
            className={clsx(
              'btn-icon',
              isMuted
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-surface-700 hover:bg-surface-600 text-white'
            )}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <MicLevel stream={localStream} isMuted={isMuted} />
        </div>

        {/* Camera */}
        <button
          onClick={onToggleCamera}
          className={clsx(
            'btn-icon',
            isCameraOff
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-surface-700 hover:bg-surface-600 text-white'
          )}
          title={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={clsx(
            'btn-icon',
            isScreenSharing
              ? 'bg-primary-600 hover:bg-primary-700 text-white ring-2 ring-primary-400'
              : 'bg-surface-700 hover:bg-surface-600 text-white'
          )}
          title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        >
          {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-700 mx-1" />

        {/* Device Settings */}
        <button
          onClick={onOpenSettings}
          className="btn-icon bg-surface-700 hover:bg-surface-600 text-white"
          title="Audio & video settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-surface-700 mx-1" />

        {/* Leave */}
        <button
          onClick={onLeave}
          className="btn-icon bg-red-600 hover:bg-red-700 text-white"
          title="Leave room"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
