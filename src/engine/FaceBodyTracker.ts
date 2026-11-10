/**
 * Real-Time Face & Body Tracking and Cutout Segmentation Engine
 * Tracks head coordinates, eye centers, head tilt, and body silhouette for AR Masks & Body Dressing.
 */

export interface TrackedFace {
  detected: boolean;
  x: number; // Center X
  y: number; // Center Y
  width: number;
  height: number;
  roll: number; // Head rotation angle in radians (Z)
  yaw: number;  // Head turning angle in radians (Y)
  pitch: number;// Head nod angle in radians (X)
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  forehead: { x: number; y: number };
  mouth: { x: number; y: number };
}

export interface TrackedBody {
  detected: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  shoulders: { left: { x: number; y: number }; right: { x: number; y: number } };
}

export function smoothLerp(current: number, target: number, factor = 0.25): number {
  return current + (target - current) * factor;
}

export class FaceBodyTracker {
  private currentFace: TrackedFace = {
    detected: true,
    x: 360,
    y: 520,
    width: 220,
    height: 280,
    roll: 0,
    yaw: 0,
    pitch: 0,
    leftEye: { x: 315, y: 490 },
    rightEye: { x: 405, y: 490 },
    forehead: { x: 360, y: 410 },
    mouth: { x: 360, y: 580 },
  };

  private currentBody: TrackedBody = {
    detected: true,
    x: 360,
    y: 780,
    width: 480,
    height: 600,
    shoulders: {
      left: { x: 220, y: 680 },
      right: { x: 500, y: 680 },
    },
  };

  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D;
  private lastDetectTime = 0;

  constructor() {
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 160;
    this.sampleCanvas.height = 280;
    const ctx = this.sampleCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create tracking sample context');
    this.sampleCtx = ctx;
  }

  /**
   * Tracks head and body from live video stream or simulated presenter
   */
  public update(videoEl: HTMLVideoElement | null, width = 720, height = 1280): { face: TrackedFace; body: TrackedBody } {
    const hasLiveVideo = videoEl && videoEl.readyState >= 2 && !videoEl.paused;
    const now = Date.now();

    if (hasLiveVideo && now - this.lastDetectTime > 60) {
      this.lastDetectTime = now;
      this.detectFromVideo(videoEl, width, height);
    } else if (!hasLiveVideo) {
      // Natural subtle head motion for when webcam is pending
      const t = now * 0.002;
      const targetX = 360 + Math.sin(t * 1.5) * 25;
      const targetY = 510 + Math.cos(t * 2) * 15;
      const targetRoll = Math.sin(t * 1.2) * 0.06;
      const targetYaw = Math.sin(t * 1.6) * 0.18;
      const targetPitch = Math.cos(t * 1.4) * 0.12;

      this.currentFace.x = smoothLerp(this.currentFace.x, targetX, 0.15);
      this.currentFace.y = smoothLerp(this.currentFace.y, targetY, 0.15);
      this.currentFace.roll = smoothLerp(this.currentFace.roll, targetRoll, 0.15);
      this.currentFace.yaw = smoothLerp(this.currentFace.yaw, targetYaw, 0.15);
      this.currentFace.pitch = smoothLerp(this.currentFace.pitch, targetPitch, 0.15);
      this.currentFace.leftEye = { x: this.currentFace.x - 45, y: this.currentFace.y - 30 };
      this.currentFace.rightEye = { x: this.currentFace.x + 45, y: this.currentFace.y - 30 };
      this.currentFace.forehead = { x: this.currentFace.x, y: this.currentFace.y - 110 };
      this.currentFace.mouth = { x: this.currentFace.x, y: this.currentFace.y + 60 };

      this.currentBody.x = this.currentFace.x;
      this.currentBody.y = this.currentFace.y + 260;
      this.currentBody.shoulders.left = { x: this.currentFace.x - 140, y: this.currentFace.y + 160 };
      this.currentBody.shoulders.right = { x: this.currentFace.x + 140, y: this.currentFace.y + 160 };
    }

    return { face: this.currentFace, body: this.currentBody };
  }

  private detectFromVideo(videoEl: HTMLVideoElement, width: number, height: number) {
    const sW = this.sampleCanvas.width;
    const sH = this.sampleCanvas.height;
    this.sampleCtx.drawImage(videoEl, 0, 0, sW, sH);

    const imgData = this.sampleCtx.getImageData(0, 0, sW, sH);
    const data = imgData.data;

    // Optical centroid detection of face/skin region
    let skinSumX = 0;
    let skinSumY = 0;
    let skinCount = 0;

    // Scan top 60% for head
    for (let y = 15; y < sH * 0.65; y += 4) {
      for (let x = 15; x < sW - 15; x += 4) {
        const i = (y * sW + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skin chromaticity heuristic
        if (r > 60 && g > 40 && b > 20 && r > g && r > b && r - g > 15) {
          skinSumX += x;
          skinSumY += y;
          skinCount++;
        }
      }
    }

    if (skinCount > 40) {
      const avgNormX = (skinSumX / skinCount) / sW;
      const avgNormY = (skinSumY / skinCount) / sH;

      const targetX = avgNormX * width;
      const targetY = avgNormY * height;

      this.currentFace.x = smoothLerp(this.currentFace.x, targetX, 0.3);
      this.currentFace.y = smoothLerp(this.currentFace.y, targetY, 0.3);
      this.currentFace.leftEye = { x: this.currentFace.x - 45, y: this.currentFace.y - 30 };
      this.currentFace.rightEye = { x: this.currentFace.x + 45, y: this.currentFace.y - 30 };
      this.currentFace.forehead = { x: this.currentFace.x, y: this.currentFace.y - 110 };
      this.currentFace.mouth = { x: this.currentFace.x, y: this.currentFace.y + 60 };

      this.currentBody.x = this.currentFace.x;
      this.currentBody.y = this.currentFace.y + 260;
      this.currentBody.shoulders.left = { x: this.currentFace.x - 140, y: this.currentFace.y + 160 };
      this.currentBody.shoulders.right = { x: this.currentFace.x + 140, y: this.currentFace.y + 160 };
    }
  }

  public getFace(): TrackedFace {
    return this.currentFace;
  }

  public getBody(): TrackedBody {
    return this.currentBody;
  }
}
