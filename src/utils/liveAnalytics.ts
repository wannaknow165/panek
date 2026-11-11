export interface LiveMetrics {
  durationSeconds: number;
  viewers: number;
  likes: number;
  diamonds?: number;
}

/**
 * Formats elapsed seconds into HH:MM:SS or MM:SS
 */
export function formatLiveDuration(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats count into compact human readable format (e.g. 1.2K, 45.6K)
 */
export function formatCompactNumber(num: number): string {
  if (num < 0 || isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  if (num >= 1_000) {
    return num.toLocaleString('en-US');
  }
  return num.toString();
}
