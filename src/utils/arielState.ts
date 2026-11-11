export interface ArielTiktokStatus {
  on: boolean;
  user: string;
  status: string;
  seen?: number;
  viewers?: number;
  events?: Record<string, number>;
}

export interface ArielEngineStatus {
  online?: boolean;
  state?: string;
  url?: string;
  auto?: boolean;
  lastErr?: string;
}

export interface ArielPlayingClip {
  id: string;
  audio?: boolean;
}

export interface ArielOppScreenState {
  on: boolean;
  user?: string;
  status?: string;
  show?: boolean;
  muted?: boolean;
  src?: string;
  token?: string;
  view?: {
    preset?: 'full' | 'right' | 'left';
    scale?: number;
    x?: number;
    y?: number;
  };
}

export interface ArielDeskState {
  mode: string;
  auto: boolean;
  opponent: string;
  muted: boolean;
  scene?: string;
  autoReply?: boolean;
  tiktok?: ArielTiktokStatus;
  engine?: ArielEngineStatus;
  clip?: ArielPlayingClip | null;
  oppScreen?: ArielOppScreenState;
}

export interface ArielCloudState {
  deskUrl: string;
  phoneUrl: string;
  on: boolean;
  state: 'off' | 'starting' | 'live' | 'error' | string;
  frames: number;
  linux: boolean;
  phone: boolean;
  rtsp?: string;
  error?: string;
}

export interface RosterOpponent {
  user: string;
  clips: number;
  sets: number;
  total: number;
  saved: boolean;
  alive: boolean;
}

export interface OverlayFaceItem {
  thumb: string;
}

export interface OverlayItem {
  id: string;
  he: string;
  kind?: string;
  user?: string;
  set?: string;
  pos?: 'left' | 'center' | 'right';
  size?: number;
  bottom?: number;
  head?: number;
  hitAt?: number;
  secs?: number;
  full?: boolean;
  anchor?: string;
  face?: number;
  faces?: OverlayFaceItem[];
}

export interface OverlayJob {
  status: string;
  frames?: number;
  keep?: boolean;
}

export interface GenJob {
  id?: string;
  kind?: string;
  user?: string;
  he?: string;
  desc?: string;
  status: string;
  step?: number;
  error?: string;
  cost?: number;
  ovId?: string;
  imgs?: {
    head?: string;
    start?: string;
  };
}

export interface HeadGameState {
  on: boolean;
  user: string;
  likes: boolean;
  size: number;
  y?: number;
  thrown?: number;
  mode?: string;
  showHead?: boolean;
}

export interface SetClipAsset {
  id: string;
  name: string;
  file?: string;
  thumb?: string;
  audio?: boolean;
  secs?: number;
  size?: 'full' | 'inset' | 'insetWide';
}

export interface SetLayerAsset {
  id: string;
  name: string;
  file: string;
  type: 'image' | 'video' | 'camera' | string;
  thumb?: string;
  opacity?: number;
  label?: string;
  mirror?: boolean;
}

export interface SetSceneItem {
  id: string;
  name: string;
  thumb?: string;
  mode?: string;
  frame?: { shot?: string; scale?: number; x?: number; y?: number };
}

export interface ArielSetConfig {
  mode?: string;
  dim?: number;
  bg?: SetLayerAsset | null;
  front?: SetLayerAsset[];
  scene?: string;
  frame?: {
    shot?: string;
    scale?: number;
    x?: number;
    y?: number;
  };
}

export interface FxTransparentItem {
  id: string;
  name: string;
  thumb?: string;
  alpha?: boolean;
  secs?: number;
  aim?: 'face' | 'full';
}

export interface PlayerClipEntry {
  id: string;
  he: string;
  set: string;
}

export interface PlayerClipChinoMeta {
  preset?: string;
  sends?: number;
  state?: string;
  rid?: string;
}

export interface PlayerSetClipItem {
  id: string;
  t?: number;
  engine?: string;
  he?: string;
  chino?: PlayerClipChinoMeta | null;
}

export interface PlayerFunSceneItem {
  id: string;
  file?: string;
  img?: string;
  status?: string;
  t?: number;
}

export interface PlayerHeadObject {
  img?: string;
  t?: number;
}

export interface PlayerRecord {
  user: string;
  nick?: string;
  photo?: string;
  head?: PlayerHeadObject | string | null;
  roles?: string[];
  clips?: Record<string, PlayerSetClipItem[]> | PlayerClipEntry[];
  fun?: Record<string, PlayerFunSceneItem[]>;
  gifts?: number;
  diamonds?: number;
  last?: number;
}

export interface FlattenedPlayerClip {
  id: string;
  set: string;
  he: string;
  engine?: string;
  t?: number;
  chino?: PlayerClipChinoMeta | null;
}

export interface OpenRouterEngineModel {
  id: string;
  est?: { secs?: number; res?: string; usd?: number };
  out?: number;
  durations?: number[];
  resolutions?: string[];
}

export interface OpenRouterEnginesConfig {
  current?: {
    video?: string;
    boxer?: string;
    image?: string;
    audio?: boolean;
  };
  names?: Record<string, string>;
  video?: OpenRouterEngineModel[];
  image?: OpenRouterEngineModel[];
  tested?: Record<string, { usd?: number; secs?: number; he?: string }>;
  key?: boolean;
}

export interface CatalogSetItem {
  id: string;
  he: string;
  kind?: string;
  thumb?: string;
}

export interface CatalogSceneItem {
  id: string;
  he: string;
  kind?: string;
}

export interface ChinoDirectorStatus {
  online: boolean;
  stageReady?: boolean;
  externalClip?: boolean;
  muted?: boolean;
  target?: string | null;
  hint?: string;
  url?: string;
  lastErr?: string;
  live?: { active?: boolean; audio?: boolean };
  conv?: { active?: boolean; state?: string; secondsLeft?: number | null };
  queue?: string[];
}

export interface RealLiveChatEvent {
  id: string;
  kind: 'chat' | 'gift' | 'like' | 'join' | 'battle' | 'status';
  user: string;
  nickname: string;
  text: string;
  giftName?: string;
  giftCount?: number;
  diamonds?: number;
  likeCount?: number;
  timestamp: number;
}

export interface StatusLogLine {
  id: string;
  time: string;
  message: string;
}

export interface ArielDashboardSnapshot {
  connectedToServer: boolean;
  serverError: string | null;
  desk: ArielDeskState;
  tiktok: ArielTiktokStatus;
  cloud: ArielCloudState;
  roster: RosterOpponent[];
  overlays: OverlayItem[];
  overlayJobs: Record<string, OverlayJob>;
  genJobs: GenJob[];
  genHave: Record<string, { user?: string; boxer?: string }>;
  headgame: HeadGameState;
  clips: SetClipAsset[];
  assets: { bg: SetLayerAsset[]; front: SetLayerAsset[] };
  scenes: SetSceneItem[];
  setConfig: ArielSetConfig;
  fxLibrary: FxTransparentItem[];
  players: PlayerRecord[];
  catalog: { sets: CatalogSetItem[]; scenes: CatalogSceneItem[] };
  director: ChinoDirectorStatus;
  liveEvents: RealLiveChatEvent[];
  logs: StatusLogLine[];
}

export function createEmptyArielSnapshot(): ArielDashboardSnapshot {
  return {
    connectedToServer: false,
    serverError: null,
    desk: {
      mode: 'off',
      auto: false,
      opponent: '',
      muted: false,
    },
    tiktok: {
      on: false,
      user: '',
      status: 'טוען חיבור שרת...',
    },
    cloud: {
      deskUrl: '',
      phoneUrl: '',
      on: false,
      state: 'off',
      frames: 0,
      linux: true,
      phone: false,
    },
    roster: [],
    overlays: [],
    overlayJobs: {},
    genJobs: [],
    genHave: {},
    headgame: {
      on: false,
      user: '',
      likes: true,
      size: 0.46,
    },
    clips: [],
    assets: { bg: [], front: [] },
    scenes: [],
    setConfig: { dim: 0, front: [] },
    fxLibrary: [],
    players: [],
    catalog: { sets: [], scenes: [] },
    director: { online: false },
    liveEvents: [],
    logs: [],
  };
}

/**
 * Filters real opponent overlays (`kind === 'clip'`) matching `fx_ref.html` rules:
 * - If `showAll` is true, returns all opponent clips.
 * - Otherwise, returns only clips matching `selectedUser` (case-insensitive, stripped of leading `@`).
 */
export function filterOpponentOverlays(
  overlays: OverlayItem[],
  selectedUser: string,
  showAll: boolean
): OverlayItem[] {
  const opponentClips = overlays.filter((o) => o.kind === 'clip');
  if (showAll) {
    return opponentClips;
  }
  const clean = selectedUser.trim().replace(/^@/, '').toLowerCase();
  if (!clean) {
    return [];
  }
  return opponentClips.filter((o) => String(o.user || '').toLowerCase() === clean);
}

/**
 * Returns generic character/puncher overlays (`kind !== 'clip'`, e.g. boxer1..3, ov_baby)
 */
export function filterGenericCharacterOverlays(overlays: OverlayItem[]): OverlayItem[] {
  return overlays.filter((o) => o.kind !== 'clip');
}

/**
 * Checks whether an overlay clip can be launched to Chino's 3D stage (`POST /api/chino/send`).
 * Supported interaction sets in server.mjs: belly, chicken, baby, ballet, tiny, fan, bow, bottle, boxer.
 */
export function isChinoSendableOverlay(overlay: OverlayItem): boolean {
  const hay = `${overlay.id} ${overlay.set || ''} ${overlay.he || ''}`.toLowerCase();
  return (
    overlay.kind === 'clip' ||
    hay.includes('belly') ||
    hay.includes('chicken') ||
    hay.includes('baby') ||
    hay.includes('ballet') ||
    hay.includes('tiny') ||
    hay.includes('bottle') ||
    hay.includes('fan')
  );
}

/**
 * Checks if TikTok live stream connector is actively connected to a live broadcast
 */
export function isTiktokActivelyLive(tiktok?: ArielTiktokStatus): boolean {
  if (!tiktok || !tiktok.on) return false;
  const st = String(tiktok.status || '');
  if (/נותק|4404|not currently live|שגיאה|ממתין/i.test(st)) {
    return false;
  }
  return /מחובר/i.test(st);
}

/**
 * Normalizes a real SSE message from ARIEL `/api/events` into a RealLiveChatEvent (if chat/gift/like/join/battle)
 */
export function parseRealSseChatEvent(
  msg: Record<string, any>,
  nowMs: number = Date.now()
): RealLiveChatEvent | null {
  if (!msg || typeof msg !== 'object') return null;

  if (msg.type === 'chatmsg') {
    const user = String(msg.user || msg.uniqueId || 'viewer');
    const nickname = String(msg.nick || msg.nickname || user);
    const kindRaw = String(msg.kind || msg.event || 'chat').toLowerCase();

    if (kindRaw === 'gift' || msg.giftName || msg.gift) {
      const giftName = String(msg.giftName || msg.gift || 'מתנה');
      const giftCount = Number(msg.repeatCount || msg.count || 1);
      const diamonds = Number(msg.diamondCount || msg.diamonds || 0);
      return {
        id: `sse_gift_${nowMs}_${user}_${giftName}`,
        kind: 'gift',
        user,
        nickname,
        text: `שלח/ה ${giftName} x${giftCount}`,
        giftName,
        giftCount,
        diamonds,
        timestamp: nowMs,
      };
    }

    if (kindRaw === 'like' || typeof msg.likeCount === 'number') {
      const count = Number(msg.likeCount || msg.count || 1);
      return {
        id: `sse_like_${nowMs}_${user}`,
        kind: 'like',
        user,
        nickname,
        text: `שלח/ה ${count} לייקים`,
        likeCount: count,
        timestamp: nowMs,
      };
    }

    if (kindRaw === 'member' || kindRaw === 'join') {
      return {
        id: `sse_join_${nowMs}_${user}`,
        kind: 'join',
        user,
        nickname,
        text: 'הצטרף/ה לשידור החי',
        timestamp: nowMs,
      };
    }

    const text = String(msg.text || msg.comment || '').trim();
    if (!text) return null;

    return {
      id: `sse_chat_${nowMs}_${user}`,
      kind: 'chat',
      user,
      nickname,
      text,
      timestamp: nowMs,
    };
  }

  if (msg.type === 'battle' && msg.opponent) {
    const opp = String(msg.opponent);
    return {
      id: `sse_battle_${nowMs}_${opp}`,
      kind: 'battle',
      user: opp,
      nickname: opp,
      text: `קרב זוהה מול @${opp}`,
      timestamp: nowMs,
    };
  }

  return null;
}

/**
 * Pure reducer applying an SSE message from `/api/events` to `ArielDashboardSnapshot`
 */
export function applyArielSseEvent(
  state: ArielDashboardSnapshot,
  msg: Record<string, any>,
  nowMs: number = Date.now()
): ArielDashboardSnapshot {
  if (!msg || typeof msg.type !== 'string') return state;

  const next: ArielDashboardSnapshot = {
    ...state,
    connectedToServer: true,
    serverError: null,
  };

  switch (msg.type) {
    case 'status': {
      const text = String(msg.msg || '').trim();
      if (!text) return next;
      const timeStr = new Date(nowMs).toLocaleTimeString('he-IL');
      return {
        ...next,
        logs: [{ id: `log_${nowMs}_${Math.random()}`, time: timeStr, message: text }, ...state.logs].slice(0, 60),
      };
    }
    case 'desk': {
      const deskPayload = msg as unknown as ArielDeskState;
      return {
        ...next,
        desk: { ...state.desk, ...deskPayload },
        tiktok: deskPayload.tiktok ? { ...state.tiktok, ...deskPayload.tiktok } : state.tiktok,
      };
    }
    case 'cloud': {
      return {
        ...next,
        cloud: { ...state.cloud, ...(msg as Partial<ArielCloudState>) },
      };
    }
    case 'headgame': {
      return {
        ...next,
        headgame: { ...state.headgame, ...(msg as Partial<HeadGameState>) },
      };
    }
    case 'set': {
      return {
        ...next,
        setConfig: { ...state.setConfig, ...(msg as Partial<ArielSetConfig>) },
      };
    }
    case 'assets': {
      return {
        ...next,
        assets: {
          bg: Array.isArray(msg.bg) ? msg.bg : state.assets.bg,
          front: Array.isArray(msg.front) ? msg.front : state.assets.front,
        },
      };
    }
    case 'clips': {
      return {
        ...next,
        clips: Array.isArray(msg.clips) ? msg.clips : state.clips,
      };
    }
    case 'scenes': {
      return {
        ...next,
        scenes: Array.isArray(msg.scenes) ? msg.scenes : state.scenes,
      };
    }
    case 'clip': {
      return {
        ...next,
        desk: {
          ...state.desk,
          clip: msg.id ? { id: String(msg.id), audio: Boolean(msg.audio) } : null,
        },
      };
    }
    case 'clipState': {
      return {
        ...next,
        desk: {
          ...state.desk,
          clip: msg.playing || null,
        },
      };
    }
    case 'fxlib': {
      return {
        ...next,
        fxLibrary: Array.isArray(msg.fx) ? msg.fx : state.fxLibrary,
      };
    }
    case 'genjobs': {
      return {
        ...next,
        genJobs: Array.isArray(msg.jobs) ? msg.jobs : state.genJobs,
        genHave: msg.have && typeof msg.have === 'object' ? msg.have : state.genHave,
      };
    }
    case 'opponent': {
      const oppName = String(msg.handle || msg.name || '');
      return {
        ...next,
        desk: {
          ...state.desk,
          opponent: oppName,
        },
      };
    }
    case 'director': {
      return {
        ...next,
        director: { ...state.director, ...(msg as Partial<ChinoDirectorStatus>) },
      };
    }
      default: {
        const parsedChat = parseRealSseChatEvent(msg, nowMs);
        if (parsedChat) {
          return {
            ...next,
            liveEvents: [...state.liveEvents, parsedChat].slice(-50),
          };
        }
        return next;
      }
    }
  }

/**
 * Extracts a safe string URL for a player's avatar or captured head image (`photo` or `head.img`).
 */
export function getPlayerAvatarUrl(player?: PlayerRecord | null): string {
  if (!player) return '';
  if (typeof player.photo === 'string' && player.photo.trim()) {
    return player.photo.trim();
  }
  if (typeof player.head === 'string' && player.head.trim()) {
    return player.head.trim();
  }
  if (player.head && typeof player.head === 'object' && typeof player.head.img === 'string') {
    return player.head.img.trim();
  }
  return '';
}

const DEFAULT_SET_HE_TITLES: Record<string, string> = {
  boxer1: '🥊 מתאגרף 1',
  boxer2: '🥊 מתאגרף מתחמם',
  boxer3: '👊 אגרוף ענק',
  ov_baby: '👶 תינוק בוכה',
  fx_belly: '💃 ריקוד בטן',
  fx_ballet: '🩰 בלרינה',
  fx_chicken: '🐔 תרנגולת',
  fx_bow: '🙇 משתחווה למלך',
  fx_tiny: '🤏 קטן על הכף',
  fx_fan: '🪭 מנפנף למלך',
  fx_babyarm: '👶 בידיים של צ׳ינו',
  fx_bottle: '🍼 בקבוק של צ׳ינו',
  lion_bottle: '🦁🍼 בקבוק עם אריה',
  lion_kuchi: '🦁👶 קוצ׳י קוצ׳י',
  lion_chicken: '🦁🐔 תרנגולת ואריה',
  lion_ballet: '🦁🩰 בלט עם אריה',
  lion_belly: '🦁💃 ריקוד בטן ואריה',
};

/**
 * Flattens `player.clips` whether returned as `Record<setId, Clip[]>` (real `/api/players` format)
 * or as a legacy array of `PlayerClipEntry`.
 */
export function flattenPlayerClips(
  player?: PlayerRecord | null,
  setTitleLookup: Record<string, string> = {}
): FlattenedPlayerClip[] {
  if (!player || !player.clips) return [];

  if (Array.isArray(player.clips)) {
    return player.clips
      .filter((c) => c && typeof c.id === 'string')
      .map((c) => ({
        id: c.id,
        set: c.set || '',
        he: c.he || setTitleLookup[c.set] || DEFAULT_SET_HE_TITLES[c.set] || c.set || c.id,
      }));
  }

  if (typeof player.clips === 'object') {
    const out: FlattenedPlayerClip[] = [];
    for (const [setKey, arr] of Object.entries(player.clips)) {
      if (!Array.isArray(arr)) continue;
      for (const item of arr) {
        if (!item || typeof item.id !== 'string') continue;
        out.push({
          id: item.id,
          set: setKey,
          he: item.he || setTitleLookup[setKey] || DEFAULT_SET_HE_TITLES[setKey] || setKey,
          engine: item.engine,
          t: item.t,
          chino: item.chino || null,
        });
      }
    }
    return out.sort((a, b) => (b.t || 0) - (a.t || 0));
  }

  return [];
}

/**
 * Maps Chino stage state strings from `/api/chino/state` & `player.clips[].chino.state` to Hebrew UI badges.
 */
export function getChinoStateLabel(state?: string | null): {
  text: string;
  tone: 'gold' | 'green' | 'red' | 'muted';
} {
  switch (state) {
    case 'preparing_tracking':
      return { text: '🎯 מכין מעקב במה', tone: 'gold' };
    case 'preparing_audio':
      return { text: '🔊 מכין סאונד', tone: 'gold' };
    case 'queued':
      return { text: '⏳ בתור לבמה של צ׳ינו', tone: 'gold' };
    case 'awaiting_review':
      return { text: '👁 מוכן לאישור בצ׳ינו', tone: 'gold' };
    case 'ready':
      return { text: '✓ מוכן על הבמה', tone: 'green' };
    case 'playing':
      return { text: '🦁 מתנגן עכשיו אצל צ׳ינו!', tone: 'green' };
    case 'completed':
      return { text: '✓ הוצג אצל צ׳ינו', tone: 'muted' };
    case 'failed':
    case 'error':
      return { text: '❌ שגיאת שיגור לצ׳ינו', tone: 'red' };
    default:
      return { text: state ? String(state) : 'לא שוגר עדיין', tone: 'muted' };
  }
}

