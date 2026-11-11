import React, { useState } from 'react';
import { Radio, Users, Smartphone, Swords } from 'lucide-react';
import { ArielDashboardSnapshot, isTiktokActivelyLive } from '../utils/arielState';

interface LiveAnalyticsProps {
  snapshot: ArielDashboardSnapshot;
  className?: string;
}

export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({
  snapshot,
  className = '',
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const isLive = isTiktokActivelyLive(snapshot.tiktok);
  const liveOpponentsCount = snapshot.roster.filter((r) => r.alive).length;
  const realViewers = snapshot.tiktok.viewers ?? 0;

  return (
    <div className={`relative flex items-center select-none font-['Heebo',sans-serif] ${className}`}>
      <button
        type="button"
        onClick={() => setShowDetails((prev) => !prev)}
        className="flex items-center gap-2 sm:gap-3 px-3 py-1.5 bg-[#17130f] hover:bg-[#1f180f] border border-[#3a2f22] hover:border-[#d9a441] rounded-full shadow-md transition-all cursor-pointer text-xs"
        title="סטטוס חיבור אמיתי לטיקטוק ולשרת ARIEL"
      >
        {/* 1. Real TikTok Broadcast Connection Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-extrabold text-[11px] ${
            isLive
              ? 'bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/40'
              : 'bg-[#1f180f] text-[#a8957a] border border-[#3a2f22]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isLive ? 'bg-[#2ecc71] animate-pulse' : 'bg-[#777]'
            }`}
          />
          <span>{isLive ? 'LIVE מחובר' : 'לא בלייב'}</span>
        </span>

        {/* 2. Monitored TikTok Handle */}
        {snapshot.tiktok.user && (
          <span dir="ltr" className="font-mono font-bold text-[#f3e7d3] hidden sm:inline">
            @{snapshot.tiktok.user}
          </span>
        )}

        {/* 3. Real Viewers (only shown when actively reported) */}
        {isLive && (
          <span className="inline-flex items-center gap-1 text-[#f3e7d3] font-bold">
            <Users className="w-3.5 h-3.5 text-[#d9a441]" />
            <span className="font-mono">{realViewers}</span>
          </span>
        )}

        {/* 4. Real Opponents Currently Streaming on TikTok */}
        <span
          className="hidden md:inline-flex items-center gap-1 text-[#d9a441] font-bold"
          title="יריבים מהרשימה שנמצאים בלייב בטיקטוק עכשיו"
        >
          <Swords className="w-3.5 h-3.5" />
          <span>{liveOpponentsCount} יריבים בלייב</span>
        </span>

        {/* 5. Real Cloudphone Cast Indicator */}
        <span
          className={`hidden lg:inline-flex items-center gap-1 font-bold ${
            snapshot.cloud.on ? 'text-[#2ecc71]' : 'text-[#a8957a]'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{snapshot.cloud.on ? 'משדר לטלפון' : 'ענן כבוי'}</span>
        </span>
      </button>

      {showDetails && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 right-0 z-50 w-72 bg-[#17130f] border border-[#3a2f22] rounded-2xl p-3.5 shadow-2xl text-right space-y-2.5 text-xs"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#3a2f22]">
            <span className="font-extrabold text-[#d9a441] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              סטטוס אמת מהשרת (ללא הדמיה)
            </span>
          </div>

          <div className="space-y-1.5 text-[#f3e7d3]">
            <div className="flex justify-between gap-2">
              <span className="text-[#a8957a]">משתמש מנוטר:</span>
              <span dir="ltr" className="font-mono font-bold">
                @{snapshot.tiktok.user || '—'}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 pt-1 border-t border-[#3a2f22]/60">
              <span className="text-[#a8957a]">מצב TikTok חי:</span>
              <span className="font-mono text-[11px] text-[#f3e7d3] break-words">
                {snapshot.tiktok.status || 'לא מחובר'}
              </span>
            </div>
            <div className="flex justify-between gap-2 pt-1 border-t border-[#3a2f22]/60">
              <span className="text-[#a8957a]">שידור לטלפון בענן:</span>
              <span className="font-bold">
                {snapshot.cloud.state === 'live'
                  ? '🟢 פעיל'
                  : snapshot.cloud.on
                  ? 'מתחבר…'
                  : 'כבוי'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#a8957a]">סרטוני יריבים בשרת:</span>
              <span className="font-mono font-bold">{snapshot.overlays.length}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#a8957a]">יריבים בלייב כרגע:</span>
              <span className="font-mono font-bold text-[#2ecc71]">
                {liveOpponentsCount} / {snapshot.roster.length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDetails(false)}
            className="w-full py-1.5 text-center font-bold text-[#1a1208] bg-[#d9a441] rounded-lg cursor-pointer"
          >
            סגור
          </button>
        </div>
      )}
    </div>
  );
};
