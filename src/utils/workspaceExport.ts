import { LiveMetrics, formatLiveDuration } from './liveAnalytics';

/**
 * Formats session metrics into a Google Sheet spreadsheet row
 */
export function buildLiveSessionRow(
  metrics: LiveMetrics,
  sessionTitle: string = 'שידור TikTok Live'
): (string | number)[] {
  const dateStr = new Date().toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    dateStr,
    sessionTitle,
    formatLiveDuration(metrics.durationSeconds),
    metrics.viewers,
    metrics.likes,
    metrics.diamonds ?? 0,
    'הושלם בהצלחה',
  ];
}

/**
 * Standard table headers for live stream report
 */
export const LIVE_SESSION_HEADERS = [
  'תאריך ושעה',
  'כותרת השידור',
  'משך שידור',
  'צופים (שיא)',
  'סה״כ לייקים',
  'יהלומים ומתנות',
  'סטטוס',
];

/**
 * Formats supporters / competitors into spreadsheet rows
 */
export function buildSupportersRows(
  users: Array<{ username: string; points?: number; tag?: string }>
): (string | number)[][] {
  return users.map((u, idx) => [
    idx + 1,
    u.username.startsWith('@') ? u.username : `@${u.username}`,
    u.tag || 'תומך פעיל',
    u.points ?? 0,
    new Date().toLocaleDateString('he-IL'),
  ]);
}
