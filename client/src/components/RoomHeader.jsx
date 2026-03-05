import {
  Tv,
  Users,
  MessageSquare,
  Copy,
  Check,
  Crown,
  Settings,
} from 'lucide-react';
import { useState } from 'react';

export default function RoomHeader({ room, isHost, onToggleChat, chatOpen, onToggleHostControls, showHostControls }) {
  const [copied, setCopied] = useState(false);

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join/${room.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-surface-900/90 backdrop-blur-xl border-b border-surface-800 px-4 py-2.5 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center">
          <Tv className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white hidden sm:block">us-moment</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-surface-700" />

      {/* Room info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-white truncate">{room.name}</h2>
          <div className="flex items-center gap-2 text-xs text-surface-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {room.participants.length}
            </span>
            <span>•</span>
            <span>ID: {room.id}</span>
            {isHost && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-yellow-400">
                  <Crown className="w-3 h-3" /> Host
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={copyInviteLink}
          className="flex items-center gap-1.5 bg-surface-800 hover:bg-surface-700 px-3 py-1.5 rounded-lg transition-colors text-sm"
          title="Copy invite link"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-surface-400" />
          )}
          <span className="text-surface-300 hidden sm:block">{copied ? 'Copied!' : 'Invite'}</span>
        </button>

        {isHost && (
          <button
            onClick={onToggleHostControls}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${
              showHostControls
                ? 'bg-primary-600 text-white'
                : 'bg-surface-800 hover:bg-surface-700 text-surface-300'
            }`}
            title="Host controls"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Controls</span>
          </button>
        )}

        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${
            chatOpen
              ? 'bg-primary-600 text-white'
              : 'bg-surface-800 hover:bg-surface-700 text-surface-300'
          }`}
          title="Toggle chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:block">Chat</span>
        </button>
      </div>
    </div>
  );
}
