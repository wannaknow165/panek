import test from 'node:test';
import assert from 'node:assert/strict';
import { isGreenScreenPixel, calculateOverlayBounds } from './chromaKey';

test('isGreenScreenPixel correctly identifies pure green', () => {
  assert.equal(isGreenScreenPixel(0, 255, 0), true);
  assert.equal(isGreenScreenPixel(15, 230, 25), true);
});

test('isGreenScreenPixel rejects non-green pixels', () => {
  assert.equal(isGreenScreenPixel(255, 255, 255), false); // white
  assert.equal(isGreenScreenPixel(0, 0, 0), false); // black
  assert.equal(isGreenScreenPixel(220, 50, 40), false); // red
  assert.equal(isGreenScreenPixel(40, 50, 220), false); // blue
  assert.equal(isGreenScreenPixel(80, 85, 80), false); // dark gray
});

test('calculateOverlayBounds correctly computes fullscreen cover', () => {
  const bounds = calculateOverlayBounds('fullscreen', 720, 1280, 1920, 1080);
  // Video is wider than canvas 9:16, so height matches 1280, width is scaled and centered
  assert.equal(bounds.h, 1280);
  assert.ok(bounds.w > 720);
  assert.ok(bounds.x < 0);
  assert.equal(bounds.y, 0);
});

test('calculateOverlayBounds centers overlay properly', () => {
  const bounds = calculateOverlayBounds('center', 720, 1280, 500, 500);
  assert.equal(bounds.w, 720 * 0.78);
  assert.equal(bounds.h, 720 * 0.78);
  assert.equal(bounds.x, (720 - bounds.w) / 2);
  assert.equal(bounds.y, (1280 - bounds.h) / 2);
});
