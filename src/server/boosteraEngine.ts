import crypto from 'crypto';
import {
  ActiveProgramLayer,
  BOOSTERA_LAYER_Z_INDEX,
  BoosteraAnchor,
  BoosteraAssetFormat,
  BoosteraAssetItem,
  BoosteraEffectCategory,
  BoosteraEffectDefinition,
  BoosteraRealtimeEventType,
  BoosteraStatusSnapshot,
  BoosteraTarget,
  BoosteraTriggerLogEntry,
  BoosteraWsMessage,
  GloveVariationItem,
  ProgramAudioState,
  ProgramCameraState,
  ProgramDeepArState,
  ProgramOutputSnapshot,
} from '../types/boostera';

export interface TriggerEffectOptions {
  target?: BoosteraTarget;
  opponentUser?: string;
  anchor?: BoosteraAnchor;
  position?: { x: number; y: number; scale: number };
  variationIndex?: number;
  loop?: boolean;
  durationMs?: number;
  layerOrder?: 'front' | 'behind';
  triggerSource?: 'manual' | 'tiktok_event' | 'api';
  actorIp?: string;
}

export interface UpstreamCatalogSyncPayload {
  overlays?: Array<{
    id: string;
    he?: string;
    kind?: string;
    user?: string;
    pos?: string;
    size?: number;
  }>;
  clips?: Array<{
    id: string;
    name: string;
    file?: string;
    thumb?: string;
  }>;
  frontAssets?: Array<{
    id: string;
    name: string;
    file: string;
    type?: string;
    thumb?: string;
  }>;
  bgAssets?: Array<{
    id: string;
    name: string;
    file: string;
    type?: string;
    thumb?: string;
  }>;
  fxList?: Array<{
    id: string;
    name: string;
    file?: string;
  }>;
}

function inferFormat(pathOrName: string): { format: BoosteraAssetFormat; hasAlpha: boolean } {
  const lower = pathOrName.toLowerCase();
  if (lower.endsWith('.webm')) {
    return { format: 'webm_alpha', hasAlpha: true };
  }
  if (lower.endsWith('.mp4')) {
    return { format: 'mp4', hasAlpha: false };
  }
  if (lower.endsWith('.png')) {
    return { format: 'png', hasAlpha: true };
  }
  if (lower.endsWith('.webp')) {
    return { format: 'webp', hasAlpha: true };
  }
  if (lower.endsWith('.gif')) {
    return { format: 'gif', hasAlpha: true };
  }
  return { format: 'webm_alpha', hasAlpha: true };
}

function buildInitialEffectsRegistry(): BoosteraEffectDefinition[] {
  const basePos = { x: 0.5, y: 0.5, scale: 1 };

  return [
    // ==================== 1. CAMERA EFFECTS (§4) ====================
    {
      id: 'cam_front',
      name: 'Front Camera',
      nameHe: 'מצלמה קדמית',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'self',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { facing: 'front' },
    },
    {
      id: 'cam_back',
      name: 'Back Camera',
      nameHe: 'מצלמה אחורית',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'self',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { facing: 'back' },
    },
    {
      id: 'cam_switch',
      name: 'Camera Switch',
      nameHe: 'החלפת מצלמה קדמית/אחורית',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 350,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'self',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { facing: 'switch' },
    },
    {
      id: 'cam_mirror',
      name: 'Mirror Flip',
      nameHe: 'היפוך מראה (Mirror)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { mirror: true },
    },
    {
      id: 'cam_zoom_in',
      name: 'Zoom In 1.35x',
      nameHe: 'זום פנימה (Zoom In)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { zoom: 1.35 },
    },
    {
      id: 'cam_zoom_out',
      name: 'Zoom Out Reset',
      nameHe: 'זום החוצה (1.0x)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 400,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { zoom: 1.0 },
    },
    {
      id: 'cam_crop',
      name: 'Crop Upper Frame',
      nameHe: 'חיתוך פריים ממוקד (Crop)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'self',
      tracking: 'none',
      anchor: 'top',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { cropMode: 'upper_body', zoom: 1.22 },
    },
    {
      id: 'cam_rotate',
      name: 'Dutch Tilt / Rotate',
      nameHe: 'סיבוב מצלמה דרמטי',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 2500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { rotateDeg: -8 },
    },
    {
      id: 'cam_shake',
      name: 'Camera Shake',
      nameHe: 'רעידת מצלמה (Shake)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 1400,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.8,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { shake: 'normal' },
    },
    {
      id: 'cam_fast_shake',
      name: 'Fast Impact Shake',
      nameHe: 'רעידה מהירה חזקה (Fast Shake)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 950,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.9,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { shake: 'fast' },
    },
    {
      id: 'cam_punch_zoom',
      name: 'Punch Zoom',
      nameHe: 'פאנץ׳ זום (Punch Zoom)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 850,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { punchZoom: true },
    },
    {
      id: 'cam_snap_zoom',
      name: 'Snap Zoom',
      nameHe: 'סנאפ זום מהיר (Snap Zoom)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 1100,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: true,
      volume: 0.75,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { snapZoom: true },
    },
    {
      id: 'cam_flash',
      name: 'Strobe Flash',
      nameHe: 'פלאש לבן (Flash)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 480,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.flash_transition,
      layer: 'flash_transition',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.7,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { flash: true },
      visualPreset: { animationStyle: 'stinger_flash', accentColor: '#FFFFFF' },
    },
    {
      id: 'cam_blur',
      name: 'Cinematic Blur',
      nameHe: 'טשטוש מצלמה (Blur)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 2200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { blurPx: 8 },
    },
    {
      id: 'cam_focus',
      name: 'Dramatic Focus Vignette',
      nameHe: 'מיקוד דרמטי (Focus)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { focusVignette: true },
    },
    {
      id: 'cam_slow_mo',
      name: 'Live Safe Slow-Mo Cadence',
      nameHe: 'הילוך איטי חי (ללא השהיה)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 2000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { slowMotion: true },
    },
    {
      id: 'cam_freeze_frame',
      name: 'Freeze Frame',
      nameHe: 'הקפאת תמונה (Freeze Frame)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 1800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.phone_camera,
      layer: 'phone_camera',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.7,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { freezeFrame: true },
    },
    {
      id: 'cam_glitch',
      name: 'Digital Glitch',
      nameHe: 'גליץ׳ דיגיטלי (Glitch)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 1300,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.8,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      cameraParams: { glitch: true },
    },
    {
      id: 'cam_rgb_shift',
      name: 'Chromatic / RGB Shift',
      nameHe: 'הפרדת צבעים (RGB Shift)',
      category: 'Camera',
      type: 'camera_transform',
      durationMs: 1600,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { rgbShift: true },
    },

    // ==================== 2. DEEPAR / FACE AR (§4 — Server-Driven) ====================
    {
      id: 'deepar_glasses',
      name: 'DeepAR Studio Glasses',
      nameHe: 'משקפי DeepAR יוקרתיים',
      category: 'AR',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.5, y: 0.34, scale: 1 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      deepArEffectId: 'deepar_gold_glasses_v2',
      visualPreset: {
        badgeText: 'DeepAR Glasses',
        accentColor: '#E5B34B',
        animationStyle: 'deepar_aura',
      },
    },
    {
      id: 'deepar_masks',
      name: 'DeepAR Royal Mask',
      nameHe: 'מסכת פנים DeepAR מלאה',
      category: 'AR',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.5, y: 0.34, scale: 1.05 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      deepArEffectId: 'deepar_royal_mask_v1',
      visualPreset: {
        badgeText: 'DeepAR Mask',
        accentColor: '#E5B34B',
        animationStyle: 'deepar_aura',
      },
    },
    {
      id: 'deepar_face_filter',
      name: 'DeepAR Cinema Lut Filter',
      nameHe: 'פילטר קולנועי לפנים',
      category: 'Face',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      deepArEffectId: 'deepar_cinema_warm',
    },
    {
      id: 'deepar_beauty',
      name: 'DeepAR Natural Beauty',
      nameHe: 'ביוטי טבעי (DeepAR Beauty)',
      category: 'Face',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      deepArEffectId: 'deepar_beauty_natural',
    },
    {
      id: 'deepar_skin_smooth',
      name: 'Skin Smoothing',
      nameHe: 'החלקת עור עדינה',
      category: 'Face',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      deepArEffectId: 'deepar_skin_smooth_40',
    },
    {
      id: 'deepar_face_reshape',
      name: 'Subtle Face Reshape',
      nameHe: 'עיצוב פנים עדין',
      category: 'Face',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      deepArEffectId: 'deepar_reshape_subtle',
    },
    {
      id: 'deepar_bg_blur',
      name: 'DeepAR Background Blur',
      nameHe: 'טשטוש רקע חכם (BG Blur)',
      category: 'AR',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.background_fx,
      layer: 'background_fx',
      target: 'self',
      tracking: 'body',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      deepArEffectId: 'deepar_bg_bokeh',
    },
    {
      id: 'deepar_bg_replace',
      name: 'DeepAR Studio Background',
      nameHe: 'החלפת רקע אולפן (BG Replace)',
      category: 'AR',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.background,
      layer: 'background',
      target: 'screen',
      tracking: 'body',
      anchor: 'fullscreen',
      position: basePos,
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      deepArEffectId: 'deepar_bg_replace_luxury',
    },
    {
      id: 'deepar_face_attached',
      name: 'Face-Attached Golden Sparks',
      nameHe: 'ניצוצות צמודי-פנים',
      category: 'Face',
      type: 'deepar_filter',
      durationMs: 4500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.5, y: 0.35, scale: 1 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      deepArEffectId: 'deepar_face_sparks',
      visualPreset: {
        badgeText: 'Face Aura',
        accentColor: '#E5B34B',
        animationStyle: 'deepar_aura',
      },
    },
    {
      id: 'deepar_head_attached',
      name: 'Head-Attached Champion Crown',
      nameHe: 'כתר אלופים צמוד-ראש',
      category: 'AR',
      type: 'deepar_filter',
      durationMs: 0,
      loop: true,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx + 2,
      layer: 'face_fx',
      target: 'self',
      tracking: 'head',
      anchor: 'follow_head',
      position: { x: 0.5, y: 0.22, scale: 1.1 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      deepArEffectId: 'deepar_champion_crown',
      visualPreset: {
        badgeText: 'כתר אלופים AR',
        accentColor: '#E5B34B',
        animationStyle: 'deepar_aura',
      },
    },

    // ==================== 3. TRACKING & BODY EFFECTS (§5) ====================
    {
      id: 'track_face_lock',
      name: 'Face Tracking Target Lock',
      nameHe: 'נעילת מעקב פנים על יריב/שחקן',
      category: 'Body',
      type: 'tracking_effect',
      durationMs: 5000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx,
      layer: 'face_fx',
      target: 'rival',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.72, y: 0.36, scale: 1 },
      audio: true,
      volume: 0.65,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'FACE LOCK',
        accentColor: '#EF4444',
        animationStyle: 'tracking_reticle',
      },
    },
    {
      id: 'track_head_halo',
      name: 'Head Tracking Energy Halo',
      nameHe: 'הילת אנרגיה במעקב ראש',
      category: 'Body',
      type: 'tracking_effect',
      durationMs: 5000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.face_fx + 1,
      layer: 'face_fx',
      target: 'player1',
      tracking: 'head',
      anchor: 'follow_head',
      position: { x: 0.5, y: 0.24, scale: 1 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'HEAD TRACK',
        accentColor: '#E5B34B',
        animationStyle: 'tracking_reticle',
      },
    },
    {
      id: 'track_hand_fire',
      name: 'Hand Tracking Flame Burst',
      nameHe: 'להבות במעקב כפות ידיים',
      category: 'Body',
      type: 'tracking_effect',
      durationMs: 4500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.body_fx,
      layer: 'body_fx',
      target: 'self',
      tracking: 'hand',
      anchor: 'follow_hand',
      position: { x: 0.35, y: 0.58, scale: 1 },
      audio: true,
      volume: 0.75,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'HAND FLAME',
        accentColor: '#F97316',
        animationStyle: 'tracking_reticle',
      },
    },
    {
      id: 'track_body_shield',
      name: 'Body Tracking Kinetic Shield',
      nameHe: 'מגן אנרגטי במעקב גוף מלא',
      category: 'Body',
      type: 'tracking_effect',
      durationMs: 6000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.body_fx,
      layer: 'body_fx',
      target: 'self',
      tracking: 'body',
      anchor: 'follow_body',
      position: { x: 0.5, y: 0.52, scale: 1.15 },
      audio: true,
      volume: 0.7,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'BODY SHIELD',
        accentColor: '#38BDF8',
        animationStyle: 'tracking_reticle',
      },
    },
    {
      id: 'track_limb_lightning',
      name: 'Limb Tracking Lightning',
      nameHe: 'ברקים במעקב זרועות ורגליים',
      category: 'Body',
      type: 'tracking_effect',
      durationMs: 4800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.body_fx + 2,
      layer: 'body_fx',
      target: 'player2',
      tracking: 'limb',
      anchor: 'follow_player',
      position: { x: 0.5, y: 0.55, scale: 1.1 },
      audio: true,
      volume: 0.8,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'LIMB LIGHTNING',
        accentColor: '#60A5FA',
        animationStyle: 'tracking_reticle',
      },
    },

    // ==================== 4. BATTLE EFFECTS (§6 — All 18 Required Events) ====================
    {
      id: 'battle_start',
      name: 'Battle Start',
      nameHe: 'תחילת קרב (Battle Start)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.95,
      trigger: 'both',
      tiktokEvent: 'battle_started',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'BATTLE START',
        subtitleText: 'הקרב יצא לדרך!',
        accentColor: '#E5B34B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'score_change',
      name: 'Score Change Surge',
      nameHe: 'קפיצת ניקוד (Score Change)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 2400,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.16, scale: 1 },
      audio: true,
      volume: 0.7,
      trigger: 'both',
      tiktokEvent: 'score_changed',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'SCORE UP',
        subtitleText: 'עלייה בניקוד הקרב',
        accentColor: '#16A34A',
        animationStyle: 'score_pulse',
      },
    },
    {
      id: 'battle_gift_received',
      name: 'Gift Received Alert',
      nameHe: 'מתנה התקבלה בקרב',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 2800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.gift_fx,
      layer: 'gift_fx',
      target: 'supporter',
      tracking: 'none',
      anchor: 'bottom',
      position: { x: 0.5, y: 0.78, scale: 1 },
      audio: true,
      volume: 0.85,
      trigger: 'both',
      tiktokEvent: 'gift_received',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'GIFT BOOST',
        subtitleText: 'תודה על המתנה!',
        accentColor: '#E5B34B',
        animationStyle: 'gift_burst',
      },
    },
    {
      id: 'battle_rose_received',
      name: 'Rose Received Burst',
      nameHe: 'ורד התקבל (Rose Burst)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 2200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.gift_fx,
      layer: 'gift_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.5, y: 0.65, scale: 0.9 },
      audio: true,
      volume: 0.65,
      trigger: 'both',
      tiktokEvent: 'rose_received',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'ROSE +1',
        accentColor: '#F43F5E',
        animationStyle: 'gift_burst',
      },
    },
    {
      id: 'battle_challenge',
      name: 'Battle Challenge',
      nameHe: 'אתגר קרב (Challenge)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3600,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'CHALLENGE',
        subtitleText: 'משימת בונוס פעילה!',
        accentColor: '#F59E0B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'top_supporter',
      name: 'Top Supporter Spotlight',
      nameHe: 'תומך מוביל (Top Supporter)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 4500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 2,
      layer: 'score',
      target: 'supporter',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.2, scale: 1.05 },
      audio: true,
      volume: 0.9,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'TOP SUPPORTER',
        subtitleText: 'מלך החדר על הבמה',
        accentColor: '#E5B34B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'battle_glove_alert',
      name: 'Glove Activated',
      nameHe: 'כפפת קרב הופעלה!',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 4,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'glove_triggered',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'GLOVE ACTIVE',
        subtitleText: '30 שניות מכפיל כפפה!',
        accentColor: '#EF4444',
        animationStyle: 'glove_impact',
      },
    },
    {
      id: 'battle_mult_x2',
      name: 'Multiplier ×2',
      nameHe: 'מכפיל ניקוד ×2',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 3,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.18, scale: 1.1 },
      audio: true,
      volume: 0.9,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'DOUBLE ×2',
        subtitleText: 'כל מתנה שווה כפול!',
        accentColor: '#38BDF8',
        multiplier: 2,
        animationStyle: 'score_pulse',
      },
    },
    {
      id: 'battle_mult_x3',
      name: 'Multiplier ×3',
      nameHe: 'מכפיל ניקוד ×3',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 3,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.18, scale: 1.15 },
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'TRIPLE ×3',
        subtitleText: 'בוסט משולש פעיל!',
        accentColor: '#F59E0B',
        multiplier: 3,
        animationStyle: 'score_pulse',
      },
    },
    {
      id: 'battle_mult_x5',
      name: 'Multiplier ×5',
      nameHe: 'מכפיל ניקוד ×5',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 4200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 5,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'MEGA ×5',
        subtitleText: 'פיצוץ כפפה פי 5!',
        accentColor: '#EF4444',
        multiplier: 5,
        animationStyle: 'glove_impact',
      },
    },
    {
      id: 'battle_win',
      name: 'Battle Win',
      nameHe: 'ניצחון בקרב (WIN)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 5000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'self',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'win',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'VICTORY!',
        subtitleText: 'ניצחון ענק בקרב!',
        accentColor: '#E5B34B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'battle_lose',
      name: 'Battle Lose',
      nameHe: 'סיום קרב / עונש (Lose)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 4200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'self',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.85,
      trigger: 'both',
      tiktokEvent: 'lose',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'NEXT ROUND',
        subtitleText: 'חוזרים חזק בסיבוב הבא!',
        accentColor: '#64748B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'battle_snipe',
      name: 'Snipe Alert!',
      nameHe: 'סנייפ בשנייה האחרונה (Snipe!)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3600,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx + 2,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'snipe',
      enabled: true,
      favorite: true,
      cameraParams: { punchZoom: true, shake: 'fast' },
      visualPreset: {
        badgeText: 'SNIPE NOW!',
        subtitleText: 'עקיפה בשנייה האחרונה!',
        accentColor: '#EF4444',
        animationStyle: 'glove_impact',
      },
    },
    {
      id: 'battle_last_seconds',
      name: 'Last 10 Seconds',
      nameHe: 'שניות אחרונות לקרב!',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 5000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 4,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.14, scale: 1.05 },
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'FINAL SECONDS',
        subtitleText: 'כולם על המסך עכשיו!',
        accentColor: '#EF4444',
        animationStyle: 'score_pulse',
      },
    },
    {
      id: 'battle_lead_change',
      name: 'Lead Change',
      nameHe: 'מהפך בהובלה (Lead Change)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 3200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 2,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'top',
      position: { x: 0.5, y: 0.18, scale: 1 },
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'LEAD CHANGE',
        subtitleText: 'עלינו להובלה!',
        accentColor: '#16A34A',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'battle_comeback',
      name: 'Epic Comeback',
      nameHe: 'קאמבק מטורף (Comeback)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 4200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'COMEBACK!',
        subtitleText: 'מהפך ענק משום מקום!',
        accentColor: '#E5B34B',
        animationStyle: 'battle_banner',
      },
    },
    {
      id: 'battle_streak',
      name: 'Win Streak Fire',
      nameHe: 'רצף ניצחונות (Win Streak)',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 4000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score + 3,
      layer: 'score',
      target: 'self',
      tracking: 'none',
      anchor: 'bottom',
      position: { x: 0.5, y: 0.82, scale: 1 },
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'WIN STREAK',
        subtitleText: 'שומרים על הרצף החם!',
        accentColor: '#F97316',
        animationStyle: 'score_pulse',
      },
    },
    {
      id: 'battle_mvp',
      name: 'Battle MVP Ceremony',
      nameHe: 'הכתרת ה-MVP של הקרב',
      category: 'Battle',
      type: 'battle_event',
      durationMs: 5200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx + 3,
      layer: 'foreground_fx',
      target: 'supporter',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'BATTLE MVP',
        subtitleText: 'כבוד למוביל של הניצחון!',
        accentColor: '#E5B34B',
        animationStyle: 'battle_banner',
      },
    },

    // ==================== 5. GLOVES WITH VARIATIONS (§7) ====================
    {
      id: 'glove_x2',
      name: 'Glove ×2 Variations',
      nameHe: 'כפפה ×2 (4 וריאציות וידאו)',
      category: 'Gloves',
      type: 'glove_variation',
      assetFormat: 'webm_alpha',
      variations: [
        { id: 'x2_a', label: 'Video A — Cyber Punch ×2', asset: '/media/overlays/boxer1.webm', durationMs: 4000 },
        { id: 'x2_b', label: 'Video B — Blue Shockwave ×2', asset: '/media/overlays/boxer2.webm', durationMs: 4000 },
        { id: 'x2_c', label: 'Video C — Speed Combo ×2', asset: '/media/overlays/boxer3.webm', durationMs: 4200 },
        { id: 'x2_d', label: 'Video D — Uppercut Spark ×2', asset: '/media/overlays/boxer1.webm', durationMs: 4000 },
      ],
      randomVariation: true,
      durationMs: 4000,
      loop: false,
      zIndex: 82,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 0.95,
      trigger: 'both',
      tiktokEvent: 'glove_x2',
      enabled: true,
      favorite: true,
      cameraParams: { shake: 'normal' },
      visualPreset: {
        badgeText: 'GLOVE ×2',
        accentColor: '#38BDF8',
        multiplier: 2,
        animationStyle: 'glove_impact',
      },
    },
    {
      id: 'glove_x3',
      name: 'Glove ×3 Variations',
      nameHe: 'כפפה ×3 (4 וריאציות וידאו)',
      category: 'Gloves',
      type: 'glove_variation',
      assetFormat: 'webm_alpha',
      variations: [
        { id: 'x3_a', label: 'Video A — Golden Fist ×3', asset: '/media/overlays/boxer2.webm', durationMs: 4200 },
        { id: 'x3_b', label: 'Video B — Fire Meteor ×3', asset: '/media/overlays/boxer3.webm', durationMs: 4200 },
        { id: 'x3_c', label: 'Video C — Thunder Strike ×3', asset: '/media/overlays/boxer1.webm', durationMs: 4200 },
        { id: 'x3_d', label: 'Video D — Lion Smash ×3', asset: '/media/overlays/boxer3.webm', durationMs: 4400 },
      ],
      randomVariation: true,
      durationMs: 4200,
      loop: false,
      zIndex: 84,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'glove_x3',
      enabled: true,
      favorite: true,
      cameraParams: { punchZoom: true, shake: 'normal' },
      visualPreset: {
        badgeText: 'GLOVE ×3',
        accentColor: '#F59E0B',
        multiplier: 3,
        animationStyle: 'glove_impact',
      },
    },
    {
      id: 'glove_x5',
      name: 'Glove ×5 Explosion',
      nameHe: 'כפפה ×5 פיצוץ (4 וריאציות וידאו)',
      category: 'Gloves',
      type: 'glove_variation',
      assetFormat: 'webm_alpha',
      variations: [
        { id: 'x5_a', label: 'Video A — Supernova ×5', asset: '/media/overlays/boxer3.webm', durationMs: 4500 },
        { id: 'x5_b', label: 'Video B — Mega Knockout ×5', asset: '/media/overlays/boxer2.webm', durationMs: 4500 },
        { id: 'x5_c', label: 'Video C — Crimson Titan ×5', asset: '/media/overlays/boxer1.webm', durationMs: 4500 },
        { id: 'x5_d', label: 'Video D — Royal Explosion ×5', asset: '/media/overlays/boxer3.webm', durationMs: 4600 },
      ],
      randomVariation: true,
      durationMs: 4500,
      loop: false,
      zIndex: 86,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: basePos,
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'glove_x5',
      enabled: true,
      favorite: true,
      cameraParams: { punchZoom: true, shake: 'fast', flash: true },
      visualPreset: {
        badgeText: 'GLOVE ×5 EXPLOSION',
        accentColor: '#EF4444',
        multiplier: 5,
        animationStyle: 'glove_impact',
      },
    },

    // ==================== 6. GIFT EFFECTS (§9 — Including TikTok Universe Circle) ====================
    {
      id: 'gift_universe_circle',
      name: 'TikTok Universe Circle',
      nameHe: 'מעגל TikTok Universe (שכבת על שקופה)',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 6500,
      loop: false,
      zIndex: 76,
      layer: 'gift_fx',
      target: 'screen',
      tracking: 'face',
      anchor: 'center',
      position: { x: 0.5, y: 0.48, scale: 1.15 },
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'gift_universe',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'TIKTOK UNIVERSE',
        subtitleText: 'Cosmic Portal Overlay',
        accentColor: '#E5B34B',
        secondaryColor: '#38BDF8',
        animationStyle: 'universe_ring',
      },
    },
    {
      id: 'gift_rose',
      name: 'Rose Gift Overlay',
      nameHe: 'מתנת ורד (Rose)',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 2600,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.gift_fx,
      layer: 'gift_fx',
      target: 'self',
      tracking: 'face',
      anchor: 'follow_face',
      position: { x: 0.5, y: 0.68, scale: 0.9 },
      audio: true,
      volume: 0.7,
      trigger: 'both',
      tiktokEvent: 'gift_rose',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'ROSE',
        accentColor: '#F43F5E',
        animationStyle: 'gift_burst',
      },
    },
    {
      id: 'gift_finger_heart',
      name: 'Finger Heart Pop',
      nameHe: 'לב אצבעות (Finger Heart)',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 2600,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.gift_fx,
      layer: 'gift_fx',
      target: 'self',
      tracking: 'hand',
      anchor: 'follow_hand',
      position: { x: 0.5, y: 0.6, scale: 0.95 },
      audio: true,
      volume: 0.7,
      trigger: 'both',
      tiktokEvent: 'gift_finger_heart',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'FINGER HEART',
        accentColor: '#EC4899',
        animationStyle: 'gift_burst',
      },
    },
    {
      id: 'gift_galaxy',
      name: 'Galaxy Cosmic Gift',
      nameHe: 'מתנת גלקסיה (Galaxy)',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 5200,
      loop: false,
      zIndex: 74,
      layer: 'gift_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.95,
      trigger: 'both',
      tiktokEvent: 'gift_galaxy',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'GALAXY',
        subtitleText: 'שובל כוכבים על כל המסך',
        accentColor: '#818CF8',
        secondaryColor: '#38BDF8',
        animationStyle: 'universe_ring',
      },
    },
    {
      id: 'gift_lion',
      name: 'Lion King Gift Entrance',
      nameHe: 'מתנת האריה השואג (Lion)',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 5800,
      loop: false,
      zIndex: 75,
      layer: 'gift_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: { x: 0.5, y: 0.5, scale: 1.1 },
      audio: true,
      volume: 1.0,
      trigger: 'both',
      tiktokEvent: 'gift_lion',
      enabled: true,
      favorite: true,
      cameraParams: { shake: 'fast', flash: true },
      visualPreset: {
        badgeText: 'LION GIFT!',
        subtitleText: 'האריה נכנס לבמה!',
        accentColor: '#E5B34B',
        animationStyle: 'gift_burst',
      },
    },
    {
      id: 'gift_custom_supporter',
      name: 'Custom Supporter Gift Animation',
      nameHe: 'אנימציית מתנה מותאמת לתומך',
      category: 'Gifts',
      type: 'gift_asset',
      assetFormat: 'webm_alpha',
      durationMs: 4200,
      loop: false,
      zIndex: 73,
      layer: 'gift_fx',
      target: 'supporter',
      tracking: 'none',
      anchor: 'bottom',
      position: { x: 0.5, y: 0.74, scale: 1 },
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'VIP SUPPORTER',
        accentColor: '#E5B34B',
        animationStyle: 'gift_burst',
      },
    },

    // ==================== 7. CHARACTER / SUPPORTER EFFECTS (§10) ====================
    {
      id: 'char_lion',
      name: 'Ariel The Lion Stage Performer',
      nameHe: 'אריאל האריה — הופעה בקרב',
      category: 'Characters',
      type: 'character_overlay',
      assetFormat: 'webm_alpha',
      durationMs: 6000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.character,
      layer: 'character',
      layerOrder: 'front',
      target: 'screen',
      tracking: 'none',
      anchor: 'center',
      position: { x: 0.5, y: 0.56, scale: 1 },
      audio: true,
      volume: 1.0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      upstreamBridge: { kind: 'scene', refId: 'baby' },
      visualPreset: {
        badgeText: 'LION CHARACTER',
        subtitleText: 'Play in Battle',
        accentColor: '#E5B34B',
      },
    },
    {
      id: 'char_dancer',
      name: 'Belly Dancer Character',
      nameHe: 'רקדנית בטן — Play in Battle',
      category: 'Characters',
      type: 'character_overlay',
      asset: '/media/overlays/fx_belly.webm',
      assetFormat: 'webm_alpha',
      durationMs: 5500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.character,
      layer: 'character',
      layerOrder: 'front',
      target: 'rival',
      tracking: 'face',
      anchor: 'center',
      position: { x: 0.5, y: 0.58, scale: 0.92 },
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      upstreamBridge: { kind: 'special', refId: 'fx_belly' },
    },
    {
      id: 'char_baby',
      name: 'Crying Baby Character',
      nameHe: 'תינוק בוכה — Play in Battle',
      category: 'Characters',
      type: 'character_overlay',
      asset: '/media/overlays/ov_baby.webm',
      assetFormat: 'webm_alpha',
      durationMs: 5200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.character,
      layer: 'character',
      layerOrder: 'front',
      target: 'rival',
      tracking: 'face',
      anchor: 'center',
      position: { x: 0.5, y: 0.6, scale: 0.9 },
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      upstreamBridge: { kind: 'special', refId: 'ov_baby' },
    },
    {
      id: 'char_custom_supporter',
      name: 'Custom Supporter Avatar',
      nameHe: 'דמות תומך מותאמת (Supporter)',
      category: 'Characters',
      type: 'character_overlay',
      assetFormat: 'webm_alpha',
      durationMs: 5000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.character,
      layer: 'character',
      layerOrder: 'behind',
      target: 'supporter',
      tracking: 'none',
      anchor: 'right',
      position: { x: 0.76, y: 0.62, scale: 0.85 },
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'SUPPORTER CHARACTER',
        accentColor: '#16A34A',
      },
    },

    // ==================== 8. VIDEO & OVERLAY EFFECTS (§8 — WebM Alpha / MP4 / WebP) ====================
    {
      id: 'vid_knockout_fullscreen',
      name: 'Full-Screen Knockout Cinema (WebM)',
      nameHe: 'וידאו מסך מלא — נוקאאוט קולנועי (WebM)',
      category: 'Videos',
      type: 'fullscreen_video',
      asset: '/media/overlays/boxer3.webm',
      assetFormat: 'webm',
      durationMs: 4800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.background_fx,
      layer: 'background_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.95,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      upstreamBridge: { kind: 'overlay', refId: 'boxer3' },
      visualPreset: {
        badgeText: 'FULL-SCREEN VIDEO',
        accentColor: '#E5B34B',
      },
    },
    {
      id: 'vid_alpha_confetti_rain',
      name: 'Transparent WebM Alpha Gold Rain',
      nameHe: 'וידאו שקוף (WebM Alpha) — גשם זהב בלייב',
      category: 'Videos',
      type: 'video_overlay',
      asset: '/media/overlays/fx_fan.webm',
      assetFormat: 'webm_alpha',
      durationMs: 4500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx,
      layer: 'foreground_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      upstreamBridge: { kind: 'overlay', refId: 'fx_fan' },
      visualPreset: {
        badgeText: 'WEBM ALPHA',
        accentColor: '#E5B34B',
      },
    },
    {
      id: 'vid_mp4_intro_bumper',
      name: 'MP4 Battle Arena Intro Bumper',
      nameHe: 'סרטון פתיחת זירה (MP4 Full-Screen)',
      category: 'Videos',
      type: 'fullscreen_video',
      asset: '/media/overlays/boxer1.webm',
      assetFormat: 'mp4',
      durationMs: 4200,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.background_fx,
      layer: 'background_fx',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.9,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      upstreamBridge: { kind: 'overlay', refId: 'boxer1' },
      visualPreset: {
        badgeText: 'MP4 ARENA INTRO',
        accentColor: '#F59E0B',
      },
    },
    {
      id: 'ov_royal_frame_webp',
      name: 'Animated WebP Royal Battle Lower-Third',
      nameHe: 'שכבת כותרת קרב שקופה (Animated WebP / PNG)',
      category: 'Overlays',
      type: 'image_overlay',
      assetFormat: 'animated_webp',
      durationMs: 6000,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.score,
      layer: 'score',
      target: 'screen',
      tracking: 'none',
      anchor: 'bottom',
      position: { x: 0.5, y: 0.86, scale: 1 },
      audio: false,
      volume: 0,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'BOOSTERA LIVE ARENA',
        subtitleText: '1080×1920 Clean Program Layer',
        accentColor: '#E5B34B',
      },
    },

    // ==================== 9. TRANSITIONS & AUDIO (§21, §25) ====================
    {
      id: 'trans_gold_stinger',
      name: 'Golden Stinger Transition',
      nameHe: 'מעבר זהב מהיר (Stinger)',
      category: 'Transitions',
      type: 'transition_fx',
      durationMs: 950,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.flash_transition,
      layer: 'flash_transition',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.85,
      trigger: 'manual',
      enabled: true,
      favorite: true,
      visualPreset: {
        badgeText: 'BOOSTERA',
        accentColor: '#E5B34B',
        animationStyle: 'stinger_flash',
      },
    },
    {
      id: 'trans_glitch_cut',
      name: 'Glitch Cut Transition',
      nameHe: 'חיתוך גליץ׳ בין סצנות',
      category: 'Transitions',
      type: 'transition_fx',
      durationMs: 800,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.flash_transition,
      layer: 'flash_transition',
      target: 'screen',
      tracking: 'none',
      anchor: 'fullscreen',
      position: basePos,
      audio: true,
      volume: 0.8,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      cameraParams: { glitch: true, rgbShift: true },
      visualPreset: {
        accentColor: '#38BDF8',
        animationStyle: 'stinger_flash',
      },
    },
    {
      id: 'audio_ducking_drop',
      name: 'Battle Horn + Auto Ducking',
      nameHe: 'צופר קרב + הנמכת מוזיקה אוטומטית',
      category: 'Audio',
      type: 'audio_fx',
      durationMs: 2500,
      loop: false,
      zIndex: BOOSTERA_LAYER_Z_INDEX.text,
      layer: 'text',
      target: 'screen',
      tracking: 'none',
      anchor: 'bottom',
      position: { x: 0.5, y: 0.9, scale: 1 },
      audio: true,
      volume: 1.0,
      trigger: 'manual',
      enabled: true,
      favorite: false,
      visualPreset: {
        badgeText: 'AUDIO SFX',
        accentColor: '#E5B34B',
      },
    },
  ];
}

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; lastRefill: number }>();
  private readonly capacity: number;
  private readonly refillPerSec: number;

  constructor(capacity = 40, refillPerSec = 15) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
  }

  public allow(key: string, now = Date.now()): boolean {
    const entry = this.buckets.get(key);
    if (!entry) {
      this.buckets.set(key, { tokens: this.capacity - 1, lastRefill: now });
      return true;
    }

    const elapsedSec = Math.max(0, (now - entry.lastRefill) / 1000);
    const refilled = Math.min(this.capacity, entry.tokens + elapsedSec * this.refillPerSec);
    if (refilled < 1) {
      entry.tokens = refilled;
      entry.lastRefill = now;
      return false;
    }

    entry.tokens = refilled - 1;
    entry.lastRefill = now;
    return true;
  }
}

export function signAssetUrl(assetPath: string, secret: string, expiresAtMs: number): string {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(`${assetPath}:${expiresAtMs}`)
    .digest('hex')
    .slice(0, 24);
  const sep = assetPath.includes('?') ? '&' : '?';
  return `${assetPath}${sep}exp=${expiresAtMs}&sig=${hmac}`;
}

export function verifySignedAssetUrl(
  assetPath: string,
  exp: number,
  sig: string,
  secret: string,
  now = Date.now()
): boolean {
  if (!Number.isFinite(exp) || exp < now || !sig) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${assetPath}:${exp}`)
    .digest('hex')
    .slice(0, 24);
  if (sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export class BoosteraEffectsEngine {
  private readonly startedAt = Date.now();
  private effects = new Map<string, BoosteraEffectDefinition>();
  private assets = new Map<string, BoosteraAssetItem>();
  private activeLayers = new Map<string, ActiveProgramLayer>();
  private expiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private listeners = new Set<(msg: BoosteraWsMessage) => void>();
  private auditLog: BoosteraTriggerLogEntry[] = [];
  private version = 1;

  private cameraState: ProgramCameraState = {
    connected: true,
    facing: 'front',
    mirror: false,
    zoom: 1,
    rotateDeg: 0,
    cropMode: 'none',
    shake: 'none',
    punchZoom: false,
    snapZoom: false,
    flash: false,
    blurPx: 0,
    focusVignette: false,
    slowMotion: false,
    freezeFrame: false,
    glitch: false,
    rgbShift: false,
  };

  private deepArState: ProgramDeepArState = {
    enabled: true,
    activeFilterIds: [],
    beauty: 0.35,
    skinSmoothing: 0.3,
    faceReshape: 0.12,
    backgroundBlur: false,
    backgroundReplacementUrl: null,
  };

  private audioState: ProgramAudioState = {
    microphoneConnected: true,
    muted: false,
    gain: 1.0,
    noiseReduction: true,
    musicChannelVolume: 0.7,
    effectAudioEnabled: true,
    ducking: true,
    duckingActive: false,
  };

  private sceneMode: 'camera' | 'lion' | 'custom_bg' = 'camera';
  private sourceStreamUrl = '/api/phone/view.mjpeg';
  private backgroundAssetUrl: string | null = null;
  private streamActive = true;
  private upstreamConnected = false;
  private livekitConfigured = false;
  private deepArConfigured = true;
  private wsClientsConnected = 0;
  private readonly signingSecret: string;
  private readonly rng: () => number;

  constructor(opts?: {
    signingSecret?: string;
    livekitConfigured?: boolean;
    deepArConfigured?: boolean;
    rng?: () => number;
  }) {
    this.signingSecret = opts?.signingSecret || 'boostera-default-signing-key';
    this.livekitConfigured = Boolean(opts?.livekitConfigured);
    this.deepArConfigured = opts?.deepArConfigured ?? true;
    this.rng = opts?.rng || Math.random;

    for (const def of buildInitialEffectsRegistry()) {
      this.effects.set(def.id, def);
    }

    // Seed core transparent gift/glove assets in Asset Library
    this.registerAsset({
      id: 'asset_universe_circle',
      name: 'TikTok Universe Circle (Alpha)',
      url: '/api/v1/assets/virtual/universe-circle.webm',
      format: 'webm_alpha',
      hasAlpha: true,
      category: 'gift',
      durationMs: 6500,
    });
  }

  public dispose(): void {
    for (const timer of this.expiryTimers.values()) {
      clearTimeout(timer);
    }
    this.expiryTimers.clear();
  }

  public subscribe(listener: (msg: BoosteraWsMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setWsClientsCount(count: number): void {
    this.wsClientsConnected = Math.max(0, count);
  }

  public setUpstreamConnected(connected: boolean): void {
    if (this.upstreamConnected !== connected) {
      this.upstreamConnected = connected;
      this.cameraState.connected = connected;
      this.emit(connected ? 'camera_connected' : 'camera_disconnected', {
        upstreamConnected: connected,
      });
    }
  }

  public registerAsset(asset: BoosteraAssetItem): void {
    const exp = Date.now() + 6 * 3600 * 1000;
    this.assets.set(asset.id, {
      ...asset,
      signedUrl: signAssetUrl(asset.url, this.signingSecret, exp),
    });
  }

  /**
   * Synchronizes real .webm / .mp4 / .png / .webp overlays and clips from the live server
   * into the Effects Registry and Asset Library without duplicates.
   */
  public syncUpstreamCatalog(payload: UpstreamCatalogSyncPayload): void {
    const validGloveClipUrls: string[] = [];

    if (Array.isArray(payload.overlays)) {
      for (const ov of payload.overlays) {
        if (!ov?.id) continue;
        const url = `/media/overlays/${ov.id}.webm`;
        const assetId = `ov_${ov.id}`;
        this.registerAsset({
          id: assetId,
          name: ov.he || ov.id,
          url,
          format: 'webm_alpha',
          hasAlpha: true,
          category: ov.user ? 'character' : 'overlay',
          user: ov.user,
          durationMs: 5000,
        });

        if (ov.id.includes('boxer') || ov.id.includes('hit') || !ov.user) {
          validGloveClipUrls.push(url);
        }

        const effectId = `srv_ov_${ov.id}`;
        const existing = this.effects.get(effectId);
        const isChar = Boolean(ov.user) || ov.kind === 'clip';

        this.effects.set(effectId, {
          id: effectId,
          name: ov.he || ov.id,
          nameHe: ov.he || ov.id,
          category: isChar ? 'Characters' : 'Overlays',
          type: isChar ? 'character_overlay' : 'video_overlay',
          asset: url,
          assetFormat: 'webm_alpha',
          durationMs: 5200,
          loop: false,
          zIndex: isChar ? BOOSTERA_LAYER_Z_INDEX.character : BOOSTERA_LAYER_Z_INDEX.foreground_fx - 5,
          layer: isChar ? 'character' : 'foreground_fx',
          layerOrder: 'front',
          target: ov.user ? 'rival' : 'screen',
          tracking: 'none',
          anchor:
            ov.pos === 'left'
              ? 'left'
              : ov.pos === 'right'
                ? 'right'
                : 'center',
          position: { x: 0.5, y: 0.56, scale: ov.size ?? 0.85 },
          audio: true,
          volume: 0.95,
          trigger: 'manual',
          enabled: existing ? existing.enabled : true,
          favorite: existing ? existing.favorite : false,
          upstreamBridge: {
            kind: 'overlay',
            refId: ov.id,
            user: ov.user,
          },
        });
      }
    }

    if (Array.isArray(payload.clips)) {
      for (const cl of payload.clips) {
        if (!cl?.id) continue;
        const fileUrl = cl.file || `/media/clips/${cl.id}`;
        const { format, hasAlpha } = inferFormat(fileUrl);
        this.registerAsset({
          id: `clip_${cl.id}`,
          name: cl.name || cl.id,
          url: fileUrl,
          thumbnail: cl.thumb,
          format,
          hasAlpha,
          category: 'video',
          durationMs: 6000,
        });

        const effectId = `srv_clip_${cl.id}`;
        const existing = this.effects.get(effectId);
        this.effects.set(effectId, {
          id: effectId,
          name: cl.name || cl.id,
          nameHe: cl.name || cl.id,
          category: 'Videos',
          type: 'video_overlay',
          asset: fileUrl,
          assetFormat: format,
          thumbnail: cl.thumb,
          durationMs: 6500,
          loop: false,
          zIndex: BOOSTERA_LAYER_Z_INDEX.foreground_fx - 8,
          layer: 'foreground_fx',
          target: 'screen',
          tracking: 'none',
          anchor: 'fullscreen',
          position: { x: 0.5, y: 0.5, scale: 1 },
          audio: true,
          volume: 1.0,
          trigger: 'manual',
          enabled: existing ? existing.enabled : true,
          favorite: existing ? existing.favorite : false,
          upstreamBridge: {
            kind: 'clip',
            refId: cl.id,
          },
        });
      }
    }

    if (Array.isArray(payload.frontAssets)) {
      for (const fr of payload.frontAssets) {
        if (!fr?.id || !fr.file) continue;
        const { format, hasAlpha } = inferFormat(fr.file);
        this.registerAsset({
          id: `front_${fr.id}`,
          name: fr.name || fr.id,
          url: fr.file,
          thumbnail: fr.thumb,
          format,
          hasAlpha,
          category: 'foreground',
        });
      }
    }

    if (Array.isArray(payload.bgAssets)) {
      for (const bg of payload.bgAssets) {
        if (!bg?.id || !bg.file) continue;
        const { format, hasAlpha } = inferFormat(bg.file);
        this.registerAsset({
          id: `bg_${bg.id}`,
          name: bg.name || bg.id,
          url: bg.file,
          thumbnail: bg.thumb,
          format,
          hasAlpha,
          category: 'background',
        });
      }
    }

    // Bind real upstream .webm combat clips into Glove ×2 / ×3 / ×5 variations when available
    if (validGloveClipUrls.length > 0) {
      for (const gloveId of ['glove_x2', 'glove_x3', 'glove_x5']) {
        const glove = this.effects.get(gloveId);
        if (glove?.variations) {
          glove.variations = glove.variations.map((v, idx) => ({
            ...v,
            asset: validGloveClipUrls[idx % validGloveClipUrls.length],
          }));
        }
      }
    }
  }

  public listEffects(filter?: {
    category?: string;
    enabled?: boolean;
    q?: string;
    favoritesOnly?: boolean;
  }): BoosteraEffectDefinition[] {
    let items = Array.from(this.effects.values());
    if (filter?.category && filter.category !== 'All') {
      items = items.filter((e) => e.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (typeof filter?.enabled === 'boolean') {
      items = items.filter((e) => e.enabled === filter.enabled);
    }
    if (filter?.favoritesOnly) {
      items = items.filter((e) => e.favorite);
    }
    if (filter?.q) {
      const q = filter.q.trim().toLowerCase();
      if (q) {
        items = items.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.nameHe.toLowerCase().includes(q) ||
            e.id.toLowerCase().includes(q)
        );
      }
    }
    return items;
  }

  public getEffect(id: string): BoosteraEffectDefinition | null {
    return this.effects.get(id) || null;
  }

  public updateEffect(
    id: string,
    patch: Partial<
      Pick<
        BoosteraEffectDefinition,
        | 'enabled'
        | 'favorite'
        | 'randomVariation'
        | 'target'
        | 'anchor'
        | 'zIndex'
        | 'durationMs'
        | 'loop'
        | 'volume'
      >
    >
  ): BoosteraEffectDefinition | null {
    const current = this.effects.get(id);
    if (!current) return null;
    const updated: BoosteraEffectDefinition = {
      ...current,
      ...patch,
      zIndex: typeof patch.zIndex === 'number' ? patch.zIndex : current.zIndex,
      durationMs: typeof patch.durationMs === 'number' ? patch.durationMs : current.durationMs,
    };
    this.effects.set(id, updated);
    return updated;
  }

  public listAssets(category?: string): BoosteraAssetItem[] {
    const all = Array.from(this.assets.values());
    if (!category || category === 'all') return all;
    return all.filter((a) => a.category === category);
  }

  public resolveVariation(
    effect: BoosteraEffectDefinition,
    variationIndex?: number
  ): GloveVariationItem | null {
    if (!effect.variations || effect.variations.length === 0) return null;
    if (
      typeof variationIndex === 'number' &&
      variationIndex >= 0 &&
      variationIndex < effect.variations.length
    ) {
      return effect.variations[variationIndex];
    }
    if (effect.randomVariation !== false) {
      const idx = Math.floor(this.rng() * effect.variations.length);
      return effect.variations[Math.min(effect.variations.length - 1, Math.max(0, idx))];
    }
    return effect.variations[0];
  }

  public triggerEffect(
    id: string,
    options: TriggerEffectOptions = {}
  ): { ok: boolean; layer?: ActiveProgramLayer; effect?: BoosteraEffectDefinition; error?: string } {
    const effect = this.effects.get(id);
    if (!effect) {
      this.emit('effect_failed', { effectId: id, reason: 'Effect not found' });
      return { ok: false, error: `Effect '${id}' not found in BOOSTERA registry` };
    }
    if (!effect.enabled) {
      this.emit('effect_failed', { effectId: id, reason: 'Effect is disabled' });
      return { ok: false, error: `Effect '${effect.nameHe}' is currently disabled` };
    }

    const now = Date.now();
    const chosenVariation = this.resolveVariation(effect, options.variationIndex);
    const effectiveDuration =
      options.durationMs ?? chosenVariation?.durationMs ?? effect.durationMs;
    const isPersistent = Boolean(options.loop ?? effect.loop) || effectiveDuration <= 0;

    // Apply immediate camera / DeepAR state transitions
    if (effect.cameraParams) {
      this.applyCameraParams(effect.cameraParams, isPersistent);
    }
    if (effect.deepArEffectId) {
      this.toggleDeepArFilter(effect.deepArEffectId, effect.id);
    }
    if (effect.audio && this.audioState.ducking) {
      this.audioState.duckingActive = true;
    }

    // Compute layer zIndex (respecting character front/behind person §10)
    let resolvedZIndex = effect.zIndex;
    const order = options.layerOrder || effect.layerOrder;
    if (effect.category === 'Characters' && order) {
      resolvedZIndex = order === 'behind' ? 35 : 65;
    }

    // Replace existing persistent instance of the same effectId if re-triggered as toggle
    for (const [instId, existing] of this.activeLayers.entries()) {
      if (existing.effectId === effect.id && existing.loop) {
        this.stopInstance(instId, false);
        if (effect.type === 'deepar_filter' || effect.id === 'cam_mirror') {
          // Toggled off
          this.bumpVersion();
          this.emit('effect_finished', { effectId: effect.id, instanceId: instId, toggledOff: true });
          return { ok: true, effect };
        }
      }
    }

    const instanceId = `inst_${effect.id}_${now}_${Math.floor(this.rng() * 10000)}`;
    const activeLayer: ActiveProgramLayer = {
      instanceId,
      effectId: effect.id,
      name: effect.name,
      nameHe: effect.nameHe,
      category: effect.category,
      type: effect.type,
      asset: chosenVariation?.asset || effect.asset,
      variationLabel: chosenVariation?.label,
      zIndex: resolvedZIndex,
      layer: effect.layer,
      target: options.target || effect.target,
      opponentUser: options.opponentUser,
      tracking: effect.tracking,
      anchor: options.anchor || effect.anchor,
      position: options.position || effect.position,
      startedAt: now,
      durationMs: effectiveDuration,
      expiresAt: isPersistent ? null : now + effectiveDuration,
      loop: isPersistent,
      audio: effect.audio && this.audioState.effectAudioEnabled && !this.audioState.muted,
      volume: effect.volume * this.audioState.gain,
      cameraParams: effect.cameraParams,
      deepArEffectId: effect.deepArEffectId,
      visualPreset: effect.visualPreset,
    };

    this.activeLayers.set(instanceId, activeLayer);
    this.bumpVersion();

    // Audit log (§24)
    this.auditLog.unshift({
      id: `trig_${now}_${Math.floor(this.rng() * 9999)}`,
      timestamp: now,
      effectId: effect.id,
      effectName: effect.nameHe,
      category: effect.category,
      target: activeLayer.target,
      variationUsed: chosenVariation?.label,
      zIndex: activeLayer.zIndex,
      triggerSource: options.triggerSource || 'manual',
      actorIp: options.actorIp,
    });
    if (this.auditLog.length > 100) {
      this.auditLog.length = 100;
    }

    // Schedule deterministic auto-expiry for non-looping effects
    if (!isPersistent && effectiveDuration > 0) {
      const timer = setTimeout(() => {
        this.stopInstance(instanceId, true);
      }, effectiveDuration);
      if (typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
      this.expiryTimers.set(instanceId, timer);
    }

    this.emit('effect_started', {
      instanceId,
      effectId: effect.id,
      name: effect.nameHe,
      category: effect.category,
      zIndex: activeLayer.zIndex,
      target: activeLayer.target,
      variation: chosenVariation?.label,
    });

    // Emit specialized domain realtime events (§15)
    if (effect.category === 'Gloves' || effect.id === 'battle_glove_alert') {
      this.emit('glove_triggered', {
        effectId: effect.id,
        multiplier: effect.visualPreset?.multiplier ?? 2,
        variation: chosenVariation?.label,
      });
    } else if (effect.id === 'battle_snipe') {
      this.emit('snipe', { effectId: effect.id, target: activeLayer.target });
    } else if (effect.id === 'battle_win') {
      this.emit('win', { effectId: effect.id });
    } else if (effect.id === 'battle_lose') {
      this.emit('lose', { effectId: effect.id });
    } else if (effect.id === 'battle_start') {
      this.emit('battle_started', { effectId: effect.id });
    } else if (effect.id === 'score_change') {
      this.emit('score_changed', { effectId: effect.id });
    } else if (effect.category === 'Gifts') {
      this.emit('gift_received', { effectId: effect.id, giftName: effect.name });
    }

    return { ok: true, layer: activeLayer, effect };
  }

  public playCustomOverlay(payload: {
    id?: string;
    name?: string;
    asset: string;
    durationMs?: number;
    zIndex?: number;
    anchor?: BoosteraAnchor;
    target?: BoosteraTarget;
    opponentUser?: string;
    position?: { x: number; y: number; scale: number };
    loop?: boolean;
    audio?: boolean;
  }): ActiveProgramLayer {
    const now = Date.now();
    const durationMs = payload.durationMs ?? 5500;
    const isLoop = Boolean(payload.loop);
    const instanceId = `ov_${now}_${Math.floor(this.rng() * 10000)}`;
    const layer: ActiveProgramLayer = {
      instanceId,
      effectId: payload.id || `custom_ov_${now}`,
      name: payload.name || payload.id || 'Overlay Video',
      nameHe: payload.name || payload.id || 'שכבת וידאו חיה',
      category: 'Overlays',
      type: 'video_overlay',
      asset: payload.asset,
      zIndex: payload.zIndex ?? 85,
      layer: 'foreground_fx',
      target: payload.target || 'screen',
      opponentUser: payload.opponentUser,
      tracking: 'none',
      anchor: payload.anchor || 'center',
      position: payload.position || { x: 0.5, y: 0.55, scale: 0.9 },
      startedAt: now,
      durationMs,
      expiresAt: isLoop ? null : now + durationMs,
      loop: isLoop,
      audio: payload.audio !== false && !this.audioState.muted,
      volume: this.audioState.gain,
    };

    this.activeLayers.set(instanceId, layer);
    this.bumpVersion();

    if (!isLoop && durationMs > 0) {
      const timer = setTimeout(() => this.stopInstance(instanceId, true), durationMs);
      if (typeof (timer as any).unref === 'function') {
        (timer as any).unref();
      }
      this.expiryTimers.set(instanceId, timer);
    }

    this.emit('effect_started', {
      instanceId,
      effectId: layer.effectId,
      name: layer.nameHe,
      category: layer.category,
      zIndex: layer.zIndex,
    });

    return layer;
  }

  public playCharacterInBattle(payload: {
    id?: string;
    name?: string;
    asset?: string;
    durationMs?: number;
    anchor?: BoosteraAnchor;
    target?: BoosteraTarget;
    opponentUser?: string;
    layerOrder?: 'front' | 'behind';
    audio?: boolean;
    loop?: boolean;
    position?: { x: number; y: number; scale: number };
  }): ActiveProgramLayer {
    if (payload.id && this.effects.has(payload.id)) {
      const res = this.triggerEffect(payload.id, {
        target: payload.target,
        opponentUser: payload.opponentUser,
        anchor: payload.anchor,
        durationMs: payload.durationMs,
        layerOrder: payload.layerOrder,
        loop: payload.loop,
        position: payload.position,
      });
      if (res.layer) return res.layer;
    }

    const zIndex = payload.layerOrder === 'behind' ? 35 : 65;
    return this.playCustomOverlay({
      id: payload.id || 'character_battle',
      name: payload.name || 'Character in Battle',
      asset: payload.asset || '/media/overlays/fx_belly.webm',
      durationMs: payload.durationMs ?? 5500,
      zIndex,
      anchor: payload.anchor || 'center',
      target: payload.target || 'rival',
      opponentUser: payload.opponentUser,
      loop: payload.loop,
      audio: payload.audio ?? true,
      position: payload.position || { x: 0.5, y: 0.56, scale: 0.92 },
    });
  }

  public stopEffect(idOrInstanceId: string): number {
    let stopped = 0;
    if (this.activeLayers.has(idOrInstanceId)) {
      this.stopInstance(idOrInstanceId, true);
      return 1;
    }
    for (const [instId, layer] of Array.from(this.activeLayers.entries())) {
      if (layer.effectId === idOrInstanceId) {
        this.stopInstance(instId, true);
        stopped += 1;
      }
    }
    return stopped;
  }

  public stopAllEffects(): number {
    const count = this.activeLayers.size;
    for (const timer of this.expiryTimers.values()) {
      clearTimeout(timer);
    }
    this.expiryTimers.clear();
    this.activeLayers.clear();

    // Reset transient camera effects while preserving chosen front/back camera
    this.cameraState = {
      ...this.cameraState,
      mirror: false,
      zoom: 1,
      rotateDeg: 0,
      cropMode: 'none',
      shake: 'none',
      punchZoom: false,
      snapZoom: false,
      flash: false,
      blurPx: 0,
      focusVignette: false,
      slowMotion: false,
      freezeFrame: false,
      glitch: false,
      rgbShift: false,
    };
    this.deepArState.activeFilterIds = [];
    this.deepArState.backgroundBlur = false;
    this.deepArState.backgroundReplacementUrl = null;
    this.audioState.duckingActive = false;

    this.bumpVersion();
    this.emit('effect_finished', { allStopped: true, clearedCount: count });
    return count;
  }

  public setCameraFacing(mode: 'front' | 'back' | 'switch'): ProgramCameraState {
    const nextFacing =
      mode === 'switch'
        ? this.cameraState.facing === 'front'
          ? 'back'
          : 'front'
        : mode;
    this.cameraState.facing = nextFacing;
    this.cameraState.connected = true;
    this.bumpVersion();
    this.emit('camera_connected', { facing: nextFacing });
    return { ...this.cameraState };
  }

  public setScene(payload: {
    mode: 'camera' | 'lion' | 'custom_bg';
    backgroundAssetUrl?: string | null;
    sourceStreamUrl?: string;
  }): ProgramOutputSnapshot {
    this.sceneMode = payload.mode;
    if (payload.backgroundAssetUrl !== undefined) {
      this.backgroundAssetUrl = payload.backgroundAssetUrl;
    }
    if (payload.sourceStreamUrl) {
      this.sourceStreamUrl = payload.sourceStreamUrl;
    }
    this.bumpVersion();
    this.emit('stream_started', {
      sceneMode: this.sceneMode,
      backgroundAssetUrl: this.backgroundAssetUrl,
    });
    return this.getProgramSnapshot();
  }

  public updateAudio(patch: Partial<ProgramAudioState>): ProgramAudioState {
    this.audioState = {
      ...this.audioState,
      ...patch,
    };
    this.bumpVersion();
    this.emit('microphone_connected', { audio: this.audioState });
    return { ...this.audioState };
  }

  /**
   * Bridges live TikTok / Phone events into BOOSTERA Realtime WebSocket events
   * and auto-triggers mapped Battle/Gift effects when enabled.
   */
  public ingestExternalEvent(raw: Record<string, any>): void {
    const type = String(raw?.type || '');
    if (type === 'gift' || raw?.giftName) {
      const giftName = String(raw?.giftName || raw?.text || 'Gift');
      this.emit('gift_received', {
        user: raw?.user || raw?.nickname || 'viewer',
        giftName,
      });
      if (/universe/i.test(giftName)) {
        this.triggerEffect('gift_universe_circle', { triggerSource: 'tiktok_event' });
      } else if (/lion|אריה/i.test(giftName)) {
        this.triggerEffect('gift_lion', { triggerSource: 'tiktok_event' });
      } else if (/galaxy|גלקסיה/i.test(giftName)) {
        this.triggerEffect('gift_galaxy', { triggerSource: 'tiktok_event' });
      } else if (/rose|ורד/i.test(giftName)) {
        this.triggerEffect('gift_rose', { triggerSource: 'tiktok_event' });
      }
    } else if (type === 'battle' || raw?.battleStarted) {
      this.emit('battle_started', { opponent: raw?.opponent || '' });
    } else if (type === 'score') {
      this.emit('score_changed', { score: raw?.score });
    } else if (type === 'cloud') {
      const active = Boolean(raw?.on || raw?.phone);
      this.streamActive = active || this.streamActive;
      this.emit(active ? 'stream_started' : 'stream_stopped', { cloud: raw });
    }
  }

  public getProgramSnapshot(): ProgramOutputSnapshot {
    const sortedLayers = Array.from(this.activeLayers.values()).sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      return a.startedAt - b.startedAt;
    });

    return {
      version: this.version,
      updatedAt: Date.now(),
      resolution: { width: 1080, height: 1920 },
      aspectRatio: '9:16',
      targetFps: 60,
      fallbackStableFps: 30,
      currentFps: this.livekitConfigured ? 60 : 30,
      latencyBudgetMs: 500,
      estimatedLatencyMs: this.livekitConfigured ? 140 : 220,
      streamActive: this.streamActive,
      sceneMode: this.sceneMode,
      sourceStreamUrl: this.sourceStreamUrl,
      backgroundAssetUrl: this.backgroundAssetUrl,
      cleanFeedPath: '/clean-feed',
      virtualCameraName: 'BOOSTERA Camera',
      camera: { ...this.cameraState },
      deepAr: {
        ...this.deepArState,
        activeFilterIds: [...this.deepArState.activeFilterIds],
      },
      audio: { ...this.audioState },
      activeLayers: sortedLayers,
    };
  }

  public getStatusSnapshot(): BoosteraStatusSnapshot {
    const allEffects = Array.from(this.effects.values());
    const enabledEffects = allEffects.filter((e) => e.enabled);
    const program = this.getProgramSnapshot();

    return {
      ok: true,
      service: 'BOOSTERA Effects Server',
      timestamp: Date.now(),
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      gates: {
        gate1PhoneCameraToServer: this.upstreamConnected || this.cameraState.connected,
        gate2PhoneMicToServer: this.audioState.microphoneConnected,
        gate3EffectsToCleanProgram: true,
        gate4CleanProgramToVirtualCam: true,
      },
      infrastructure: {
        livekitConfigured: this.livekitConfigured,
        deepArConfigured: this.deepArConfigured,
        upstreamConnected: this.upstreamConnected,
        wsClientsConnected: this.wsClientsConnected,
      },
      counts: {
        totalEffects: allEffects.length,
        enabledEffects: enabledEffects.length,
        totalAssets: this.assets.size,
        activeLayers: this.activeLayers.size,
      },
      programSummary: {
        resolution: '1080x1920',
        fps: program.currentFps,
        estimatedLatencyMs: program.estimatedLatencyMs,
        sceneMode: program.sceneMode,
        cameraFacing: program.camera.facing,
        cleanFeedPath: program.cleanFeedPath,
        virtualCameraName: program.virtualCameraName,
      },
      recentTriggers: this.auditLog.slice(0, 25),
    };
  }

  private applyCameraParams(
    params: NonNullable<BoosteraEffectDefinition['cameraParams']>,
    persistent: boolean
  ): void {
    if (params.facing) {
      this.setCameraFacing(params.facing);
    }
    if (params.mirror !== undefined) {
      this.cameraState.mirror = persistent ? !this.cameraState.mirror : params.mirror;
    }
    if (typeof params.zoom === 'number') {
      this.cameraState.zoom = params.zoom;
    }
    if (typeof params.rotateDeg === 'number') {
      this.cameraState.rotateDeg = params.rotateDeg;
    }
    if (params.cropMode) {
      this.cameraState.cropMode =
        this.cameraState.cropMode === params.cropMode ? 'none' : params.cropMode;
    }
    if (params.shake) {
      this.cameraState.shake = params.shake;
    }
    if (params.punchZoom !== undefined) {
      this.cameraState.punchZoom = params.punchZoom;
    }
    if (params.snapZoom !== undefined) {
      this.cameraState.snapZoom = params.snapZoom;
    }
    if (params.flash !== undefined) {
      this.cameraState.flash = params.flash;
    }
    if (typeof params.blurPx === 'number') {
      this.cameraState.blurPx = params.blurPx;
    }
    if (params.focusVignette !== undefined) {
      this.cameraState.focusVignette =
        persistent ? !this.cameraState.focusVignette : params.focusVignette;
    }
    if (params.slowMotion !== undefined) {
      this.cameraState.slowMotion = params.slowMotion;
    }
    if (params.freezeFrame !== undefined) {
      this.cameraState.freezeFrame = params.freezeFrame;
    }
    if (params.glitch !== undefined) {
      this.cameraState.glitch = params.glitch;
    }
    if (params.rgbShift !== undefined) {
      this.cameraState.rgbShift = params.rgbShift;
    }
  }

  private toggleDeepArFilter(deepArId: string, effectId: string): void {
    const idx = this.deepArState.activeFilterIds.indexOf(deepArId);
    if (idx >= 0) {
      this.deepArState.activeFilterIds.splice(idx, 1);
      if (effectId === 'deepar_bg_blur') this.deepArState.backgroundBlur = false;
    } else {
      this.deepArState.activeFilterIds.push(deepArId);
      if (effectId === 'deepar_bg_blur') this.deepArState.backgroundBlur = true;
    }
  }

  private stopInstance(instanceId: string, emitEvent: boolean): void {
    const timer = this.expiryTimers.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.expiryTimers.delete(instanceId);
    }

    const layer = this.activeLayers.get(instanceId);
    if (!layer) return;

    this.activeLayers.delete(instanceId);

    // Clear transient camera flags owned by this expiring effect
    if (layer.cameraParams) {
      if (layer.cameraParams.shake) this.cameraState.shake = 'none';
      if (layer.cameraParams.punchZoom) this.cameraState.punchZoom = false;
      if (layer.cameraParams.snapZoom) this.cameraState.snapZoom = false;
      if (layer.cameraParams.flash) this.cameraState.flash = false;
      if (layer.cameraParams.blurPx) this.cameraState.blurPx = 0;
      if (layer.cameraParams.rotateDeg) this.cameraState.rotateDeg = 0;
      if (layer.cameraParams.slowMotion) this.cameraState.slowMotion = false;
      if (layer.cameraParams.freezeFrame) this.cameraState.freezeFrame = false;
      if (layer.cameraParams.glitch) this.cameraState.glitch = false;
      if (layer.cameraParams.rgbShift) this.cameraState.rgbShift = false;
    }

    const anyAudioRemaining = Array.from(this.activeLayers.values()).some((l) => l.audio);
    if (!anyAudioRemaining) {
      this.audioState.duckingActive = false;
    }

    this.bumpVersion();
    if (emitEvent) {
      this.emit('effect_finished', {
        instanceId,
        effectId: layer.effectId,
        name: layer.nameHe,
      });
    }
  }

  private bumpVersion(): void {
    this.version += 1;
  }

  private emit(event: BoosteraRealtimeEventType, payload: Record<string, unknown>): void {
    const msg: BoosteraWsMessage = {
      event,
      timestamp: Date.now(),
      payload,
      program: this.getProgramSnapshot(),
    };
    for (const listener of this.listeners) {
      try {
        listener(msg);
      } catch {
        // Ignore individual listener errors
      }
    }
  }
}
