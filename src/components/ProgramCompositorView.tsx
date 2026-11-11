import React, { useState, useEffect } from 'react';
import { ActiveProgramLayer, BoosteraAnchor, BoosteraTarget, ProgramOutputSnapshot } from '../types/boostera';
import { studioAudio } from '../utils/audioSynthesizer';

interface ProgramCompositorViewProps {
  program: ProgramOutputSnapshot;
  mutedOverride?: boolean;
  cleanFeedMode?: boolean;
}

function zIndexClassFor(zIndex: number): string {
  if (zIndex <= 15) return 'z-[10]';
  if (zIndex <= 25) return 'z-[20]';
  if (zIndex <= 38) return 'z-[30]';
  if (zIndex <= 48) return 'z-[40]';
  if (zIndex <= 58) return 'z-[50]';
  if (zIndex <= 68) return 'z-[60]';
  if (zIndex <= 78) return 'z-[70]';
  if (zIndex <= 88) return 'z-[80]';
  if (zIndex <= 95) return 'z-[90]';
  return 'z-[100]';
}

function anchorPositionClasses(anchor: BoosteraAnchor, target: BoosteraTarget): string {
  if (anchor === 'fullscreen') return 'inset-0 flex items-center justify-center';
  if (anchor === 'top') return 'inset-x-4 top-8 flex flex-col items-center justify-start';
  if (anchor === 'bottom') return 'inset-x-4 bottom-10 flex flex-col items-center justify-end';
  if (anchor === 'left') return 'inset-y-8 left-4 w-1/2 flex items-center justify-start';
  if (anchor === 'right') return 'inset-y-8 right-4 w-1/2 flex items-center justify-end';

  // Target-specific spatial anchoring (§5 & §12: self vs rival vs player1..4 vs supporter)
  if (
    anchor === 'follow_face' ||
    anchor === 'follow_head' ||
    anchor === 'follow_body' ||
    anchor === 'follow_hand' ||
    anchor === 'follow_player'
  ) {
    if (target === 'rival' || target === 'player2') {
      return 'top-[22%] left-3 w-[48%] flex flex-col items-center justify-center';
    }
    if (target === 'player1') {
      return 'top-[22%] right-3 w-[48%] flex flex-col items-center justify-center';
    }
    if (target === 'player3') {
      return 'bottom-[20%] right-3 w-[48%] flex flex-col items-center justify-center';
    }
    if (target === 'player4') {
      return 'bottom-[20%] left-3 w-[48%] flex flex-col items-center justify-center';
    }
    if (anchor === 'follow_head') {
      return 'inset-x-6 top-[14%] flex flex-col items-center justify-center';
    }
    return 'inset-x-6 top-[26%] flex flex-col items-center justify-center';
  }

  return 'inset-0 flex flex-col items-center justify-center p-4';
}

export const ProgramCompositorView: React.FC<ProgramCompositorViewProps> = ({
  program,
  mutedOverride = false,
  cleanFeedMode = false,
}) => {
  const [streamFailed, setStreamFailed] = useState(false);
  const [streamKey, setStreamKey] = useState<number>(() => Date.now());
  const lastSoundInstanceRef = React.useRef<string>('');

  useEffect(() => {
    setStreamFailed(false);
    setStreamKey(Date.now());
  }, [program.sourceStreamUrl, program.sceneMode]);

  // Trigger low-latency synthesized impact/gift audio cue when a non-video SFX layer arrives
  useEffect(() => {
    const isMuted = mutedOverride || program.audio.muted || !program.audio.effectAudioEnabled;
    if (isMuted || program.activeLayers.length === 0) return;

    const newest = program.activeLayers[program.activeLayers.length - 1];
    if (!newest || newest.instanceId === lastSoundInstanceRef.current) return;
    lastSoundInstanceRef.current = newest.instanceId;

    if (newest.audio && !newest.asset) {
      if (newest.category === 'Gloves' || newest.effectId.includes('snipe')) {
        studioAudio.playPunch();
      } else if (newest.category === 'Gifts' || newest.effectId === 'battle_win') {
        studioAudio.playVictoryFanfare();
      } else if (newest.category === 'Battle') {
        studioAudio.playNeonPop();
      }
    }
  }, [program.activeLayers, program.audio.muted, program.audio.effectAudioEnabled, mutedOverride]);

  const cam = program.camera;
  const cameraTransformClasses = [
    'w-full h-full object-cover transition-transform duration-200',
    cam.mirror ? '-scale-x-100' : '',
    cam.zoom > 1.25 ? 'scale-125' : cam.zoom > 1.1 ? 'scale-110' : 'scale-100',
    cam.rotateDeg < 0 ? '-rotate-6' : cam.rotateDeg > 0 ? 'rotate-6' : '',
    cam.cropMode === 'upper_body' ? 'object-top scale-125' : '',
    cam.shake === 'fast'
      ? 'boostera-shake-fast'
      : cam.shake === 'normal'
        ? 'boostera-shake-normal'
        : '',
    cam.punchZoom ? 'boostera-punch-zoom' : '',
    cam.snapZoom ? 'boostera-snap-zoom' : '',
    cam.blurPx > 0 || program.deepAr.backgroundBlur ? 'blur-[3px]' : '',
    cam.glitch ? 'boostera-glitch-fx' : '',
    cam.rgbShift ? 'saturate-200 contrast-125 hue-rotate-15' : '',
    cam.freezeFrame ? 'contrast-110 brightness-105' : '',
    program.deepAr.activeFilterIds.includes('deepar_cinema_warm')
      ? 'sepia-[0.18] contrast-110 saturate-125'
      : '',
    program.deepAr.activeFilterIds.includes('deepar_beauty_natural')
      ? 'brightness-105 saturate-110'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const effectiveMuted = mutedOverride || program.audio.muted;

  return (
    <div
      data-testid="boostera-program-output"
      data-active-layers={program.activeLayers.length}
      data-clean-feed={cleanFeedMode ? '1' : '0'}
      className="relative w-full h-full aspect-[9/16] bg-black overflow-hidden select-none"
    >
      {/* LAYER 10: Background Replacement Layer */}
      {program.backgroundAssetUrl && (
        <div className="absolute inset-0 z-[10] pointer-events-none">
          <img
            src={program.backgroundAssetUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* LAYER 20: Phone / DeepAR / LiveKit Base Camera Stream */}
      <div className="absolute inset-0 z-[20] overflow-hidden flex items-center justify-center bg-black">
        {!streamFailed ? (
          <img
            src={`${program.sourceStreamUrl}${
              program.sourceStreamUrl.includes('?') ? '&' : '?'
            }t=${streamKey}`}
            alt=""
            onError={() => setStreamFailed(true)}
            className={cameraTransformClasses}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-slate-950 via-[#0B0E14] to-slate-950" />
        )}
      </div>

      {/* Focus Vignette Camera Filter */}
      {cam.focusVignette && (
        <div className="absolute inset-0 z-[85] pointer-events-none bg-radial from-transparent via-black/25 to-black/80" />
      )}

      {/* SORTED ACTIVE PROGRAM LAYERS (zIndex 30 -> 100) */}
      {program.activeLayers.map((layer: ActiveProgramLayer) => {
        const zCls = zIndexClassFor(layer.zIndex);
        const posCls = anchorPositionClasses(layer.anchor, layer.target);
        const preset = layer.visualPreset;
        const isVideoAsset =
          Boolean(layer.asset) &&
          !layer.asset!.startsWith('/api/v1/assets/virtual/') &&
          /\.(webm|mp4)(\?|$)/i.test(layer.asset!);
        const isImageAsset =
          Boolean(layer.asset) && /\.(png|webp|gif|jpg|jpeg)(\?|$)/i.test(layer.asset!);

        return (
          <div
            key={layer.instanceId}
            data-layer-id={layer.effectId}
            data-layer-z={layer.zIndex}
            className={`absolute pointer-events-none ${zCls} ${posCls}`}
          >
            {/* 1. Real WebM Alpha / MP4 Video Layer */}
            {isVideoAsset && (
              <video
                src={layer.asset}
                autoPlay
                playsInline
                loop={layer.loop}
                muted={effectiveMuted || !layer.audio}
                className={
                  layer.anchor === 'fullscreen'
                    ? 'w-full h-full object-cover'
                    : 'max-w-[92%] max-h-[82%] object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.75)]'
                }
              />
            )}

            {/* 2. PNG / WebP / Animated WebP Overlay Layer */}
            {isImageAsset && (
              <img
                src={layer.asset}
                alt=""
                referrerPolicy="no-referrer"
                className={
                  layer.anchor === 'fullscreen'
                    ? 'w-full h-full object-cover'
                    : 'max-w-[88%] max-h-[75%] object-contain'
                }
              />
            )}

            {/* 3. TikTok Universe Circle / Cosmic Portal Gift Overlay (§9) */}
            {preset?.animationStyle === 'universe_ring' && (
              <div className="relative flex items-center justify-center w-[78%] aspect-square max-w-[340px]">
                <div className="absolute inset-0 rounded-full border-4 border-[#E5B34B] shadow-[0_0_55px_rgba(229,179,75,0.8)] boostera-universe-ring" />
                <div className="absolute inset-3 rounded-full border-2 border-dashed border-sky-400/90 boostera-universe-ring" />
                <div className="absolute inset-7 rounded-full bg-radial from-[#E5B34B]/30 via-sky-500/15 to-transparent" />
                <div className="relative z-10 text-center px-4 py-2 rounded-xl bg-black/75 border border-[#E5B34B]/80 animate-combo-pop">
                  <div className="text-sm md:text-base font-black tracking-wider text-[#E5B34B]">
                    {preset.badgeText || layer.name}
                  </div>
                  {preset.subtitleText && (
                    <div className="text-[11px] font-bold text-slate-100 mt-0.5">
                      {preset.subtitleText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Glove ×2 / ×3 / ×5 & Snipe Impact Graphic */}
            {preset?.animationStyle === 'glove_impact' && (
              <div className="px-5 py-3 rounded-2xl bg-gradient-to-tr from-red-700/95 via-amber-500/95 to-yellow-300/95 border-2 border-white/80 text-slate-950 shadow-[0_14px_40px_rgba(239,68,68,0.7)] text-center animate-combo-pop">
                <div className="text-lg md:text-2xl font-black tracking-tight">
                  {preset.badgeText || layer.name}
                </div>
                {(layer.variationLabel || preset.subtitleText) && (
                  <div className="text-[11px] font-extrabold text-slate-950/90 mt-0.5">
                    {layer.variationLabel || preset.subtitleText}
                  </div>
                )}
              </div>
            )}

            {/* 5. Battle / Score / Gift / Tracking Stage Graphics */}
            {(preset?.animationStyle === 'battle_banner' ||
              preset?.animationStyle === 'score_pulse' ||
              preset?.animationStyle === 'gift_burst' ||
              preset?.animationStyle === 'tracking_reticle' ||
              preset?.animationStyle === 'deepar_aura') && (
              <div
                className={`px-4 py-2.5 rounded-xl bg-black/80 backdrop-blur-md border text-center animate-combo-pop ${
                  preset.animationStyle === 'tracking_reticle'
                    ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                    : 'border-[#E5B34B] shadow-[0_10px_30px_rgba(0,0,0,0.7)]'
                }`}
              >
                <div className="text-sm md:text-lg font-black text-[#E5B34B] tracking-wide">
                  {preset.badgeText || layer.nameHe}
                </div>
                {preset.subtitleText && (
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {preset.subtitleText}
                  </div>
                )}
                {layer.opponentUser && (
                  <div dir="ltr" className="text-[11px] font-bold text-slate-300 mt-0.5">
                    @{layer.opponentUser}
                  </div>
                )}
              </div>
            )}

            {/* 6. Fullscreen Camera Flash / Stinger Transition (§11 Layer 100) */}
            {preset?.animationStyle === 'stinger_flash' && (
              <div className="absolute inset-0 bg-gradient-to-tr from-[#E5B34B]/90 via-white to-amber-200 boostera-flash-overlay" />
            )}
          </div>
        );
      })}

      {/* Immediate Camera Flash Flag */}
      {cam.flash && (
        <div className="absolute inset-0 z-[100] bg-white pointer-events-none boostera-flash-overlay" />
      )}
    </div>
  );
};
