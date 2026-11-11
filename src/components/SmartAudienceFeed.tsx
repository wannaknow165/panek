import React, { useEffect, useRef } from 'react';
import { Gift, Heart, MessageCircle, Swords, UserPlus } from 'lucide-react';
import { RealLiveChatEvent } from '../utils/arielState';

interface SmartAudienceFeedProps {
  events: RealLiveChatEvent[];
  tiktokStatusText?: string;
  isLiveConnected?: boolean;
}

export const SmartAudienceFeed: React.FC<SmartAudienceFeedProps> = ({
  events,
  tiktokStatusText,
  isLiveConnected = false,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [events]);

  return (
    <section
      aria-label="אירועי צ׳אט אמיתיים מטיקטוק"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="relative w-full flex flex-col gap-1.5 pointer-events-auto select-none"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-300 px-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              isLiveConnected ? 'bg-[#16A34A]' : 'bg-slate-500'
            }`}
          />
          <span className="font-semibold truncate">
            {isLiveConnected ? 'צ׳אט טיקטוק חי' : 'צ׳אט טיקטוק (לא בשידור כרגע)'}
          </span>
        </div>
        <span className="tabular-nums text-slate-400 shrink-0">
          {events.length} אירועים
        </span>
      </div>

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto py-1"
      >
        {events.length === 0 ? (
          <div className="px-3 py-2 rounded-lg bg-[#121721]/85 border border-slate-800 text-[11px] text-slate-400 leading-snug">
            {tiktokStatusText
              ? `מצב חיבור: ${tiktokStatusText}`
              : 'ממתין להודעות ומתנות אמיתיות מטיקטוק LIVE…'}
          </div>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="self-start flex items-center gap-1.5 max-w-[94%] px-2.5 py-1 rounded-lg bg-[#121721]/90 border border-slate-800 text-[11.5px] text-slate-100"
            >
              {ev.kind === 'gift' && <Gift className="w-3.5 h-3.5 text-[#E5B34B] shrink-0" />}
              {ev.kind === 'like' && (
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
              )}
              {ev.kind === 'join' && <UserPlus className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />}
              {ev.kind === 'battle' && <Swords className="w-3.5 h-3.5 text-[#E5B34B] shrink-0" />}
              {ev.kind === 'chat' && (
                <MessageCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )}
              <span className="font-bold text-[#E5B34B] shrink-0">{ev.nickname}:</span>
              <span className="text-slate-200 break-words">{ev.text}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
