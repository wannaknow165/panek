import { VideoPosition } from '../types/videoOverlay';

/**
 * Detects whether an RGB pixel matches green-screen chroma key
 * Used when overlaying video clips shot on green backdrop
 */
export function isGreenScreenPixel(
  r: number,
  g: number,
  b: number,
  threshold = 80,
  dominanceRatio = 1.35
): boolean {
  // Green must be above minimum luminance threshold
  if (g < threshold) return false;

  // Green must significantly dominate red and blue channels
  const maxOther = Math.max(r, b);
  return g > maxOther * dominanceRatio && g - maxOther > 30;
}

/**
 * Calculates coordinates and dimensions for drawing video overlay onto canvas
 */
export function calculateOverlayBounds(
  position: VideoPosition,
  canvasW: number,
  canvasH: number,
  videoW: number,
  videoH: number
): { x: number; y: number; w: number; h: number } {
  if (videoW <= 0 || videoH <= 0 || canvasW <= 0 || canvasH <= 0) {
    return { x: 0, y: 0, w: canvasW, h: canvasH };
  }

  switch (position) {
    case 'fullscreen': {
      // Cover the whole canvas
      const scale = Math.max(canvasW / videoW, canvasH / videoH);
      const w = videoW * scale;
      const h = videoH * scale;
      const x = (canvasW - w) / 2;
      const y = (canvasH - h) / 2;
      return { x, y, w, h };
    }

    case 'center': {
      // Centered 75% width
      const targetW = canvasW * 0.78;
      const targetH = targetW * (videoH / videoW);
      const x = (canvasW - targetW) / 2;
      const y = (canvasH - targetH) / 2;
      return { x, y, w: targetW, h: targetH };
    }

    case 'bottom': {
      // Bottom banner overlay (e.g. fire/energy bursts)
      const targetW = canvasW;
      const targetH = canvasH * 0.45;
      return { x: 0, y: canvasH - targetH, w: targetW, h: targetH };
    }

    case 'top-right': {
      const targetW = canvasW * 0.38;
      const targetH = targetW * (videoH / videoW);
      return { x: canvasW - targetW - 20, y: 30, w: targetW, h: targetH };
    }

    case 'top-left': {
      const targetW = canvasW * 0.38;
      const targetH = targetW * (videoH / videoW);
      return { x: 20, y: 30, w: targetW, h: targetH };
    }

    default:
      return { x: 0, y: 0, w: canvasW, h: canvasH };
  }
}
