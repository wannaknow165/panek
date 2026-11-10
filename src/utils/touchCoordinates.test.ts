import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTouch,
  formatAdbTap,
  formatAdbSwipe,
  formatAdbKeyevent,
  ADB_KEY_CODES,
} from './touchCoordinates';

test('normalizeTouch correctly maps center of rect to native resolution', () => {
  const rect = { left: 100, top: 50, width: 400, height: 800 };
  const res = normalizeTouch(300, 450, rect, 1080, 1920);

  assert.equal(res.normX, 0.5);
  assert.equal(res.normY, 0.5);
  assert.equal(res.androidX, 540);
  assert.equal(res.androidY, 960);
});

test('normalizeTouch clamps out of bounds clicks', () => {
  const rect = { left: 0, top: 0, width: 200, height: 400 };
  const resNegative = normalizeTouch(-50, -20, rect, 1080, 1920);
  assert.equal(resNegative.normX, 0);
  assert.equal(resNegative.normY, 0);
  assert.equal(resNegative.androidX, 0);
  assert.equal(resNegative.androidY, 0);

  const resOverflow = normalizeTouch(250, 500, rect, 1080, 1920);
  assert.equal(resOverflow.normX, 1);
  assert.equal(resOverflow.normY, 1);
  assert.equal(resOverflow.androidX, 1080);
  assert.equal(resOverflow.androidY, 1920);
});

test('formatAdbTap produces valid ADB command', () => {
  const cmd = formatAdbTap(540, 960);
  assert.equal(cmd, 'input tap 540 960');
});

test('formatAdbSwipe produces valid ADB swipe command', () => {
  const cmd = formatAdbSwipe(540, 1500, 540, 400, 300);
  assert.equal(cmd, 'input swipe 540 1500 540 400 300');
});

test('formatAdbKeyevent correctly formats key codes', () => {
  assert.equal(formatAdbKeyevent(ADB_KEY_CODES.BACK), 'input keyevent 4');
  assert.equal(formatAdbKeyevent(ADB_KEY_CODES.HOME), 'input keyevent 3');
});
