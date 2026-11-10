import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiveSessionRow,
  LIVE_SESSION_HEADERS,
  buildSupportersRows,
} from './workspaceExport';

test('buildLiveSessionRow builds 7-column row with duration and counts', () => {
  const metrics = { durationSeconds: 3660, viewers: 1850, likes: 45000, diamonds: 250 };
  const row = buildLiveSessionRow(metrics, 'קרב אגרוף לייב');

  assert.equal(row.length, 7);
  assert.equal(row[1], 'קרב אגרוף לייב');
  assert.equal(row[2], '01:01:00');
  assert.equal(row[3], 1850);
  assert.equal(row[4], 45000);
  assert.equal(row[5], 250);
  assert.equal(row[6], 'הושלם בהצלחה');
});

test('LIVE_SESSION_HEADERS contains required column definitions', () => {
  assert.equal(LIVE_SESSION_HEADERS.length, 7);
  assert.ok(LIVE_SESSION_HEADERS.includes('תאריך ושעה'));
  assert.ok(LIVE_SESSION_HEADERS.includes('סה״כ לייקים'));
});

test('buildSupportersRows handles @ prefix and index ranking', () => {
  const users = [
    { username: 'david', points: 500, tag: 'VIP' },
    { username: '@noa_live', points: 350 },
  ];
  const rows = buildSupportersRows(users);

  assert.equal(rows.length, 2);
  assert.equal(rows[0][0], 1);
  assert.equal(rows[0][1], '@david');
  assert.equal(rows[0][2], 'VIP');
  assert.equal(rows[1][0], 2);
  assert.equal(rows[1][1], '@noa_live');
  assert.equal(rows[1][2], 'תומך פעיל');
});
