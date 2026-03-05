import { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, Bot, ChevronDown, Mic, Monitor, Wifi, Video, Volume2 } from 'lucide-react';
import clsx from 'clsx';

// ─── Knowledge base ───────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: '🎤 Mic not working', key: 'mic' },
  { label: '🔊 No audio on screen share', key: 'screenaudio' },
  { label: '📷 Camera not showing', key: 'camera' },
  { label: '🔌 Can\'t connect / join', key: 'connect' },
  { label: '🔇 Others can\'t hear me', key: 'hearne' },
  { label: '🖥️ Screen share tips', key: 'screentips' },
];

const RESPONSES = {
  greeting: {
    match: /^(hi|hey|hello|sup|yo)\b/i,
    reply: `Hey! 👋 I'm the **us-moment support bot**. I can help with mic issues, screen share audio, camera problems, and connection trouble.\n\nWhat's going wrong? Pick a quick topic or just describe the issue.`,
  },
  mic: {
    match: /mic|microphone|audio input|not.*hear|hear.*me|voice|speaking/i,
    reply: `**Mic not working? Here's how to fix it:**\n\n1. Click the **⚙️ Settings** button in the control bar\n2. Under **Microphone**, select your correct device from the dropdown and hit **Apply**\n3. If it's still blank — check your browser permissions:\n   - Click the **🔒 lock icon** in the address bar\n   - Set **Microphone → Allow**\n   - Then hit the **Retry** button that appears at the top of the room\n4. Make sure you're not muted — the mic button turns red when muted\n5. Try disconnecting and reconnecting your headset/mic\n\nStill not working? Try a different browser (Chrome works best).`,
  },
  screenaudio: {
    match: /screen.*audio|audio.*screen|share.*sound|sound.*share|system.*audio|movie.*sound|no.*sound.*share|share.*no.*sound/i,
    reply: `**No audio on screen share — very common! Here's the fix:**\n\nWhen the browser asks what to share, you must:\n\n1. Choose **"Entire Screen"** or **"A Tab"** (not just a window)\n2. ✅ Make sure to check **"Share system audio"** or **"Share tab audio"** at the bottom of the picker — it's unchecked by default!\n3. If sharing a **specific app** (like VLC), system audio only works on **Windows** via "Entire Screen" mode\n\n🍎 **macOS:** System audio sharing requires macOS 13+ and may need a virtual audio driver (like BlackHole)\n\n🌐 **Netflix/YouTube tabs:** Choose **"Chrome Tab"** → tick "Share tab audio" — this works most reliably.\n\nWant me to explain any of these steps in more detail?`,
  },
  camera: {
    match: /camera|webcam|video.*not|not.*video|can't see|black screen|no video/i,
    reply: `**Camera not showing? Let's fix it:**\n\n1. Click **⚙️ Settings** → select your camera under **Camera** → hit **Apply** — the preview will show before you apply\n2. Check browser permissions:\n   - **🔒 lock icon** in address bar → **Camera → Allow**\n   - Refresh and rejoin if needed\n3. Make sure another app (Zoom, Teams, Discord) isn't hogging the camera — close them first\n4. If the preview in Settings is black, try selecting a different camera device\n5. Unplug and replug your USB webcam\n\nNote: You can still participate with mic-only if your camera isn't available — just leave camera off.`,
  },
  connect: {
    match: /connect|join|can't.*room|room.*not|disconnect|kicked|lag|freeze/i,
    reply: `**Connection issues? Try these:**\n\n1. **Hard refresh** the page: \`Ctrl+Shift+R\` (Windows) / \`Cmd+Shift+R\` (Mac)\n2. Check your internet — video calls need at least **2 Mbps upload/download**\n3. **Firewall/VPN:** WebRTC can be blocked by corporate firewalls or VPNs — try disabling your VPN\n4. If you keep disconnecting, switch from Wi-Fi to a **wired connection**\n5. Try a different browser — **Chrome or Edge** have the best WebRTC support\n6. Ask the host to share the **invite link** again\n\nIf the server is down, you'll see a connection error in the browser console (\`F12\`).`,
  },
  hearne: {
    match: /can't hear|cannot hear|hear.*others|others.*hear|no sound from|audio.*others|echo/i,
    reply: `**Others can't hear you (or you can't hear them):**\n\n**If others can't hear you:**\n- Check you're not muted (mic button = red means muted)\n- Open **⚙️ Settings** and pick the right **microphone** device\n- Make sure the mic track is active — try toggling mic off then back on\n\n**If you can't hear others:**\n- Open **⚙️ Settings** → **Speaker** → select your headphones/speakers\n- Check system volume isn't muted\n- Right-click the speaker icon in taskbar → set correct output device\n\n**Echo or feedback?**\n- Use headphones to prevent your mic picking up the speaker output\n- The host can mute you via Host Controls to stop feedback loops`,
  },
  screentips: {
    match: /screen.*tip|share.*tip|how.*share|share.*screen|screen.*share.*how/i,
    reply: `**Screen sharing tips for the best experience:**\n\n🎬 **Streaming a movie (Netflix, YouTube):**\n→ Use **"Chrome Tab"** → tick **"Share tab audio"**\n→ This gives the cleanest audio+video sync\n\n📁 **Playing a local video file (VLC, MPC):**\n→ Use **"Entire Screen"** + check **"Share system audio"** on Windows\n→ Set the video to fullscreen before sharing\n\n🖥️ **Quality tips:**\n- Close unused browser tabs and apps to free up CPU\n- Set your display to **1080p** for best quality\n- The host can adjust stream quality via the **Controls** panel\n\n⚡ **Latency tips:**\n- Viewers see a ~0.5–2 second delay — this is normal for WebRTC P2P\n- For 5+ people, performance is best when everyone uses wired internet`,
  },
  thanks: {
    match: /thank|thanks|thx|ty|helpful|great|awesome|perfect|works|fixed/i,
    reply: `Glad that helped! 🎉 Enjoy the watch party! 🍿\n\nIf anything else comes up, I'm right here.`,
  },
  fallback: `Hmm, I'm not sure about that specific issue. Here are some things to try:\n\n- **Mic/audio issues** → open ⚙️ Settings and reselect your device\n- **Screen share audio** → make sure to tick "Share system audio" in the browser share dialog\n- **Connection drops** → disable VPN, switch to Chrome, try wired internet\n\nFor anything else, try pressing \`F12\` → Console tab to see error messages and share them.`,
};

function getReply(input) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  // Check quick action keys first
  if (RESPONSES[trimmed]) {
    return RESPONSES[trimmed].reply || RESPONSES[trimmed];
  }

  // Match against patterns
  for (const [key, val] of Object.entries(RESPONSES)) {
    if (key === 'fallback') continue;
    if (val.match && val.match.test(input)) {
      return val.reply;
    }
  }

  return RESPONSES.fallback;
}

function formatMessage(text) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    // Handle newlines
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export default function SupportBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 0,
      from: 'bot',
      text: `Hey! 👋 I'm **us-moment support**. Having trouble with your mic, screen share audio, or camera? I can help!\n\nPick a topic below or type your issue.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const pushBot = (text) => {
    setMessages((m) => [...m, { id: Date.now(), from: 'bot', text }]);
    if (!open) setUnread((n) => n + 1);
  };

  const send = (overrideText) => {
    const text = overrideText ?? input.trim();
    if (!text) return;
    setInput('');

    const userMsg = { id: Date.now(), from: 'user', text };
    setMessages((m) => [...m, userMsg]);

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = getReply(text);
      if (reply) pushBot(reply);
    }, 600);
  };

  const handleQuickAction = (key) => {
    const label = QUICK_ACTIONS.find((q) => q.key === key)?.label || key;
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text: label }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply = getReply(key);
      if (reply) pushBot(reply);
    }, 500);
  };

  return (
    <>
      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 flex flex-col glass-panel shadow-2xl overflow-hidden"
          style={{ height: '520px' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary-700 to-indigo-700 border-b border-primary-600/50">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Support Bot</p>
              <p className="text-xs text-primary-200">Always here to help</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={clsx('flex gap-2', msg.from === 'user' ? 'flex-row-reverse' : 'flex-row')}>
                {msg.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={clsx(
                    'max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed',
                    msg.from === 'bot'
                      ? 'bg-surface-800 text-surface-100 rounded-tl-sm'
                      : 'bg-primary-600 text-white rounded-tr-sm'
                  )}
                >
                  {formatMessage(msg.text)}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-surface-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-2 border-t border-surface-700/50 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((q) => (
              <button
                key={q.key}
                onClick={() => handleQuickAction(q.key)}
                className="text-xs bg-surface-800 hover:bg-surface-700 text-surface-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors border border-surface-700 hover:border-primary-500/50"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-surface-700/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-surface-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Describe your issue..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'fixed bottom-20 right-4 z-50 w-13 h-13 rounded-full shadow-lg shadow-primary-500/30',
          'flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95',
          open
            ? 'bg-surface-700 hover:bg-surface-600'
            : 'bg-gradient-to-br from-primary-500 to-indigo-600 hover:from-primary-400 hover:to-indigo-500'
        )}
        style={{ width: 52, height: 52, bottom: open ? undefined : '5.5rem' }}
        title="Support"
      >
        {open ? (
          <ChevronDown className="w-5 h-5 text-white" />
        ) : (
          <MessageCircleQuestion className="w-6 h-6 text-white" />
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
