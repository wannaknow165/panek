import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Share2,
  Gift,
  Smile,
  Send,
  MoreVertical,
  ChevronLeft,
  Circle,
  Square,
  Sparkles,
  Wifi,
  Radio,
} from 'lucide-react';
import { CloudphoneConfig, LiveChatMessage, FloatingHeart } from '../types/studio';
import { normalizeTouch, formatAdbTap, formatAdbSwipe, formatAdbKeyevent, ADB_KEY_CODES } from '../utils/touchCoordinates';
import { studioAudio } from '../utils/audioSynthesizer';

interface CloudphoneRemoteViewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cloudConfig: CloudphoneConfig;
  onSendAdbCommand?: (command: string) => void;
}

interface TouchRipple {
  id: string;
  x: number;
  y: number;
  androidX: number;
  androidY: number;
}

export const CloudphoneRemoteView: React.FC<CloudphoneRemoteViewProps> = ({
  canvasRef,
  cloudConfig,
  onSendAdbCommand,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 60 FPS Continuous Virtual Camera Mirror Loop
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      const mirror = mirrorCanvasRef.current;
      const src = canvasRef.current;
      if (mirror && src) {
        const ctx = mirror.getContext('2d');
        if (ctx) {
          ctx.drawImage(src, 0, 0, mirror.width, mirror.height);
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef]);

  // Likes & Hearts
  const [likesCount, setLikesCount] = useState<number>(42890);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // Remote Touch Ripples
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const [lastAdbCommand, setLastAdbCommand] = useState<string>('input tap 540 960');
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Live Chat Stream
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([
    { id: '1', user: 'איתי לוי', avatar: '🦁', message: 'יאללה תן עוד אגרוף קומיקס!!', color: '#ffbe0b', timestamp: Date.now() },
    { id: '2', user: 'Maya_Gaming', avatar: '🎮', message: 'וואו האפקטים מטורפים לגמרי!', color: '#00f2fe', timestamp: Date.now() },
    { id: '3', user: 'רועי כהן', avatar: '⚡', message: 'שלחתי לך כוכבים ✨', gift: { name: 'כוכב טיקטוק', icon: '⭐', count: 10 }, color: '#fe2c55', timestamp: Date.now() },
    { id: '4', user: 'Daniel_Pro', avatar: '👑', message: 'איזה איכות שידור חדה בענן!', color: '#a0c4ff', timestamp: Date.now() },
  ]);

  // Automated Chat Stream
  useEffect(() => {
    const sampleComments: { user: string; avatar: string; message: string; gift?: { name: string; icon: string; count: number } }[] = [
      { user: 'נועה ברק', avatar: '🌸', message: 'תעשה עוד פעם ראש ענק חחח 😂' },
      { user: 'Alex_LIVE', avatar: '🔥', message: 'SUPER PUNCH COMBO!! 🥊' },
      { user: 'שירן א.', avatar: '💎', message: 'מתנה מיוחדת בשבילך!', gift: { name: 'גלקסי טיקטוק', icon: '🌌', count: 1 } },
      { user: 'יוסי_VIP', avatar: '🚀', message: 'שבר את הלייבבב!' },
      { user: 'Tal_Gaming', avatar: '⚡', message: 'הלייזרים בעיניים פשוט מטורף 🤩' },
      { user: 'Dana_99', avatar: '🌹', message: 'ורד לסטרימר האלוף!', gift: { name: 'ורד', icon: '🌹', count: 5 } },
    ];

    const interval = setInterval(() => {
      const randomComment = sampleComments[Math.floor(Math.random() * sampleComments.length)];
      setChatMessages((prev) => [
        ...prev.slice(-12),
        {
          id: Math.random().toString(),
          user: randomComment.user,
          avatar: randomComment.avatar,
          message: randomComment.message,
          gift: randomComment.gift,
          color: ['#00f2fe', '#fe2c55', '#ffd166', '#06d6a0', '#ff9f1c'][Math.floor(Math.random() * 5)],
          timestamp: Date.now(),
        },
      ]);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Handle Touch & Tap events on Cloudphone Screen
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const { normX, normY, androidX, androidY } = normalizeTouch(e.clientX, e.clientY, rect);

    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };

    // Emit Tap
    const cmd = formatAdbTap(androidX, androidY);
    setLastAdbCommand(cmd);
    onSendAdbCommand?.(cmd);

    // Spawn Touch Ripple
    const rippleId = Math.random().toString();
    setRipples((prev) => [...prev.slice(-4), { id: rippleId, x: e.clientX - rect.left, y: e.clientY - rect.top, androidX, androidY }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 600);

    // Spawn Floating Hearts
    setLikesCount((prev) => prev + 1);
    const heartColors = ['#fe2c55', '#ff007f', '#00f2fe', '#ffbe0b', '#ffffff'];
    const heartId = Math.random().toString();
    setFloatingHearts((prev) => [
      ...prev.slice(-10),
      {
        id: heartId,
        x: e.clientX - rect.left + (Math.random() - 0.5) * 30,
        y: e.clientY - rect.top,
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        scale: 0.8 + Math.random() * 0.6,
        rotation: (Math.random() - 0.5) * 40,
      },
    ]);

    setTimeout(() => {
      setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
    }, 1600);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !touchStartRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const duration = Math.max(100, Math.min(1000, Date.now() - touchStartRef.current.time));

    // If swipe gesture detected (> 40px movement)
    if (Math.hypot(dx, dy) > 40) {
      const start = normalizeTouch(touchStartRef.current.x, touchStartRef.current.y, rect);
      const end = normalizeTouch(e.clientX, e.clientY, rect);
      const swipeCmd = formatAdbSwipe(start.androidX, start.androidY, end.androidX, end.androidY, duration);
      setLastAdbCommand(swipeCmd);
      onSendAdbCommand?.(swipeCmd);
    }

    touchStartRef.current = null;
  };

  const handleAndroidNavClick = (key: keyof typeof ADB_KEY_CODES) => {
    const code = ADB_KEY_CODES[key];
    const cmd = formatAdbKeyevent(code);
    setLastAdbCommand(cmd);
    onSendAdbCommand?.(cmd);
  };

  const handleGiftClick = (name: string, icon: string) => {
    studioAudio.playCoin();
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        user: 'אני (Host)',
        avatar: '⭐',
        message: `שלח מתנה: ${name}!`,
        gift: { name, icon, count: 1 },
        color: '#ffbe0b',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    studioAudio.playCoin();
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        user: 'אני (Host)',
        avatar: '👑',
        message: chatInput.trim(),
        color: '#00f2fe',
        timestamp: Date.now(),
      },
    ]);
    setChatInput('');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-0 md:p-3 overflow-hidden bg-[#07090e]">
      {/* Phone Frame Mockup Container */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative w-full h-full max-w-[440px] md:max-h-[880px] aspect-[9/16] rounded-none md:rounded-[40px] overflow-hidden shadow-2xl md:ring-8 md:ring-slate-800/80 bg-black flex flex-col select-none touch-none"
      >
        {/* Background Stream Layer (Mirror of the Virtual Camera Engine) */}
        <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden">
          <canvas
            ref={mirrorCanvasRef}
            width={720}
            height={1280}
            className="w-full h-full object-cover"
          />
          {/* Subtle gradient scrim for UI readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/85 pointer-events-none" />
        </div>

        {/* 1. TikTok LIVE Top Header */}
        <div className="relative z-10 flex items-center justify-between px-3 pt-3 md:pt-4 pb-2">
          {/* Host Info Capsule */}
          <div className="flex items-center gap-2 p-1 pl-2.5 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#fe2c55]">
              <div className="w-full h-full bg-gradient-to-tr from-[#fe2c55] to-[#00f2fe] flex items-center justify-center text-xs font-black text-white">
                LIVE
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[12px] font-bold text-white leading-tight">TikTok Studio IL</span>
              <span className="text-[10px] text-emerald-400 font-medium">18.4K צופים בלייב</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                studioAudio.playConfetti();
              }}
              className="px-2.5 py-1 bg-[#fe2c55] hover:bg-[#e0264b] text-white text-[11px] font-black rounded-full transition-transform active:scale-95"
            >
              + עקוב
            </button>
          </div>

          {/* Right Header Status Badges */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2.5 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white text-[11px] font-bold">
              <Radio className="w-3 h-3 text-[#fe2c55] animate-pulse" />
              <span>LIVE</span>
            </div>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Top Banner / Ranking Strip */}
        <div className="relative z-10 px-3 flex items-center justify-between text-[11px] text-white/90">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/30 to-amber-700/30 border border-amber-400/30 text-amber-300 font-bold">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>דירוג יומי: מקום #3 🏆</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-slate-300">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span className="font-mono text-[10px]">Cloudphone: 18ms</span>
          </div>
        </div>

        {/* Center Canvas Stretch Space (for tap ripples and hearts) */}
        <div className="relative flex-1 pointer-events-none">
          {/* Animated Touch Ripples */}
          {ripples.map((r) => (
            <div
              key={r.id}
              style={{ left: `${r.x}px`, top: `${r.y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
            >
              <div className="w-12 h-12 rounded-full border-2 border-[#00f2fe] bg-[#00f2fe]/20 animate-ping" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-black/80 border border-[#00f2fe] text-[9px] font-mono text-[#00f2fe] whitespace-nowrap shadow-lg">
                ADB: {r.androidX},{r.androidY}
              </div>
            </div>
          ))}

          {/* Floating Hearts Rising Upward */}
          {floatingHearts.map((h) => (
            <div
              key={h.id}
              style={{
                left: `${h.x}px`,
                top: `${h.y}px`,
                color: h.color,
                transform: `scale(${h.scale}) rotate(${h.rotation}deg)`,
              }}
              className="absolute animate-floating-heart pointer-events-none z-20"
            >
              <Heart className="w-7 h-7 fill-current drop-shadow-md" />
            </div>
          ))}
        </div>

        {/* 3. TikTok Live Chat & Gifts Stream Overlay */}
        <div className="relative z-10 px-3 pb-2 flex flex-col justify-end max-h-[220px]">
          {/* Chat Messages List (Reverse Stack) */}
          <div className="flex flex-col gap-1.5 overflow-hidden pointer-events-none">
            {chatMessages.slice(-5).map((msg) => (
              <div
                key={msg.id}
                className="flex items-start gap-1.5 max-w-[85%] px-2.5 py-1 rounded-xl bg-black/45 backdrop-blur-md border border-white/5 text-[12px] text-white animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <span className="text-base leading-none">{msg.avatar}</span>
                <div className="flex flex-col text-right">
                  <span className="font-bold text-[11px]" style={{ color: msg.color || '#fff' }}>
                    {msg.user}:
                  </span>
                  <span className="text-slate-100 font-normal leading-snug">
                    {msg.message}
                  </span>
                  {msg.gift && (
                    <div className="flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded bg-gradient-to-r from-[#fe2c55]/30 to-[#ffbe0b]/30 border border-[#fe2c55]/40 text-[10px] text-yellow-300 font-bold">
                      <span className="text-sm">{msg.gift.icon}</span>
                      <span>שלח/ה {msg.gift.name} x{msg.gift.count}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Interactive TikTok Action Bar */}
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-white/10 pointer-events-auto">
            {/* Real Interactive Chat Input Form */}
            <form
              onSubmit={handleSendMessage}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center gap-1.5 px-3 py-1.5 bg-black/75 backdrop-blur-md rounded-full border border-white/20 text-white text-xs focus-within:border-[#00f2fe] transition-colors"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="כתוב תגובה בלייב..."
                className="w-full bg-transparent border-none outline-none text-white text-xs placeholder:text-slate-400 font-['Heebo',sans-serif]"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-1 rounded-full text-[#00f2fe] hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                title="שלח תגובה ללייב"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Quick Gift Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGiftClick('ורד אדום', '🌹');
                }}
                className="p-2 rounded-full bg-black/60 hover:bg-[#fe2c55] text-white backdrop-blur-md border border-white/15 transition-all active:scale-90"
                title="שלח ורד"
              >
                <span className="text-lg leading-none">🌹</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGiftClick('גלקסי טיקטוק', '🌌');
                }}
                className="p-2 rounded-full bg-black/60 hover:bg-[#00f2fe] text-white backdrop-blur-md border border-white/15 transition-all active:scale-90"
                title="שלח גלקסי"
              >
                <span className="text-lg leading-none">🌌</span>
              </button>

              {/* Likes Tap Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePointerDown(e as unknown as React.PointerEvent<HTMLDivElement>);
                }}
                className="relative p-2 rounded-full bg-[#fe2c55] text-white shadow-lg shadow-[#fe2c55]/30 active:scale-90 transition-transform"
                title="לייק"
              >
                <Heart className="w-5 h-5 fill-white" />
                <span className="absolute -top-1 -right-1 px-1 rounded-full bg-white text-[#fe2c55] text-[9px] font-black">
                  {likesCount > 999 ? `${(likesCount / 1000).toFixed(1)}k` : likesCount}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Android Bottom Navigation Bar (Sends Real ADB Keyevents!) */}
        <div className="relative z-20 flex items-center justify-around py-2.5 bg-black/90 border-t border-slate-800 text-slate-400 pointer-events-auto">
          {/* Back Button */}
          <button
            onClick={() => handleAndroidNavClick('BACK')}
            className="p-2 rounded-lg hover:text-white hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center"
            title="ADB Back (Keyevent 4)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Home Button */}
          <button
            onClick={() => handleAndroidNavClick('HOME')}
            className="p-2 rounded-lg hover:text-white hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center"
            title="ADB Home (Keyevent 3)"
          >
            <Circle className="w-4 h-4" />
          </button>

          {/* Recents / App Switch Button */}
          <button
            onClick={() => handleAndroidNavClick('APP_SWITCH')}
            className="p-2 rounded-lg hover:text-white hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center"
            title="ADB Recents (Keyevent 187)"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>

        {/* Live ADB Command Telemetry Badge */}
        <div className="absolute bottom-16 left-3 z-20 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-slate-700/60 text-[9px] font-mono text-emerald-400 pointer-events-none flex items-center gap-1 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{lastAdbCommand}</span>
        </div>
      </div>
    </div>
  );
};
