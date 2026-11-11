import React, { useState, useMemo } from 'react';
import {
  Search,
  Play,
  Star,
  Square,
  Copy,
  Check,
  Volume2,
  VolumeX,
  SwitchCamera,
  Shuffle,
} from 'lucide-react';
import {
  BoosteraEffectCategory,
  BoosteraEffectDefinition,
  BoosteraStatusSnapshot,
  BoosteraTarget,
  ProgramOutputSnapshot,
} from '../types/boostera';
import { boosteraApi } from '../services/boosteraApi';
import { ProgramCompositorView } from './ProgramCompositorView';

interface BoosteraEffectsLibraryProps {
  effects: BoosteraEffectDefinition[];
  program: ProgramOutputSnapshot;
  status: BoosteraStatusSnapshot | null;
  wsConnected: boolean;
  selectedOpponent: string;
  onEffectsChanged: () => Promise<void>;
  onApplyProgram: (next?: ProgramOutputSnapshot) => void;
  onPushLog: (msg: string) => void;
}

const LIBRARY_CATEGORIES: Array<{ id: 'All' | 'Favorites' | BoosteraEffectCategory; label: string }> = [
  { id: 'All', label: 'הכל' },
  { id: 'Favorites', label: 'מועדפים' },
  { id: 'Camera', label: 'Camera' },
  { id: 'AR', label: 'AR' },
  { id: 'Face', label: 'Face' },
  { id: 'Body', label: 'Body' },
  { id: 'Battle', label: 'Battle' },
  { id: 'Gloves', label: 'Gloves' },
  { id: 'Gifts', label: 'Gifts' },
  { id: 'Characters', label: 'Characters' },
  { id: 'Videos', label: 'Videos' },
  { id: 'Overlays', label: 'Overlays' },
  { id: 'Transitions', label: 'Transitions' },
  { id: 'Audio', label: 'Audio' },
];

const TARGET_OPTIONS: Array<{ id: BoosteraTarget; label: string }> = [
  { id: 'screen', label: 'כל המסך (Screen)' },
  { id: 'self', label: 'עצמי (Self)' },
  { id: 'rival', label: 'יריב (Rival)' },
  { id: 'supporter', label: 'תומך נבחר (Supporter)' },
  { id: 'player1', label: 'Player 1' },
  { id: 'player2', label: 'Player 2' },
  { id: 'player3', label: 'Player 3' },
  { id: 'player4', label: 'Player 4' },
];

function formatDurationLabel(ms: number, loop: boolean): string {
  if (loop || ms <= 0) return 'קבוע';
  return `${(ms / 1000).toFixed(1)}s`;
}

export const BoosteraEffectsLibrary: React.FC<BoosteraEffectsLibraryProps> = ({
  effects,
  program,
  status,
  wsConnected,
  selectedOpponent,
  onEffectsChanged,
  onApplyProgram,
  onPushLog,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Favorites' | BoosteraEffectCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [targetOverride, setTargetOverride] = useState<BoosteraTarget | 'default'>('default');
  const [copiedCleanFeed, setCopiedCleanFeed] = useState(false);
  const [busyId, setBusyId] = useState<string>('');

  const cleanFeedFullUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/clean-feed';
    return `${window.location.origin}/clean-feed`;
  }, []);

  const filteredEffects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effects.filter((eff) => {
      if (selectedCategory === 'Favorites' && !eff.favorite) return false;
      if (selectedCategory !== 'All' && selectedCategory !== 'Favorites' && eff.category !== selectedCategory) {
        return false;
      }
      if (q) {
        return (
          eff.nameHe.toLowerCase().includes(q) ||
          eff.name.toLowerCase().includes(q) ||
          eff.id.toLowerCase().includes(q) ||
          eff.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [effects, selectedCategory, searchQuery]);

  const handleTrigger = async (eff: BoosteraEffectDefinition, variationIndex?: number) => {
    if (!eff.enabled) {
      onPushLog(`האפקט "${eff.nameHe}" כבוי כרגע — הפעל אותו בכרטיס תחילה`);
      return;
    }
    setBusyId(eff.id);
    const chosenTarget = targetOverride === 'default' ? eff.target : targetOverride;
    const res = await boosteraApi.triggerEffect(eff.id, {
      target: chosenTarget,
      opponentUser: selectedOpponent.replace(/^@/, '') || undefined,
      variationIndex,
    });
    setBusyId('');
    if (res?.ok) {
      onApplyProgram(res.program);
      onPushLog(`הופעל ב-Program Output: ${eff.nameHe}`);
    } else {
      onPushLog(`שגיאה בהפעלת אפקט: ${res?.error || eff.id}`);
    }
  };

  const handleToggleFavorite = async (eff: BoosteraEffectDefinition) => {
    await boosteraApi.updateEffect(eff.id, { favorite: !eff.favorite });
    await onEffectsChanged();
  };

  const handleToggleEnabled = async (eff: BoosteraEffectDefinition) => {
    await boosteraApi.updateEffect(eff.id, { enabled: !eff.enabled });
    await onEffectsChanged();
  };

  const handleToggleRandomVariation = async (eff: BoosteraEffectDefinition) => {
    await boosteraApi.updateEffect(eff.id, { randomVariation: !eff.randomVariation });
    await onEffectsChanged();
  };

  const handleCopyCleanFeed = async () => {
    try {
      await navigator.clipboard.writeText(cleanFeedFullUrl);
      setCopiedCleanFeed(true);
      onPushLog('הועתק קישור ה-Clean Feed (1080×1920) עבור OBS / Virtual Camera');
      setTimeout(() => setCopiedCleanFeed(false), 2000);
    } catch {
      onPushLog('לא ניתן להעתיק אוטומטית בדפדפן זה');
    }
  };

  return (
    <div
      dir="rtl"
      className="w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] overflow-hidden bg-[#0B0E14]"
    >
      {/* RIGHT MAIN WORKSPACE: Server Effects Registry & Category Browser */}
      <section className="flex flex-col h-full overflow-hidden border-b lg:border-b-0 lg:border-l border-slate-800/90">
        {/* Header & Pipeline Gates Readiness (§26) */}
        <div className="px-6 py-4 bg-[#121721]/70 border-b border-slate-800/90 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-100 font-['Rubik',sans-serif]">
                ספריית אפקטים — BOOSTERA Effects Server ({effects.length})
              </h1>
              {/* Zero-Pill Pipeline Gate Statuses (§26) */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5 tabular-nums">
                <span className={status?.gates.gate1PhoneCameraToServer !== false ? 'text-[#16A34A] font-semibold' : 'text-amber-400'}>
                  Gate 1 מצלמה: פעיל
                </span>
                <span aria-hidden="true">·</span>
                <span className={status?.gates.gate2PhoneMicToServer !== false ? 'text-[#16A34A] font-semibold' : 'text-amber-400'}>
                  Gate 2 מיקרופון: מסונכרן
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#16A34A] font-semibold">
                  Gate 3 Program Output: 1080×1920 ({program.currentFps} FPS)
                </span>
                <span aria-hidden="true">·</span>
                <span className={wsConnected ? 'text-[#16A34A] font-semibold' : 'text-amber-400'}>
                  {wsConnected ? 'WebSocket חי (/ws/live)' : 'מתחבר ל-WS...'}
                </span>
              </div>
            </div>

            {/* Search + Target Override */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חיפוש אפקט מהשרת..."
                  aria-label="חיפוש בספריית האפקטים"
                  className="w-48 bg-[#0B0E14] text-slate-100 placeholder:text-slate-500 border border-slate-800 focus:border-[#E5B34B] rounded-lg pr-8 pl-3 py-1.5 text-xs focus:outline-none"
                />
              </div>

              <select
                aria-label="יעד הפעלה (Target)"
                value={targetOverride}
                onChange={(e) => setTargetOverride(e.target.value as BoosteraTarget | 'default')}
                className="bg-[#0B0E14] text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#E5B34B] cursor-pointer"
              >
                <option value="default">יעד ברירת מחדל של האפקט</option>
                {TARGET_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 12 Categories Segmented Filter Bar (§25) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {LIBRARY_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#E5B34B] text-slate-950 font-bold'
                      : 'bg-[#0B0E14] text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Effects Cards Grid (100% Server-Driven, Zero Hardcoded Effects) */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredEffects.length === 0 ? (
            <div className="p-10 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
              <p className="text-sm font-bold text-slate-200">לא נמצאו אפקטים בקטגוריה זו</p>
              <p className="text-xs text-slate-400">נסה לבחור קטגוריה אחרת או לנקות את שדה החיפוש.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEffects.map((eff) => {
                const isRunning = program.activeLayers.some((l) => l.effectId === eff.id);
                const isVideoPreview =
                  Boolean(eff.asset) &&
                  !eff.asset!.startsWith('/api/v1/assets/virtual/') &&
                  /\.(webm|mp4)(\?|$)/i.test(eff.asset!);

                return (
                  <div
                    key={eff.id}
                    className={`p-4 rounded-xl bg-[#121721] border flex flex-col justify-between gap-3 transition-colors ${
                      !eff.enabled
                        ? 'border-slate-800/50 opacity-60'
                        : isRunning
                          ? 'border-[#16A34A]'
                          : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Preview / Thumbnail Frame */}
                      <div className="relative h-28 rounded-lg bg-[#0B0E14] border border-slate-800/80 overflow-hidden flex items-center justify-center">
                        {isVideoPreview ? (
                          <video
                            src={eff.asset}
                            muted
                            loop
                            playsInline
                            preload="metadata"
                            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                            onMouseLeave={(e) => e.currentTarget.pause()}
                            className="w-full h-full object-cover"
                          />
                        ) : eff.thumbnail ? (
                          <img
                            src={eff.thumbnail}
                            alt={eff.nameHe}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center px-3">
                            <div className="text-xs font-extrabold text-[#E5B34B] tracking-wide">
                              {eff.visualPreset?.badgeText || eff.category.toUpperCase()}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {eff.name}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          aria-label={`מועדף ${eff.nameHe}`}
                          onClick={() => handleToggleFavorite(eff)}
                          className="absolute top-2 left-2 p-1.5 rounded-md bg-black/70 text-slate-300 hover:text-[#E5B34B] cursor-pointer"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              eff.favorite ? 'fill-[#E5B34B] text-[#E5B34B]' : ''
                            }`}
                          />
                        </button>
                      </div>

                      {/* Title & Clean Unboxed Metadata */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-100 leading-snug">
                            {eff.nameHe}
                          </h3>
                          <label className="inline-flex items-center gap-1 text-[11px] text-slate-400 shrink-0 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={eff.enabled}
                              onChange={() => handleToggleEnabled(eff)}
                              aria-label={`אפשר ${eff.nameHe}`}
                              className="accent-[#E5B34B]"
                            />
                            <span>{eff.enabled ? 'פעיל' : 'כבוי'}</span>
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-1 tabular-nums">
                          <span>{eff.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>משך: {formatDurationLabel(eff.durationMs, eff.loop)}</span>
                          <span aria-hidden="true">·</span>
                          <span>יעד: {eff.target}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">z:{eff.zIndex}</span>
                        </div>
                      </div>

                      {/* Glove Variations Selector (§7) */}
                      {eff.variations && eff.variations.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">וריאציות כפפה ({eff.variations.length}):</span>
                            <button
                              type="button"
                              onClick={() => handleToggleRandomVariation(eff)}
                              className={`inline-flex items-center gap-1 font-semibold cursor-pointer ${
                                eff.randomVariation !== false ? 'text-[#E5B34B]' : 'text-slate-400'
                              }`}
                            >
                              <Shuffle className="w-3 h-3" />
                              <span>{eff.randomVariation !== false ? 'וריאציה אקראית' : 'קבועה (A)'}</span>
                            </button>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {eff.variations.map((v, idx) => (
                              <button
                                key={v.id}
                                type="button"
                                disabled={!eff.enabled}
                                onClick={() => handleTrigger(eff, idx)}
                                className="py-1 px-1.5 rounded bg-[#0B0E14] hover:bg-[#19202E] border border-slate-800 text-[10px] font-mono text-slate-300 whitespace-nowrap cursor-pointer disabled:opacity-40"
                              >
                                Video {String.fromCharCode(65 + idx)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Primary Trigger / Stop Action */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={!eff.enabled || busyId === eff.id}
                        onClick={() => handleTrigger(eff)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#E5B34B] hover:brightness-105 text-slate-950 font-bold text-xs whitespace-nowrap cursor-pointer disabled:opacity-40"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>הפעל ב-Program</span>
                      </button>

                      {isRunning && (
                        <button
                          type="button"
                          onClick={() =>
                            boosteraApi
                              .stopEffect(eff.id)
                              .then((r) => onApplyProgram(r?.program))
                          }
                          aria-label={`עצור ${eff.nameHe}`}
                          className="p-2 rounded-lg bg-[#DC2626] text-white cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* LEFT SIDEBAR: Authoritative Program Output + Clean Feed URL + Audio Mixer */}
      <aside className="flex flex-col h-full bg-[#121721] overflow-y-auto p-4 space-y-4">
        {/* Real Program Output Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-100 font-['Rubik',sans-serif]">
              BOOSTERA Program Output
            </h2>
            <span className="text-xs font-mono tabular-nums text-slate-400">
              1080×1920 · {program.activeLayers.length} שכבות
            </span>
          </div>

          <div className="w-full max-w-[230px] mx-auto rounded-xl overflow-hidden border border-slate-800 bg-black">
            <ProgramCompositorView program={program} />
          </div>

          {/* Quick Camera Front / Back / Switch */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() =>
                boosteraApi.cameraFront().then((r) => {
                  onApplyProgram(r?.program);
                  onPushLog('מצלמת טלפון: קדמית (Front)');
                })
              }
              className={`py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                program.camera.facing === 'front'
                  ? 'bg-[#19202E] border-[#E5B34B] text-[#E5B34B]'
                  : 'bg-[#0B0E14] border-slate-800 text-slate-300'
              }`}
            >
              קדמית
            </button>
            <button
              type="button"
              onClick={() =>
                boosteraApi.cameraBack().then((r) => {
                  onApplyProgram(r?.program);
                  onPushLog('מצלמת טלפון: אחורית (Back)');
                })
              }
              className={`py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                program.camera.facing === 'back'
                  ? 'bg-[#19202E] border-[#E5B34B] text-[#E5B34B]'
                  : 'bg-[#0B0E14] border-slate-800 text-slate-300'
              }`}
            >
              אחורית
            </button>
            <button
              type="button"
              onClick={() =>
                boosteraApi.cameraSwitch().then((r) => {
                  onApplyProgram(r?.program);
                  onPushLog('הוחלפה מצלמת הטלפון');
                })
              }
              className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#0B0E14] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>החלף</span>
            </button>
          </div>
        </div>

        {/* Clean Feed Endpoint for Virtual Camera / OBS (§18) */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">Clean Feed (ל-Virtual Camera / OBS)</span>
            <span className="text-slate-400">ללא UI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              readOnly
              dir="ltr"
              aria-label="כתובת Clean Feed"
              value={cleanFeedFullUrl}
              className="flex-1 bg-[#0B0E14] text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono select-all"
            />
            <button
              type="button"
              onClick={handleCopyCleanFeed}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
            >
              {copiedCleanFeed ? (
                <Check className="w-3.5 h-3.5 text-[#16A34A]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedCleanFeed ? 'הועתק' : 'העתק'}</span>
            </button>
          </div>
        </div>

        {/* Program Audio Sync & Ducking Mixer (§21) */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">סנכרון סאונד ומיקרופון (Program Audio)</span>
            <button
              type="button"
              onClick={() =>
                boosteraApi
                  .updateAudio({ muted: !program.audio.muted })
                  .then((r) => onApplyProgram(r?.program))
              }
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer ${
                program.audio.muted
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-[#0B0E14] border border-slate-800 text-slate-200'
              }`}
            >
              {program.audio.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{program.audio.muted ? 'מושתק' : 'פעיל'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-12 shrink-0">Gain</span>
            <input
              type="range"
              aria-label="עוצמת Gain למיקרופון"
              min={0.2}
              max={2}
              step={0.05}
              value={program.audio.gain}
              onChange={(e) =>
                boosteraApi
                  .updateAudio({ gain: Number(e.target.value) })
                  .then((r) => onApplyProgram(r?.program))
              }
              className="flex-1 accent-[#E5B34B] cursor-pointer"
            />
            <span className="font-mono tabular-nums w-10 text-left text-slate-300">
              {Math.round(program.audio.gain * 100)}%
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={program.audio.noiseReduction}
                onChange={(e) =>
                  boosteraApi
                    .updateAudio({ noiseReduction: e.target.checked })
                    .then((r) => onApplyProgram(r?.program))
                }
                className="accent-[#E5B34B]"
              />
              <span>סינון רעשים</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={program.audio.ducking}
                onChange={(e) =>
                  boosteraApi
                    .updateAudio({ ducking: e.target.checked })
                    .then((r) => onApplyProgram(r?.program))
                }
                className="accent-[#E5B34B]"
              />
              <span>Ducking אוטומטי</span>
            </label>
          </div>
        </div>

        {/* Active Layers Stack (§11) */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">שכבות פעילות כרגע ב-Program</span>
            {program.activeLayers.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  boosteraApi.stopAllEffects().then((r) => onApplyProgram(r?.program))
                }
                className="text-[#DC2626] font-bold hover:underline cursor-pointer"
              >
                נקה הכל
              </button>
            )}
          </div>

          {program.activeLayers.length === 0 ? (
            <p className="text-xs text-slate-500">
              אין שכבות אפקט פעילות כרגע — זרם המצלמה הנקי משודר.
            </p>
          ) : (
            <div className="space-y-1.5">
              {program.activeLayers.map((layer) => (
                <div
                  key={layer.instanceId}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-800 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-slate-200">{layer.nameHe}</span>
                    <span className="text-slate-500 font-mono text-[11px] mr-1.5">
                      z:{layer.zIndex}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`עצור שכבה ${layer.nameHe}`}
                    onClick={() =>
                      boosteraApi
                        .stopEffect(layer.instanceId)
                        .then((r) => onApplyProgram(r?.program))
                    }
                    className="text-slate-400 hover:text-[#DC2626] cursor-pointer shrink-0"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
