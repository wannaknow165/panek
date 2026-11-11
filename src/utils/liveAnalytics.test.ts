import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatLiveDuration,
  formatCompactNumber,
} from './liveAnalytics';

test('formatLiveDuration formats minutes and seconds correctly', () => {
  assert.equal(formatLiveDuration(0), '00:00');
  assert.equal(formatLiveDuration(65), '01:05');
  assert.equal(formatLiveDuration(599), '09:59');
});

test('formatLiveDuration includes hours when over 3600 seconds', () => {
  assert.equal(formatLiveDuration(3600), '01:00:00');
  assert.equal(formatLiveDuration(3665), '01:01:05');
  assert.equal(formatLiveDuration(7325), '02:02:05');
});

test('formatLiveDuration handles negative or invalid input gracefully', () => {
  assert.equal(formatLiveDuration(-10), '00:00');
  assert.equal(formatLiveDuration(NaN), '00:00');
});

test('formatCompactNumber formats numbers into compact string', () => {
  assert.equal(formatCompactNumber(0), '0');
  assert.equal(formatCompactNumber(450), '450');
  assert.equal(formatCompactNumber(1250), '1,250');
  assert.equal(formatCompactNumber(15400), '15.4K');
  assert.equal(formatCompactNumber(250000), '250K');
  assert.equal(formatCompactNumber(1500000), '1.5M');
});
