import { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { getSocket } from '../lib/socket';
import useRoomStore from '../store/useRoomStore';
import clsx from 'clsx';

export default function ChatPanel() {
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);
  const messages = useRoomStore((s) => s.messages);
  const mySocketId = useRoomStore((s) => s.mySocketId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    getSocket().emit('chat:message', { text: trimmed });
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-800 flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary-400" />
        <span className="text-sm font-medium text-white">Chat</span>
        <span className="text-xs text-surface-500 ml-auto">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-500">
            <MessageCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs text-surface-600">Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === mySocketId;
            return (
              <div
                key={msg.id}
                className={clsx('flex flex-col', isMe ? 'items-end' : 'items-start')}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={clsx('text-xs font-medium', isMe ? 'text-primary-400' : 'text-surface-400')}>
                    {isMe ? 'You' : msg.senderName}
                  </span>
                  <span className="text-xs text-surface-600">{formatTime(msg.timestamp)}</span>
                </div>
                <div
                  className={clsx(
                    'max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words',
                    isMe
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-surface-800 text-surface-200 rounded-bl-md'
                  )}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-surface-800">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="btn-icon bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 w-10 h-10"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
