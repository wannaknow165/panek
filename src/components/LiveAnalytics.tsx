import React, { useState, useEffect } from 'react';
import { Users, Heart, Clock, Radio, Activity, Gem } from 'lucide-react';
import {
  formatLiveDuration,
  formatCompactNumber,
  simulateNextLiveMetrics,
  LiveMetrics,
} from '../utils/liveAnalytics';

interface LiveAnalyticsProps {
  className?: string;
  initialMetrics?: Partial<LiveMetrics>;
}

export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({
  className = '',
  initialMetrics,
}) => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    durationSeconds: initialMetrics?.durationSeconds ?? 842, // e.g. ~14 minutes in
    viewers: initialMetrics?.viewers ?? 1420,
    likes: initialMetrics?.likes ?? 38450,
    diamonds: initialMetrics?.diamonds ?? 142,
  });

  const [likePulse, setLikePulse] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Live second-by-second pulse and metrics simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics((prev) => {
        const next = simulateNextLiveMetrics(prev);
        return next;
      });
      // Trigger a gentle micro-pulse on the heart icon
      setLikePulse(true);
      const pulseTimeout = setTimeout(() => setLikePulse(false), 300);
      return () => clearTimeout(pulseTimeout);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`relative flex items-center select-none font-['Heebo',sans-serif] ${className}`}>
      {/* Main Glass Pill */}
      <div
        onClick={() => setShowDetails((prev) => !prev)}
        className="group flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-1 bg-gradient-to-r from-slate-900/90 via-slate-950/90 to-slate-900/90 hover:from-slate-800/90 hover:to-slate-900/90 border border-rose-500/30 hover:border-rose-500/50 rounded-full shadow-lg shadow-rose-950/20 backdrop-blur-md cursor-pointer transition-all active:scale-[0.98]"
        title="נתוני שידור חי (Live Analytics) - לחץ לפרטים"
      >
        {/* 1. Glowing LIVE Badge */}
        <div className="flex items-center gap-1.5 shrink-0 bg-rose-500/15 border border-rose-500/40 px-2 py-0.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-sm shadow-rose-500" />
          </span>
          <span className="text-[10px] sm:text-xs font-black tracking-wider text-rose-400 uppercase">
            LIVE
          </span>
        </div>

        {/* 2. Broadcast Duration Timer */}
        <div className="flex items-center gap-1 text-slate-300 text-[11px] sm:text-xs font-mono font-medium shrink-0">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatLiveDuration(metrics.durationSeconds)}</span>
        </div>

        <div className="w-[1px] h-3 bg-slate-800 hidden sm:block shrink-0" />

        {/* 3. Live Viewers Count */}
        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-200 shrink-0">
          <Users className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span className="font-mono text-cyan-300 font-bold">
            {formatCompactNumber(metrics.viewers)}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline font-normal">צופים</span>
        </div>

        <div className="w-[1px] h-3 bg-slate-800 hidden sm:block shrink-0" />

        {/* 4. Likes Counter with Heart Pulse Effect */}
        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-slate-200 shrink-0">
          <Heart
            className={`w-3.5 h-3.5 text-[#fe2c55] fill-[#fe2c55] transition-transform duration-200 ${
              likePulse ? 'scale-125' : 'scale-100'
            }`}
          />
          <span className="font-mono text-rose-300 font-bold">
            {formatCompactNumber(metrics.likes)}
          </span>
          <span className="text-[10px] text-slate-400 hidden md:inline font-normal">לייקים</span>
        </div>

        {/* 5. Diamonds Count (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 text-[11px] font-bold text-amber-300 shrink-0">
          <Gem className="w-3 h-3 text-amber-400" />
          <span className="font-mono">{metrics.diamonds}</span>
        </div>

        {/* Subtle Activity Wave Icon */}
        <Activity className="w-3 h-3 text-emerald-400 hidden sm:block animate-pulse shrink-0 ml-0.5" />
      </div>

      {/* Popover Card on Click */}
      {showDetails && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0 z-50 w-64 bg-slate-950/95 border border-slate-800 rounded-2xl p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-right font-['Heebo',sans-serif]"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 mb-2.5">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              מדדי שידור חי (TikTok Live)
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              יציב 60fps
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
              <span className="text-slate-400">זמן מתחילת שידור:</span>
              <span className="font-mono font-bold text-white">
                {formatLiveDuration(metrics.durationSeconds)}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
              <span className="text-slate-400">צופים נוכחיים:</span>
              <span className="font-mono font-bold text-[#00f2fe]">
                {metrics.viewers.toLocaleString('he-IL')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
              <span className="text-slate-400">סה״כ לייקים:</span>
              <span className="font-mono font-bold text-rose-400">
                {metrics.likes.toLocaleString('he-IL')}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
              <span className="text-slate-400">יהלומים ומתנות:</span>
              <span className="font-mono font-bold text-amber-300">
                {metrics.diamonds} 💎
              </span>
            </div>

            <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-900/60">
              <span className="text-slate-400">קצב זרימת לייקים:</span>
              <span className="font-mono text-emerald-400 font-bold">~18 / שנייה</span>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(false)}
            className="w-full mt-3 py-1 text-center text-[10px] font-bold text-slate-400 hover:text-white bg-slate-900/90 hover:bg-slate-800 rounded-lg border border-slate-800 transition-colors"
          >
            סגור
          </button>
        </div>
      )}
    </div>
  );
};
