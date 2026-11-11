import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyArielSnapshot,
  filterOpponentOverlays,
  filterGenericCharacterOverlays,
  isChinoSendableOverlay,
  isTiktokActivelyLive,
  parseRealSseChatEvent,
  applyArielSseEvent,
  OverlayItem,
} from './arielState';

const SAMPLE_OVERLAYS: OverlayItem[] = [
  { id: 'boxer1', he: 'מתאגרף', kind: '' },
  { id: 'ov_turk_vs_ronbiton11_1', he: 'רון חוטף', kind: 'clip', user: 'ronbiton11' },
  { id: 'ov_turk_vs_khaledashur_1', he: 'חאלד חוטף', kind: 'clip', user: 'khaledashur' },
  { id: 'ov_belly_ronbiton11', he: 'רון ריקוד בטן', kind: 'clip', user: 'ronbiton11', set: 'fx_belly' },
];

test('filterOpponentOverlays returns empty when user is blank and showAll is false', () => {
  const res = filterOpponentOverlays(SAMPLE_OVERLAYS, '', false);
  assert.equal(res.length, 0);
});

test('filterOpponentOverlays filters case-insensitively and strips leading @', () => {
  const res = filterOpponentOverlays(SAMPLE_OVERLAYS, '@RonBiton11', false);
  assert.equal(res.length, 2);
  assert.ok(res.every((o) => o.user === 'ronbiton11'));
});

test('filterOpponentOverlays returns all opponent clips when showAll is true', () => {
  const res = filterOpponentOverlays(SAMPLE_OVERLAYS, '', true);
  assert.equal(res.length, 3);
  assert.ok(res.every((o) => o.kind === 'clip'));
});

test('filterGenericCharacterOverlays excludes per-opponent clips', () => {
  const generic = filterGenericCharacterOverlays(SAMPLE_OVERLAYS);
  assert.equal(generic.length, 1);
  assert.equal(generic[0].id, 'boxer1');
});

test('isChinoSendableOverlay identifies opponent clips and dance sets', () => {
  assert.equal(isChinoSendableOverlay(SAMPLE_OVERLAYS[3]), true);
  assert.equal(isChinoSendableOverlay({ id: 'fx_chicken_test', he: 'תרנגולת' }), true);
  assert.equal(isChinoSendableOverlay({ id: 'plain_frame', he: 'מסגרת' }), false);
});

test('isTiktokActivelyLive distinguishes disconnected 4404 from live connection', () => {
  assert.equal(
    isTiktokActivelyLive({
      on: true,
      user: 'duop1658',
      status: 'נותק (4404) Creator is not currently live. Retry after 91s.',
    }),
    false
  );
  assert.equal(
    isTiktokActivelyLive({
      on: true,
      user: 'duop1658',
      status: 'מחובר ✓ לחדר השידור',
    }),
    true
  );
  assert.equal(isTiktokActivelyLive({ on: false, user: '', status: '' }), false);
});

test('parseRealSseChatEvent parses real chatmsg and gift events', () => {
  const chat = parseRealSseChatEvent(
    { type: 'chatmsg', kind: 'chat', user: 'yossi99', nick: 'יוסי', text: 'אלוף!' },
    1000
  );
  assert.ok(chat);
  assert.equal(chat.kind, 'chat');
  assert.equal(chat.nickname, 'יוסי');
  assert.equal(chat.text, 'אלוף!');

  const gift = parseRealSseChatEvent(
    { type: 'chatmsg', kind: 'gift', user: 'vip1', nick: 'VIP', giftName: 'Rose', repeatCount: 5, diamondCount: 5 },
    2000
  );
  assert.ok(gift);
  assert.equal(gift.kind, 'gift');
  assert.equal(gift.giftCount, 5);
});

test('applyArielSseEvent updates cloud, headgame, status logs, and chat events immutably', () => {
  let state = createEmptyArielSnapshot();
  state = applyArielSseEvent(state, { type: 'cloud', on: true, state: 'live', phone: true }, 100);
  assert.equal(state.cloud.on, true);
  assert.equal(state.cloud.state, 'live');
  assert.equal(state.cloud.phone, true);

  state = applyArielSseEvent(state, { type: 'headgame', on: true, user: 'khaledashur', thrown: 7 }, 200);
  assert.equal(state.headgame.on, true);
  assert.equal(state.headgame.user, 'khaledashur');
  assert.equal(state.headgame.thrown, 7);

  state = applyArielSseEvent(state, { type: 'status', msg: 'עצר הכל' }, 300);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0].message, 'עצר הכל');
});

test('getPlayerAvatarUrl and flattenPlayerClips parse real /api/players object schema cleanly', async () => {
  const { getPlayerAvatarUrl, flattenPlayerClips, getChinoStateLabel } = await import('./arielState');

  const realServerPlayer = {
    user: 'khaledashur',
    photo: '',
    head: { t: 1794244722646, img: '/data/heads/khaledashur.png' },
    clips: {
      fx_chicken: [
        {
          id: 'ov_turk_vs_khaledashur_mw9izgtx',
          t: 100,
          engine: 'x-ai/grok-imagine-video-1.5-lite',
          chino: { preset: 'chicken_blow', sends: 14, state: 'queued', rid: 'rid-1' },
        },
      ],
      fx_bottle: [
        {
          id: 'ov_turk_vs_khaledashur_mw9plswu',
          t: 200,
          engine: 'x-ai/grok-imagine-video-1.5-lite',
          chino: { preset: 'baby_bottle_feed', sends: 5, state: 'playing', rid: 'rid-2' },
        },
      ],
    },
  };

  assert.equal(getPlayerAvatarUrl(realServerPlayer), '/data/heads/khaledashur.png');

  const flat = flattenPlayerClips(realServerPlayer);
  assert.equal(flat.length, 2);
  // Sorted newest first (t=200 before t=100)
  assert.equal(flat[0].id, 'ov_turk_vs_khaledashur_mw9plswu');
  assert.equal(flat[0].set, 'fx_bottle');
  assert.equal(flat[0].he, '🍼 בקבוק של צ׳ינו');
  assert.equal(flat[0].chino?.state, 'playing');

  assert.equal(getChinoStateLabel('playing').tone, 'green');
  assert.equal(getChinoStateLabel('queued').tone, 'gold');
});

