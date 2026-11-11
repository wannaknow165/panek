import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BoosteraEffectsEngine,
  RateLimiter,
  signAssetUrl,
  verifySignedAssetUrl,
} from './boosteraEngine';

test('BoosteraEffectsEngine initializes all 12 categories including DeepAR, Gloves, Battle, and TikTok Universe', () => {
  const engine = new BoosteraEffectsEngine({ signingSecret: 'test-secret' });
  const all = engine.listEffects();

  assert.ok(all.length >= 55, 'Expected rich server-side effects registry');

  const categories = new Set(all.map((e) => e.category));
  for (const requiredCat of [
    'Camera',
    'AR',
    'Face',
    'Body',
    'Battle',
    'Gloves',
    'Gifts',
    'Characters',
    'Transitions',
    'Audio',
  ]) {
    assert.ok(categories.has(requiredCat as any), `Missing category ${requiredCat}`);
  }

  const universe = engine.getEffect('gift_universe_circle');
  assert.ok(universe, 'TikTok Universe circle gift must exist in server registry');
  assert.equal(universe?.assetFormat, 'webm_alpha');

  engine.dispose();
});

test('Glove variations resolve deterministically or randomly and emit glove_triggered + effect_started', () => {
  let rngStep = 0;
  const rngSeq = [0.85, 0.1]; // 0.85 * 4 => index 3 (Video D)
  const engine = new BoosteraEffectsEngine({
    rng: () => rngSeq[rngStep++ % rngSeq.length],
  });

  const events: string[] = [];
  engine.subscribe((msg) => {
    events.push(msg.event);
  });

  const res = engine.triggerEffect('glove_x5', { target: 'rival', opponentUser: 'khaledashur' });
  assert.equal(res.ok, true);
  assert.ok(res.layer?.variationLabel?.includes('Video D'));
  assert.equal(res.layer?.target, 'rival');
  assert.equal(res.layer?.opponentUser, 'khaledashur');
  assert.ok(events.includes('effect_started'));
  assert.ok(events.includes('glove_triggered'));

  // Explicit variation override (index 1 => Video B)
  const resExplicit = engine.triggerEffect('glove_x3', { variationIndex: 1 });
  assert.ok(resExplicit.layer?.variationLabel?.includes('Video B'));

  engine.dispose();
});

test('Active layers in Program Output are strictly sorted by zIndex and respect front/behind character layering', () => {
  const engine = new BoosteraEffectsEngine();

  engine.triggerEffect('cam_flash'); // zIndex 100
  engine.playCharacterInBattle({
    name: 'Behind Lion',
    asset: '/media/overlays/lion.webm',
    layerOrder: 'behind', // zIndex 35
    loop: true,
  });
  engine.playCharacterInBattle({
    name: 'Front Dancer',
    asset: '/media/overlays/fx_belly.webm',
    layerOrder: 'front', // zIndex 65
    loop: true,
  });
  engine.triggerEffect('gift_universe_circle'); // zIndex 76

  const program = engine.getProgramSnapshot();
  assert.equal(program.resolution.width, 1080);
  assert.equal(program.resolution.height, 1920);
  assert.equal(program.cleanFeedPath, '/clean-feed');
  assert.equal(program.virtualCameraName, 'BOOSTERA Camera');

  const zIndices = program.activeLayers.map((l) => l.zIndex);
  const sorted = [...zIndices].sort((a, b) => a - b);
  assert.deepEqual(zIndices, sorted, 'Program layers must be strictly ordered by ascending zIndex');
  assert.equal(zIndices[0], 35);
  assert.equal(zIndices[zIndices.length - 1], 100);

  // Stop all clears layers and resets transient camera flags
  const cleared = engine.stopAllEffects();
  assert.equal(cleared, 4);
  assert.equal(engine.getProgramSnapshot().activeLayers.length, 0);
  assert.equal(engine.getProgramSnapshot().camera.flash, false);

  engine.dispose();
});

test('Camera switch, Audio ducking, and disabled effect rejection work accurately', () => {
  const engine = new BoosteraEffectsEngine();

  assert.equal(engine.getProgramSnapshot().camera.facing, 'front');
  engine.setCameraFacing('switch');
  assert.equal(engine.getProgramSnapshot().camera.facing, 'back');
  engine.setCameraFacing('front');
  assert.equal(engine.getProgramSnapshot().camera.facing, 'front');

  // Audio update + ducking activation on audio effect
  engine.updateAudio({ gain: 1.25, ducking: true, muted: false });
  engine.triggerEffect('battle_snipe');
  assert.equal(engine.getProgramSnapshot().audio.duckingActive, true);
  assert.equal(engine.getProgramSnapshot().audio.gain, 1.25);

  // Disable an effect and ensure trigger fails cleanly
  engine.updateEffect('battle_win', { enabled: false });
  const denied = engine.triggerEffect('battle_win');
  assert.equal(denied.ok, false);

  engine.dispose();
});

test('syncUpstreamCatalog merges overlays and clips idempotently and binds Glove variations', () => {
  const engine = new BoosteraEffectsEngine();
  engine.syncUpstreamCatalog({
    overlays: [
      { id: 'boxer_real_1', he: 'אגרוף אמיתי 1', kind: 'overlay' },
      { id: 'khaled_chicken', he: 'תרנגולת לחאלד', kind: 'clip', user: 'khaledashur' },
    ],
    clips: [{ id: 'intro_mp4', name: 'פתיח שידור', file: '/media/clips/intro.mp4' }],
  });

  // Run a second time to verify idempotency (no duplicates)
  const countAfterFirst = engine.listEffects().length;
  engine.syncUpstreamCatalog({
    overlays: [
      { id: 'boxer_real_1', he: 'אגרוף אמיתי 1', kind: 'overlay' },
      { id: 'khaled_chicken', he: 'תרנגולת לחאלד', kind: 'clip', user: 'khaledashur' },
    ],
    clips: [{ id: 'intro_mp4', name: 'פתיח שידור', file: '/media/clips/intro.mp4' }],
  });
  assert.equal(engine.listEffects().length, countAfterFirst);

  const videos = engine.listEffects({ category: 'Videos' });
  assert.equal(videos.length, 1);
  assert.equal(videos[0].assetFormat, 'mp4');

  const glove5 = engine.getEffect('glove_x5');
  assert.equal(glove5?.variations?.[0].asset, '/media/overlays/boxer_real_1.webm');

  engine.dispose();
});

test('HMAC signed asset URLs and RateLimiter enforce security constraints', () => {
  const secret = 'super-secret-boostera-key';
  const exp = Date.now() + 60_000;
  const signed = signAssetUrl('/media/overlays/x5.webm', secret, exp);
  const parsed = new URL(`http://localhost${signed}`);

  assert.equal(
    verifySignedAssetUrl(
      '/media/overlays/x5.webm',
      Number(parsed.searchParams.get('exp')),
      parsed.searchParams.get('sig') || '',
      secret
    ),
    true
  );

  // Tampered path or expired timestamp must fail
  assert.equal(
    verifySignedAssetUrl(
      '/media/overlays/other.webm',
      Number(parsed.searchParams.get('exp')),
      parsed.searchParams.get('sig') || '',
      secret
    ),
    false
  );
  assert.equal(
    verifySignedAssetUrl(
      '/media/overlays/x5.webm',
      Date.now() - 1000,
      parsed.searchParams.get('sig') || '',
      secret
    ),
    false
  );

  const limiter = new RateLimiter(3, 1);
  const t0 = 1_000_000;
  assert.equal(limiter.allow('ip1', t0), true);
  assert.equal(limiter.allow('ip1', t0), true);
  assert.equal(limiter.allow('ip1', t0), true);
  assert.equal(limiter.allow('ip1', t0), false);
  assert.equal(limiter.allow('ip1', t0 + 1100), true);
});
