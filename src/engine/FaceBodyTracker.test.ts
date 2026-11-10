import test from 'node:test';
import assert from 'node:assert/strict';
import { smoothLerp } from './FaceBodyTracker';

test('smoothLerp interpolates smoothly towards target', () => {
  const v1 = smoothLerp(0, 100, 0.5);
  assert.equal(v1, 50);

  const v2 = smoothLerp(100, 200, 0.25);
  assert.equal(v2, 125);
});

test('smoothLerp preserves value when current equals target', () => {
  assert.equal(smoothLerp(42, 42, 0.5), 42);
});
