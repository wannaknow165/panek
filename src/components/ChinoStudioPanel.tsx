import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Send, Play, Volume2, VolumeX, Radio } from 'lucide-react';
import {
  ArielDashboardSnapshot,
  ChinoDirectorStatus,
  flattenPlayerClips,
  getChinoStateLabel,
  getPlayerAvatarUrl,
} from '../utils/arielState';
import { arielApi } from '../services/arielApi';

interface ChinoStudioPanelProps {
  snapshot: ArielDashboardSnapshot;
  onRefreshAll: () => Promise<void>;
  onRefreshOverlays: () => Promise<void>;
  onPushLog: (msg: string) => void;
}

export const ChinoStudioPanel: React.FC<ChinoStudioPanelProps> = ({
  snapshot,
  onRefreshAll,
  onRefreshOverlays,
  onPushLog,
}) => {
  const [director, setDirector] = useState<ChinoDirectorStatus>(snapshot.director);
  const [cloudSource, setCloudSource] = useState<'lion' | 'camera'>('camera');
  const [sayText, setSayText] = useState<string>('');
  const [hintText, setHintText] = useState<string>(snapshot.director.hint || '');
  const [searchClipQuery, setSearchClipQuery] = useState<string>('');
  const [activeRidMap, setActiveRidMap] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<string>('');

  useEffect(() => {
    setDirector(snapshot.director);
    if (snapshot.director.hint && !hintText) {
      setHintText(snapshot.director.hint);
    }
  }, [snapshot.director, hintText]);

  const pollChinoLiveStatus = useCallback(async () => {
    const [dirRes, srcRes] = await Promise.all([
      arielApi.getDirector(),
      arielApi.getCloudSource(),
    ]);
    if (dirRes) setDirector(dirRes);
    if (srcRes?.source === 'lion' || srcRes?.source === 'camera') {
      setCloudSource(srcRes.source);
    }
  }, []);

  useEffect(() => {
    pollChinoLiveStatus();
    const timer = setInterval(pollChinoLiveStatus, 4000);
    return () => clearInterval(timer);
  }, [pollChinoLiveStatus]);

  useEffect(() => {
    const entries = Object.entries(activeRidMap);
    if (entries.length === 0) return;

    const timer = setInterval(async () => {
      for (const [clipId, rid] of entries) {
        if (!rid) continue;
        const st = await arielApi.getChinoState(rid);
        const stateStr = st?.state || st?.status;
        if (stateStr === 'completed' || stateStr === 'failed' || stateStr === 'error') {
          setActiveRidMap((prev) => {
            const copy = { ...prev };
            delete copy[clipId];
            return copy;
          });
          onRefreshOverlays();
        }
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [activeRidMap, onRefreshOverlays]);

  const handleToggleCloudSource = async (target: 'lion' | 'camera') => {
    setBusyAction('source');
    const res = await arielApi.setCloudSource(target);
    setBusyAction('');
    if (res?.error) {
      onPushLog(`שגיאת מקור מצלמה: ${res.error}`);
    } else {
      setCloudSource(target);
      onPushLog(
        target === 'lion'
          ? 'אריאל האריה הופעל כמקור השידור החי'
          : 'חזרנו למצלמה הרגילה שלך'
      );
    }
  };

  const handlePerformerAction = async (action: 'dance' | 'song' | 'roar', label: string) => {
    setBusyAction(action);
    const res = await arielApi.triggerChinoAction(action);
    setBusyAction('');
    if (res?.error) {
      onPushLog(`שגיאת צ׳ינו: ${res.error}`);
    } else {
      onPushLog(`צ׳ינו מבצע עכשיו: ${label}`);
      pollChinoLiveStatus();
    }
  };

  const handleSayNow = async () => {
    const clean = sayText.trim();
    if (!clean) return;
    setBusyAction('say');
    const res = await arielApi.sayLionText(clean);
    setBusyAction('');
    if (res?.error) {
      onPushLog(`שגיאת דיבור צ׳ינו: ${res.error}`);
    } else {
      onPushLog(`צ׳ינו אומר: "${clean}"`);
      setSayText('');
      pollChinoLiveStatus();
    }
  };

  const handleSaveHint = async () => {
    setBusyAction('hint');
    const res = await arielApi.setDirectorHint(hintText.trim());
    setBusyAction('');
    if (res?.error) {
      onPushLog(`שגיאת כותרת: ${res.error}`);
    } else {
      onPushLog('כותרת ההמתנה של צ׳ינו נשמרה');
      pollChinoLiveStatus();
    }
  };

  const handleToggleAuto = async () => {
    const nextAuto = !snapshot.desk.auto;
    const res = await arielApi.toggleDeskAuto(nextAuto);
    if (!res?.error) {
      onPushLog(nextAuto ? 'מנחה אוטומטי הופעל' : 'מנחה אוטומטי כובה');
      await onRefreshAll();
    }
  };

  const handleToggleMute = async () => {
    const res = await arielApi.toggleDeskMute();
    if (!res?.error) {
      onPushLog(director.muted ? 'קול צ׳ינו חזר' : 'צ׳ינו הושתק');
      await onRefreshAll();
      pollChinoLiveStatus();
    }
  };

  const handleLaunchClipToChino = async (clipId: string, user: string, title: string) => {
    onPushLog(`משגר לבמה של צ׳ינו: ${title} (@${user})`);
    const res = await arielApi.sendToChino(clipId, user);
    if (res?.error) {
      onPushLog(`שגיאת שיגור לצ׳ינו: ${res.error}`);
      return;
    }
    const rid = res?.requestId || res?.rid;
    if (rid) {
      setActiveRidMap((prev) => ({ ...prev, [clipId]: String(rid) }));
    }
    onPushLog(`שוגר לבמה של צ׳ינו: ${title}`);
    await onRefreshOverlays();
  };

  const allChinoEntries = useMemo(() => {
    return snapshot.players.flatMap((pl) => {
      const avatar = getPlayerAvatarUrl(pl);
      return flattenPlayerClips(pl).map((clip) => ({
        player: pl.user,
        avatar,
        clip,
      }));
    });
  }, [snapshot.players]);

  const filteredEntries = useMemo(() => {
    const q = searchClipQuery.trim().replace(/^@/, '').toLowerCase();
    if (!q) return allChinoEntries;
    return allChinoEntries.filter(
      (item) =>
        item.player.toLowerCase().includes(q) || item.clip.he.toLowerCase().includes(q)
    );
  }, [allChinoEntries, searchClipQuery]);

  return (
    <div
      dir="rtl"
      className="w-full h-full grid grid-cols-1 lg:grid-cols-[380px_1fr] overflow-hidden bg-[#0B0E14]"
    >
      {/* RIGHT PANE: Chino Host Live Controls */}
      <aside className="p-6 bg-[#121721] border-b lg:border-b-0 lg:border-l border-slate-800/90 overflow-y-auto space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold text-slate-100 font-['Rubik',sans-serif]">
            צ׳ינו — מנחה אוטומטי והאריה
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className={director.online ? 'text-[#16A34A] font-semibold' : 'text-[#DC2626]'}>
              {director.online
                ? director.stageReady
                  ? 'מחובר · במה מוכנה'
                  : 'מחובר · מכין במה'
                : 'מנוע צ׳ינו אופליין'}
            </span>
            {director.conv?.state && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  מצב:{' '}
                  {director.conv.state === 'idle'
                    ? 'בהמתנה'
                    : director.conv.state === 'speaking'
                      ? 'מדבר כעת'
                      : director.conv.state === 'performing'
                        ? 'מופיע על הבמה'
                        : director.conv.state === 'playing'
                          ? 'מנגן קליפ'
                          : director.conv.state}
                </span>
              </>
            )}
            {Array.isArray(director.queue) && director.queue.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-[#E5B34B]">
                  {director.queue.length} בתור
                </span>
              </>
            )}
          </div>
        </div>

        {/* Cloud Camera Source Switcher */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <label className="block text-xs font-bold text-slate-300">
            מקור השידור במצלמת הענן
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0B0E14] rounded-lg border border-slate-800">
            <button
              type="button"
              disabled={busyAction === 'source'}
              onClick={() => handleToggleCloudSource('lion')}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                cloudSource === 'lion'
                  ? 'bg-[#E5B34B] text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              שדר את אריאל בלייב
            </button>
            <button
              type="button"
              disabled={busyAction === 'source'}
              onClick={() => handleToggleCloudSource('camera')}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                cloudSource === 'camera'
                  ? 'bg-[#19202E] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              מצלמה רגילה
            </button>
          </div>
        </div>

        {/* Auto-Host & Audio Controls */}
        <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleToggleAuto}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              snapshot.desk.auto
                ? 'bg-[#16A34A]/15 border-[#16A34A] text-[#16A34A]'
                : 'bg-[#19202E] border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{snapshot.desk.auto ? 'מענה אוטומטי פעיל' : 'הפעל מענה אוטומטי'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleMute}
            className={`inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
              director.muted || snapshot.desk.muted
                ? 'bg-[#DC2626] border-[#DC2626] text-white'
                : 'bg-[#19202E] border-slate-700 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {director.muted || snapshot.desk.muted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>מושתק (בטל)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>השתק את צ׳ינו</span>
              </>
            )}
          </button>
        </div>

        {/* Performer Choreography */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <span className="block text-xs font-bold text-slate-300">
            הופעות מהירות על הבמה
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dance' as const, label: 'רקוד עכשיו' },
              { id: 'song' as const, label: 'שיר לצופים' },
              { id: 'roar' as const, label: 'שאגה חיה' },
            ].map((act) => (
              <button
                key={act.id}
                type="button"
                disabled={busyAction === act.id}
                onClick={() => handlePerformerAction(act.id, act.label)}
                className="py-2.5 px-3 rounded-lg bg-[#19202E] hover:bg-[#E5B34B] text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-[#E5B34B] text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>

        {/* Direct Speech Composer */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <label htmlFor="chinoSayField" className="block text-xs font-bold text-slate-300">
            דבר עכשיו מהפה של צ׳ינו
          </label>
          <div className="flex items-center gap-2">
            <input
              id="chinoSayField"
              type="text"
              value={sayText}
              onChange={(e) => setSayText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSayNow()}
              placeholder="כתוב משפט שצ׳ינו יגיד בקול שלו..."
              className="flex-1 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
            <button
              type="button"
              disabled={busyAction === 'say' || !sayText.trim()}
              onClick={handleSayNow}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
              <span>אמור</span>
            </button>
          </div>
        </div>

        {/* Waiting Hint Text */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <label htmlFor="chinoHintField" className="block text-xs font-bold text-slate-300">
            כותרת המתנה לצופים על המסך
          </label>
          <div className="flex items-center gap-2">
            <input
              id="chinoHintField"
              type="text"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveHint()}
              placeholder="כתבו שאלה בצ׳אט — צ׳ינו עונה"
              className="flex-1 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg px-3 py-2 text-xs focus:outline-none"
            />
            <button
              type="button"
              disabled={busyAction === 'hint'}
              onClick={handleSaveHint}
              className="px-3.5 py-2 rounded-lg bg-[#19202E] hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              שמור
            </button>
          </div>
        </div>
      </aside>

      {/* LEFT PANE: Searchable Stage Launcher for All Chino Player Clips */}
      <section className="flex flex-col h-full overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-['Rubik',sans-serif]">
              שיגור סרטוני שחקנים לבמה של צ׳ינו ({filteredEntries.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              מעקב במה תלת-ממדי, סנכרון סאונד ואינטראקציה חיה עם האריה
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchClipQuery}
              onChange={(e) => setSearchClipQuery(e.target.value)}
              placeholder="סינון לפי @שחקן או סוג אפקט..."
              aria-label="סינון סרטוני צ׳ינו"
              className="w-full bg-[#121721] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg pr-8 pl-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-12">
              לא נמצאו סרטוני שחקנים מתאימים לסינון הנוכחי.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredEntries.map(({ player, avatar, clip }) => {
                const liveState = activeRidMap[clip.id] ? 'queued' : clip.chino?.state;
                const badge = getChinoStateLabel(liveState);
                return (
                  <div
                    key={`${player}-${clip.id}`}
                    className="p-3.5 rounded-xl bg-[#121721] border border-slate-800/90 hover:border-slate-700 flex flex-col justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={player}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover bg-slate-900 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#19202E] flex items-center justify-center font-bold text-xs text-[#E5B34B] shrink-0">
                          {player[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-100 truncate">
                          {clip.he}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                          <span dir="ltr">@{player}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              badge.tone === 'green'
                                ? 'text-[#16A34A] font-semibold'
                                : badge.tone === 'gold'
                                ? 'text-[#E5B34B]'
                                : badge.tone === 'red'
                                ? 'text-[#DC2626]'
                                : 'text-slate-500'
                            }
                          >
                            {badge.text.replace(/^[^\w\u0590-\u05FF]+/, '')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleLaunchClipToChino(clip.id, player, clip.he)}
                        className="py-2 px-3 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                      >
                        שגר לצ׳ינו
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          arielApi
                            .playOverlay({
                              id: clip.id,
                              loop: false,
                              swap: false,
                              pos: 'center',
                              size: 0.75,
                              bottom: 0.2,
                            })
                            .then(() => onPushLog(`מנגן ישירות: ${clip.he} (@${player})`))
                        }
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#19202E] hover:bg-slate-700 text-slate-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>נגן ישיר</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
