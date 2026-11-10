/**
 * Touch coordinates normalization and ADB command generator
 * Maps client screen viewport touch events to Android native resolution (e.g. 1080x1920)
 */

export interface NormalizedCoord {
  normX: number; // 0.0 to 1.0
  normY: number; // 0.0 to 1.0
  androidX: number; // 0 to targetW (pixels)
  androidY: number; // 0 to targetH (pixels)
}

/**
 * Normalizes client coordinates within a bounding rect to target resolution coordinates
 */
export function normalizeTouch(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  targetW = 1080,
  targetH = 1920
): NormalizedCoord {
  if (rect.width <= 0 || rect.height <= 0) {
    return { normX: 0.5, normY: 0.5, androidX: Math.round(targetW / 2), androidY: Math.round(targetH / 2) };
  }

  // Calculate relative 0.0 - 1.0 bounded coordinates
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;

  const normX = Math.max(0, Math.min(1, relX));
  const normY = Math.max(0, Math.min(1, relY));

  const androidX = Math.round(normX * targetW);
  const androidY = Math.round(normY * targetH);

  return { normX, normY, androidX, androidY };
}

/**
 * Generates an ADB input tap command
 */
export function formatAdbTap(androidX: number, androidY: number): string {
  return `input tap ${Math.round(androidX)} ${Math.round(androidY)}`;
}

/**
 * Generates an ADB input swipe command
 */
export function formatAdbSwipe(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  durationMs = 250
): string {
  return `input swipe ${Math.round(startX)} ${Math.round(startY)} ${Math.round(endX)} ${Math.round(endY)} ${Math.round(durationMs)}`;
}

/**
 * Generates an ADB input keyevent command
 */
export function formatAdbKeyevent(keyCode: number | string): string {
  return `input keyevent ${keyCode}`;
}

export const ADB_KEY_CODES = {
  HOME: 3,
  BACK: 4,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  POWER: 26,
  APP_SWITCH: 187, // Recents
} as const;
