import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActiveProgramLayer,
  BoosteraAssetItem,
  BoosteraAnchor,
  BoosteraEffectDefinition,
  BoosteraStatusSnapshot,
  BoosteraTarget,
  BoosteraWsMessage,
  ProgramAudioState,
  ProgramOutputSnapshot,
} from '../types/boostera';

const envMeta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};

const BOOSTERA_API_BASE = (
  envMeta.BOOSTERA_API_URL ||
  envMeta.VITE_BOOSTERA_API_URL ||
  '/api/v1'
).replace(/\/+$/, '');

const BOOSTERA_CLIENT_KEY =
  envMeta.BOOSTERA_CLIENT_KEY ||
  envMeta.VITE_BOOSTERA_CLIENT_KEY ||
  'UMd3XmvHa1IYwSAW';

function resolveWsUrl(): string {
  const configured = envMeta.BOOSTERA_WS_URL || envMeta.VITE_BOOSTERA_WS_URL;
  if (configured) {
    const sep = configured.includes('?') ? '&' : '?';
    return `${configured}${sep}ck=${encodeURIComponent(BOOSTERA_CLIENT_KEY)}`;
  }
  if (typeof window === 'undefined') {
    return `ws://localhost:3000/ws/live?ck=${encodeURIComponent(BOOSTERA_CLIENT_KEY)}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws/live?ck=${encodeURIComponent(BOOSTERA_CLIENT_KEY)}`;
}

function buildAuthHeaders(hasJsonBody = false): Record<string, string> {
  const headers: Record<string, string> = {
    'x-boostera-key': BOOSTERA_CLIENT_KEY,
  };
  if (hasJsonBody) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function getBoosteraJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BOOSTERA_API_BASE}${path}`, {
      headers: buildAuthHeaders(false),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function mutateBoosteraJson<T>(
  method: 'POST' | 'PATCH',
  path: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch(`${BOOSTERA_API_BASE}${path}`, {
    method,
    headers: buildAuthHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  return data as T;
}

export function createInitialProgramSnapshot(): ProgramOutputSnapshot {
  return {
    version: 0,
    updatedAt: Date.now(),
    resolution: { width: 1080, height: 1920 },
    aspectRatio: '9:16',
    targetFps: 60,
    fallbackStableFps: 30,
    currentFps: 30,
    latencyBudgetMs: 500,
    estimatedLatencyMs: 220,
    streamActive: true,
    sceneMode: 'camera',
    sourceStreamUrl: '/api/phone/view.mjpeg',
    backgroundAssetUrl: null,
    cleanFeedPath: '/clean-feed',
    virtualCameraName: 'BOOSTERA Camera',
    camera: {
      connected: true,
      facing: 'front',
      mirror: false,
      zoom: 1,
      rotateDeg: 0,
      cropMode: 'none',
      shake: 'none',
      punchZoom: false,
      snapZoom: false,
      flash: false,
      blurPx: 0,
      focusVignette: false,
      slowMotion: false,
      freezeFrame: false,
      glitch: false,
      rgbShift: false,
    },
    deepAr: {
      enabled: true,
      activeFilterIds: [],
      beauty: 0.35,
      skinSmoothing: 0.3,
      faceReshape: 0.12,
      backgroundBlur: false,
      backgroundReplacementUrl: null,
    },
    audio: {
      microphoneConnected: true,
      muted: false,
      gain: 1,
      noiseReduction: true,
      musicChannelVolume: 0.7,
      effectAudioEnabled: true,
      ducking: true,
      duckingActive: false,
    },
    activeLayers: [],
  };
}

export const boosteraApi = {
  getEffects: (params?: { category?: string; q?: string; enabled?: boolean; favorites?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.category && params.category !== 'All') qs.set('category', params.category);
    if (params?.q) qs.set('q', params.q);
    if (typeof params?.enabled === 'boolean') qs.set('enabled', String(params.enabled));
    if (params?.favorites) qs.set('favorites', 'true');
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return getBoosteraJson<{ ok: boolean; count: number; effects: BoosteraEffectDefinition[] }>(
      `/effects${suffix}`
    );
  },

  getEffectById: (id: string) =>
    getBoosteraJson<{ ok: boolean; effect: BoosteraEffectDefinition }>(
      `/effects/${encodeURIComponent(id)}`
    ),

  updateEffect: (
    id: string,
    patch: Partial<
      Pick<
        BoosteraEffectDefinition,
        'enabled' | 'favorite' | 'randomVariation' | 'target' | 'anchor' | 'zIndex' | 'durationMs' | 'loop'
      >
    >
  ) =>
    mutateBoosteraJson<{ ok: boolean; effect?: BoosteraEffectDefinition; error?: string }>(
      'PATCH',
      `/effects/${encodeURIComponent(id)}`,
      patch
    ),

  getAssets: (category?: string) =>
    getBoosteraJson<{ ok: boolean; count: number; assets: BoosteraAssetItem[] }>(
      `/assets${category ? `?category=${encodeURIComponent(category)}` : ''}`
    ),

  triggerEffect: (
    id: string,
    options?: {
      target?: BoosteraTarget;
      opponentUser?: string;
      anchor?: BoosteraAnchor;
      variationIndex?: number;
      loop?: boolean;
      durationMs?: number;
      layerOrder?: 'front' | 'behind';
    }
  ) =>
    mutateBoosteraJson<{
      ok: boolean;
      layer?: ActiveProgramLayer;
      program?: ProgramOutputSnapshot;
      error?: string;
    }>('POST', `/effects/${encodeURIComponent(id)}/trigger`, options || {}),

  stopEffect: (idOrInstanceId: string) =>
    mutateBoosteraJson<{ ok: boolean; stopped?: number; program?: ProgramOutputSnapshot }>(
      'POST',
      '/effects/stop',
      { id: idOrInstanceId, instanceId: idOrInstanceId }
    ),

  stopAllEffects: () =>
    mutateBoosteraJson<{ ok: boolean; stopped?: number; program?: ProgramOutputSnapshot }>(
      'POST',
      '/effects/stop-all',
      {}
    ),

  cameraFront: () =>
    mutateBoosteraJson<{ ok: boolean; program?: ProgramOutputSnapshot }>('POST', '/camera/front', {}),

  cameraBack: () =>
    mutateBoosteraJson<{ ok: boolean; program?: ProgramOutputSnapshot }>('POST', '/camera/back', {}),

  cameraSwitch: () =>
    mutateBoosteraJson<{ ok: boolean; program?: ProgramOutputSnapshot }>('POST', '/camera/switch', {}),

  setScene: (payload: {
    mode: 'camera' | 'lion' | 'custom_bg';
    backgroundAssetUrl?: string | null;
    sourceStreamUrl?: string;
  }) => mutateBoosteraJson<{ ok: boolean; program?: ProgramOutputSnapshot }>('POST', '/scene', payload),

  playOverlay: (payload: {
    id?: string;
    name?: string;
    asset?: string;
    durationMs?: number;
    zIndex?: number;
    anchor?: BoosteraAnchor;
    target?: BoosteraTarget;
    opponentUser?: string;
    loop?: boolean;
    swap?: boolean;
    pos?: string;
    size?: number;
    bottom?: number;
    head?: number;
    hitAt?: number;
    dir?: string;
    audio?: boolean;
  }) => mutateBoosteraJson<{ ok: boolean; layer?: ActiveProgramLayer; program?: ProgramOutputSnapshot }>('POST', '/overlay', payload),

  playCharacter: (payload: {
    id?: string;
    name?: string;
    asset?: string;
    set?: string;
    overlayId?: string;
    opponentUser?: string;
    durationMs?: number;
    anchor?: BoosteraAnchor;
    target?: BoosteraTarget;
    layerOrder?: 'front' | 'behind';
    audio?: boolean;
    loop?: boolean;
  }) => mutateBoosteraJson<{ ok: boolean; layer?: ActiveProgramLayer; program?: ProgramOutputSnapshot }>('POST', '/character', payload),

  updateAudio: (patch: Partial<ProgramAudioState>) =>
    mutateBoosteraJson<{ ok: boolean; audio?: ProgramAudioState; program?: ProgramOutputSnapshot }>(
      'POST',
      '/audio',
      patch
    ),

  getStatus: () => getBoosteraJson<BoosteraStatusSnapshot>('/status'),

  getProgram: () =>
    getBoosteraJson<{ ok: boolean; program: ProgramOutputSnapshot }>('/program'),
};

export interface BoosteraRealtimeEventItem {
  id: string;
  event: string;
  time: string;
  summary: string;
}

function summarizeWsEvent(msg: BoosteraWsMessage): string | null {
  const p = msg.payload || {};
  switch (msg.event) {
    case 'effect_started':
      return `הופעל ב-Program: ${String(p.name || p.effectId || '')}${
        p.variation ? ` (${String(p.variation)})` : ''
      }`;
    case 'effect_finished':
      if (p.allStopped) return 'נוקו כל שכבות האפקטים מ-Program Output';
      return `הסתיים אפקט: ${String(p.name || p.effectId || '')}`;
    case 'effect_failed':
      return `שגיאת אפקט: ${String(p.reason || p.effectId || '')}`;
    case 'glove_triggered':
      return `כפפת קרב ×${String(p.multiplier || 2)} הופעלה ב-Program`;
    case 'snipe':
      return 'הופעל אפקט SNIPE בשנייה האחרונה!';
    case 'win':
      return 'אפקט ניצחון (WIN) עלה ל-Program';
    case 'lose':
      return 'אפקט סיום קרב עלה ל-Program';
    case 'gift_received':
      return `מתנה בלייב: ${String(p.giftName || '')}`;
    case 'battle_started':
      return 'תחילת קרב סונכרנה ל-Program Output';
    case 'score_changed':
      return 'עדכון ניקוד בקרב';
    case 'camera_connected':
      return p.facing ? `מצלמה פעילה: ${p.facing === 'back' ? 'אחורית' : 'קדמית'}` : null;
    default:
      return null;
  }
}

export function useBoosteraRealtime() {
  const [program, setProgram] = useState<ProgramOutputSnapshot>(() =>
    createInitialProgramSnapshot()
  );
  const [effects, setEffects] = useState<BoosteraEffectDefinition[]>([]);
  const [assets, setAssets] = useState<BoosteraAssetItem[]>([]);
  const [status, setStatus] = useState<BoosteraStatusSnapshot | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsEvents, setWsEvents] = useState<BoosteraRealtimeEventItem[]>([]);
  const latestVersionRef = useRef<number>(0);

  const refreshBoosteraCatalog = useCallback(async () => {
    const [effRes, assetRes, statusRes, progRes] = await Promise.all([
      boosteraApi.getEffects(),
      boosteraApi.getAssets(),
      boosteraApi.getStatus(),
      boosteraApi.getProgram(),
    ]);

    if (Array.isArray(effRes?.effects)) {
      setEffects(effRes.effects);
    }
    if (Array.isArray(assetRes?.assets)) {
      setAssets(assetRes.assets);
    }
    if (statusRes?.ok) {
      setStatus(statusRes);
    }
    if (progRes?.program && progRes.program.version >= latestVersionRef.current) {
      latestVersionRef.current = progRes.program.version;
      setProgram(progRes.program);
    }
  }, []);

  useEffect(() => {
    refreshBoosteraCatalog();
  }, [refreshBoosteraCatalog]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      try {
        ws = new WebSocket(resolveWsUrl());
      } catch {
        reconnectTimer = setTimeout(connect, 3000);
        return;
      }

      ws.onopen = () => {
        if (!disposed) {
          setWsConnected(true);
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as BoosteraWsMessage;
          if (msg.program && msg.program.version >= latestVersionRef.current) {
            latestVersionRef.current = msg.program.version;
            setProgram(msg.program);
          }
          if (msg.event === 'program_sync' && msg.payload?.status) {
            setStatus(msg.payload.status as BoosteraStatusSnapshot);
          }

          const summary = summarizeWsEvent(msg);
          if (summary) {
            const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString('he-IL');
            const eventId = `${msg.event}_${msg.timestamp}_${String(
              (msg.payload as Record<string, unknown>)?.instanceId || ''
            )}`;
            setWsEvents((prev) => {
              if (prev.some((x) => x.id === eventId)) return prev;
              return [{ id: eventId, event: msg.event, time, summary }, ...prev].slice(0, 40);
            });
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        ws = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 2500);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  const applyImmediateProgram = useCallback((nextProgram?: ProgramOutputSnapshot) => {
    if (nextProgram && nextProgram.version >= latestVersionRef.current) {
      latestVersionRef.current = nextProgram.version;
      setProgram(nextProgram);
    }
  }, []);

  return {
    program,
    effects,
    assets,
    status,
    wsConnected,
    wsEvents,
    refreshBoosteraCatalog,
    applyImmediateProgram,
    setEffects,
  };
}
