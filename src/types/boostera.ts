export type BoosteraEffectCategory =
  | 'Camera'
  | 'AR'
  | 'Face'
  | 'Body'
  | 'Battle'
  | 'Gloves'
  | 'Gifts'
  | 'Characters'
  | 'Videos'
  | 'Overlays'
  | 'Transitions'
  | 'Audio';

export type BoosteraEffectType =
  | 'camera_transform'
  | 'deepar_filter'
  | 'tracking_effect'
  | 'battle_event'
  | 'glove_variation'
  | 'gift_asset'
  | 'character_overlay'
  | 'video_overlay'
  | 'image_overlay'
  | 'transition_fx'
  | 'audio_fx';

export type BoosteraLayerType =
  | 'background'
  | 'phone_camera'
  | 'background_fx'
  | 'character'
  | 'face_fx'
  | 'body_fx'
  | 'gift_fx'
  | 'text'
  | 'score'
  | 'foreground_fx'
  | 'flash_transition';

export const BOOSTERA_LAYER_Z_INDEX: Record<BoosteraLayerType, number> = {
  background: 10,
  phone_camera: 20,
  background_fx: 30,
  character: 40,
  face_fx: 50,
  body_fx: 60,
  gift_fx: 70,
  text: 75,
  score: 80,
  foreground_fx: 90,
  flash_transition: 100,
};

export type BoosteraTarget =
  | 'screen'
  | 'self'
  | 'rival'
  | 'supporter'
  | 'player1'
  | 'player2'
  | 'player3'
  | 'player4';

export type BoosteraTrackingMode =
  | 'none'
  | 'face'
  | 'head'
  | 'hand'
  | 'body'
  | 'limb';

export type BoosteraAnchor =
  | 'fullscreen'
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'custom_xy'
  | 'follow_face'
  | 'follow_head'
  | 'follow_body'
  | 'follow_hand'
  | 'follow_player';

export type BoosteraAssetFormat =
  | 'webm_alpha'
  | 'webm'
  | 'mp4'
  | 'png'
  | 'webp'
  | 'animated_webp'
  | 'gif';

export interface GloveVariationItem {
  id: string;
  label: string;
  asset: string;
  durationMs: number;
}

export interface CameraTransformParams {
  facing?: 'front' | 'back' | 'switch';
  mirror?: boolean;
  zoom?: number;
  rotateDeg?: number;
  cropMode?: 'none' | 'tight_9_16' | 'upper_body';
  shake?: 'none' | 'normal' | 'fast';
  punchZoom?: boolean;
  snapZoom?: boolean;
  flash?: boolean;
  blurPx?: number;
  focusVignette?: boolean;
  slowMotion?: boolean;
  freezeFrame?: boolean;
  glitch?: boolean;
  rgbShift?: boolean;
}

export interface BoosteraVisualPreset {
  badgeText?: string;
  subtitleText?: string;
  accentColor?: string;
  secondaryColor?: string;
  animationStyle?:
    | 'universe_ring'
    | 'glove_impact'
    | 'battle_banner'
    | 'gift_burst'
    | 'tracking_reticle'
    | 'stinger_flash'
    | 'deepar_aura'
    | 'score_pulse';
  multiplier?: number;
}

export interface BoosteraEffectDefinition {
  id: string;
  name: string;
  nameHe: string;
  category: BoosteraEffectCategory;
  type: BoosteraEffectType;
  asset?: string;
  assetFormat?: BoosteraAssetFormat;
  thumbnail?: string;
  variations?: GloveVariationItem[];
  randomVariation?: boolean;
  durationMs: number; // 0 = persistent toggle until stopped
  loop: boolean;
  zIndex: number;
  layer: BoosteraLayerType;
  target: BoosteraTarget;
  tracking: BoosteraTrackingMode;
  anchor: BoosteraAnchor;
  position: {
    x: number; // 0..1 normalized
    y: number; // 0..1 normalized
    scale: number;
  };
  layerOrder?: 'front' | 'behind';
  audio: boolean;
  soundAsset?: string;
  volume: number;
  trigger: 'manual' | 'tiktok_event' | 'both';
  tiktokEvent?: string;
  enabled: boolean;
  favorite: boolean;
  cameraParams?: CameraTransformParams;
  deepArEffectId?: string;
  visualPreset?: BoosteraVisualPreset;
  upstreamBridge?: {
    kind: 'overlay' | 'clip' | 'fx' | 'special' | 'scene' | 'hit';
    refId: string;
    user?: string;
    dir?: 'left' | 'right';
  };
}

export interface BoosteraAssetItem {
  id: string;
  name: string;
  url: string;
  signedUrl?: string;
  thumbnail?: string;
  format: BoosteraAssetFormat;
  hasAlpha: boolean;
  category: 'gift' | 'glove' | 'character' | 'overlay' | 'video' | 'background' | 'foreground';
  durationMs?: number;
  user?: string;
}

export interface ActiveProgramLayer {
  instanceId: string;
  effectId: string;
  name: string;
  nameHe: string;
  category: BoosteraEffectCategory;
  type: BoosteraEffectType;
  asset?: string;
  variationLabel?: string;
  zIndex: number;
  layer: BoosteraLayerType;
  target: BoosteraTarget;
  opponentUser?: string;
  tracking: BoosteraTrackingMode;
  anchor: BoosteraAnchor;
  position: {
    x: number;
    y: number;
    scale: number;
  };
  startedAt: number;
  durationMs: number;
  expiresAt: number | null;
  loop: boolean;
  audio: boolean;
  volume: number;
  cameraParams?: CameraTransformParams;
  deepArEffectId?: string;
  visualPreset?: BoosteraVisualPreset;
}

export interface ProgramCameraState {
  connected: boolean;
  facing: 'front' | 'back';
  mirror: boolean;
  zoom: number;
  rotateDeg: number;
  cropMode: 'none' | 'tight_9_16' | 'upper_body';
  shake: 'none' | 'normal' | 'fast';
  punchZoom: boolean;
  snapZoom: boolean;
  flash: boolean;
  blurPx: number;
  focusVignette: boolean;
  slowMotion: boolean;
  freezeFrame: boolean;
  glitch: boolean;
  rgbShift: boolean;
}

export interface ProgramDeepArState {
  enabled: boolean;
  activeFilterIds: string[];
  beauty: number;
  skinSmoothing: number;
  faceReshape: number;
  backgroundBlur: boolean;
  backgroundReplacementUrl: string | null;
}

export interface ProgramAudioState {
  microphoneConnected: boolean;
  muted: boolean;
  gain: number; // 0..2
  noiseReduction: boolean;
  musicChannelVolume: number; // 0..1
  effectAudioEnabled: boolean;
  ducking: boolean;
  duckingActive: boolean;
}

export interface ProgramOutputSnapshot {
  version: number;
  updatedAt: number;
  resolution: {
    width: 1080;
    height: 1920;
  };
  aspectRatio: '9:16';
  targetFps: 60;
  fallbackStableFps: 30;
  currentFps: number;
  latencyBudgetMs: 500;
  estimatedLatencyMs: number;
  streamActive: boolean;
  sceneMode: 'camera' | 'lion' | 'custom_bg';
  sourceStreamUrl: string;
  backgroundAssetUrl: string | null;
  cleanFeedPath: string;
  virtualCameraName: string;
  camera: ProgramCameraState;
  deepAr: ProgramDeepArState;
  audio: ProgramAudioState;
  activeLayers: ActiveProgramLayer[];
}

export type BoosteraRealtimeEventType =
  | 'program_sync'
  | 'camera_connected'
  | 'camera_disconnected'
  | 'microphone_connected'
  | 'stream_started'
  | 'stream_stopped'
  | 'effect_started'
  | 'effect_finished'
  | 'effect_failed'
  | 'gift_received'
  | 'battle_started'
  | 'score_changed'
  | 'glove_triggered'
  | 'snipe'
  | 'win'
  | 'lose';

export interface BoosteraWsMessage {
  event: BoosteraRealtimeEventType;
  timestamp: number;
  payload: Record<string, unknown>;
  program?: ProgramOutputSnapshot;
}

export interface BoosteraTriggerLogEntry {
  id: string;
  timestamp: number;
  effectId: string;
  effectName: string;
  category: BoosteraEffectCategory;
  target: BoosteraTarget;
  variationUsed?: string;
  zIndex: number;
  triggerSource: 'manual' | 'tiktok_event' | 'api';
  actorIp?: string;
}

export interface BoosteraGateStatus {
  gate1PhoneCameraToServer: boolean;
  gate2PhoneMicToServer: boolean;
  gate3EffectsToCleanProgram: boolean;
  gate4CleanProgramToVirtualCam: boolean;
}

export interface BoosteraStatusSnapshot {
  ok: boolean;
  service: 'BOOSTERA Effects Server';
  timestamp: number;
  uptimeSec: number;
  gates: BoosteraGateStatus;
  infrastructure: {
    livekitConfigured: boolean;
    deepArConfigured: boolean;
    upstreamConnected: boolean;
    wsClientsConnected: number;
  };
  counts: {
    totalEffects: number;
    enabledEffects: number;
    totalAssets: number;
    activeLayers: number;
  };
  programSummary: {
    resolution: string;
    fps: number;
    estimatedLatencyMs: number;
    sceneMode: string;
    cameraFacing: 'front' | 'back';
    cleanFeedPath: string;
    virtualCameraName: string;
  };
  recentTriggers: BoosteraTriggerLogEntry[];
}
