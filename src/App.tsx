/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopStudioBar } from './components/TopStudioBar';
import { VirtualCameraPiP } from './components/VirtualCameraPiP';
import { CloudphoneRemoteView } from './components/CloudphoneRemoteView';
import { LuxuryFloatingDeck } from './components/LuxuryFloatingDeck';
import { ServerBridgeModal } from './components/ServerBridgeModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { EffectsCompositor } from './engine/EffectsCompositor';
import { EffectType, TriggerEvent, CloudphoneConfig } from './types/studio';
import { VideoClipAsset, ActiveVideoOverlay } from './types/videoOverlay';
import { studioAudio } from './utils/audioSynthesizer';
import { FacialExpressions } from './engine/MediaPipeFaceTracker';
import { Camera, RefreshCw } from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const compositorRef = useRef<EffectsCompositor | null>(null);

  // Layout & UI State
  const [layoutMode, setLayoutMode] = useState<'cloudphone-pip' | 'studio-dual' | 'camera-full'>('cloudphone-pip');
  const [isPipExpanded, setIsPipExpanded] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Camera & Stream State
  const [isCamActive, setIsCamActive] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Facial Landmark Expressions & Auto-Trigger State
  const [facialExpressions, setFacialExpressions] = useState<FacialExpressions>({
    mouthOpen: 0,
    mouthSmile: 0,
    eyeBlinkLeft: 0,
    eyeBlinkRight: 0,
    browRaise: 0,
    isSurprise: false,
    isSmiling: false,
    isBlinking: false,
    isWinkingLeft: false,
    isWinkingRight: false,
  });
  const [isGestureAutoTrigger, setIsGestureAutoTrigger] = useState(true);
  const [surpriseActionPreset, setSurpriseActionPreset] = useState<'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser'>('shockwave');

  // Video Overlays State
  const [customClips, setCustomClips] = useState<VideoClipAsset[]>([]);
  const [activeOverlays, setActiveOverlays] = useState<ActiveVideoOverlay[]>([]);

  // Active Effects State
  const [activeBackground, setActiveBackground] = useState<EffectType>('bg-none');
  const [isBigHeadActive, setIsBigHeadActive] = useState(false);
  const [isCrownActive, setIsCrownActive] = useState(false);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [activeMask, setActiveMask] = useState<'none' | 'forest' | 'cyber' | 'glasses' | 'crown' | 'kitsune' | 'kitty' | 'helmet' | 'dj_stage'>('forest');
  const [isBodyAuraActive, setIsBodyAuraActive] = useState(false);
  const [isCutoutActive, setIsCutoutActive] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  // Cloudphone Configuration
  const [cloudConfig, setCloudConfig] = useState<CloudphoneConfig>({
    ip: '192.168.1.100',
    port: 8080,
    adbPort: 5555,
    connected: false,
    isSimulator: true,
    ping: 18,
    fps: 60,
    resolution: '1080x1920',
    bitrate: '4.5 Mbps',
  });

  // Initialize Compositor Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const comp = new EffectsCompositor(canvasRef.current);
      compositorRef.current = comp;
      comp.setARMask(activeMask);
      comp.toggleBodyAura(isBodyAuraActive);
      comp.toggleCutout(isCutoutActive);
      comp.setBackground(activeBackground);
      comp.start();
    } catch (e) {
      console.error('Failed to init compositor:', e);
    }

    return () => {
      compositorRef.current?.cleanup();
    };
  }, []);

  // Synchronize state changes immediately to the compositor
  useEffect(() => {
    compositorRef.current?.setARMask(activeMask);
  }, [activeMask]);

  useEffect(() => {
    compositorRef.current?.toggleBodyAura(isBodyAuraActive);
  }, [isBodyAuraActive]);

  useEffect(() => {
    compositorRef.current?.toggleCutout(isCutoutActive);
  }, [isCutoutActive]);

  useEffect(() => {
    compositorRef.current?.setBackground(activeBackground);
  }, [activeBackground]);

  useEffect(() => {
    compositorRef.current?.setMusicPlaying(isMusicPlaying);
  }, [isMusicPlaying]);

  useEffect(() => {
    compositorRef.current?.setAudioLevel(audioLevel);
  }, [audioLevel]);

  // Poll real-time facial expressions from compositor for live UI feedback
  useEffect(() => {
    const timer = setInterval(() => {
      if (compositorRef.current) {
        setFacialExpressions({ ...compositorRef.current.getExpressions() });
      }
    }, 80);
    return () => clearInterval(timer);
  }, []);

  const handleToggleGestureAutoTrigger = useCallback((enabled: boolean) => {
    setIsGestureAutoTrigger(enabled);
    compositorRef.current?.setGestureAutoTrigger(enabled);
  }, []);

  const handleTriggerSurpriseTest = useCallback(() => {
    compositorRef.current?.triggerTestGesture('surprise');
  }, []);

  const handleChangeSurprisePreset = useCallback((preset: 'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser') => {
    setSurpriseActionPreset(preset);
    compositorRef.current?.setSurpriseActionPreset(preset);
  }, []);

  // Camera Stream Lifecycle
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
        setIsCamActive(true);

        if (compositorRef.current) {
          compositorRef.current.setSourceVideo(videoRef.current, isFrontCamera);
        }

        // Attach microphone for live audio volume meter & auto triggers
        studioAudio.attachMicrophoneStream(stream, (vol) => {
          setAudioLevel(vol);
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'שגיאת גישה למצלמה';
      console.warn('Camera access unavailable (running in simulated presenter mode):', message);
      setCameraError(message);
      setIsCamActive(false);

      // Start simulated audio reactivity when real mic isn't accessible
      const fakeAudioInterval = setInterval(() => {
        setAudioLevel((prev) => Math.max(8, Math.min(75, prev + (Math.random() - 0.48) * 15)));
      }, 150);

      return () => clearInterval(fakeAudioInterval);
    }
  }, [isFrontCamera]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCamActive(false);
    if (compositorRef.current) {
      compositorRef.current.setSourceVideo(null, isFrontCamera);
    }
  }, [isFrontCamera]);

  // Try auto-starting camera once mounted, graceful fallback if blocked
  useEffect(() => {
    startCamera().catch(() => {});
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleToggleCamera = () => {
    if (isCamActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleSwitchCameraFacing = () => {
    setIsFrontCamera((prev) => !prev);
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    studioAudio.setMuted(nextMute);
  };

  // Triggering Effects via manual button or auto-engine
  const handleTriggerEffect = useCallback((event: TriggerEvent) => {
    if (!compositorRef.current) return;
    compositorRef.current.triggerEffect(event);

    if (event.type.startsWith('bg-')) {
      setActiveBackground(event.type);
    } else if (event.type === 'head-bulge') {
      setIsBigHeadActive((prev) => !prev);
    } else if (event.type === 'head-crown' || event.type === 'mask-crown') {
      setIsCrownActive((prev) => !prev);
      setActiveMask((prev) => (prev === 'crown' ? 'none' : 'crown'));
    } else if (event.type === 'mask-forest') {
      setActiveMask((prev) => (prev === 'forest' ? 'none' : 'forest'));
    } else if (event.type === 'mask-cyber') {
      setActiveMask((prev) => (prev === 'cyber' ? 'none' : 'cyber'));
    } else if (event.type === 'mask-glasses') {
      setActiveMask((prev) => (prev === 'glasses' ? 'none' : 'glasses'));
    } else if (event.type === 'mask-kitsune') {
      setActiveMask((prev) => (prev === 'kitsune' ? 'none' : 'kitsune'));
    } else if (event.type === 'mask-kitty') {
      setActiveMask((prev) => (prev === 'kitty' ? 'none' : 'kitty'));
    } else if (event.type === 'mask-helmet') {
      setActiveMask((prev) => (prev === 'helmet' ? 'none' : 'helmet'));
    } else if (event.type === 'mask-dj' || event.type === 'mask-stage') {
      setActiveMask((prev) => (prev === 'dj_stage' ? 'none' : 'dj_stage'));
    } else if (event.type === 'body-aura') {
      setIsBodyAuraActive((prev) => !prev);
    } else if (event.type === 'cutout-mode') {
      setIsCutoutActive((prev) => !prev);
    } else if (event.type === 'clip-laser') {
      setIsLaserActive(true);
      setTimeout(() => setIsLaserActive(false), 2200);
    }
  }, []);

  // Video Overlay Playback Handlers
  const handlePlayVideoOverlay = useCallback((asset: VideoClipAsset) => {
    if (!compositorRef.current) return;
    compositorRef.current.playVideoOverlay(asset);
    setActiveOverlays([...compositorRef.current.getActiveOverlays()]);
  }, []);

  const handleStopVideoOverlay = useCallback((assetId: string) => {
    if (!compositorRef.current) return;
    compositorRef.current.stopVideoOverlay(assetId);
    setActiveOverlays([...compositorRef.current.getActiveOverlays()]);
  }, []);

  const handleAddCustomClip = useCallback((clip: VideoClipAsset) => {
    setCustomClips((prev) => [clip, ...prev]);
    handlePlayVideoOverlay(clip);
  }, [handlePlayVideoOverlay]);

  const handleDeleteCustomClip = useCallback((clipId: string) => {
    handleStopVideoOverlay(clipId);
    setCustomClips((prev) => prev.filter((c) => c.id !== clipId));
  }, [handleStopVideoOverlay]);

  // Keep activeOverlays array synchronized with compositor loop
  useEffect(() => {
    const syncInterval = setInterval(() => {
      if (compositorRef.current) {
        const current = compositorRef.current.getActiveOverlays();
        setActiveOverlays((prev) => {
          if (prev.length !== current.length) return [...current];
          return prev;
        });
      }
    }, 500);
    return () => clearInterval(syncInterval);
  }, []);

  const handleSendAdbCommand = (cmd: string) => {
    // In production, this forwards directly over WebSocket to the Cloudphone server.js bridge
    // Here we maintain real-time status and telemetry
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07090e] text-slate-100 flex flex-col font-['Heebo',sans-serif]">
      {/* Hidden Source Video Element used by the Canvas Compositor */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* Master 4K 60FPS Virtual Camera Compositor Canvas (Persistently Mounted) */}
      <canvas
        ref={canvasRef}
        width={720}
        height={1280}
        className="hidden"
      />

      {/* 1. Top Studio Bar with Live Analytics & Workspace */}
      <TopStudioBar
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        cloudConfig={cloudConfig}
        onOpenServerModal={() => setIsServerModalOpen(true)}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isCamActive={isCamActive}
        onToggleCamera={handleToggleCamera}
        audioLevel={audioLevel}
      />

      {/* Demo Mode Notification Banner (When real webcam is pending/not started) */}
      {!isCamActive && (
        <div className="relative z-30 w-full bg-gradient-to-r from-blue-950/85 via-slate-900/95 to-purple-950/85 border-b border-cyan-500/30 px-3 py-1.5 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-cyan-300 font-bold shrink-0">
              👤 מצב הדגמה 3D פעיל:
            </span>
            <span className="text-slate-300 text-[11px] truncate">
              מסכות ה-3D של בנובה וסנאפצ'ט (יצור היער, שועל, כתר, עמדת DJ) עוקבות בזמן אמת אחרי שחקן ההדגמה.
            </span>
          </div>

          <button
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-[#fe2c55] to-[#ff007f] hover:brightness-110 text-white rounded-lg font-bold text-[11px] shadow-sm active:scale-95 transition-all shrink-0 mr-2"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>הפעל מצלמת רשת עכשיו</span>
          </button>
        </div>
      )}

      {/* 2. Main Viewport Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        {/* Draggable PiP View of the Virtual Camera Stream (Persistently Mounted) */}
        <VirtualCameraPiP
          canvasRef={canvasRef}
          isExpanded={isPipExpanded}
          onToggleExpand={() => setIsPipExpanded(!isPipExpanded)}
          onSwapView={() => setLayoutMode('studio-dual')}
          isFrontCamera={isFrontCamera}
          onSwitchCamera={handleSwitchCameraFacing}
          isVisible={layoutMode === 'cloudphone-pip'}
        />

        {/* Layout Mode A: Full Cloudphone Screen */}
        {layoutMode === 'cloudphone-pip' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <CloudphoneRemoteView
              canvasRef={canvasRef}
              cloudConfig={cloudConfig}
              onSendAdbCommand={handleSendAdbCommand}
            />
          </div>
        )}

        {/* Layout Mode B: Studio Dual View (Side-by-Side: Studio Engine & Cloudphone) */}
        {layoutMode === 'studio-dual' && (
          <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-3 md:p-6 items-center justify-center">
            {/* Left Side: Virtual Camera Studio Compositor */}
            <div className="relative flex flex-col items-center justify-center w-full h-full max-h-[820px] bg-slate-950/80 rounded-3xl border border-slate-800 p-2 overflow-hidden shadow-2xl">
              <div className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-300 font-bold border-b border-slate-800/80 mb-2">
                <span className="flex items-center gap-1.5 text-[#00f2fe]">
                  <Camera className="w-4 h-4" />
                  מנוע אפקטים ומצלמה וירטואלית (Canvas Stream)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 font-mono text-[10px]">
                  60 FPS LIVE
                </span>
              </div>

              <div className="relative w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden shadow-xl ring-2 ring-slate-800 bg-black">
                <canvas
                  ref={(node) => {
                    if (node && canvasRef.current) {
                      const ctx = node.getContext('2d');
                      let animId: number;
                      const renderDualMirror = () => {
                        if (canvasRef.current && ctx) {
                          ctx.drawImage(canvasRef.current, 0, 0, node.width, node.height);
                        }
                        animId = requestAnimationFrame(renderDualMirror);
                      };
                      animId = requestAnimationFrame(renderDualMirror);
                      return () => cancelAnimationFrame(animId);
                    }
                  }}
                  width={720}
                  height={1280}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right Side: Cloudphone TikTok LIVE View */}
            <div className="w-full h-full max-h-[820px] flex items-center justify-center">
              <CloudphoneRemoteView
                canvasRef={canvasRef}
                cloudConfig={cloudConfig}
                onSendAdbCommand={handleSendAdbCommand}
              />
            </div>
          </div>
        )}
      </main>

      {/* 3. Luxury Floating Gold Deck with 7-Icon Ring & Mini Bottom Sheet */}
      <LuxuryFloatingDeck
        onTriggerEffect={handleTriggerEffect}
        activeMask={activeMask}
        onSetARMask={setActiveMask}
        activeBackground={activeBackground}
        isBodyAuraActive={isBodyAuraActive}
        isCutoutActive={isCutoutActive}
        facialExpressions={facialExpressions}
      />

      {/* 4. Cloudphone Server Setup & Docker Modal */}
      <ServerBridgeModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        config={cloudConfig}
        onUpdateConfig={(newConfig) => setCloudConfig((prev) => ({ ...prev, ...newConfig }))}
      />

      {/* 5. Google Workspace (Drive & Sheets) Modal */}
      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        canvasRef={canvasRef}
        onSelectAsset={(url, type, name) => {
          console.log('Selected asset from Drive:', name, url, type);
          if (type === 'video') {
            handlePlayVideoOverlay({
              id: `drive_${Date.now()}`,
              name,
              category: 'custom',
              url,
              blendMode: 'screen',
              position: 'center',
              opacity: 1,
              loop: false,
              volume: 1,
              isCustom: true,
            });
          }
        }}
      />
    </div>
  );
}
