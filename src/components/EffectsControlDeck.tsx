import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Sparkles,
  Flame,
  Crown,
  Coins,
  Smile,
  Sliders,
  ChevronDown,
  ChevronUp,
  Radio,
  Layers,
  Wand2,
  Film,
  UserCheck,
  Scissors,
} from 'lucide-react';
import { EffectType, TriggerEvent } from '../types/studio';
import { VideoClipAsset, ActiveVideoOverlay } from '../types/videoOverlay';
import { VideoOverlayDeck } from './VideoOverlayDeck';
import { LyriaMusicDeck } from './LyriaMusicDeck';
import { FacialExpressions } from '../engine/MediaPipeFaceTracker';
import { Music, Disc } from 'lucide-react';

interface EffectsControlDeckProps {
  onTriggerEffect: (event: TriggerEvent) => void;
  audioLevel: number;
  activeBackground: EffectType;
  isBigHeadActive: boolean;
  isCrownActive: boolean;
  isLaserActive: boolean;
  activeMask?: 'none' | 'forest' | 'cyber' | 'glasses' | 'crown' | 'kitsune' | 'kitty' | 'helmet' | 'dj_stage';
  isBodyAuraActive?: boolean;
  isCutoutActive?: boolean;
  onPlayVideoOverlay: (asset: VideoClipAsset) => void;
  onStopVideoOverlay: (assetId: string) => void;
  activeOverlays: ActiveVideoOverlay[];
  customClips: VideoClipAsset[];
  onAddCustomClip: (clip: VideoClipAsset) => void;
  onDeleteCustomClip: (clipId: string) => void;
  facialExpressions?: FacialExpressions;
  isGestureAutoTrigger?: boolean;
  onToggleGestureAutoTrigger?: (enabled: boolean) => void;
  onTriggerSurpriseTest?: () => void;
  surpriseActionPreset?: 'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser';
  onChangeSurpriseActionPreset?: (preset: 'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser') => void;
  onMusicPlayingChange?: (isPlaying: boolean) => void;
}

export const EffectsControlDeck: React.FC<EffectsControlDeckProps> = ({
  onTriggerEffect,
  audioLevel,
  activeBackground,
  isBigHeadActive,
  isCrownActive,
  isLaserActive,
  activeMask = 'none',
  isBodyAuraActive = false,
  isCutoutActive = false,
  onPlayVideoOverlay,
  onStopVideoOverlay,
  activeOverlays,
  customClips,
  onAddCustomClip,
  onDeleteCustomClip,
  facialExpressions,
  isGestureAutoTrigger = true,
  onToggleGestureAutoTrigger,
  onTriggerSurpriseTest,
  surpriseActionPreset = 'shockwave',
  onChangeSurpriseActionPreset,
  onMusicPlayingChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'masks' | 'music' | 'punches' | 'heads' | 'clips' | 'backgrounds' | 'auto'>('masks');

  // Auto Mode Settings
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [micThreshold, setMicThreshold] = useState(65);
  const [autoTimerInterval, setAutoTimerInterval] = useState<number>(5); // seconds (0 = off)
  const lastAutoTriggerRef = useRef<number>(0);

  // Auto trigger loop based on audio peak or timer
  useEffect(() => {
    if (!isAutoMode) return;

    const timer = setInterval(() => {
      const now = Date.now();

      // Check audio peak threshold
      const hasAudioSpike = audioLevel >= micThreshold;
      const isTimerDue = autoTimerInterval > 0 && now - lastAutoTriggerRef.current >= autoTimerInterval * 1000;

      if ((hasAudioSpike || isTimerDue) && now - lastAutoTriggerRef.current > 1400) {
        lastAutoTriggerRef.current = now;

        const autoEffects: EffectType[] = [
          'punch-comic',
          'punch-combo',
          'punch-fire',
          'clip-coins',
          'clip-confetti',
          'clip-laser',
        ];
        const randomEffect = autoEffects[Math.floor(Math.random() * autoEffects.length)];

        onTriggerEffect({
          id: Math.random().toString(),
          type: randomEffect,
          timestamp: now,
          label: 'טריגר אוטומטי (Auto Mode)',
        });
      }
    }, 200);

    return () => clearInterval(timer);
  }, [isAutoMode, audioLevel, micThreshold, autoTimerInterval, onTriggerEffect]);

  const handleTrigger = (type: EffectType, label: string) => {
    onTriggerEffect({
      id: Math.random().toString(),
      type,
      timestamp: Date.now(),
      label,
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-0 inset-x-0 z-30 flex flex-col items-center justify-end px-2 md:px-6 pb-2 md:pb-4 pointer-events-none"
    >
      {/* Control Deck Floating Container */}
      <div className="w-full max-w-4xl bg-[#0c0f17]/95 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300">
        {/* Header / Tab Navigation Strip */}
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 bg-slate-900/90 border-b border-slate-800/80">
          {/* Tab Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                setActiveTab('videos');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'videos' && !isCollapsed
                  ? 'bg-gradient-to-r from-[#fe2c55] via-[#ff007f] to-[#00f2fe] text-white shadow-md shadow-[#fe2c55]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>הלבשת וידאו (Overlays)</span>
              {activeOverlays.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('masks');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'masks' && !isCollapsed
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-[#fe2c55] text-white shadow-md shadow-pink-500/30'
                  : (activeMask !== 'none' || isBodyAuraActive || isCutoutActive)
                  ? 'bg-pink-950/60 text-pink-300 border border-pink-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>מסכות AR וגוף (AR & Body)</span>
              {(activeMask !== 'none' || isBodyAuraActive || isCutoutActive) && (
                <span className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('music');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'music' && !isCollapsed
                  ? 'bg-gradient-to-r from-[#fe2c55] via-[#ff007f] to-[#00f2fe] text-white shadow-md shadow-[#fe2c55]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>מוזיקה ב-AI (Lyria)</span>
              <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-[#00f2fe]">PRO</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('punches');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'punches' && !isCollapsed
                  ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff0055] text-white shadow-md shadow-[#fe2c55]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>אגרופים (Punches)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('heads');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'heads' && !isCollapsed
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>ראשים (Head FX)</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('clips');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'clips' && !isCollapsed
                  ? 'bg-gradient-to-r from-[#00f2fe] to-[#00c0f9] text-slate-950 shadow-md shadow-[#00f2fe]/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>קליפים ומדבקות</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('backgrounds');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'backgrounds' && !isCollapsed
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>רקעים דינמיים</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('auto');
                setIsCollapsed(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'auto' && !isCollapsed
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/30'
                  : isAutoMode
                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>אוטומציה וקול</span>
              {isAutoMode && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
          </div>

          {/* Minimize / Maximize Deck */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0 ml-2"
            title={isCollapsed ? 'פתח לוח אפקטים' : 'מזער לוח אפקטים'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Tab Content Body */}
        {!isCollapsed && (
          <div className="p-3 md:p-4">
            {/* 0. הלבשת וידאו (Video Overlays) Tab */}
            {activeTab === 'videos' && (
              <VideoOverlayDeck
                onPlayVideoOverlay={onPlayVideoOverlay}
                onStopVideoOverlay={onStopVideoOverlay}
                activeOverlays={activeOverlays}
                customClips={customClips}
                onAddCustomClip={onAddCustomClip}
                onDeleteCustomClip={onDeleteCustomClip}
              />
            )}

            {/* 1. מסכות AR וגוף (AR Face Masks & Body Tracking) */}
            {activeTab === 'masks' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-semibold">
                  <span>זיהוי פנים וגוף אופטי 4K (עוקב בזמן אמת אחרי תנועות הראש והגוף):</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    60 FPS TRACKING ACTIVE
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* 1. Banuba Forest Beast / Stag Druid ("הוא ביער") */}
                  <button
                    onClick={() => handleTrigger('mask-forest', 'יצור היער 3D (Banuba)')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'forest'
                        ? 'bg-gradient-to-b from-emerald-500/35 via-teal-900/60 to-slate-900 border-emerald-400 text-white shadow-emerald-500/30 ring-1 ring-emerald-400'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-emerald-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl mb-1.5">
                      🌲
                    </div>
                    <span className="text-xs font-extrabold text-white">יצור היער 3D (Banuba)</span>
                    <span className="text-[10px] text-emerald-300/80 font-medium">
                      {activeMask === 'forest' ? 'פעיל כעת ✓' : 'קרני אייל ענקיות + רונות ורוחות יער'}
                    </span>
                  </button>

                  {/* 2. Japanese Kitsune Spirit Fox */}
                  <button
                    onClick={() => handleTrigger('mask-kitsune', 'שועל קיטסונה 3D')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'kitsune'
                        ? 'bg-gradient-to-b from-amber-500/35 via-orange-950/60 to-slate-900 border-amber-400 text-white shadow-amber-500/30 ring-1 ring-amber-400'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-amber-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl mb-1.5">
                      🦊
                    </div>
                    <span className="text-xs font-extrabold text-white">שועל קיטסונה 3D</span>
                    <span className="text-[10px] text-amber-300/80 font-medium">
                      {activeMask === 'kitsune' ? 'פעיל כעת ✓' : 'פורצלן יפני + אוזניים תלת-ממדיות'}
                    </span>
                  </button>

                  {/* 3. Cyber Oni Mask */}
                  <button
                    onClick={() => handleTrigger('mask-cyber', 'שד סייבר-אוני 3D')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'cyber'
                        ? 'bg-gradient-to-b from-[#fe2c55]/30 to-slate-900 border-[#fe2c55] text-white shadow-[#fe2c55]/30 ring-1 ring-[#fe2c55]'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-[#fe2c55]/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#fe2c55]/20 flex items-center justify-center text-xl mb-1.5">
                      👹
                    </div>
                    <span className="text-xs font-extrabold text-white">שד סייבר-אוני 3D</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeMask === 'cyber' ? 'פעיל כעת ✓' : 'קרני כרום + שריון וניבים'}
                    </span>
                  </button>

                  {/* Cyber Glasses */}
                  <button
                    onClick={() => handleTrigger('mask-glasses', 'משקפי סייבר HUD')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'glasses'
                        ? 'bg-gradient-to-b from-[#00f2fe]/30 to-slate-900 border-[#00f2fe] text-white shadow-[#00f2fe]/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-[#00f2fe]/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00f2fe]/20 flex items-center justify-center text-xl mb-1.5">
                      🕶️
                    </div>
                    <span className="text-xs font-extrabold text-white">משקפי סייבר HUD</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeMask === 'glasses' ? 'פעיל כעת ✓' : 'עדשות הולוגרמה עם סריקה'}
                    </span>
                  </button>

                  {/* 3D Gold Crown */}
                  <button
                    onClick={() => handleTrigger('mask-crown', 'כתר מלכות זהב 3D')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'crown'
                        ? 'bg-gradient-to-b from-amber-500/30 to-slate-900 border-amber-400 text-white shadow-amber-500/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-amber-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl mb-1.5">
                      👑
                    </div>
                    <span className="text-xs font-extrabold text-white">כתר זהב מלכותי 3D</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeMask === 'crown' ? 'פעיל כעת ✓' : 'כתר משובץ אבני אודם ויהלומים'}
                    </span>
                  </button>

                  {/* Kawaii TikTok Kitty */}
                  <button
                    onClick={() => handleTrigger('mask-kitty', 'אוזני חתול TikTok')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'kitty'
                        ? 'bg-gradient-to-b from-pink-500/30 to-slate-900 border-pink-400 text-white shadow-pink-500/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-pink-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-xl mb-1.5">
                      🐱
                    </div>
                    <span className="text-xs font-extrabold text-white">אוזני חתול TikTok</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeMask === 'kitty' ? 'פעיל כעת ✓' : 'אוזניים ורודות + אף ושפם'}
                    </span>
                  </button>

                  {/* Cyber Mecha Helmet */}
                  <button
                    onClick={() => handleTrigger('mask-helmet', 'קסדת סייבר 3D')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'helmet'
                        ? 'bg-gradient-to-b from-indigo-500/30 to-slate-900 border-indigo-400 text-white shadow-indigo-500/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-indigo-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-xl mb-1.5">
                      🪖
                    </div>
                    <span className="text-xs font-extrabold text-white">קסדת סייבר 3D</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {activeMask === 'helmet' ? 'פעיל כעת ✓' : 'מגן פנים עתידני מלא'}
                    </span>
                  </button>

                  {/* 3D Cyber DJ Turntable Stage & Equalizer */}
                  <button
                    onClick={() => handleTrigger('mask-dj', 'במת דיג\'יי 3D (Lyria Stage)')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      activeMask === 'dj_stage'
                        ? 'bg-gradient-to-b from-[#00f2fe]/35 via-cyan-950/60 to-slate-900 border-[#00f2fe] text-white shadow-[#00f2fe]/30 ring-1 ring-[#00f2fe]'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-[#00f2fe]/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00f2fe]/20 flex items-center justify-center text-xl mb-1.5">
                      🎧
                    </div>
                    <span className="text-xs font-extrabold text-white">במת DJ תלת-ממדית</span>
                    <span className="text-[10px] text-cyan-300/80 font-medium">
                      {activeMask === 'dj_stage' ? 'פעיל כעת ✓' : 'פטפון מסתובב + אקולייזר מגיב לקול'}
                    </span>
                  </button>

                  {/* Body Energy Aura */}
                  <button
                    onClick={() => handleTrigger('body-aura', 'הילת אש לגוף')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      isBodyAuraActive
                        ? 'bg-gradient-to-b from-cyan-500/30 to-slate-900 border-cyan-400 text-white shadow-cyan-500/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-cyan-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-xl mb-1.5">
                      🥋
                    </div>
                    <span className="text-xs font-extrabold text-white">הילת דרקון לגוף 4K</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isBodyAuraActive ? 'פעיל כעת ✓' : 'הילת פלזמה עוטפת כתפיים וגב'}
                    </span>
                  </button>

                  {/* Live Body Cutout */}
                  <button
                    onClick={() => handleTrigger('cutout-mode', 'חיתוך גוף בלייב')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 shadow-lg ${
                      isCutoutActive
                        ? 'bg-gradient-to-b from-emerald-500/30 to-slate-900 border-emerald-400 text-white shadow-emerald-500/30'
                        : 'bg-slate-850 border-slate-700/80 text-white hover:border-emerald-400/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-xl mb-1.5">
                      <Scissors className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-extrabold text-white">חיתוך גוף בלייב</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {isCutoutActive ? 'חיתוך פועל ✓' : 'בידוד הגוף על גבי רקעים'}
                    </span>
                  </button>

                  {/* Reset All Filters Button */}
                  <button
                    onClick={() => {
                      if (activeMask !== 'none') handleTrigger(`mask-${activeMask}` as EffectType, 'איפוס מסכה');
                      if (isBodyAuraActive) handleTrigger('body-aura', 'איפוס הילה');
                      if (isCutoutActive) handleTrigger('cutout-mode', 'איפוס חיתוך');
                    }}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-xl mb-1.5">
                      ❌
                    </div>
                    <span className="text-xs font-extrabold text-slate-300">איפוס מסכות</span>
                    <span className="text-[10px] text-slate-500">הסרת כל המסכות וההילות</span>
                  </button>
                </div>

                {/* MediaPipe Facial Landmark Listener & Expression Auto-Trigger Deck */}
                <div className="bg-gradient-to-br from-slate-900/90 via-[#0a0f1d]/95 to-slate-900/90 border border-cyan-500/30 rounded-2xl p-3.5 shadow-xl">
                  {/* Panel Header & Auto-Trigger Switch */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-lg">
                        😮
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-white">טריגרים אוטומטיים לפי הבעות פנים</span>
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40">
                            MediaPipe 478 3D Mesh
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          פותחים פה רחב? מופעלת סופת הלם ואפקט הפתעה תלת-ממדי! מחייכים? עפים לבבות ונצנוצים!
                        </p>
                      </div>
                    </div>

                    {/* Auto-Trigger Toggle */}
                    <button
                      onClick={() => onToggleGestureAutoTrigger && onToggleGestureAutoTrigger(!isGestureAutoTrigger)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isGestureAutoTrigger
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isGestureAutoTrigger ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                      <span>{isGestureAutoTrigger ? 'הפעלה אוטומטית: פעילה ✓' : 'הפעלה אוטומטית: כבויה'}</span>
                    </button>
                  </div>

                  {/* Real-Time Facial Landmark Meters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                    {/* 1. Mouth Open / Surprise Meter */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>😮</span>
                          <span>פתיחת פה (הפתעה)</span>
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${
                          facialExpressions?.isSurprise ? 'text-cyan-400 animate-pulse' : 'text-slate-400'
                        }`}>
                          {Math.round((facialExpressions?.mouthOpen || 0) * 100)}%
                        </span>
                      </div>

                      {/* Progress Bar with 48% threshold marker */}
                      <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden my-1">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-[#fe2c55] transition-all duration-75"
                          style={{ width: `${Math.min(100, Math.round((facialExpressions?.mouthOpen || 0) * 100))}%` }}
                        />
                        <div className="absolute top-0 bottom-0 left-[48%] w-0.5 bg-white/40" title="סף הפעלה 48%" />
                      </div>

                      <div className="flex items-center justify-between text-[9px] mt-1">
                        <span className="text-slate-500">סף: 48%</span>
                        {facialExpressions?.isSurprise ? (
                          <span className="text-cyan-400 font-extrabold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">
                            ⚡ הפתעה הופעלה!
                          </span>
                        ) : (
                          <span className="text-slate-500">המתנה לפתיחת פה</span>
                        )}
                      </div>
                    </div>

                    {/* 2. Smile Meter */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>😊</span>
                          <span>חיוך</span>
                        </span>
                        <span className={`text-[11px] font-mono font-bold ${
                          facialExpressions?.isSmiling ? 'text-pink-400 animate-pulse' : 'text-slate-400'
                        }`}>
                          {Math.round((facialExpressions?.mouthSmile || 0) * 100)}%
                        </span>
                      </div>

                      <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden my-1">
                        <div
                          className="h-full bg-gradient-to-r from-pink-500 to-amber-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, Math.round((facialExpressions?.mouthSmile || 0) * 100))}%` }}
                        />
                        <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-white/40" title="סף הפעלה 50%" />
                      </div>

                      <div className="flex items-center justify-between text-[9px] mt-1">
                        <span className="text-slate-500">סף: 50%</span>
                        {facialExpressions?.isSmiling ? (
                          <span className="text-pink-400 font-extrabold bg-pink-950/80 px-1.5 py-0.5 rounded border border-pink-500/40">
                            💖 חיוך זוהה!
                          </span>
                        ) : (
                          <span className="text-slate-500">חייך לקבלת לבבות</span>
                        )}
                      </div>
                    </div>

                    {/* 3. Blink / Wink Meter */}
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-white flex items-center gap-1">
                          <span>😉</span>
                          <span>קריצה ומצמוץ</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {Math.round((((facialExpressions?.eyeBlinkLeft || 0) + (facialExpressions?.eyeBlinkRight || 0)) / 2) * 100)}%
                        </span>
                      </div>

                      <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden my-1">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-75"
                          style={{ width: `${Math.min(100, Math.round((((facialExpressions?.eyeBlinkLeft || 0) + (facialExpressions?.eyeBlinkRight || 0)) / 2) * 100))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] mt-1">
                        <span className="text-slate-500">מצמוץ עוקב</span>
                        {facialExpressions?.isBlinking ? (
                          <span className="text-cyan-400 font-extrabold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40">
                            🌟 נצנוץ כוכבים!
                          </span>
                        ) : facialExpressions?.isWinkingLeft || facialExpressions?.isWinkingRight ? (
                          <span className="text-amber-400 font-extrabold bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                            ✨ קריצה זוהתה!
                          </span>
                        ) : (
                          <span className="text-slate-500">מצמוץ או קריצה</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Surprise Action Preset & Test Button Strip */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap ml-1 font-semibold">אפקט הפתעה:</span>
                      {[
                        { id: 'shockwave', label: '⚡ סופת הלם 3D' },
                        { id: 'combo', label: '💥 אגרוף קומבו' },
                        { id: 'coins', label: '🪙 מטבעות זהב' },
                        { id: 'confetti', label: '🎊 קונפטי' },
                        { id: 'laser', label: '🔴 לייזר סייבר' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => onChangeSurpriseActionPreset && onChangeSurpriseActionPreset(preset.id as any)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                            surpriseActionPreset === preset.id
                              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                              : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Test Surprise Trigger Button */}
                    <button
                      onClick={() => onTriggerSurpriseTest && onTriggerSurpriseTest()}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#fe2c55] via-purple-600 to-[#00f2fe] text-white text-xs font-black shadow-lg shadow-purple-600/30 hover:brightness-110 active:scale-95 transition-all"
                    >
                      <span className="text-base">😮</span>
                      <span>בדוק אפקט הפתעה עכשיו!</span>
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 1.5. מוזיקה ב-AI (Google Lyria AI Music & 3D Stage) */}
            {activeTab === 'music' && (
              <LyriaMusicDeck
                onMusicPlayingChange={onMusicPlayingChange}
                onActivateDJStage={() => handleTrigger('mask-dj', 'במת דיג\'יי 3D')}
                isDJStageActive={activeMask === 'dj_stage'}
              />
            )}

            {/* 2. אגרופים (Punches) Tab */}
            {activeTab === 'punches' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleTrigger('punch-comic', 'אגרוף קומיקס')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-[#fe2c55] text-white group active:scale-95 transition-all shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#fe2c55]/20 group-hover:bg-[#fe2c55] flex items-center justify-center text-xl mb-1.5 transition-colors">
                    👊
                  </div>
                  <span className="text-xs font-extrabold text-white">אגרוף קומיקס</span>
                  <span className="text-[10px] text-slate-400 font-medium">POW! + רעידת מסך</span>
                </button>

                <button
                  onClick={() => handleTrigger('punch-combo', 'סופר קומבו')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-[#00f2fe] text-white group active:scale-95 transition-all shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-[#00f2fe]/20 group-hover:bg-[#00f2fe] flex items-center justify-center text-xl mb-1.5 transition-colors">
                    ⚡
                  </div>
                  <span className="text-xs font-extrabold text-white">סופר קומבו</span>
                  <span className="text-[10px] text-slate-400 font-medium">רצף 3 אגרופים מהיר</span>
                </button>

                <button
                  onClick={() => handleTrigger('punch-fire', 'אגרוף אש')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-amber-500 text-white group active:scale-95 transition-all shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 group-hover:bg-amber-500 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    🔥
                  </div>
                  <span className="text-xs font-extrabold text-white">אגרוף אש</span>
                  <span className="text-[10px] text-slate-400 font-medium">להבות מתפרצות + צליל</span>
                </button>

                <button
                  onClick={() => handleTrigger('punch-ko', 'נוקאאוט K.O')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 hover:border-purple-500 text-white group active:scale-95 transition-all shadow-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 group-hover:bg-purple-500 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    💀
                  </div>
                  <span className="text-xs font-extrabold text-white">נוקאאוט K.O!</span>
                  <span className="text-[10px] text-slate-400 font-medium">זעזוע מסך סופני</span>
                </button>
              </div>
            )}

            {/* 2. ראשים (Head FX) Tab */}
            {activeTab === 'heads' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  onClick={() => handleTrigger('head-bulge', 'ראש ענק')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 text-right ${
                    isBigHeadActive
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-850 border-slate-700/80 text-white hover:border-amber-400/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/30 flex items-center justify-center text-xl shrink-0">
                    🤪
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold">ראש ענק (Bulge)</span>
                    <span className="text-[10px] text-slate-400">
                      {isBigHeadActive ? 'פעיל כעת ✓' : 'הגדלה ועיוות פרצוף'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleTrigger('head-crown', 'כתר מלכות')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 text-right ${
                    isCrownActive
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                      : 'bg-slate-850 border-slate-700/80 text-white hover:border-yellow-400/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/30 flex items-center justify-center text-xl shrink-0">
                    👑
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold">כתר מלכות</span>
                    <span className="text-[10px] text-slate-400">
                      {isCrownActive ? 'פעיל כעת ✓' : 'כתר זהב מרחף מעל הראש'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => handleTrigger('clip-laser', 'עיני לייזר')}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all active:scale-95 text-right ${
                    isLaserActive
                      ? 'bg-[#00f2fe]/20 border-[#00f2fe] text-[#00f2fe]'
                      : 'bg-slate-850 border-slate-700/80 text-white hover:border-[#00f2fe]/60'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00f2fe]/30 flex items-center justify-center text-xl shrink-0">
                    ⚡
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold">עיני לייזר</span>
                    <span className="text-[10px] text-slate-400">קרני לייזר ניאון עוצמתיות</span>
                  </div>
                </button>
              </div>
            )}

            {/* 3. קליפים ומדבקות (Clips & Stickers) Tab */}
            {activeTab === 'clips' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleTrigger('clip-coins', 'מטר מטבעות')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-850 border border-slate-700/80 hover:border-yellow-400 text-white group active:scale-95 transition-all shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-yellow-400/20 group-hover:bg-yellow-400 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    🪙
                  </div>
                  <span className="text-xs font-extrabold">גשם מטבעות זהב</span>
                  <span className="text-[10px] text-slate-400">35 מטבעות עם פיזיקה</span>
                </button>

                <button
                  onClick={() => handleTrigger('clip-confetti', 'פיצוץ קונפטי')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-850 border border-slate-700/80 hover:border-pink-500 text-white group active:scale-95 transition-all shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 group-hover:bg-pink-500 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    🎉
                  </div>
                  <span className="text-xs font-extrabold">פיצוץ קונפטי</span>
                  <span className="text-[10px] text-slate-400">חגיגת מתנות טיקטוק</span>
                </button>

                <button
                  onClick={() => handleTrigger('clip-fire', 'הילת אש')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-850 border border-slate-700/80 hover:border-orange-500 text-white group active:scale-95 transition-all shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 group-hover:bg-orange-500 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    🔥
                  </div>
                  <span className="text-xs font-extrabold">להבות והילת אש</span>
                  <span className="text-[10px] text-slate-400">אש עולה מתחתית המסך</span>
                </button>

                <button
                  onClick={() => handleTrigger('clip-laser', 'עיני לייזר')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-850 border border-slate-700/80 hover:border-cyan-400 text-white group active:scale-95 transition-all shadow-md"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-400/20 group-hover:bg-cyan-400 flex items-center justify-center text-xl mb-1.5 transition-colors">
                    👀
                  </div>
                  <span className="text-xs font-extrabold">קרני לייזר</span>
                  <span className="text-[10px] text-slate-400">צליל זאפ וקרניים זוהרות</span>
                </button>
              </div>
            )}

            {/* 4. רקעים דינמיים (Backgrounds) Tab */}
            {activeTab === 'backgrounds' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  onClick={() => handleTrigger('bg-neon', 'מועדון ניאון')}
                  className={`p-3 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeBackground === 'bg-neon'
                      ? 'bg-purple-950/60 border-[#fe2c55] text-white shadow-lg shadow-[#fe2c55]/20'
                      : 'bg-slate-850 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black">🌃 מועדון ניאון</div>
                  <div className="text-[10px] text-slate-400 mt-1">רשת תלת-מימדית ושמש רטרו</div>
                </button>

                <button
                  onClick={() => handleTrigger('bg-cyber', 'סייברפאנק')}
                  className={`p-3 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeBackground === 'bg-cyber'
                      ? 'bg-cyan-950/60 border-[#00f2fe] text-white shadow-lg shadow-[#00f2fe]/20'
                      : 'bg-slate-850 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black">🤖 סייברפאנק</div>
                  <div className="text-[10px] text-slate-400 mt-1">גשם קוד דיגיטלי כחול</div>
                </button>

                <button
                  onClick={() => handleTrigger('bg-greenscreen', 'גרין סקרין')}
                  className={`p-3 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeBackground === 'bg-greenscreen'
                      ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-lg shadow-emerald-400/20'
                      : 'bg-slate-850 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black">🟩 מסך ירוק</div>
                  <div className="text-[10px] text-slate-400 mt-1">Chroma Key מושלם להזרקה</div>
                </button>

                <button
                  onClick={() => handleTrigger('bg-none', 'ללא רקע (טבעי)')}
                  className={`p-3 rounded-2xl border text-right transition-all active:scale-95 ${
                    activeBackground === 'bg-none'
                      ? 'bg-slate-800 border-slate-500 text-white'
                      : 'bg-slate-850 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="text-base font-black">📹 חדר מקורי</div>
                  <div className="text-[10px] text-slate-400 mt-1">רקע המצלמה הרגיל</div>
                </button>
              </div>
            )}

            {/* 5. אוטומציה וקול (Auto & Mic) Tab */}
            {activeTab === 'auto' && (
              <div className="flex flex-col gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${isAutoMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-white">מנוע טריגרים אוטומטי (Auto Trigger Engine)</span>
                  </div>

                  <button
                    onClick={() => setIsAutoMode(!isAutoMode)}
                    className={`px-3.5 py-1 text-xs font-bold rounded-full transition-all active:scale-95 ${
                      isAutoMode
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isAutoMode ? 'מצב אוטומטי פועל ✓' : 'הפעל מצב אוטומטי'}
                  </button>
                </div>

                {/* Mic Peak Threshold & Visualizer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>רגישות לצעקות / מכות קוליות:</span>
                      <span className="font-mono text-emerald-400 font-bold">{micThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={95}
                      value={micThreshold}
                      onChange={(e) => setMicThreshold(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />

                    {/* Live VU Meter */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-400">ווליום מיקרופון:</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-75 ${
                            audioLevel >= micThreshold ? 'bg-[#fe2c55]' : 'bg-[#00f2fe]'
                          }`}
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 w-7 text-left">{audioLevel}%</span>
                    </div>
                  </div>

                  {/* Periodic Rhythm Timer */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-slate-300">טיימר מקצב אגרופים קבוע:</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { sec: 0, label: 'כבוי' },
                        { sec: 3, label: '3 שנ׳' },
                        { sec: 5, label: '5 שנ׳' },
                        { sec: 8, label: '8 שנ׳' },
                      ].map((item) => (
                        <button
                          key={item.sec}
                          onClick={() => setAutoTimerInterval(item.sec)}
                          className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            autoTimerInterval === item.sec
                              ? 'bg-[#fe2c55] border-[#fe2c55] text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      משגר אפקטים ואגרופים מרהיבים במרווחים קבועים
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
