import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Settings2, Lock, Eye, Sparkles } from 'lucide-react';
import {
  ArielDashboardSnapshot,
  OpenRouterEnginesConfig,
  PlayerRecord,
  flattenPlayerClips,
  getChinoStateLabel,
  getPlayerAvatarUrl,
} from '../utils/arielState';
import { arielApi } from '../services/arielApi';

interface PlayersAndSpecialsPanelProps {
  snapshot: ArielDashboardSnapshot;
  selectedOpponent: string;
  onSelectOpponent: (user: string) => void;
  onJumpToLiveBattle: () => void;
  onRefreshOverlays: () => Promise<void>;
  onPushLog: (msg: string) => void;
}

const SPECIAL_SETS_CATALOG: Array<{ id: string; label: string }> = [
  { id: 'boxer1', label: 'הטורקי מרביץ' },
  { id: 'boxer2', label: 'מתאגרף מתחמם' },
  { id: 'boxer3', label: 'אגרוף ענק למצלמה' },
  { id: 'ov_baby', label: 'תינוק בוכה (ראש חי)' },
  { id: 'fx_belly', label: 'רקדנית בטן' },
  { id: 'fx_ballet', label: 'בלרינה' },
  { id: 'fx_chicken', label: 'תרנגולת' },
  { id: 'fx_bow', label: 'משתחווה למלך' },
  { id: 'fx_tiny', label: 'קטן על הכף של צ׳ינו' },
  { id: 'fx_fan', label: 'מנפנף לצ׳ינו' },
  { id: 'fx_babyarm', label: 'בידיים של צ׳ינו' },
  { id: 'fx_bottle', label: 'בקבוק של צ׳ינו' },
  { id: 'lion_bottle', label: 'בקבוק עם אריה' },
  { id: 'lion_kuchi', label: 'קוצ׳י קוצ׳י אריה' },
  { id: 'lion_chicken', label: 'תרנגולת ואריה' },
  { id: 'lion_ballet', label: 'בלט עם אריה' },
  { id: 'lion_belly', label: 'ריקוד בטן ואריה' },
];

function extractTiktokHandle(raw: string): string {
  const trimmed = raw.trim();
  const matchUrl = trimmed.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (matchUrl?.[1]) return matchUrl[1];
  return trimmed.replace(/^@/, '');
}

export const PlayersAndSpecialsPanel: React.FC<PlayersAndSpecialsPanelProps> = ({
  snapshot,
  selectedOpponent,
  onSelectOpponent,
  onJumpToLiveBattle,
  onRefreshOverlays,
  onPushLog,
}) => {
  const [subView, setSubView] = useState<'directory' | 'matrix' | 'specials' | 'custom-ai'>('directory');
  const [playerSearch, setPlayerSearch] = useState<string>('');
  const [newPlayerHandle, setNewPlayerHandle] = useState<string>('');

  // Face Lock & Specials State
  const [targetInput, setTargetInput] = useState<string>(selectedOpponent || '');
  const [lockStatus, setLockStatus] = useState<string>('');
  const [lockedFaceImg, setLockedFaceImg] = useState<string>('');
  const [isLocking, setIsLocking] = useState<boolean>(false);

  // Preview Modal
  const [previewModal, setPreviewModal] = useState<{
    user: string;
    set: string;
    label: string;
    imgUrl?: string;
    loading: boolean;
    error?: string;
  } | null>(null);

  // OpenRouter Engines & RunPod Custom Factory
  const [showEnginesDrawer, setShowEnginesDrawer] = useState<boolean>(false);
  const [enginesConfig, setEnginesConfig] = useState<OpenRouterEnginesConfig | null>(null);
  const [savingEngines, setSavingEngines] = useState<boolean>(false);

  const [genDesc, setGenDesc] = useState<string>('');
  const [genKind, setGenKind] = useState<string>('character');
  const [genDur, setGenDur] = useState<number>(5);
  const [genShortName, setGenShortName] = useState<string>('');

  useEffect(() => {
    if (selectedOpponent && !targetInput) {
      setTargetInput(selectedOpponent);
    }
  }, [selectedOpponent, targetInput]);

  useEffect(() => {
    if ((showEnginesDrawer || subView === 'custom-ai') && !enginesConfig) {
      arielApi.getEngines().then((cfg) => {
        if (cfg) setEnginesConfig(cfg);
      });
    }
  }, [showEnginesDrawer, subView, enginesConfig]);

  const setTitleLookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of snapshot.catalog.sets) {
      map[s.id] = s.he.replace(/^[^\w\u0590-\u05FF]+/, '');
    }
    for (const s of SPECIAL_SETS_CATALOG) {
      if (!map[s.id]) map[s.id] = s.label;
    }
    return map;
  }, [snapshot.catalog.sets]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().replace(/^@/, '').toLowerCase();
    if (!q) return snapshot.players;
    return snapshot.players.filter(
      (p) =>
        p.user.toLowerCase().includes(q) ||
        (p.nick || '').toLowerCase().includes(q)
    );
  }, [snapshot.players, playerSearch]);

  const matrixColumns = useMemo(() => {
    if (snapshot.catalog.sets.length > 0) {
      return snapshot.catalog.sets.map((s) => ({
        id: s.id,
        he: s.he.replace(/^[^\w\u0590-\u05FF]+/, '').replace(/\s*\(.*\)$/, ''),
      }));
    }
    return SPECIAL_SETS_CATALOG.slice(0, 12).map((s) => ({ id: s.id, he: s.label }));
  }, [snapshot.catalog.sets]);

  const findReadyClipForSet = (p: PlayerRecord, setId: string) => {
    return flattenPlayerClips(p, setTitleLookup).find((c) => c.set === setId);
  };

  const handleAddPlayer = async () => {
    const clean = extractTiktokHandle(newPlayerHandle);
    if (!clean) return;
    const res = await arielApi.addPlayer(clean);
    if (res?.error) {
      onPushLog(`שגיאה: ${res.error}`);
    } else {
      onPushLog(`שחקן נוסף לשרת: @${clean}`);
      setNewPlayerHandle('');
      onSelectOpponent(clean);
      await onRefreshOverlays();
    }
  };

  const handleLockUserFace = async () => {
    const handle = extractTiktokHandle(targetInput);
    if (!handle) {
      setLockStatus('הדבק קישור לייב מטיקטוק או כתוב @username');
      return;
    }
    setTargetInput(handle);
    onSelectOpponent(handle);
    setIsLocking(true);
    setLockStatus(`מחפש ונועל על הפנים של @${handle}...`);

    const capRes = await arielApi.captureOpponent({ user: handle, wait: false });
    setIsLocking(false);

    const existingPlayer = snapshot.players.find(
      (p) => p.user.toLowerCase() === handle.toLowerCase()
    );
    const savedAvatar = getPlayerAvatarUrl(existingPlayer);

    if (capRes?.ok && capRes?.head) {
      setLockedFaceImg(`${capRes.head}?t=${capRes.t || Date.now()}`);
      setLockStatus(`@${handle} בלייב — ננעלו פנים חיות מהשידור`);
      onPushLog(`ננעלו פנים חיות של @${handle}`);
    } else if (savedAvatar) {
      setLockedFaceImg(savedAvatar);
      setLockStatus(`@${handle} אופליין כרגע — משתמש בפנים השמורות במערכת`);
    } else {
      setLockedFaceImg('');
      setLockStatus(capRes?.error || `לא נמצאה תמונת פנים שמורה עבור @${handle}`);
    }
  };

  const handleFireSpecial = async (
    userRaw: string,
    setId: string,
    label: string,
    fromPreview?: boolean
  ) => {
    const clean = extractTiktokHandle(userRaw);
    if (!clean) {
      onPushLog('בחר שחקן או הקלד שם משתמש תחילה');
      return;
    }
    onPushLog(`מפעיל "${label}" על @${clean}...`);
    const res = await arielApi.triggerSpecial(clean, setId, { fromPreview });
    if (res?.error) {
      onPushLog(`שגיאה: ${res.error}`);
    } else {
      onPushLog(`נשלח "${label}" עבור @${clean}`);
      await onRefreshOverlays();
    }
  };

  const handlePreviewSpecial = async (setId: string, label: string) => {
    const clean = extractTiktokHandle(targetInput || selectedOpponent);
    if (!clean) {
      onPushLog('כתוב או בחר שם משתמש לפני תצוגה מקדימה');
      return;
    }
    setPreviewModal({ user: clean, set: setId, label, loading: true });
    const res = await arielApi.triggerSpecial(clean, setId, { preview: true });
    if (res?.error) {
      setPreviewModal({ user: clean, set: setId, label, loading: false, error: res.error });
    } else {
      setPreviewModal({
        user: clean,
        set: setId,
        label,
        loading: false,
        imgUrl: res?.img || res?.preview || res?.start,
      });
    }
  };

  const handleSaveEngineField = async (field: 'video' | 'boxer' | 'image', modelId: string) => {
    setSavingEngines(true);
    const res = await arielApi.saveEngines({ [field]: modelId });
    setSavingEngines(false);
    if (!res?.error) {
      const updated = await arielApi.getEngines();
      if (updated) setEnginesConfig(updated);
      onPushLog(`מנוע ${field} עודכן ל-${enginesConfig?.names?.[modelId] || modelId}`);
    }
  };

  const handleCreateCustomRunpod = async () => {
    const desc = genDesc.trim();
    if (!desc) return;
    const finalDesc =
      genKind === 'character'
        ? `${desc}, the character has NO head — an empty neck opening where a head should be`
        : desc;
    const res = await arielApi.generateRunpod({
      desc: finalDesc,
      kind: genKind,
      dur: genDur,
      he: genShortName.trim() || desc.slice(0, 24),
    });
    if (res?.error) {
      onPushLog(`שגיאת ייצור: ${res.error}`);
    } else {
      onPushLog(`נשלח לייצור וידאו: ${desc}`);
      setGenDesc('');
      setGenShortName('');
      await onRefreshOverlays();
    }
  };

  const activeHandle = extractTiktokHandle(targetInput || selectedOpponent);
  const activePlayerObj = snapshot.players.find(
    (p) => p.user.toLowerCase() === activeHandle.toLowerCase()
  );
  const displayFace = lockedFaceImg || getPlayerAvatarUrl(activePlayerObj);

  return (
    <div dir="rtl" className="w-full h-full flex flex-col overflow-hidden bg-[#0B0E14]">
      {/* Workspace Toolbar */}
      <div className="px-6 py-3.5 bg-[#121721] border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0B0E14] rounded-lg border border-slate-800">
          {[
            { id: 'directory' as const, label: `כרטיסי שחקנים (${snapshot.players.length})` },
            { id: 'matrix' as const, label: 'טבלת מטריצה מלאה' },
            { id: 'specials' as const, label: 'נעילת פנים וסטים מיוחדים' },
            { id: 'custom-ai' as const, label: 'יצירת דמות / אפקט AI' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubView(tab.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                subView === tab.id
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(subView === 'directory' || subView === 'matrix') && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                placeholder="סינון שחקנים..."
                aria-label="סינון שחקנים"
                className="w-44 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg pr-8 pl-3 py-1.5 text-xs focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              dir="ltr"
              value={newPlayerHandle}
              onChange={(e) => setNewPlayerHandle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
              placeholder="@username חדש..."
              aria-label="הוסף שחקן חדש"
              className="w-36 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddPlayer}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>הוסף</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowEnginesDrawer((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              showEnginesDrawer
                ? 'bg-[#19202E] border-[#E5B34B] text-[#E5B34B]'
                : 'bg-[#0B0E14] border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>מנועי OpenRouter</span>
          </button>
        </div>
      </div>

      {/* Collapsible OpenRouter Engines Selector */}
      {showEnginesDrawer && (
        <div className="px-6 py-4 bg-[#121721]/80 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              בחירת מודלים פעילים בשרת (OpenRouter)
            </span>
            {savingEngines && <span className="text-xs text-[#E5B34B]">שומר...</span>}
          </div>

          {!enginesConfig ? (
            <div className="text-xs text-slate-400">טוען רשימת מודלים מהשרת...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  מנוע וידאו ראשי (ריקודים וסטים)
                </label>
                <select
                  aria-label="מנוע וידאו ראשי"
                  value={enginesConfig.current?.video || ''}
                  onChange={(e) => handleSaveEngineField('video', e.target.value)}
                  className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                >
                  {(enginesConfig.video || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {enginesConfig.names?.[m.id] || m.id}
                      {m.est?.usd ? ` (~$${m.est.usd})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  מנוע וידאו מתאגרף / קרב
                </label>
                <select
                  aria-label="מנוע וידאו מתאגרף"
                  value={enginesConfig.current?.boxer || ''}
                  onChange={(e) => handleSaveEngineField('boxer', e.target.value)}
                  className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                >
                  {(enginesConfig.video || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {enginesConfig.names?.[m.id] || m.id}
                      {m.est?.usd ? ` (~$${m.est.usd})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  מנוע הדבקת פנים ותמונה
                </label>
                <select
                  aria-label="מנוע תמונה"
                  value={enginesConfig.current?.image || ''}
                  onChange={(e) => handleSaveEngineField('image', e.target.value)}
                  className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                >
                  {(enginesConfig.image || []).map((m) => (
                    <option key={m.id} value={m.id}>
                      {enginesConfig.names?.[m.id] || m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* 1. PLAYERS DIRECTORY */}
        {subView === 'directory' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlayers.map((p) => {
              const avatar = getPlayerAvatarUrl(p);
              const flatClips = flattenPlayerClips(p, setTitleLookup);
              const rosterEntry = snapshot.roster.find(
                (r) => r.user.toLowerCase() === p.user.toLowerCase()
              );

              return (
                <div
                  key={p.user}
                  className="p-4 rounded-xl bg-[#121721] border border-slate-800/90 flex flex-col justify-between gap-3.5"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={p.user}
                          referrerPolicy="no-referrer"
                          className="w-11 h-11 rounded-full object-cover bg-slate-900 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#19202E] flex items-center justify-center font-bold text-sm text-[#E5B34B] shrink-0">
                          {p.user[0]?.toUpperCase() || '?'}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div dir="ltr" className="font-bold text-sm text-slate-100 truncate">
                          @{p.user}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          {rosterEntry?.alive && (
                            <>
                              <span className="text-[#16A34A] font-semibold">בלייב</span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="tabular-nums">{flatClips.length} סרטונים</span>
                          {p.diamonds ? (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{p.diamonds} יהלומים</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="px-2.5 py-1.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-xs font-semibold text-slate-300 cursor-pointer whitespace-nowrap">
                        תמונת פנים
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const res = await arielApi.uploadPlayerPhoto(p.user, file);
                            if (!res?.error) {
                              onPushLog(`עודכנה תמונת פנים עבור @${p.user}`);
                              await onRefreshOverlays();
                            }
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          onSelectOpponent(p.user);
                          onJumpToLiveBattle();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 text-xs font-bold whitespace-nowrap cursor-pointer"
                      >
                        לקרב חי
                      </button>
                    </div>
                  </div>

                  {/* Ready Clips */}
                  {flatClips.length > 0 && (
                    <div className="divide-y divide-slate-800/60 border-t border-b border-slate-800/60 py-1">
                      {flatClips.map((c) => {
                        const chinoBadge = c.chino?.state ? getChinoStateLabel(c.chino.state) : null;
                        return (
                          <div
                            key={c.id}
                            className="py-1.5 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="min-w-0 truncate">
                              <span className="font-semibold text-slate-200">{c.he}</span>
                              {chinoBadge && (
                                <span className="text-[11px] text-slate-400 mr-1.5">
                                  · {chinoBadge.text.replace(/^[^\w\u0590-\u05FF]+/, '')}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  arielApi
                                    .playOverlay({
                                      id: c.id,
                                      loop: false,
                                      swap: false,
                                      pos: 'center',
                                      size: 0.75,
                                      bottom: 0.2,
                                    })
                                    .then(() => onPushLog(`מנגן: ${c.he} (@${p.user})`))
                                }
                                className="px-2.5 py-1 rounded bg-[#19202E] hover:bg-[#E5B34B] text-slate-200 hover:text-slate-950 font-semibold text-[11px] cursor-pointer"
                              >
                                נגן
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  arielApi
                                    .sendToChino(c.id, p.user)
                                    .then(() => onPushLog(`שוגר לצ׳ינו: ${c.he} (@${p.user})`))
                                }
                                className="px-2 py-1 rounded bg-[#0B0E14] hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] cursor-pointer"
                              >
                                לצ׳ינו
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick Set Generators */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { set: 'boxer3', lbl: 'אגרוף' },
                      { set: 'ov_baby', lbl: 'תינוק' },
                      { set: 'fx_belly', lbl: 'בטן' },
                      { set: 'fx_chicken', lbl: 'תרנגולת' },
                      { set: 'fx_bottle', lbl: 'בקבוק' },
                      { set: 'lion_belly', lbl: 'עם אריה' },
                    ].map((q) => (
                      <button
                        key={q.set}
                        type="button"
                        onClick={() => handleFireSpecial(p.user, q.set, q.lbl)}
                        className="px-2.5 py-1 rounded-md bg-[#0B0E14] hover:bg-[#19202E] border border-slate-800 text-[11px] text-slate-400 hover:text-slate-100 whitespace-nowrap cursor-pointer"
                      >
                        + {q.lbl}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. EVERYONE x EVERY EFFECT MATRIX */}
        {subView === 'matrix' && (
          <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#121721]">
            <table className="w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-[#0B0E14] border-b border-slate-800 text-slate-300">
                  <th className="p-3 font-bold sticky right-0 bg-[#0B0E14] z-10">שחקן</th>
                  {matrixColumns.map((col) => (
                    <th key={col.id} className="p-2.5 font-semibold text-center min-w-[78px] whitespace-nowrap">
                      {col.he}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlayers.map((p) => {
                  const avatar = getPlayerAvatarUrl(p);
                  return (
                    <tr key={p.user} className="hover:bg-[#19202E]/50 transition-colors">
                      <td className="p-2.5 sticky right-0 bg-[#121721] font-semibold">
                        <div className="flex items-center gap-2.5">
                          {avatar ? (
                            <img
                              src={avatar}
                              alt={p.user}
                              referrerPolicy="no-referrer"
                              className="w-7 h-7 rounded-full object-cover bg-slate-900 shrink-0"
                            />
                          ) : (
                            <span className="w-7 h-7 rounded-full bg-[#19202E] flex items-center justify-center text-xs text-[#E5B34B] shrink-0">
                              {p.user[0]?.toUpperCase() || '?'}
                            </span>
                          )}
                          <span dir="ltr" className="truncate max-w-[130px] text-slate-100">
                            @{p.user}
                          </span>
                        </div>
                      </td>

                      {matrixColumns.map((col) => {
                        const ready = findReadyClipForSet(p, col.id);
                        return (
                          <td key={col.id} className="p-1.5 text-center">
                            {ready ? (
                              <button
                                type="button"
                                title={`נגן ${col.he} (@${p.user})`}
                                onClick={() =>
                                  arielApi
                                    .playOverlay({
                                      id: ready.id,
                                      loop: false,
                                      swap: false,
                                      pos: 'center',
                                      size: 0.75,
                                      bottom: 0.2,
                                    })
                                    .then(() => onPushLog(`מנגן: ${col.he} (@${p.user})`))
                                }
                                className="w-8 h-8 rounded-lg bg-[#16A34A]/15 hover:bg-[#16A34A] text-[#16A34A] hover:text-slate-950 font-bold cursor-pointer"
                              >
                                ✓
                              </button>
                            ) : (
                              <button
                                type="button"
                                title={`ייצר ${col.he} עבור @${p.user}`}
                                onClick={() => handleFireSpecial(p.user, col.id, col.he)}
                                className="w-8 h-8 rounded-lg bg-[#0B0E14] hover:bg-[#E5B34B] text-slate-500 hover:text-slate-950 border border-slate-800 font-bold cursor-pointer"
                              >
                                +
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. FACE LOCK & SPECIAL SETS */}
        {subView === 'specials' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-5 rounded-xl bg-[#121721] border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                {displayFace ? (
                  <img
                    src={displayFace}
                    alt={activeHandle}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded-full object-cover border-2 border-[#E5B34B] bg-slate-900 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#19202E] flex items-center justify-center text-sm font-bold text-slate-300 shrink-0">
                    @
                  </div>
                )}

                <input
                  type="text"
                  dir="ltr"
                  value={targetInput}
                  onChange={(e) => {
                    setTargetInput(e.target.value);
                    onSelectOpponent(extractTiktokHandle(e.target.value));
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLockUserFace()}
                  placeholder="הדבק קישור לייב מטיקטוק או הקלד @username..."
                  aria-label="שם משתמש או קישור לנעילת פנים"
                  className="flex-1 min-w-[220px] bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg px-3.5 py-2.5 text-sm focus:outline-none"
                />

                <button
                  type="button"
                  disabled={isLocking}
                  onClick={handleLockUserFace}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isLocking ? 'נועל פנים...' : 'נעל על הפנים'}</span>
                </button>
              </div>

              {lockStatus && <p className="text-xs font-semibold text-[#E5B34B]">{lockStatus}</p>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {SPECIAL_SETS_CATALOG.map((s) => {
                const readyClip = activePlayerObj
                  ? findReadyClipForSet(activePlayerObj, s.id)
                  : undefined;
                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-xl bg-[#121721] border flex flex-col justify-between gap-3 ${
                      readyClip ? 'border-[#16A34A]/60' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-100">{s.label}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span className="font-mono">{s.id}</span>
                        {readyClip && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#16A34A] font-semibold">מוכן להפעלה</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFireSpecial(activeHandle, s.id, s.label)}
                        className="w-full py-2 px-3 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer"
                      >
                        {readyClip ? 'נגן עכשיו' : 'הפעל / צור וידאו'}
                      </button>

                      {!readyClip && (
                        <button
                          type="button"
                          onClick={() => handlePreviewSpecial(s.id, s.label)}
                          className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-[#19202E] hover:bg-slate-700 text-slate-300 text-xs font-semibold whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>תצוגה מקדימה</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. CUSTOM AI VIDEO / CHARACTER FACTORY (RunPod) */}
        {subView === 'custom-ai' && (
          <div className="max-w-2xl mx-auto p-6 rounded-xl bg-[#121721] border border-slate-800 space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-['Rubik',sans-serif]">
                יצירת דמות או אפקט חדש ב-AI (RunPod)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                צור דמויות חדשות להלבשת ראש חי של יריב, מתאגרפים מותאמים אישית או אפקטים שקופים.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  תיאור הוידאו או הדמות
                </label>
                <textarea
                  value={genDesc}
                  onChange={(e) => setGenDesc(e.target.value)}
                  placeholder="לדוגמה: מתאגרף עם כפפות זהב בזירה מוארת / רקדנית פלמנקו..."
                  aria-label="תיאור דמות או אפקט"
                  className="w-full h-24 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg p-3 text-sm resize-none focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">סוג אפקט</label>
                  <select
                    aria-label="סוג ייצור"
                    value={genKind}
                    onChange={(e) => setGenKind(e.target.value)}
                    className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="character">דמות לראש החי של היריב</option>
                    <option value="puncher">דמות שנותנת מכות</option>
                    <option value="effect">אפקט שקוף על המסך</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">אורך וידאו</label>
                  <select
                    aria-label="אורך וידאו"
                    value={genDur}
                    onChange={(e) => setGenDur(Number(e.target.value))}
                    className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                  >
                    <option value={5}>5 שניות (~$0.32)</option>
                    <option value={8}>8 שניות (~$0.50)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">שם קצר בתפריט</label>
                  <input
                    type="text"
                    value={genShortName}
                    onChange={(e) => setGenShortName(e.target.value)}
                    placeholder="אופציונלי"
                    className="w-full bg-[#0B0E14] text-slate-100 border border-slate-800 rounded-lg px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={!genDesc.trim()}
                onClick={handleCreateCustomRunpod}
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-sm cursor-pointer disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>שלח לייצור בשרת</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="תצוגה מקדימה"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md bg-[#121721] border border-slate-700 rounded-xl p-5 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">
                {previewModal.label} — @{previewModal.user}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                סגור
              </button>
            </div>

            {previewModal.loading ? (
              <div className="py-10 text-center text-xs text-slate-400">
                מכין תצוגה מקדימה עם הפנים של @{previewModal.user}...
              </div>
            ) : previewModal.error ? (
              <div className="py-6 text-center text-xs text-[#DC2626]">{previewModal.error}</div>
            ) : previewModal.imgUrl ? (
              <img
                src={previewModal.imgUrl}
                alt="תצוגה מקדימה"
                className="w-full max-h-[50vh] object-contain rounded-lg bg-black"
              />
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                התצוגה המקדימה מוכנה — לחץ למטה כדי לייצר את הוידאו המלא.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPreviewModal(null)}
                className="px-4 py-2 rounded-lg bg-[#19202E] text-xs font-semibold text-slate-200 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={previewModal.loading}
                onClick={() => {
                  const { user, set, label } = previewModal;
                  setPreviewModal(null);
                  handleFireSpecial(user, set, label, true);
                }}
                className="px-4 py-2 rounded-lg bg-[#E5B34B] text-slate-950 text-xs font-bold cursor-pointer"
              >
                צור וידאו מלא
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
