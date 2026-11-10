import test from 'node:test';
import assert from 'node:assert';
import {
  computeFacePoseFromLandmarks,
  computeGlassesAnchor,
  computeHatAnchor,
  computeExpressionsFromLandmarks,
  MediaPipeFaceTracker,
} from './MediaPipeFaceTracker';

test('computeGlassesAnchor places glasses at bridge of nose between eyes', () => {
  // Mock landmark coordinates (normalized 0..1 in 720x1280 screen)
  const leftEye = { x: 300, y: 500, z: 0 };
  const rightEye = { x: 420, y: 500, z: 0 };
  const noseBridge = { x: 360, y: 490, z: 15 };

  const anchor = computeGlassesAnchor(leftEye, rightEye, noseBridge);
  assert.strictEqual(anchor.x, 360);
  assert.strictEqual(anchor.y, 490);
  assert.strictEqual(anchor.width, 120);
});

test('computeHatAnchor places hat above forehead with correct head roll', () => {
  const forehead = { x: 360, y: 380, z: 0 };
  const chin = { x: 360, y: 640, z: 0 };
  const leftTemple = { x: 260, y: 460, z: 0 };
  const rightTemple = { x: 460, y: 460, z: 0 };

  const anchor = computeHatAnchor(forehead, chin, leftTemple, rightTemple);
  assert.strictEqual(anchor.x, 360);
  // Hat should be above forehead (y < 380)
  assert.ok(anchor.y < 380);
  assert.strictEqual(anchor.headWidth, 200);
});

test('computeFacePoseFromLandmarks calculates yaw, pitch and roll', () => {
  const leftEye = { x: 310, y: 500, z: -10 };
  const rightEye = { x: 410, y: 500, z: 10 };
  const forehead = { x: 360, y: 400, z: 0 };
  const chin = { x: 360, y: 650, z: 0 };
  const noseTip = { x: 360, y: 530, z: 40 };

  const pose = computeFacePoseFromLandmarks(leftEye, rightEye, forehead, chin, noseTip);
  assert.ok(typeof pose.roll === 'number');
  assert.ok(typeof pose.yaw === 'number');
  assert.ok(typeof pose.pitch === 'number');
  assert.strictEqual(pose.roll, 0); // Both eyes at y=500 -> 0 roll
});

test('computeExpressionsFromLandmarks detects wide open mouth (Surprise / Jaw Drop)', () => {
  // Construct 478 mock landmarks
  const mockLandmarks = new Array(478).fill({ x: 360, y: 500, z: 0 });

  // Wide mouth opening: upper inner lip 13 at y=550, lower inner lip 14 at y=630 (80px gap), mouth corners 61 & 291 at width 100px
  mockLandmarks[13] = { x: 360, y: 550, z: 0 };
  mockLandmarks[14] = { x: 360, y: 630, z: 0 };
  mockLandmarks[61] = { x: 310, y: 580, z: 0 };
  mockLandmarks[291] = { x: 410, y: 580, z: 0 };

  const exp = computeExpressionsFromLandmarks(mockLandmarks);
  assert.ok(exp.mouthOpen > 0.5, `Expected mouthOpen > 0.5, got ${exp.mouthOpen}`);
  assert.strictEqual(exp.isSurprise, true, 'isSurprise must be true when mouth is wide open');
});

test('computeExpressionsFromLandmarks detects closed mouth as neutral (not surprise)', () => {
  const mockLandmarks = new Array(478).fill({ x: 360, y: 500, z: 0 });

  // Closed mouth: gap is only 6px, mouth width 100px
  mockLandmarks[13] = { x: 360, y: 577, z: 0 };
  mockLandmarks[14] = { x: 360, y: 583, z: 0 };
  mockLandmarks[61] = { x: 310, y: 580, z: 0 };
  mockLandmarks[291] = { x: 410, y: 580, z: 0 };

  const exp = computeExpressionsFromLandmarks(mockLandmarks);
  assert.ok(exp.mouthOpen < 0.2, `Expected mouthOpen < 0.2, got ${exp.mouthOpen}`);
  assert.strictEqual(exp.isSurprise, false, 'isSurprise must be false when mouth is closed');
});

test('computeExpressionsFromLandmarks incorporates blendshapes for smile and surprise', () => {
  const mockLandmarks = new Array(478).fill({ x: 360, y: 500, z: 0 });

  const expSmile = computeExpressionsFromLandmarks(mockLandmarks, {
    mouthSmileLeft: 0.85,
    mouthSmileRight: 0.82,
  });
  assert.ok(expSmile.mouthSmile > 0.7);
  assert.strictEqual(expSmile.isSmiling, true);

  const expJaw = computeExpressionsFromLandmarks(mockLandmarks, {
    jawOpen: 0.75,
  });
  assert.ok(expJaw.mouthOpen > 0.7);
  assert.strictEqual(expJaw.isSurprise, true);
});

test('MediaPipeFaceTracker notifies registered gesture listeners', () => {
  const tracker = new MediaPipeFaceTracker();

  let receivedEvent: any = null;
  const unsubscribe = tracker.addGestureListener((event: any) => {
    receivedEvent = event;
  });

  tracker.triggerManualGesture('surprise', 0.95);
  assert.ok(receivedEvent !== null);
  assert.strictEqual(receivedEvent.type, 'surprise');
  assert.strictEqual(receivedEvent.intensity, 0.95);

  receivedEvent = null;
  unsubscribe();
  tracker.triggerManualGesture('smile', 0.8);
  assert.strictEqual(receivedEvent, null, 'Unsubscribed listener should not receive events');

  tracker.dispose();
});
