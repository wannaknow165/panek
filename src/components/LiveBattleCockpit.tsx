import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Play,
  Send,
  Sparkles,
  Camera,
  RefreshCw,
  Trash2,
  Volume2,
  VolumeX,
  FolderOpen,
  SwitchCamera,
  Copy,
  Check,
} from 'lucide-react';
import {
  ArielDashboardSnapshot,
  OverlayItem,
  filterOpponentOverlays,
  filterGenericCharacterOverlays,
  isChinoSendableOverlay,
  isTiktokActivelyLive,
  getPlayerAvatarUrl,
} from '../utils/arielState';
import { arielApi } from '../services/arielApi';
import {
  BoosteraEffectDefinition,
  ProgramOutputSnapshot,
} from '../types/boostera';
import {
  boosteraApi,
  BoosteraRealtimeEventItem,
} from '../services/boosteraApi';
import { ProgramCompositorView } from './ProgramCompositorView';

interface LiveBattleCockpitProps {
  snapshot: ArielDashboardSnapshot;
  program: ProgramOutputSnapshot;
  effects: BoosteraEffectDefinition[];
  wsConnected: boolean;
  wsEvents: BoosteraRealtimeEventItem[];
  onApplyProgram: (next?: ProgramOutputSnapshot) => void;
  selectedOpponent: string;
  onSelectOpponent: (user: string) => void;
  onRefreshOverlays: () => Promise<void>;
  onRefreshAll: () => Promise<void>;
  onPushLog: (msg: string) => void;
  onOpenWorkspaceModal: () => void;
  localArCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCamActive: boolean;
  onToggleCamera: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const QUICK_FIRE_SETS: Array<{ id: string; label: string; assetFallback?: string }> = [
  { id: 'boxer3', label: 'אגרוף ענק', assetFallback: '/media/overlays/boxer3.webm' },
  { id: 'ov_baby', label: 'תינוק בוכה', assetFallback: '/media/overlays/ov_baby.webm' },
  { id: 'fx_belly', label: 'רקדנית בטן', assetFallback: '/media/overlays/fx_belly.webm' },
  { id: 'fx_chicken', label: 'תרנגולת' },
  { id: 'fx_bottle', label: 'בקבוק צ׳ינו' },
  { id: 'lion_belly', label: 'ריקוד עם אריה' },
];

const QUICK_STAGE_TRIGGERS: Array<{ effectId: string; label: string }> = [
  { effectId: 'glove_x2', label: 'כפפה ×2' },
  { effectId: 'glove_x3', label: 'כפפה ×3' },
  { effectId: 'glove_x5', label: 'כפפה ×5' },
  { effectId: 'gift_universe_circle', label: 'TikTok Universe' },
  { effectId: 'battle_snipe', label: 'SNIPE!' },
  { effectId: 'cam_punch_zoom', label: 'Punch Zoom' },
];

export const LiveBattleCockpit: React.FC<LiveBattleCockpitProps> = ({
  snapshot,
  program,
  effects,
  wsConnected,
  wsEvents,
  onApplyProgram,
  selectedOpponent,
  onSelectOpponent,
  onRefreshOverlays,
  onRefreshAll,
  onPushLog,
  onOpenWorkspaceModal,
  localArCanvasRef,
  isCamActive,
  onToggleCamera,
  isMuted,
  onToggleMute,
}) => {
  // Opponent sidebar filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [rosterFilter, setRosterFilter] = useState<'all' | 'live'>('all');

  // Center media view mode
  const [mediaFilter, setMediaFilter] = useState<
    'selected' | 'all-opponents' | 'characters' | 'battle-fx'
  >('selected');
  const [loopOverlay, setLoopOverlay] = useState<boolean>(false);
  const [aliveHint, setAliveHint] = useState<string>('');
  const [busyAction, setBusyAction] = useState<string>('');

  // Left Monitor: defaults to authoritative BOOSTERA Program Output (§17)
  const [monitorSource, setMonitorSource] = useState<'program-live' | 'android-screen' | 'local-ar'>(
    'program-live'
  );
  const [monitorKey, setMonitorKey] = useState<number>(() => Date.now());
  const [monitorUnavailable, setMonitorUnavailable] = useState<boolean>(false);
  const [copiedCleanFeed, setCopiedCleanFeed] = useState<boolean>(false);
  const [quickSayText, setQuickSayText] = useState<string>('');
  const mirrorRef = React.useRef<HTMLCanvasElement | null>(null);

  // Delete confirmation dialog
  const [pendingDelete, setPendingDelete] = useState<OverlayItem | null>(null);

  // Auto-select first live opponent (or first roster opponent) on initial load
  useEffect(() => {
    if (!selectedOpponent && snapshot.roster.length > 0) {
      const liveFirst = snapshot.roster.find((r) => r.alive) || snapshot.roster[0];
      if (liveFirst) {
        onSelectOpponent(liveFirst.user);
      }
    }
  }, [selectedOpponent, snapshot.roster, onSelectOpponent]);

  // Mirror local AR canvas only when selected and camera is active
  useEffect(() => {
    if (monitorSource !== 'local-ar' || !isCamActive) return;
    let rafId = 0;
    const draw = () => {
      const dst = mirrorRef.current;
      const src = localArCanvasRef.current;
      if (dst && src) {
        const ctx = dst.getContext('2d');
        ctx?.drawImage(src, 0, 0, dst.width, dst.height);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [monitorSource, localArCanvasRef, isCamActive]);

  // Lookup map from username -> avatar URL
  const avatarByUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of snapshot.players) {
      const url = getPlayerAvatarUrl(p);
      if (url) map.set(p.user.toLowerCase(), url);
    }
    return map;
  }, [snapshot.players]);

  const liveOpponentsCount = useMemo(
    () => snapshot.roster.filter((r) => r.alive).length,
    [snapshot.roster]
  );

  const filteredRoster = useMemo(() => {
    const q = searchQuery.trim().replace(/^@/, '').toLowerCase();
    return snapshot.roster.filter((r) => {
      if (rosterFilter === 'live' && !r.alive) return false;
      if (q && !r.user.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [snapshot.roster, rosterFilter, searchQuery]);

  const cleanSelected = selectedOpponent.trim().replace(/^@/, '');
  const selectedRosterItem = snapshot.roster.find(
    (r) => r.user.toLowerCase() === cleanSelected.toLowerCase()
  );
  const selectedAvatar = avatarByUser.get(cleanSelected.toLowerCase()) || '';

  const opponentClips = useMemo(
    () => filterOpponentOverlays(snapshot.overlays, cleanSelected, mediaFilter === 'all-opponents'),
    [snapshot.overlays, cleanSelected, mediaFilter]
  );
  const characterClips = useMemo(
    () => filterGenericCharacterOverlays(snapshot.overlays),
    [snapshot.overlays]
  );
  const battleServerEffects = useMemo(
    () =>
      effects.filter(
        (e) =>
          e.enabled &&
          (e.category === 'Gloves' ||
            e.category === 'Battle' ||
            e.category === 'Gifts' ||
            e.category === 'Camera' ||
            e.category === 'Body')
      ),
    [effects]
  );

  const displayedClips = mediaFilter === 'characters' ? characterClips : opponentClips;
  const totalOpponentClipsCount = useMemo(
    () => snapshot.overlays.filter((o) => o.kind === 'clip').length,
    [snapshot.overlays]
  );

  const handlePickOpponent = useCallback(
    async (user: string) => {
      onSelectOpponent(user);
      if (mediaFilter !== 'battle-fx') {
        setMediaFilter('selected');
      }
      setAliveHint('');
      const res = await arielApi.checkOpponentAlive(user);
      if (res?.alive) {
        setAliveHint(`בלייב עכשיו${res.title ? ` · ${res.title.slice(0, 36)}` : ''}`);
      } else if (res && !res.error) {
        setAliveHint('אופליין כרגע · הסרטונים המוכנים פעילים');
      }
    },
    [mediaFilter, onSelectOpponent]
  );

  const handleDetectCurrentBattleOpponent = () => {
    if (snapshot.desk.opponent) {
      handlePickOpponent(snapshot.desk.opponent);
      onPushLog(`זוהה יריב פעיל בקרב: @${snapshot.desk.opponent}`);
    } else if (!isTiktokActivelyLive(snapshot.tiktok)) {
      onPushLog('חשבון הטיקטוק אינו בשידור חי כרגע — בחר יריב מהרשימה מימין');
    } else {
      onPushLog('אין קרב פעיל כרגע בחדר השידור');
    }
  };

  // Routes through BOOSTERA Effects Server (/api/v1/overlay or /api/v1/character) -> Program Output (§10 & §16)
  const handlePlayOverlay = async (o: OverlayItem, swapHead = false) => {
    const assetUrl = `/media/overlays/${o.id}.webm`;
    const anchor =
      o.pos === 'left' ? 'left' : o.pos === 'right' ? 'right' : 'center';

    if (o.user || o.kind === 'clip') {
      const res = await boosteraApi.playCharacter({
        id: `char_${o.id}`,
        name: o.he || o.id,
        asset: assetUrl,
        overlayId: o.id,
        opponentUser: o.user || cleanSelected,
        anchor,
        target: 'rival',
        layerOrder: 'front',
        audio: true,
        loop: loopOverlay,
      });
      if (res?.ok) {
        onApplyProgram(res.program);
        setMonitorSource('program-live');
        onPushLog(`מופעל ב-Program Output: ${o.he || o.id}`);
      }
    } else {
      const res = await boosteraApi.playOverlay({
        id: o.id,
        name: o.he || o.id,
        asset: assetUrl,
        anchor,
        target: 'screen',
        opponentUser: cleanSelected,
        loop: loopOverlay,
        swap: swapHead,
        pos: o.pos || 'center',
        size: o.size ?? 0.75,
        bottom: o.bottom ?? 0.2,
        head: o.head ?? 1,
        hitAt: o.hitAt,
        dir: o.pos === 'right' ? 'left' : 'right',
        audio: true,
      });
      if (res?.ok) {
        onApplyProgram(res.program);
        setMonitorSource('program-live');
        onPushLog(`מופעל ב-Program Output: ${o.he || o.id}`);
      }
    }
  };

  const handleTriggerServerEffect = async (effId: string, label: string) => {
    setBusyAction(effId);
    const res = await boosteraApi.triggerEffect(effId, {
      opponentUser: cleanSelected || undefined,
      loop: loopOverlay || undefined,
    });
    setBusyAction('');
    if (res?.ok) {
      onApplyProgram(res.program);
      setMonitorSource('program-live');
      onPushLog(`הופעל ב-Program Output: ${label}`);
    } else {
      onPushLog(`שגיאת הפעלה: ${res?.error || label}`);
    }
  };

  const handleSendToChino = async (o: OverlayItem) => {
    onPushLog(`משגר לבמה של צ׳ינו: ${o.he || o.id}`);
    const res = await arielApi.sendToChino(o.id, o.user || cleanSelected);
    if (res?.error) {
      onPushLog(`שגיאת צ׳ינו: ${res.error}`);
    } else {
      onPushLog(`שוגר לצ׳ינו בהצלחה: ${o.he || o.id}`);
    }
  };

  // Routes Quick-Fire Character / Opponent Sets through BOOSTERA /api/v1/character (§10 & §16)
  const handleQuickFireSet = async (
    setId: string,
    label: string,
    assetFallback?: string
  ) => {
    if (!cleanSelected) {
      onPushLog('בחר קודם יריב מהרשימה מימין');
      return;
    }
    setBusyAction(setId);

    // Find matching ready clip for this opponent if already generated
    const matchingClip = opponentClips.find((c) => c.id.includes(setId));
    const resolvedAsset = matchingClip
      ? `/media/overlays/${matchingClip.id}.webm`
      : assetFallback;

    const res = await boosteraApi.playCharacter({
      id: `qf_${setId}_${cleanSelected}`,
      name: `${label} — @${cleanSelected}`,
      asset: resolvedAsset,
      set: setId,
      opponentUser: cleanSelected,
      target: 'rival',
      anchor: 'center',
      layerOrder: 'front',
      audio: true,
      loop: loopOverlay,
    });

    setBusyAction('');
    if (res?.ok) {
      onApplyProgram(res.program);
      setMonitorSource('program-live');
      onPushLog(`הופעל ב-Program על @${cleanSelected}: ${label}`);
      await onRefreshOverlays();
    } else {
      onPushLog(`שגיאה: ${label}`);
    }
  };

  const handleGenerateMissingSets = async () => {
    if (!cleanSelected) return;
    setBusyAction('gen-all');
    onPushLog(`מתחיל ייצור סטים חסרים עבור @${cleanSelected}...`);
    const res = await arielApi.generateOpponentAll({ user: cleanSelected, wait: true });
    setBusyAction('');
    if (res?.error) {
      onPushLog(`שגיאה: ${res.error}`);
    } else if (res?.exists) {
      onPushLog(res.msg || 'כל הסטים כבר קיימים ומוכנים');
    } else {
      onPushLog(`התחיל ייצור סטים חדשים עבור @${cleanSelected}`);
      await onRefreshOverlays();
    }
  };

  const handleToggleHeadGame = async () => {
    if (snapshot.headgame.on) {
      await arielApi.setHeadGame({ on: false });
      onPushLog('משחק פיצוץ הראש כובה');
      await onRefreshAll();
      return;
    }
    if (!cleanSelected) {
      onPushLog('בחר יריב מהרשימה כדי להפעיל עליו פיצוץ ראש');
      return;
    }
    const res = await arielApi.setHeadGame({ on: true, user: cleanSelected });
    if (res?.error) {
      onPushLog(`שגיאה: ${res.error}`);
    } else {
      onPushLog(`פיצוץ ראש בלייקים הופעל על @${cleanSelected}`);
      await onRefreshAll();
    }
  };

  const handleToggleCloudCast = async () => {
    const next = !snapshot.cloud.on;
    const res = await arielApi.setCloudCast(next);
    if (res?.error) {
      onPushLog(`שגיאת ענן: ${res.error}`);
    } else {
      await onRefreshAll();
      setMonitorUnavailable(false);
      setMonitorKey(Date.now());
    }
  };

  const handleSwitchProgramScene = async (next: 'camera' | 'lion') => {
    const res = await boosteraApi.setScene({ mode: next });
    if (res?.ok) {
      onApplyProgram(res.program);
      onPushLog(
        next === 'lion'
          ? 'Program Output: מקור אריאל האריה הופעל'
          : 'Program Output: חזרה למצלמת הטלפון'
      );
    }
  };

  const handleCopyCleanFeedUrl = async () => {
    const url = `${window.location.origin}/clean-feed`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCleanFeed(true);
      onPushLog('קישור Clean Feed (1080×1920 ללא UI) הועתק עבור OBS / Virtual Camera');
      setTimeout(() => setCopiedCleanFeed(false), 2000);
    } catch {
      onPushLog('לא ניתן להעתיק אוטומטית');
    }
  };

  const handleQuickSay = async () => {
    const text = quickSayText.trim();
    if (!text) return;
    setQuickSayText('');
    const res = await arielApi.sayLionText(text);
    if (res?.error) {
      onPushLog(`שגיאת דיבור: ${res.error}`);
    } else {
      onPushLog(`צ׳ינו אומר: "${text}"`);
    }
  };

  const isTiktokLive = isTiktokActivelyLive(snapshot.tiktok);

  return (
    <div
      dir="rtl"
      className="w-full h-full flex flex-col lg:grid lg:grid-cols-[276px_1fr_340px] overflow-hidden bg-[#0B0E14]"
    >
      {/* ==================== COLUMN 1 (RIGHT): OPPONENTS SIDEBAR ==================== */}
      <aside className="flex flex-col h-48 lg:h-full bg-[#121721] border-b lg:border-b-0 lg:border-l border-slate-800/90 overflow-hidden shrink-0">
        <div className="p-3.5 border-b border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-100 font-['Rubik',sans-serif]">
              יריבים ({snapshot.roster.length})
            </h2>
            <button
              type="button"
              onClick={handleDetectCurrentBattleOpponent}
              className="text-xs font-semibold text-[#E5B34B] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              מי מולי בקרב?
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              dir="ltr"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) {
                  onSelectOpponent(e.target.value.trim().replace(/^@/, ''));
                }
              }}
              placeholder="חפש או הקלד @username..."
              aria-label="חיפוש יריב לפי שם משתמש"
              className="w-full bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg pr-8 pl-3 py-1.5 text-xs focus:outline-none"
            />
          </div>

          {/* Segmented Roster Filter */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#0B0E14] rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => setRosterFilter('all')}
              className={`py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                rosterFilter === 'all'
                  ? 'bg-[#19202E] text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              הכל ({snapshot.roster.length})
            </button>
            <button
              type="button"
              onClick={() => setRosterFilter('live')}
              className={`py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                rosterFilter === 'live'
                  ? 'bg-[#19202E] text-[#16A34A]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              בלייב עכשיו ({liveOpponentsCount})
            </button>
          </div>
        </div>

        {/* High-Density Opponent List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredRoster.length === 0 ? (
            <div className="p-5 text-center text-xs text-slate-400 space-y-2">
              <p>לא נמצאו יריבים מתאימים לחיפוש.</p>
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const clean = searchQuery.trim().replace(/^@/, '');
                    arielApi.addPlayer(clean).then(() => {
                      onSelectOpponent(clean);
                      onRefreshOverlays();
                      onPushLog(`נוסף יריב חדש: @${clean}`);
                    });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs cursor-pointer"
                >
                  הוסף את @{searchQuery.trim().replace(/^@/, '')}
                </button>
              )}
            </div>
          ) : (
            filteredRoster.map((opp) => {
              const isSelected = opp.user.toLowerCase() === cleanSelected.toLowerCase();
              const avatar = avatarByUser.get(opp.user.toLowerCase());
              return (
                <button
                  key={opp.user}
                  type="button"
                  onClick={() => handlePickOpponent(opp.user)}
                  className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-right transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'bg-[#19202E] text-slate-100'
                      : 'hover:bg-[#19202E]/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={opp.user}
                        referrerPolicy="no-referrer"
                        className={`w-8 h-8 rounded-full object-cover bg-slate-900 shrink-0 ${
                          isSelected ? 'ring-2 ring-[#E5B34B]' : ''
                        }`}
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0 ${
                          isSelected ? 'ring-2 ring-[#E5B34B]' : ''
                        }`}
                      >
                        {opp.user[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div
                        dir="ltr"
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-[#E5B34B]' : 'text-slate-100'
                        }`}
                      >
                        @{opp.user}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {opp.alive ? (
                          <span className="text-[#16A34A] font-semibold">בלייב</span>
                        ) : (
                          <span>שמור</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className="text-xs font-mono tabular-nums text-slate-400 shrink-0">
                    {opp.sets}/{opp.total}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ==================== COLUMN 2 (CENTER): ACTIVE BATTLE STAGE ==================== */}
      <section className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0E14]">
        {/* Top Context & Quick-Fire Command Bar */}
        <div className="px-5 py-3.5 bg-[#121721]/60 border-b border-slate-800/90 space-y-3 shrink-0">
          {/* Selected Opponent Row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedAvatar ? (
                <img
                  src={selectedAvatar}
                  alt={cleanSelected}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full object-cover bg-slate-900 border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#19202E] border border-slate-700 flex items-center justify-center text-sm font-bold text-[#E5B34B] shrink-0">
                  {cleanSelected[0]?.toUpperCase() || '@'}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1
                    dir="ltr"
                    className="text-lg font-extrabold text-slate-100 font-['Rubik',sans-serif] truncate"
                  >
                    {cleanSelected ? `@${cleanSelected}` : 'בחר יריב מהרשימה'}
                  </h1>
                </div>
                {/* Clean Zero-Pill Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  {selectedRosterItem?.alive ? (
                    <span className="text-[#16A34A] font-semibold">בלייב עכשיו בטיקטוק</span>
                  ) : (
                    <span>מוכן להפעלה</span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{opponentClips.length} סרטונים מוכנים</span>
                  {aliveHint && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate max-w-[260px]">{aliveHint}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={!cleanSelected || busyAction === 'capture'}
                onClick={async () => {
                  if (!cleanSelected) return;
                  setBusyAction('capture');
                  onPushLog(`לוכד פריים חי של @${cleanSelected}...`);
                  const r = await arielApi.captureOpponent({ user: cleanSelected, wait: false });
                  setBusyAction('');
                  onPushLog(
                    r?.ok
                      ? `נתפסו פנים חדשות של @${cleanSelected}`
                      : r?.error || 'לא זוהו פנים חיות כרגע'
                  );
                }}
                className="px-3 py-1.5 rounded-lg bg-[#19202E] hover:bg-slate-700 border border-slate-700/80 text-slate-200 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-40"
              >
                תפוס פנים מהלייב
              </button>

              <button
                type="button"
                disabled={!cleanSelected || busyAction === 'gen-all'}
                onClick={handleGenerateMissingSets}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 text-xs font-bold transition-all whitespace-nowrap cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ייצר סטים חסרים</span>
              </button>
            </div>
          </div>

          {/* Row 1: 6 Primary Character/Opponent Triggers -> /api/v1/character */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {QUICK_FIRE_SETS.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!cleanSelected || busyAction === item.id}
                onClick={() => handleQuickFireSet(item.id, item.label, item.assetFallback)}
                className="py-1.5 px-2.5 rounded-lg bg-[#19202E] hover:bg-[#E5B34B] text-slate-100 hover:text-slate-950 border border-slate-800 hover:border-[#E5B34B] text-xs font-bold transition-colors duration-150 whitespace-nowrap truncate cursor-pointer disabled:opacity-40"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Row 2: 6 Instant BOOSTERA Battle / Gloves / Universe / Camera Triggers -> /api/v1/effects/:id/trigger */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {QUICK_STAGE_TRIGGERS.map((trig) => (
              <button
                key={trig.effectId}
                type="button"
                disabled={busyAction === trig.effectId}
                onClick={() => handleTriggerServerEffect(trig.effectId, trig.label)}
                className="py-1.5 px-2.5 rounded-lg bg-[#0B0E14] hover:bg-[#19202E] text-[#E5B34B] border border-slate-800 hover:border-[#E5B34B] text-xs font-bold transition-colors duration-150 whitespace-nowrap truncate cursor-pointer disabled:opacity-40"
              >
                {trig.label}
              </button>
            ))}
          </div>

          {/* Compact Single-Line Head Explosion Bar (`פיצוץ ראש בלייקים`) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                פיצוץ ראש בלייקים:
              </span>

              <button
                type="button"
                onClick={handleToggleHeadGame}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  snapshot.headgame.on
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#19202E] hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {snapshot.headgame.on
                  ? `פעיל על @${snapshot.headgame.user} (כבה)`
                  : 'הפעל על היריב'}
              </button>

              <button
                type="button"
                onClick={() => {
                  arielApi.throwHeadGame(1);
                  handleTriggerServerEffect('cam_shake', 'פיצוץ ×1');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#19202E] hover:bg-slate-700 border border-slate-800 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                זרוק ×1
              </button>

              <button
                type="button"
                onClick={() => {
                  arielApi.throwHeadGame(5);
                  handleTriggerServerEffect('glove_x5', 'פיצוץ ×5');
                }}
                className="px-2.5 py-1 rounded-lg bg-[#19202E] hover:bg-slate-700 border border-slate-800 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                זרוק ×5
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={Boolean(snapshot.headgame.likes)}
                  onChange={(e) =>
                    arielApi.setHeadGame({ likes: e.target.checked }).then(() => onRefreshAll())
                  }
                  className="accent-[#E5B34B]"
                />
                <span>כל לייק = זריקה</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 whitespace-nowrap">גודל</span>
                <input
                  type="range"
                  aria-label="גודל פיצוץ ראש"
                  min={0.2}
                  max={0.9}
                  step={0.02}
                  value={snapshot.headgame.size || 0.46}
                  onChange={(e) =>
                    arielApi.setHeadGame({ size: Number(e.target.value) }).then(() => onRefreshAll())
                  }
                  className="w-20 accent-[#E5B34B] cursor-pointer"
                />
                <span className="text-xs font-mono tabular-nums text-slate-300 w-9">
                  {Math.round((snapshot.headgame.size || 0.46) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Media Filter Sub-Toolbar */}
        <div className="px-5 py-2 border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-2 bg-[#0B0E14] shrink-0">
          <div className="flex items-center gap-1 p-1 bg-[#121721] rounded-lg border border-slate-800/80 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setMediaFilter('selected')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mediaFilter === 'selected'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              הסרטונים של {cleanSelected ? `@${cleanSelected}` : 'היריב'} ({opponentClips.length})
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter('all-opponents')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mediaFilter === 'all-opponents'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              כל היריבים ({totalOpponentClipsCount})
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter('characters')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mediaFilter === 'characters'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              דמויות ומכות ({characterClips.length})
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter('battle-fx')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mediaFilter === 'battle-fx'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              אפקטי קרב וכפפות ({battleServerEffects.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                arielApi.punchHit('left');
                handleTriggerServerEffect('cam_fast_shake', 'מכה משמאל');
              }}
              className="px-2.5 py-1 rounded-md bg-[#121721] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-300 whitespace-nowrap cursor-pointer"
            >
              מכה משמאל
            </button>
            <button
              type="button"
              onClick={() => {
                arielApi.punchHit('right');
                handleTriggerServerEffect('cam_fast_shake', 'מכה מימין');
              }}
              className="px-2.5 py-1 rounded-md bg-[#121721] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-300 whitespace-nowrap cursor-pointer"
            >
              מכה מימין
            </button>

            <label className="inline-flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={loopOverlay}
                onChange={(e) => setLoopOverlay(e.target.checked)}
                className="accent-[#E5B34B]"
              />
              <span>ניגון בלופ</span>
            </label>
          </div>
        </div>

        {/* Scrollable Video / Battle Effects Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {mediaFilter === 'battle-fx' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {battleServerEffects.map((eff) => {
                const active = program.activeLayers.some((l) => l.effectId === eff.id);
                return (
                  <div
                    key={eff.id}
                    className={`p-3 rounded-xl bg-[#121721] border flex flex-col justify-between gap-2.5 ${
                      active ? 'border-[#16A34A]' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-slate-100">{eff.nameHe}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                        {eff.category} · z:{eff.zIndex} ·{' '}
                        {eff.loop || eff.durationMs <= 0
                          ? 'קבוע'
                          : `${(eff.durationMs / 1000).toFixed(1)}s`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTriggerServerEffect(eff.id, eff.nameHe)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>הפעל ב-Program</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : displayedClips.length === 0 ? (
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center space-y-3 border border-dashed border-slate-800 rounded-xl p-8">
              <p className="text-sm font-semibold text-slate-200">
                {cleanSelected
                  ? `עדיין אין סרטונים מוכנים עבור @${cleanSelected}`
                  : 'בחר יריב מהרשימה מימין כדי להציג את הסרטונים שלו'}
              </p>
              <p className="text-xs text-slate-400 max-w-md">
                לחץ על אחד מכפתורי השיגור למעלה או על &quot;ייצר סטים חסרים&quot; כדי ליצור עבורו סרטוני קרב וריקוד אוטומטית.
              </p>
              {cleanSelected && (
                <button
                  type="button"
                  onClick={handleGenerateMissingSets}
                  className="px-4 py-2 rounded-lg bg-[#E5B34B] text-slate-950 text-xs font-bold cursor-pointer"
                >
                  ייצר סטים עבור @{cleanSelected}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {displayedClips.map((o) => (
                <div
                  key={o.id}
                  className="group bg-[#121721] border border-slate-800/90 hover:border-slate-600 rounded-xl overflow-hidden flex flex-col transition-colors"
                >
                  <div
                    onClick={() => handlePlayOverlay(o, false)}
                    className="relative aspect-[9/14] bg-slate-950 overflow-hidden cursor-pointer"
                  >
                    <video
                      src={`/media/overlays/${o.id}.webm`}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent pointer-events-none" />

                    <button
                      type="button"
                      aria-label={`מחק ${o.he || o.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(o);
                      }}
                      className="absolute top-2 left-2 p-1.5 rounded-md bg-black/60 hover:bg-[#DC2626] text-slate-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2 right-2.5 left-2.5 pointer-events-none">
                      <div className="text-xs font-bold text-white truncate">
                        {o.he || o.id}
                      </div>
                      {o.user && mediaFilter === 'all-opponents' && (
                        <div dir="ltr" className="text-[11px] text-slate-300 truncate">
                          @{o.user}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handlePlayOverlay(o, false)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>נגן בבמה</span>
                    </button>

                    {mediaFilter === 'characters' ? (
                      <button
                        type="button"
                        onClick={() => handlePlayOverlay(o, true)}
                        title="נגן עם הראש של היריב"
                        className="py-2 px-2.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-slate-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
                      >
                        עם ראש
                      </button>
                    ) : (
                      isChinoSendableOverlay(o) && (
                        <button
                          type="button"
                          onClick={() => handleSendToChino(o)}
                          title="שגר לבמה התלת-ממדית של צ׳ינו"
                          className="py-2 px-2.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-slate-200 font-semibold text-xs whitespace-nowrap cursor-pointer"
                        >
                          לצ׳ינו
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== COLUMN 3 (LEFT): AUTHORITATIVE PROGRAM OUTPUT MONITOR (§17) ==================== */}
      <aside className="hidden lg:flex flex-col h-full bg-[#121721] border-r border-slate-800/90 overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 font-['Rubik',sans-serif]">
              מוניטור שידור חי
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 tabular-nums">
              <span className={wsConnected ? 'text-[#16A34A] font-semibold' : 'text-[#D97706]'}>
                {wsConnected ? 'Program חי' : 'מתחבר...'}
              </span>
              <span aria-hidden="true">·</span>
              <span>1080×1920</span>
            </div>
          </div>

          {/* Monitor Source Selector: Default is Authoritative Program Output */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#0B0E14] rounded-lg border border-slate-800/80">
            <button
              type="button"
              onClick={() => setMonitorSource('program-live')}
              className={`py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                monitorSource === 'program-live'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Program ({program.activeLayers.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMonitorUnavailable(false);
                setMonitorKey(Date.now());
                setMonitorSource('android-screen');
              }}
              className={`py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                monitorSource === 'android-screen'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              מסך טלפון
            </button>
            <button
              type="button"
              onClick={() => setMonitorSource('local-ar')}
              className={`py-1 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                monitorSource === 'local-ar'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              מצלמת AR
            </button>
          </div>

          {/* Compact 9:16 Program Output Monitor + Controls Side-by-Side */}
          <div className="grid grid-cols-[126px_1fr] gap-3 items-stretch">
            <div className="aspect-[9/16] rounded-lg bg-black border border-slate-800 overflow-hidden flex items-center justify-center relative">
              {monitorSource === 'program-live' ? (
                <ProgramCompositorView program={program} mutedOverride={isMuted} />
              ) : monitorSource === 'local-ar' ? (
                isCamActive ? (
                  <canvas
                    ref={mirrorRef}
                    width={360}
                    height={640}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="p-2 text-center text-[11px] text-slate-400">
                    הפעל מצלמת AR מימין
                  </div>
                )
              ) : !monitorUnavailable ? (
                <img
                  src={`/api/phone/screen.mjpeg?t=${monitorKey}`}
                  alt="מסך טלפון"
                  onError={() => setMonitorUnavailable(true)}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-2 text-center text-[11px] text-slate-400 space-y-1.5">
                  <p>אין זרם פעיל כרגע</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMonitorUnavailable(false);
                      setMonitorKey(Date.now());
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#19202E] text-slate-200 text-[10px] cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>רענן</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between gap-2">
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handleToggleCloudCast}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    snapshot.cloud.on
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-[#E5B34B] text-slate-950 hover:brightness-105'
                  }`}
                >
                  {snapshot.cloud.on ? 'הפסק שידור לענן' : 'שדר לטלפון בענן'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSwitchProgramScene(program.sceneMode === 'lion' ? 'camera' : 'lion')
                  }
                  className={`w-full py-1.5 px-3 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    program.sceneMode === 'lion'
                      ? 'bg-[#19202E] border-[#E5B34B] text-[#E5B34B]'
                      : 'bg-[#0B0E14] border-slate-800 text-slate-200 hover:bg-[#19202E]'
                  }`}
                >
                  {program.sceneMode === 'lion' ? 'מקור: אריאל האריה' : 'החלף לאריאל האריה'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      boosteraApi.cameraSwitch().then((r) => {
                        onApplyProgram(r?.program);
                        onPushLog(
                          `מצלמה הוחלפה (${
                            r?.program?.camera.facing === 'back' ? 'אחורית' : 'קדמית'
                          })`
                        );
                      })
                    }
                    title="החלף מצלמה קדמית/אחורית"
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg border border-slate-800 bg-[#0B0E14] hover:bg-[#19202E] text-[11px] font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
                  >
                    <SwitchCamera className="w-3 h-3" />
                    <span>{program.camera.facing === 'back' ? 'אחורית' : 'קדמית'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleCamera}
                    title="מצלמת AR מקומית"
                    aria-label="הפעל מצלמת AR"
                    className={`p-1.5 rounded-lg border cursor-pointer ${
                      isCamActive
                        ? 'border-[#16A34A] text-[#16A34A] bg-[#16A34A]/10'
                        : 'border-slate-800 bg-[#0B0E14] text-slate-300'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={isMuted ? 'בטל השתקה' : 'השתק Program Audio'}
                    className="p-1.5 rounded-lg border border-slate-800 bg-[#0B0E14] text-slate-300 hover:text-white cursor-pointer"
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-[#DC2626]" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={onOpenWorkspaceModal}
                    title="Google Drive & Sheets"
                    aria-label="פתח Google Drive ו-Sheets"
                    className="p-1.5 rounded-lg border border-slate-800 bg-[#0B0E14] text-slate-300 hover:text-white cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 1-Click Copy Clean Feed for Virtual Camera / OBS (§18) */}
                <button
                  type="button"
                  onClick={handleCopyCleanFeedUrl}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-[#0B0E14] hover:bg-[#19202E] border border-slate-800 text-[11px] font-semibold text-slate-300 whitespace-nowrap cursor-pointer"
                >
                  {copiedCleanFeed ? (
                    <Check className="w-3 h-3 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-3 h-3 text-[#E5B34B]" />
                  )}
                  <span>{copiedCleanFeed ? 'Clean Feed הועתק!' : 'העתק Clean Feed ל-OBS'}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-400 leading-snug">
                {isTiktokLive ? (
                  <span className="text-[#16A34A] font-semibold">מחובר לחדר הלייב בטיקטוק</span>
                ) : (
                  <span>BOOSTERA Camera מוכנה לשידור</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Chino Voice & Performer Strip */}
        <div className="p-4 border-b border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">דיבור מהיר — צ׳ינו</span>
            <span className={snapshot.director.online ? 'text-[#16A34A]' : 'text-slate-500'}>
              {snapshot.director.online ? 'צ׳ינו מוכן' : 'אופליין'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={quickSayText}
              onChange={(e) => setQuickSayText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickSay()}
              placeholder="כתוב משפט שצ׳ינו יגיד עכשיו..."
              aria-label="משפט לדיבור מהיר של צ׳ינו"
              className="flex-1 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleQuickSay}
              aria-label="שלח משפט לצ׳ינו"
              className="px-3 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'dance', label: 'רקוד' },
              { id: 'song', label: 'שיר' },
              { id: 'roar', label: 'שאגה' },
            ].map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() =>
                  arielApi
                    .triggerChinoAction(a.id)
                    .then(() => onPushLog(`צ׳ינו מבצע: ${a.label}`))
                }
                className="py-1.5 rounded-lg bg-[#0B0E14] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Real-Time Event Bus (/ws/live) + TikTok Activity Stream */}
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-300">אירועי שרת ו-Program בזמן אמת</h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              {wsEvents.length + snapshot.liveEvents.length + snapshot.logs.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 text-xs">
            {wsEvents.length === 0 &&
            snapshot.liveEvents.length === 0 &&
            snapshot.logs.length === 0 ? (
              <div className="text-slate-500 text-xs py-6 text-center">
                אירועי WebSocket (/ws/live), מתנות ואפקטים יופיעו כאן בזמן אמת.
              </div>
            ) : (
              <>
                {wsEvents.slice(0, 12).map((wev) => (
                  <div
                    key={wev.id}
                    className="py-1 px-2 text-[11px] text-slate-200 flex items-baseline justify-between gap-2 border-b border-slate-800/50"
                  >
                    <span className="truncate text-[#E5B34B] font-semibold">{wev.summary}</span>
                    <span className="font-mono tabular-nums text-[10px] text-slate-500 shrink-0">
                      {wev.time}
                    </span>
                  </div>
                ))}
                {snapshot.liveEvents
                  .slice()
                  .reverse()
                  .slice(0, 10)
                  .map((ev) => (
                    <div
                      key={ev.id}
                      className="py-1.5 px-2.5 rounded-lg bg-[#0B0E14] border border-slate-800/70 flex items-baseline justify-between gap-2"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-bold text-[#E5B34B] ml-1.5">{ev.nickname}:</span>
                        <span className="text-slate-200">{ev.text}</span>
                      </div>
                    </div>
                  ))}
                {snapshot.logs.slice(0, 12).map((log) => (
                  <div
                    key={log.id}
                    className="py-1 px-2 text-[11px] text-slate-400 flex items-baseline justify-between gap-2 border-b border-slate-800/40"
                  >
                    <span className="truncate">{log.message}</span>
                    <span className="font-mono tabular-nums text-[10px] text-slate-500 shrink-0">
                      {log.time}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Accessible Delete Confirmation Dialog */}
      {pendingDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="אישור מחיקת סרטון"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm bg-[#121721] border border-slate-700 rounded-xl p-5 space-y-4 text-right shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">
              למחוק את &quot;{pendingDelete.he || pendingDelete.id}&quot;?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              הסרטון יימחק לצמיתות מהשרת שלך.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="px-4 py-2 rounded-lg bg-[#19202E] text-xs font-semibold text-slate-200 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = pendingDelete;
                  setPendingDelete(null);
                  await arielApi.deleteOverlay(target.id);
                  await onRefreshOverlays();
                  onPushLog(`נמחק מהשרת: ${target.he || target.id}`);
                }}
                className="px-4 py-2 rounded-lg bg-[#DC2626] text-xs font-bold text-white cursor-pointer"
              >
                מחק לצמיתות
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
