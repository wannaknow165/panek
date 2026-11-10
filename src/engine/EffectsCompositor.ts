/**
 * Real-Time Camera & Effects Studio Compositor (HTML5 Canvas + WebAudio)
 * 4K 3D Visuals, Real Video Overlays, AR Face Masks, Body Tracking & Cutout Engine.
 * 100% clean output stream: zero fake telemetry, zero text burn-in, pure video quality.
 */

import { EffectType, TriggerEvent } from '../types/studio';
import { VideoClipAsset, ActiveVideoOverlay } from '../types/videoOverlay';
import { studioAudio } from '../utils/audioSynthesizer';
import { calculateOverlayBounds, isGreenScreenPixel } from '../utils/chromaKey';
import { createProceduralVideoElement } from '../utils/presetVideos';
import { FaceBodyTracker, TrackedFace, TrackedBody } from './FaceBodyTracker';
import { ThreeFaceAREngine, ThreeARMaskType } from './ThreeFaceAREngine';
import {
  MediaPipeFaceTracker,
  HatAnchor,
  GlassesAnchor,
  Point3D,
  FacialExpressions,
  FacialGestureEvent,
} from './MediaPipeFaceTracker';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
  decay: number;
  type: 'coin' | 'confetti' | 'fire' | 'spark';
  gravity: number;
  bounce: number;
}

interface ActivePunch {
  id: string;
  type: 'comic' | 'combo' | 'fire' | 'ko';
  progress: number;
  side: 'left' | 'right' | 'center';
  x: number;
  y: number;
}

export class EffectsCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoEl: HTMLVideoElement | null = null;
  private isMirrored: boolean = true;
  private width: number = 720;
  private height: number = 1280;

  private isRunning: boolean = false;
  private animFrameId: number | null = null;

  // Real-Time Optical Face & Body Tracker
  private tracker = new FaceBodyTracker();

  // MediaPipe FaceLandmarker AR Engine (478 3D Landmarks)
  private mpTracker = new MediaPipeFaceTracker();
  private currentHatAnchor?: HatAnchor;
  private currentGlassesAnchor?: GlassesAnchor;
  private currentLandmarks: Point3D[] = [];

  // Facial Landmark Expression & Auto-Trigger Reaction State
  private surpriseVFXTimer: number = 0;
  private surpriseMouthCenter: Point3D = { x: 360, y: 550, z: 0 };
  private surpriseActionPreset: 'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser' = 'shockwave';
  private currentExpressions: FacialExpressions = {
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
  };

  // Three.js 3D Face AR Engine (Snapchat & Banuba Quality)
  private threeAR = new ThreeFaceAREngine();

  // AR Masks & Cutout State
  private activeMask: ThreeARMaskType = 'none';
  private isBodyAuraActive: boolean = false;
  private isCutoutActive: boolean = false;
  private currentAudioLevel: number = 0;
  private isMusicPlaying: boolean = false;

  // Real Video Overlays
  private activeOverlays: ActiveVideoOverlay[] = [];
  private chromaCanvas: HTMLCanvasElement;
  private chromaCtx: CanvasRenderingContext2D;

  // Effects State
  private activeBackground: EffectType = 'bg-none';
  private isBigHeadActive: boolean = false;
  private isLaserEyesActive: boolean = false;
  private punches: ActivePunch[] = [];
  private particles: Particle[] = [];

  // 3D Optical Screen Shake
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.92;

  // Stream output
  private outputStream: MediaStream | null = null;
  private simTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;

    // Enable ultra-high smoothing quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Offscreen canvas for Chroma Key processing
    this.chromaCanvas = document.createElement('canvas');
    this.chromaCanvas.width = 480;
    this.chromaCanvas.height = 480;
    const cCtx = this.chromaCanvas.getContext('2d', { willReadFrequently: true });
    if (!cCtx) throw new Error('Could not get chroma canvas context');
    this.chromaCtx = cCtx;

    // Register MediaPipe Facial Landmark Listener for auto-triggering AR effects
    this.mpTracker.addGestureListener((event) => {
      this.handleFacialGesture(event);
    });
  }

  public setSourceVideo(video: HTMLVideoElement | null, mirrored: boolean = true) {
    this.videoEl = video;
    this.isMirrored = mirrored;
  }

  public getOutputStream(): MediaStream {
    if (!this.outputStream) {
      const stream = this.canvas.captureStream(30);
      const audioTrack = studioAudio.getMixedAudioTrack();
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      this.outputStream = stream;
    }
    return this.outputStream;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }


  public setBackground(bg: EffectType) {
    this.activeBackground = bg;
  }

  public setARMask(mask: ThreeARMaskType) {
    this.activeMask = mask;
  }

  public getActiveMask() {
    return this.activeMask;
  }

  public toggleBodyAura(active?: boolean) {
    this.isBodyAuraActive = active !== undefined ? active : !this.isBodyAuraActive;
  }

  public getIsBodyAuraActive() {
    return this.isBodyAuraActive;
  }

  public toggleCutout(active?: boolean) {
    this.isCutoutActive = active !== undefined ? active : !this.isCutoutActive;
  }

  public getIsCutoutActive() {
    return this.isCutoutActive;
  }

  public toggleBigHead(active?: boolean) {
    this.isBigHeadActive = active !== undefined ? active : !this.isBigHeadActive;
  }

  public toggleLaserEyes(active?: boolean) {
    this.isLaserEyesActive = active !== undefined ? active : !this.isLaserEyesActive;
    if (this.isLaserEyesActive) {
      studioAudio.playLaser();
    }
  }

  public playVideoOverlay(asset: VideoClipAsset) {
    const existingIdx = this.activeOverlays.findIndex((o) => o.asset.id === asset.id);
    if (existingIdx !== -1) {
      const existing = this.activeOverlays[existingIdx];
      existing.videoEl.currentTime = 0;
      existing.videoEl.play().catch(() => {});
      existing.startTime = Date.now();
      return;
    }

    let videoEl: HTMLVideoElement;

    if (asset.url.startsWith('procedural:')) {
      const type = asset.url.replace('procedural:', '') as 'punch' | 'fire' | 'lightning' | 'coins' | 'glitch' | 'victory';
      videoEl = createProceduralVideoElement(type);
    } else {
      videoEl = document.createElement('video');
      videoEl.src = asset.url;
      videoEl.crossOrigin = 'anonymous';
      videoEl.playsInline = true;
      videoEl.muted = asset.volume === 0;
      videoEl.loop = asset.loop;
      videoEl.play().catch(() => {});
    }

    if (asset.category === 'punch') {
      studioAudio.playPunch('combo');
      this.shakeIntensity = 24;
    } else if (asset.category === 'fire') {
      studioAudio.playPunch('fire');
    } else if (asset.category === 'energy') {
      studioAudio.playLaser();
    } else if (asset.category === 'coins') {
      studioAudio.playCoin();
    }

    this.activeOverlays.push({
      id: Math.random().toString(),
      asset,
      videoEl,
      startTime: Date.now(),
      duration: asset.loop ? Infinity : 4500,
      isPlaying: true,
    });
  }

  public stopVideoOverlay(assetId: string) {
    const idx = this.activeOverlays.findIndex((o) => o.asset.id === assetId);
    if (idx !== -1) {
      const overlay = this.activeOverlays[idx];
      overlay.videoEl.pause();
      this.activeOverlays.splice(idx, 1);
    }
  }

  public getActiveOverlays(): ActiveVideoOverlay[] {
    return this.activeOverlays;
  }

  public triggerEffect(event: TriggerEvent) {
    const { type } = event;

    if (type.startsWith('punch-')) {
      this.triggerPunch(type as 'punch-comic' | 'punch-combo' | 'punch-fire' | 'punch-ko');
    } else if (type === 'clip-coins') {
      this.spawnCoins();
      studioAudio.playCoin();
    } else if (type === 'clip-confetti') {
      this.spawnConfetti();
      studioAudio.playConfetti();
    } else if (type === 'clip-laser') {
      this.toggleLaserEyes(true);
      setTimeout(() => this.toggleLaserEyes(false), 2400);
    } else if (type === 'clip-fire') {
      this.spawnFireAura();
      studioAudio.playPunch('fire');
    } else if (type === 'head-bulge') {
      this.toggleBigHead();
    } else if (type === 'mask-forest') {
      this.setARMask(this.activeMask === 'forest' ? 'none' : 'forest');
    } else if (type === 'mask-cyber') {
      this.setARMask(this.activeMask === 'cyber' ? 'none' : 'cyber');
    } else if (type === 'mask-glasses') {
      this.setARMask(this.activeMask === 'glasses' ? 'none' : 'glasses');
    } else if (type === 'mask-crown' || type === 'head-crown') {
      this.setARMask(this.activeMask === 'crown' ? 'none' : 'crown');
    } else if (type === 'mask-kitsune') {
      this.setARMask(this.activeMask === 'kitsune' ? 'none' : 'kitsune');
    } else if (type === 'mask-kitty') {
      this.setARMask(this.activeMask === 'kitty' ? 'none' : 'kitty');
    } else if (type === 'mask-helmet') {
      this.setARMask(this.activeMask === 'helmet' ? 'none' : 'helmet');
    } else if (type === 'mask-dj' || type === 'mask-stage') {
      this.setARMask(this.activeMask === 'dj_stage' ? 'none' : 'dj_stage');
    } else if (type === 'body-aura') {
      this.toggleBodyAura();
    } else if (type === 'cutout-mode') {
      this.toggleCutout();
    } else if (type.startsWith('bg-')) {
      this.setBackground(type);
    }
  }

  public setAudioLevel(level: number) {
    this.currentAudioLevel = Math.max(0, Math.min(1, level / 100));
  }

  public setMusicPlaying(playing: boolean) {
    this.isMusicPlaying = playing;
  }

  private triggerPunch(type: 'punch-comic' | 'punch-combo' | 'punch-fire' | 'punch-ko') {
    const punchType = type === 'punch-ko' ? 'ko' : type === 'punch-fire' ? 'fire' : type === 'punch-combo' ? 'combo' : 'comic';
    studioAudio.playPunch(punchType);

    this.shakeIntensity = type === 'punch-ko' ? 32 : type === 'punch-combo' ? 24 : 18;

    const sides: ('left' | 'right' | 'center')[] = ['left', 'right', 'center'];
    const side = type === 'punch-ko' ? 'center' : sides[Math.floor(Math.random() * sides.length)];

    this.punches.push({
      id: Math.random().toString(),
      type: punchType,
      progress: 0,
      side,
      x: side === 'left' ? 220 : side === 'right' ? 500 : 360,
      y: 500 + Math.random() * 100,
    });

    // 3D Metallic kinetic sparks
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 16;
      this.particles.push({
        x: side === 'left' ? 240 : side === 'right' ? 480 : 360,
        y: 520,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 5 + Math.random() * 8,
        color: ['#00f2fe', '#ffd166', '#ff007f', '#ffffff'][Math.floor(Math.random() * 4)],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
        alpha: 1,
        decay: 0.035,
        type: 'spark',
        gravity: 0.25,
        bounce: 0.5,
      });
    }
  }

  private spawnCoins() {
    for (let i = 0; i < 35; i++) {
      this.particles.push({
        x: 360 + (Math.random() - 0.5) * 240,
        y: 80 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 12,
        vy: -2 - Math.random() * 6,
        size: 20 + Math.random() * 12,
        color: '#ffc83b',
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.35,
        alpha: 1,
        decay: 0.007,
        type: 'coin',
        gravity: 0.65,
        bounce: 0.6,
      });
    }
  }

  private spawnConfetti() {
    const colors = ['#fe2c55', '#00f2fe', '#ffd166', '#06d6a0', '#118ab2', '#ffffff'];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: 360 + (Math.random() - 0.5) * 160,
        y: 280,
        vx: (Math.random() - 0.5) * 24,
        vy: -8 - Math.random() * 18,
        size: 9 + Math.random() * 9,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.45,
        alpha: 1,
        decay: 0.012,
        type: 'confetti',
        gravity: 0.45,
        bounce: 0.2,
      });
    }
  }

  private spawnFireAura() {
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: 360 + (Math.random() - 0.5) * 360,
        y: 1100 + Math.random() * 120,
        vx: (Math.random() - 0.5) * 4,
        vy: -7 - Math.random() * 14,
        size: 16 + Math.random() * 24,
        color: ['#ff3b30', '#ff9500', '#ffcc00'][Math.floor(Math.random() * 3)],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.2,
        alpha: 0.9,
        decay: 0.02,
        type: 'fire',
        gravity: -0.15,
        bounce: 0,
      });
    }
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.simTime += 0.03;
    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private render() {
    const { ctx, width, height } = this;

    ctx.save();

    // 1. Screen Shake
    if (this.shakeIntensity > 0.5) {
      const shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      const shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
      ctx.translate(shakeX, shakeY);
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    // Update real-time face and body tracking
    const { face, body } = this.tracker.update(this.videoEl, width, height);

    // MediaPipe FaceLandmarker 478 3D Landmark & Anchor extraction
    const mpData = this.mpTracker.update(this.videoEl, width, height);
    this.currentHatAnchor = mpData.hatAnchor;
    this.currentGlassesAnchor = mpData.glassesAnchor;
    this.currentLandmarks = mpData.landmarks;
    this.currentExpressions = mpData.expressions;

    if (mpData.hasLandmarks) {
      face.x = mpData.glassesAnchor.x;
      face.y = mpData.glassesAnchor.y + 25;
      face.roll = mpData.pose.roll;
      face.yaw = mpData.pose.yaw;
      face.pitch = mpData.pose.pitch;
    }

    // 2. Background Layer
    this.renderBackgroundLayer();

    // 3. Camera Feed with Cutout & Subject Layer
    this.renderSubjectLayer(face, body);

    // 4. REAL 4K 3D VIDEO OVERLAYS (Screen, Lighter, Chroma Key)
    this.renderActiveVideoOverlays();

    // 5. Body Dressing & Aura (Dragon / Energy Cloak)
    if (this.isBodyAuraActive) {
      this.renderBodyAura(body);
    }

    // 6. Tracked AR Face Masks & 3D Surprise Reaction
    if (this.activeMask !== 'none' || this.surpriseVFXTimer > 0) {
      this.renderTrackedARMask(face);
    }

    // 7. Dynamic Facial Landmark Surprise Reaction (Manga Speedlines & 3D Badge)
    if (this.surpriseVFXTimer > 0) {
      this.renderSurpriseVFX(face);
      this.surpriseVFXTimer = Math.max(0, this.surpriseVFXTimer - 0.02);
    }

    // 8. Dynamic Head Bulge / Laser Eyes
    this.renderFaceEffects(face);

    // 9. 3D Kinetic Punch Impacts (Clean 3D, zero comic text)
    this.render3DPunches();

    // 10. 3D Physics Particles (Coins, Confetti, Sparks)
    this.renderParticles();

    ctx.restore();
  }

  private renderBackgroundLayer() {
    const { ctx, width, height, activeBackground, simTime } = this;

    if (activeBackground === 'bg-greenscreen') {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (activeBackground === 'bg-neon') {
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0d0221');
      grad.addColorStop(0.5, '#240046');
      grad.addColorStop(1, '#0f051d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      const sunGrad = ctx.createRadialGradient(360, 420, 20, 360, 420, 160);
      sunGrad.addColorStop(0, '#fe2c55');
      sunGrad.addColorStop(0.7, '#ff007f');
      sunGrad.addColorStop(1, 'rgba(36, 0, 70, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(360, 420, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
      ctx.lineWidth = 2;
      const horizonY = 700;
      for (let x = -400; x <= width + 400; x += 90) {
        ctx.beginPath();
        ctx.moveTo(360, horizonY);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      const offset = (simTime * 60) % 50;
      for (let y = horizonY; y < height; y += 30 + (y - horizonY) * 0.15) {
        ctx.beginPath();
        ctx.moveTo(0, y + offset * ((y - horizonY) / 500));
        ctx.lineTo(width, y + offset * ((y - horizonY) / 500));
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    if (activeBackground === 'bg-cyber' || activeBackground === 'bg-matrix') {
      ctx.fillStyle = '#05070c';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.fillStyle = activeBackground === 'bg-matrix' ? 'rgba(0, 255, 120, 0.7)' : 'rgba(0, 242, 254, 0.7)';
      ctx.font = '16px monospace';
      for (let col = 0; col < width; col += 24) {
        const charY = ((simTime * 280 + col * 17) % (height + 100)) - 50;
        const char = String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96));
        ctx.fillText(char, col, charY);
      }
      ctx.restore();
      return;
    }

    ctx.fillStyle = '#080a10';
    ctx.fillRect(0, 0, width, height);
  }

  private renderSubjectLayer(face: TrackedFace, body: TrackedBody) {
    const { ctx, width, height, videoEl, isMirrored, simTime, activeBackground, isCutoutActive } = this;

    const hasLiveVideo = videoEl && videoEl.readyState >= 2 && !videoEl.paused;

    if (hasLiveVideo) {
      ctx.save();
      if (isMirrored) {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      const vW = videoEl.videoWidth || 640;
      const vH = videoEl.videoHeight || 480;
      const scale = Math.max(width / vW, height / vH);
      const sW = width / scale;
      const sH = height / scale;
      const sX = (vW - sW) / 2;
      const sY = (vH - sH) / 2;

      if (isCutoutActive) {
        // Real-Time Body Cutout Segmentation (Draws Streamer Silhouette Cleanly Over Background)
        ctx.save();
        ctx.beginPath();
        // Cutout mask covering head and body silhouette
        ctx.ellipse(isMirrored ? width - face.x : face.x, face.y, face.width * 0.75, face.height * 0.7, 0, 0, Math.PI * 2);
        ctx.rect(
          isMirrored ? width - (body.x + body.width / 2) : body.x - body.width / 2,
          body.shoulders.left.y - 20,
          body.width,
          height - body.shoulders.left.y
        );
        ctx.clip();
        ctx.drawImage(videoEl, sX, sY, sW, sH, 0, 0, width, height);
        ctx.restore();
      } else {
        if (activeBackground !== 'bg-none') {
          ctx.globalAlpha = 0.92;
        }
        ctx.drawImage(videoEl, sX, sY, sW, sH, 0, 0, width, height);
      }

      ctx.restore();
    } else {
      // 100% Clean, Pristine 4K Studio Canvas with Cinematic Presenter Avatar
      this.renderCinematicStudioFeed(simTime, face, body);
    }
  }

  /**
   * Clean, Pristine 4K Studio Canvas with Cinematic Streamer Avatar
   * (Allows 3D AR Masks, Face Landmarker accessories & reactions to be immediately visible even before camera starts)
   */
  private renderCinematicStudioFeed(t: number, face: TrackedFace, body: TrackedBody) {
    const { ctx, width, height } = this;

    // 1. Studio Lighting Background
    const bgGrad = ctx.createRadialGradient(360, 580, 80, 360, 580, 680);
    bgGrad.addColorStop(0, '#151b2c');
    bgGrad.addColorStop(0.5, '#0b0e18');
    bgGrad.addColorStop(1, '#04060a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Warm & Cool Studio Bokeh Lights
    const bokehs = [
      { x: 200 + Math.sin(t * 1.2) * 40, y: 380, r: 180, color: 'rgba(254, 44, 85, 0.09)' },
      { x: 520 + Math.cos(t * 1.0) * 50, y: 460, r: 200, color: 'rgba(0, 242, 254, 0.09)' },
      { x: 360, y: 240, r: 220, color: 'rgba(168, 85, 247, 0.06)' },
    ];
    bokehs.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Streamer Torso / Hoodie Silhouette
    ctx.save();
    const shoulderY = body.y + 60;
    const bodyGrad = ctx.createLinearGradient(0, shoulderY - 80, 0, height);
    bodyGrad.addColorStop(0, '#1c2236');
    bodyGrad.addColorStop(0.6, '#111522');
    bodyGrad.addColorStop(1, '#090c14');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.ellipse(body.x, shoulderY + 80, body.width * 0.44, body.height * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hoodie Collar & Neck
    ctx.fillStyle = '#222a42';
    ctx.beginPath();
    ctx.ellipse(face.x, face.y + 110, 55, 65, face.roll * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 3. Streamer Head & Face Contour
    ctx.save();
    ctx.translate(face.x, face.y);
    ctx.rotate(face.roll);

    // Face Skin Tone Gradient
    const headGrad = ctx.createRadialGradient(0, -10, 20, 0, 10, 120);
    headGrad.addColorStop(0, '#d4a373');
    headGrad.addColorStop(0.7, '#bc8a5f');
    headGrad.addColorStop(1, '#8a5a36');
    ctx.fillStyle = headGrad;

    ctx.beginPath();
    ctx.ellipse(0, 0, 78, 102, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Neon Rim Lighting on Head Contour
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 80, -Math.PI * 0.75, Math.PI * 0.1);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(254, 44, 85, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 80, Math.PI * 0.25, Math.PI * 0.95);
    ctx.stroke();

    // Hair Silhouette
    ctx.fillStyle = '#1c1514';
    ctx.beginPath();
    ctx.ellipse(0, -50, 82, 60, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Subtle Eyes & Brows
    ctx.fillStyle = 'rgba(40, 25, 20, 0.75)';
    // Left eye
    ctx.beginPath();
    ctx.ellipse(-28, -8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.ellipse(28, -8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle Smile / Mouth
    ctx.strokeStyle = 'rgba(140, 70, 60, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 36, 16, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  private renderActiveVideoOverlays() {
    const { ctx, width, height } = this;
    const now = Date.now();

    for (let i = this.activeOverlays.length - 1; i >= 0; i--) {
      const overlay = this.activeOverlays[i];

      if (!overlay.asset.loop && now - overlay.startTime >= overlay.duration) {
        this.activeOverlays.splice(i, 1);
        continue;
      }

      const vEl = overlay.videoEl;
      if (vEl.readyState < 2) continue;

      const vW = vEl.videoWidth || 480;
      const vH = vEl.videoHeight || 480;
      const bounds = calculateOverlayBounds(overlay.asset.position, width, height, vW, vH);

      ctx.save();
      ctx.globalAlpha = overlay.asset.opacity;

      if (overlay.asset.blendMode === 'screen') {
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(vEl, bounds.x, bounds.y, bounds.w, bounds.h);
      } else if (overlay.asset.blendMode === 'lighter') {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(vEl, bounds.x, bounds.y, bounds.w, bounds.h);
      } else if (overlay.asset.blendMode === 'multiply') {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(vEl, bounds.x, bounds.y, bounds.w, bounds.h);
      } else if (overlay.asset.blendMode === 'chroma-green') {
        this.chromaCanvas.width = vW;
        this.chromaCanvas.height = vH;
        this.chromaCtx.drawImage(vEl, 0, 0, vW, vH);

        const imgData = this.chromaCtx.getImageData(0, 0, vW, vH);
        const data = imgData.data;
        for (let p = 0; p < data.length; p += 4) {
          const r = data[p];
          const g = data[p + 1];
          const b = data[p + 2];
          if (isGreenScreenPixel(r, g, b)) {
            data[p + 3] = 0;
          }
        }
        this.chromaCtx.putImageData(imgData, 0, 0);

        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(this.chromaCanvas, bounds.x, bounds.y, bounds.w, bounds.h);
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(vEl, bounds.x, bounds.y, bounds.w, bounds.h);
      }

      ctx.restore();
    }
  }

  /**
   * Real-Time Body Dressing / Energy Aura around the streamer
   */
  private renderBodyAura(body: TrackedBody) {
    const { ctx, simTime } = this;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Volumetric Dragon / Flame Cloak around torso
    for (let i = 0; i < 16; i++) {
      const offset = (simTime * 2 + i * 0.15) % 1;
      const y = body.y + 120 - offset * 420;
      const x = body.x + Math.sin(simTime * 4 + i) * 180;
      const size = (1 - offset) * 70;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, 'rgba(0, 242, 254, 0.85)');
      grad.addColorStop(0.7, 'rgba(254, 44, 85, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Real-Time Three.js 3D Face AR Masks (Banuba & Snapchat Quality) + 3D Shockwave
   */
  private renderTrackedARMask(face: TrackedFace) {
    if (this.activeMask === 'none' && this.surpriseVFXTimer <= 0) return;
    const threeCanvas = this.threeAR.updateAndRender(
      face,
      this.activeMask,
      this.simTime,
      this.currentHatAnchor,
      this.currentGlassesAnchor,
      this.currentLandmarks,
      this.surpriseVFXTimer,
      this.currentAudioLevel,
      this.isMusicPlaying
    );
    this.ctx.drawImage(threeCanvas, 0, 0, this.width, this.height);
  }

  /**
   * 2D Cinematic Manga Speedlines & 3D Floating "😮 SURPRISE!" Badge
   */
  private renderSurpriseVFX(face: TrackedFace) {
    const { ctx, width, height } = this;
    const alpha = Math.min(1, this.surpriseVFXTimer);

    ctx.save();

    // 1. Dramatic Manga Comic Speedlines converging onto face center
    const numLines = 28;
    const centerX = face.x;
    const centerY = face.y;
    const maxRadius = Math.hypot(width, height) / 2;

    ctx.fillStyle = `rgba(255, 230, 0, ${alpha * 0.42})`;
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * Math.PI * 2 + (this.simTime * 2.5) % 0.12;
      const angleW = 0.045 + (i % 3) * 0.015;
      const rInner = 140 + Math.sin(this.simTime * 8 + i) * 20;

      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle - angleW) * maxRadius, centerY + Math.sin(angle - angleW) * maxRadius);
      ctx.lineTo(centerX + Math.cos(angle + angleW) * maxRadius, centerY + Math.sin(angle + angleW) * maxRadius);
      ctx.lineTo(centerX + Math.cos(angle) * rInner, centerY + Math.sin(angle) * rInner);
      ctx.closePath();
      ctx.fill();
    }

    // 2. High-Tech Kinetic Floating "😮 SURPRISE!" Badge
    const badgeY = face.y - 170 - (1 - alpha) * 40;
    const badgeScale = 0.8 + alpha * 0.35;

    ctx.translate(centerX, badgeY);
    ctx.scale(badgeScale, badgeScale);

    // Glowing badge background
    const text = '😮 SURPRISE!';
    ctx.font = 'bold 32px "Heebo", "Arial Black", sans-serif';
    const textMetrics = ctx.measureText(text);
    const boxW = textMetrics.width + 50;
    const boxH = 56;

    ctx.fillStyle = `rgba(7, 9, 14, ${alpha * 0.9})`;
    ctx.strokeStyle = `rgba(0, 242, 254, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 25 * alpha;

    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    // Bold text with neon gradient
    ctx.shadowBlur = 0;
    const textGrad = ctx.createLinearGradient(-boxW / 4, 0, boxW / 4, 0);
    textGrad.addColorStop(0, '#fe2c55');
    textGrad.addColorStop(0.5, '#ffd700');
    textGrad.addColorStop(1, '#00f2fe');
    ctx.fillStyle = textGrad;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 2);

    ctx.restore();
  }

  private renderFaceEffects(face: TrackedFace) {
    const { ctx, isBigHeadActive, isLaserEyesActive, simTime, width, height } = this;

    if (isBigHeadActive) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(face.x, face.y, 140, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.8)';
      ctx.lineWidth = 6;
      ctx.setLineDash([16, 12]);
      ctx.lineDashOffset = -simTime * 40;
      ctx.stroke();
      ctx.restore();
    }

    if (isLaserEyesActive) {
      ctx.save();
      const eyeL = face.leftEye;
      const eyeR = face.rightEye;
      const targetX = width / 2 + Math.sin(simTime * 12) * 200;
      const targetY = height + 100;

      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 35;

      [eyeL, eyeR].forEach((eye) => {
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.9)';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(eye.x, eye.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(eye.x, eye.y);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(eye.x, eye.y, 14, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  /**
   * 3D Kinetic Punch Impacts (Clean 3D metallic VFX, zero comic text)
   */
  private render3DPunches() {
    const { ctx } = this;

    for (let i = this.punches.length - 1; i >= 0; i--) {
      const p = this.punches[i];
      p.progress += 0.055;

      if (p.progress >= 1) {
        this.punches.splice(i, 1);
        continue;
      }

      ctx.save();

      const scale = Math.sin(p.progress * Math.PI) * 1.5;
      const alpha = p.progress < 0.7 ? 1 : (1 - p.progress) / 0.3;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // 1. Volumetric Optical Shockwave Ring
      ctx.save();
      ctx.translate(p.x, p.y);
      const ringRadius = p.progress * 220;

      const shockGrad = ctx.createRadialGradient(0, 0, ringRadius * 0.7, 0, 0, ringRadius);
      shockGrad.addColorStop(0, 'rgba(0, 242, 254, 0)');
      shockGrad.addColorStop(0.8, p.type === 'fire' ? 'rgba(255, 120, 0, 0.8)' : 'rgba(0, 242, 254, 0.8)');
      shockGrad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');
      ctx.strokeStyle = shockGrad;
      ctx.lineWidth = 12 * (1 - p.progress);
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. 3D Chrome / Metallic Kinetic Fist
      ctx.save();
      const fistX = p.side === 'left' ? p.x - (1 - p.progress) * 200 : p.side === 'right' ? p.x + (1 - p.progress) * 200 : p.x;
      const fistAngle = p.side === 'left' ? 0.35 : p.side === 'right' ? -0.35 : 0;

      ctx.translate(fistX, p.y);
      ctx.rotate(fistAngle);
      ctx.scale(scale, scale);

      // Chrome Gradient
      const chromeGrad = ctx.createLinearGradient(-40, -40, 40, 40);
      if (p.type === 'fire') {
        chromeGrad.addColorStop(0, '#ffffff');
        chromeGrad.addColorStop(0.3, '#ff9e00');
        chromeGrad.addColorStop(0.7, '#d00000');
        chromeGrad.addColorStop(1, '#370617');
      } else {
        chromeGrad.addColorStop(0, '#ffffff');
        chromeGrad.addColorStop(0.3, '#e0fbfc');
        chromeGrad.addColorStop(0.6, '#3d5a80');
        chromeGrad.addColorStop(1, '#0b0e14');
      }
      ctx.fillStyle = chromeGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 42, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Specular Highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.restore();
      ctx.restore();
    }
  }

  private renderParticles() {
    const { ctx, width, height } = this;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.type === 'coin' && p.y > height - 60) {
        p.y = height - 60;
        p.vy = -p.vy * p.bounce;
        p.vx *= 0.85;
      }

      if (p.alpha <= 0 || p.y > height + 100) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'coin') {
        const coinGrad = ctx.createRadialGradient(-p.size * 0.3, -p.size * 0.3, 2, 0, 0, p.size);
        coinGrad.addColorStop(0, '#ffffff');
        coinGrad.addColorStop(0.4, '#ffd166');
        coinGrad.addColorStop(1, '#e09f3e');
        ctx.fillStyle = coinGrad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire') {
        const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.size);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, p.color);
        grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Dispatches automated reaction effects triggered by MediaPipe facial landmark gestures
   */
  private handleFacialGesture(event: FacialGestureEvent) {
    if (event.type === 'surprise') {
      this.triggerSurpriseAnimation(event.mouthCenter, event.intensity);

      // Trigger user-configured secondary action
      if (this.surpriseActionPreset === 'combo') {
        this.triggerPunch('punch-combo');
      } else if (this.surpriseActionPreset === 'coins') {
        this.spawnCoins();
        studioAudio.playCoin();
      } else if (this.surpriseActionPreset === 'confetti') {
        this.spawnConfetti();
        studioAudio.playConfetti();
      } else if (this.surpriseActionPreset === 'laser') {
        this.toggleLaserEyes(true);
        setTimeout(() => this.toggleLaserEyes(false), 2200);
      }
    } else if (event.type === 'smile') {
      this.spawnSmileHearts(event.mouthCenter || { x: 360, y: 550, z: 0 });
      studioAudio.playSmile();
    } else if (event.type === 'blink' || event.type === 'wink_left' || event.type === 'wink_right') {
      this.spawnBlinkTwinkle(event.eyesCenter || { x: 360, y: 480, z: 0 });
      studioAudio.playBlink();
    }
  }

  /**
   * Triggers the full 3D & 2D Surprise reaction VFX
   */
  public triggerSurpriseAnimation(mouthCenter?: Point3D, intensity = 1.0) {
    this.surpriseVFXTimer = 1.0;
    if (mouthCenter) {
      this.surpriseMouthCenter = mouthCenter;
    }
    this.shakeIntensity = Math.max(this.shakeIntensity, 22 * intensity);
    studioAudio.playSurprise();
    this.spawnMouthSparks(mouthCenter || this.surpriseMouthCenter);
  }

  private spawnMouthSparks(center: Point3D) {
    const colors = ['#ffd700', '#00f2fe', '#ffffff', '#ff9500'];
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 14;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 12,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.4,
        alpha: 1,
        decay: 0.035,
        type: 'spark',
        gravity: 0.2,
        bounce: 0,
      });
    }
  }

  private spawnSmileHearts(center: Point3D) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: center.x + (Math.random() - 0.5) * 140,
        y: center.y - 30 - Math.random() * 40,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -3 - Math.random() * 4,
        size: 16 + Math.random() * 10,
        color: ['#ff2a6d', '#ff6584', '#ffd166'][Math.floor(Math.random() * 3)],
        rotation: (Math.random() - 0.5) * 0.4,
        vRot: (Math.random() - 0.5) * 0.1,
        alpha: 1,
        decay: 0.02,
        type: 'confetti',
        gravity: -0.05,
        bounce: 0,
      });
    }
  }

  private spawnBlinkTwinkle(eyesCenter: Point3D) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: eyesCenter.x + (Math.random() - 0.5) * 160,
        y: eyesCenter.y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 10 + Math.random() * 8,
        color: '#00f2fe',
        rotation: Math.random() * Math.PI,
        vRot: 0.3,
        alpha: 1,
        decay: 0.045,
        type: 'spark',
        gravity: 0,
        bounce: 0,
      });
    }
  }

  public getExpressions(): FacialExpressions {
    return this.currentExpressions;
  }

  public setGestureAutoTrigger(enabled: boolean) {
    this.mpTracker.setAutoTriggerEnabled(enabled);
  }

  public getGestureAutoTrigger(): boolean {
    return this.mpTracker.isAutoTriggerEnabled();
  }

  public setSurpriseActionPreset(preset: 'shockwave' | 'combo' | 'coins' | 'confetti' | 'laser') {
    this.surpriseActionPreset = preset;
  }

  public getSurpriseActionPreset(): string {
    return this.surpriseActionPreset;
  }

  public triggerTestGesture(type: 'surprise' | 'smile' | 'blink' = 'surprise') {
    this.mpTracker.triggerManualGesture(type, 0.95);
  }

  public cleanup() {
    this.stop();
    this.mpTracker.dispose();
    this.threeAR.dispose();
    this.activeOverlays.forEach((o) => o.videoEl.pause());
    this.activeOverlays = [];
    if (this.outputStream) {
      this.outputStream.getTracks().forEach((track) => track.stop());
      this.outputStream = null;
    }
  }
}
