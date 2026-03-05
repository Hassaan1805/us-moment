import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  PhoneOff,
  Settings,
} from 'lucide-react';
import clsx from 'clsx';

export default function ControlBar({
  isMuted,
  isCameraOff,
  isScreenSharing,
  isHost,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onLeave,
  onOpenSettings,
}) {
  return (
    <div className="bg-surface-900/90 backdrop-blur-xl border-t border-surface-800 px-6 py-3">
      <div className="flex items-center justify-center gap-3">
        {/* Mic */}
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
