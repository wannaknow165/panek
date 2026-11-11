/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TopStudioBar, StudioViewMode } from './components/TopStudioBar';
import { LiveBattleCockpit } from './components/LiveBattleCockpit';
import { BoosteraEffectsLibrary } from './components/BoosteraEffectsLibrary';
import { ChinoStudioPanel } from './components/ChinoStudioPanel';
import { PlayersAndSpecialsPanel } from './components/PlayersAndSpecialsPanel';
import { MediaAndPhoneWorkspace } from './components/MediaAndPhoneWorkspace';
import { CleanProgramFeedPage } from './components/CleanProgramFeedPage';
import { LuxuryFloatingDeck } from './components/LuxuryFloatingDeck';
import { ServerBridgeModal } from './components/ServerBridgeModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { EffectsCompositor } from './engine/EffectsCompositor';
import { EffectType, TriggerEvent, CloudphoneConfig } from './types/studio';
import { VideoClipAsset } from './types/videoOverlay';
import { studioAudio } from './utils/audioSynthesizer';
import { FacialExpressions } from './engine/MediaPipeFaceTracker';
import { useArielRealtime } from './services/arielApi';
import { boosteraApi, useBoosteraRealtime } from './services/boosteraApi';

export default function App() {
  // Dedicated Clean Feed Route (/clean-feed — 1080×1920 Chromeless Program Output for Virtual Camera / OBS)
  const isCleanFeedRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/clean-feed';

  if (isCleanFeedRoute) {
    return <CleanProgramFeedPage />;
  }

  return <BoosteraStudioShell />;
}

function BoosteraStudioShell() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const compositorRef = useRef<EffectsCompositor | null>(null);

  // Authoritative BOOSTERA Effects Server (/api/v1/* + /ws/live)
  const {
    program,
    effects,
    status: boosteraStatus,
    wsConnected,
    wsEvents,
    refreshBoosteraCatalog,
    applyImmediateProgram,
  } = useBoosteraRealtime();

  // Upstream Phone / Chino / Players Data Sync
  const {
    snapshot,
    pushLog,
    refreshAll,
    refreshOverlaysAndRoster,
  } = useArielRealtime();

  const [layoutMode, setLayoutMode] = useState<StudioViewMode>('live-battle');
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  // Local Webcam & Audio State
  const [isCamActive, setIsCamActive] = useState(false);
  const [isFrontCamera] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Real-time Facial Landmark Expressions from MediaPipeFaceTracker
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

  // Local AR Engine State (Untouched engines: MediaPipeFaceTracker, ThreeFaceAREngine, EffectsCompositor, ChromaKey)
  const [activeBackground, setActiveBackground] = useState<EffectType>('bg-none');
  const [activeMask, setActiveMask] = useState<
    'none' | 'forest' | 'cyber' | 'glasses' | 'crown' | 'kitsune' | 'kitty' | 'helmet' | 'dj_stage'
  >('none');
  const [isBodyAuraActive, setIsBodyAuraActive] = useState(false);
  const [isCutoutActive, setIsCutoutActive] = useState(false);

  const [cloudConfig, setCloudConfig] = useState<CloudphoneConfig>({
    ip: '127.0.0.1',
    port: 7777,
    adbPort: 5555,
    connected: true,
    isSimulator: false,
    ping: 0,
    fps: 60,
    resolution: '1080x1920',
    bitrate: '4.5 Mbps',
  });

  // Initialize Local 3D/AR Compositor Engine once
  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      const comp = new EffectsCompositor(canvasRef.current);
      compositorRef.current = comp;
      comp.setARMask(activeMask);
      comp.toggleBodyAura(isBodyAuraActive);
      comp.toggleCutout(isCutoutActive);
      comp.setBackground(activeBackground);
    } catch (e) {
      console.error('Failed to init compositor:', e);
    }

    return () => {
      compositorRef.current?.cleanup();
    };
  }, []);

  useEffect(() => {
    const comp = compositorRef.current;
    if (!comp) return;
    if (isCamActive) {
      comp.start();
    } else {
      comp.stop();
    }
  }, [isCamActive]);

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
    compositorRef.current?.setAudioLevel(audioLevel);
  }, [audioLevel]);

  useEffect(() => {
    if (!isCamActive) return;
    const timer = setInterval(() => {
      if (compositorRef.current) {
        setFacialExpressions({ ...compositorRef.current.getExpressions() });
      }
    }, 120);
    return () => clearInterval(timer);
  }, [isCamActive]);

  const startCamera = useCallback(async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const prevStream = videoRef.current.srcObject as MediaStream;
        prevStream.getTracks().forEach((t) => t.stop());
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
        await videoRef.current.play().catch(() => {});
        setIsCamActive(true);
        compositorRef.current?.setSourceVideo(videoRef.current, isFrontCamera);
        studioAudio.attachMicrophoneStream(stream, (vol) => {
          setAudioLevel(vol);
        });
        pushLog('מצלמת רשת מקומית הופעלה');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'לא ניתן לגשת למצלמה';
      setIsCamActive(false);
      pushLog(`מצלמה: ${message}`);
    }
  }, [isFrontCamera, pushLog]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCamActive(false);
    setAudioLevel(0);
    compositorRef.current?.setSourceVideo(null, isFrontCamera);
  }, [isFrontCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleToggleCamera = () => {
    if (isCamActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleToggleMute = async () => {
    const nextMute = !program.audio.muted;
    setIsMuted(nextMute);
    studioAudio.setMuted(nextMute);
    const res = await boosteraApi.updateAudio({ muted: nextMute });
    applyImmediateProgram(res?.program);
  };

  // Emergency Stop All via BOOSTERA Effects Server (/api/v1/effects/stop-all)
  const handleStopAllEverywhere = useCallback(async () => {
    pushLog('עוצר את כל האפקטים והשכבות ב-BOOSTERA Program Output...');
    const res = await boosteraApi.stopAllEffects();
    applyImmediateProgram(res?.program);
    await refreshAll();
    pushLog('נוקו כל האפקטים והסרטונים מ-Program Output');
  }, [applyImmediateProgram, pushLog, refreshAll]);

  const handleTriggerEffect = useCallback((event: TriggerEvent) => {
    if (!compositorRef.current) return;
    compositorRef.current.triggerEffect(event);

    if (event.type.startsWith('bg-')) {
      setActiveBackground(event.type);
    } else if (event.type === 'head-crown' || event.type === 'mask-crown') {
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
    }
  }, []);

  const handlePlayVideoOverlay = useCallback(
    async (asset: VideoClipAsset) => {
      compositorRef.current?.playVideoOverlay(asset);
      const res = await boosteraApi.playOverlay({
        id: asset.id,
        name: asset.name,
        asset: asset.url,
        loop: asset.loop,
        audio: asset.volume > 0,
      });
      applyImmediateProgram(res?.program);
    },
    [applyImmediateProgram]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0B0E14] text-slate-100 flex flex-col font-['Heebo',sans-serif]">
      {/* Hidden Source Video & Persistent Local AR Compositor Canvas */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />
      <canvas ref={canvasRef} width={720} height={1280} className="hidden" />

      {/* Clean 3-Zone Top Studio Header */}
      <TopStudioBar
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        onStopAll={handleStopAllEverywhere}
      />

      {/* Active Workspace Viewport */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {layoutMode === 'live-battle' && (
          <LiveBattleCockpit
            snapshot={snapshot}
            program={program}
            effects={effects}
            wsConnected={wsConnected}
            wsEvents={wsEvents}
            onApplyProgram={applyImmediateProgram}
            selectedOpponent={selectedOpponent || snapshot.desk.opponent}
            onSelectOpponent={setSelectedOpponent}
            onRefreshOverlays={async () => {
              await refreshOverlaysAndRoster();
              await refreshBoosteraCatalog();
            }}
            onRefreshAll={refreshAll}
            onPushLog={pushLog}
            onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
            localArCanvasRef={canvasRef}
            isCamActive={isCamActive}
            onToggleCamera={handleToggleCamera}
            isMuted={program.audio.muted || isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {layoutMode === 'effects-library' && (
          <BoosteraEffectsLibrary
            effects={effects}
            program={program}
            status={boosteraStatus}
            wsConnected={wsConnected}
            selectedOpponent={selectedOpponent || snapshot.desk.opponent}
            onEffectsChanged={refreshBoosteraCatalog}
            onApplyProgram={applyImmediateProgram}
            onPushLog={pushLog}
          />
        )}

        {layoutMode === 'chino-host' && (
          <ChinoStudioPanel
            snapshot={snapshot}
            onRefreshAll={refreshAll}
            onRefreshOverlays={refreshOverlaysAndRoster}
            onPushLog={pushLog}
          />
        )}

        {layoutMode === 'players-factory' && (
          <PlayersAndSpecialsPanel
            snapshot={snapshot}
            selectedOpponent={selectedOpponent || snapshot.desk.opponent}
            onSelectOpponent={setSelectedOpponent}
            onJumpToLiveBattle={() => setLayoutMode('live-battle')}
            onRefreshOverlays={refreshOverlaysAndRoster}
            onPushLog={pushLog}
          />
        )}

        {layoutMode === 'media-phone' && (
          <MediaAndPhoneWorkspace
            snapshot={snapshot}
            program={program}
            effects={effects}
            onApplyProgram={applyImmediateProgram}
            canvasRef={canvasRef}
            isCamActive={isCamActive}
            onToggleCamera={handleToggleCamera}
            activeMask={activeMask}
            onSetARMask={setActiveMask}
            activeBackground={activeBackground}
            onTriggerEffect={handleTriggerEffect}
            onRefreshAll={async () => {
              await refreshAll();
              await refreshBoosteraCatalog();
            }}
            onPushLog={pushLog}
            onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
            onOpenServerModal={() => setIsServerModalOpen(true)}
          />
        )}
      </main>

      {/* Luxury Floating Gold Ring available on Media/Phone Camera screen */}
      {layoutMode === 'media-phone' && (
        <LuxuryFloatingDeck
          snapshot={snapshot}
          onRefreshOverlays={refreshOverlaysAndRoster}
          onTriggerEffect={handleTriggerEffect}
          activeMask={activeMask}
          onSetARMask={setActiveMask}
          activeBackground={activeBackground}
          facialExpressions={facialExpressions}
        />
      )}

      <ServerBridgeModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        config={cloudConfig}
        onUpdateConfig={(newConfig) => setCloudConfig((prev) => ({ ...prev, ...newConfig }))}
      />

      <GoogleWorkspaceModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        canvasRef={canvasRef}
        currentLiveMetrics={{
          durationSeconds: 0,
          viewers: snapshot.tiktok.viewers ?? 0,
          likes: 0,
          diamonds: 0,
        }}
        onSelectAsset={(url, type, name) => {
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
