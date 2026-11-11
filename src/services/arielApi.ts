import { useState, useEffect, useCallback } from 'react';
import {
  ArielDashboardSnapshot,
  createEmptyArielSnapshot,
  applyArielSseEvent,
  RosterOpponent,
  OverlayItem,
  OverlayJob,
  OpenRouterEnginesConfig,
  ChinoDirectorStatus,
} from '../utils/arielState';

async function safeGetJson<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function postArielJson<T = any>(
  url: string,
  body: Record<string, any> = {}
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  return data as T;
}

export async function putArielBinary<T = any>(url: string, file: File | Blob): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  return data as T;
}

export const arielApi = {
  stopAll: () => postArielJson('/api/desk/stop', {}),
  toggleDeskMute: () => postArielJson('/api/desk/mute', {}),
  toggleDeskAuto: (on: boolean) => postArielJson('/api/desk/auto', { on }),
  sayLionText: (text: string) => postArielJson('/api/desk/say', { text }),

  // Chino Live Studio (7780) & Cloud Source Controls
  getDirector: () => safeGetJson<ChinoDirectorStatus>('/api/director'),
  setDirectorHint: (hint: string) => postArielJson('/api/director/hint', { hint }),
  getCloudSource: () => safeGetJson<{ source?: 'lion' | 'camera' | string }>('/api/cloud/source'),
  setCloudSource: (source: 'lion' | 'camera') =>
    postArielJson<{ ok?: boolean; source?: string; error?: string }>('/api/cloud/source', {
      source,
    }),
  triggerChinoAction: (action: 'dance' | 'song' | 'roar' | string) =>
    postArielJson('/api/chino/action', { action }),
  getChinoState: (rid: string) =>
    safeGetJson<any>(`/api/chino/state?rid=${encodeURIComponent(rid)}`),

  setCloudCast: (on: boolean, rtsp?: string) =>
    postArielJson('/api/cloud/cast', rtsp !== undefined ? { on, rtsp } : { on }),

  getRoster: () => safeGetJson<{ list?: RosterOpponent[] }>('/api/opp/roster'),
  checkOpponentAlive: (user: string) =>
    safeGetJson<{ user: string; alive: boolean; title?: string; error?: string }>(
      `/api/opp/alive?user=${encodeURIComponent(user)}`
    ),
  captureOpponent: (params: { user?: string; side?: string; wait?: boolean }) =>
    postArielJson('/api/opp/capture', params),
  generateOpponentNext: (params: {
    capId?: string;
    user?: string;
    side?: string;
    dur?: number;
    again?: boolean;
    wait?: boolean;
  }) => postArielJson('/api/gen/opponent', { dur: 5, ...params }),
  generateOpponentAll: (params: {
    capId?: string;
    user?: string;
    side?: string;
    wait?: boolean;
    dur?: number;
  }) => postArielJson('/api/gen/opponent/all', { dur: 5, ...params }),
  generateOpponentSome: (params: {
    user: string;
    sets: string[];
    auto?: boolean;
    fresh?: boolean;
  }) => postArielJson('/api/gen/opponent/some', params),

  getOverlays: () =>
    safeGetJson<{ list?: OverlayItem[]; jobs?: Record<string, OverlayJob> }>('/api/overlays'),
  playOverlay: (params: {
    id: string;
    loop?: boolean;
    swap?: boolean;
    pos?: string;
    size?: number;
    bottom?: number;
    head?: number;
    hitAt?: number;
    dir?: string;
  }) => postArielJson('/api/overlay/play', params),
  stopOverlay: () => postArielJson('/api/overlay/stop', {}),
  updateOverlay: (params: Record<string, any>) => postArielJson('/api/overlay/face', params),
  deleteOverlay: (id: string) => postArielJson('/api/overlay/delete', { id }),
  uploadOverlay: (file: File, mode: 'keep' | 'cut' = 'keep') =>
    putArielBinary(
      `/api/overlay/upload?name=${encodeURIComponent(file.name)}&mode=${mode}`,
      file
    ),

  sendToChino: (id: string, user?: string, click?: { x: number; y: number }) =>
    postArielJson('/api/chino/send', { id, user: user || '', ...(click ? { click } : {}) }),

  setHeadGame: (params: {
    on?: boolean;
    user?: string;
    likes?: boolean;
    size?: number;
    y?: number;
  }) => postArielJson('/api/headgame', params),
  throwHeadGame: (n: number = 1) => postArielJson('/api/headgame/throw', { n }),

  playClip: (id: string) => postArielJson('/api/clip/play', { id }),
  stopClip: () => postArielJson('/api/clip/stop', {}),
  updateClip: (params: { id: string; name?: string; size?: string }) =>
    postArielJson('/api/clip/update', params),
  deleteAsset: (kind: 'clips' | 'bg' | 'front', id: string) =>
    postArielJson('/api/asset/delete', { kind, id }),
  uploadAsset: (kind: 'clips' | 'bg' | 'front', file: File) =>
    putArielBinary(`/api/upload?kind=${kind}&name=${encodeURIComponent(file.name)}`, file),

  playFx: (id: string, flip: boolean = false) => postArielJson('/api/fx/play', { id, flip }),
  deleteFx: (id: string) => postArielJson('/api/fx/delete', { id }),
  uploadFx: (file: File) =>
    putArielBinary(`/api/fx/upload?name=${encodeURIComponent(file.name)}`, file),
  punchHit: (dir: 'left' | 'right') => postArielJson('/api/hit', { dir }),

  updateSet: (payload: Record<string, any>) => postArielJson('/api/set', payload),
  generateRunpod: (params: { desc: string; kind: string; dur: number; he: string }) =>
    postArielJson('/api/gen', params),

  triggerSpecial: (
    user: string,
    set: string,
    opts?: { auto?: boolean; preview?: boolean; fromPreview?: boolean }
  ) => postArielJson('/api/special', { user, set, ...(opts || {}) }),
  playFunScene: (id: string) => postArielJson('/api/fun/play', { id }),
  generateFunForUser: (params: { user: string; scenes: string[]; auto?: boolean }) =>
    postArielJson('/api/fun/user', params),

  addPlayer: (user: string) => postArielJson('/api/players/add', { user }),
  uploadPlayerPhoto: (user: string, file: File) =>
    putArielBinary(`/api/players/photo?user=${encodeURIComponent(user)}`, file),

  getEngines: () => safeGetJson<OpenRouterEnginesConfig>('/api/engines'),
  saveEngines: (params: { video?: string; boxer?: string; image?: string; audio?: boolean }) =>
    postArielJson('/api/engines', params),

  clientPlay: (kind: string, id: string) => postArielJson('/api/client/play', { kind, id }),
  generateAutoAi: (prompt: string, mode: string) =>
    postArielJson('/api/gen/auto', { prompt, mode }),

  phoneTap: (params: { x: number; y: number; x2?: number; y2?: number; ms?: number }) =>
    postArielJson('/api/phone/tap', params),
  phoneKey: (k: 'back' | 'home' | 'recents' | 'enter') => postArielJson('/api/phone/key', { k }),
  phoneOpenApp: (app: string) => postArielJson('/api/phone/app', { app }),
};

export function useArielRealtime() {
  const [snapshot, setSnapshot] = useState<ArielDashboardSnapshot>(() =>
    createEmptyArielSnapshot()
  );
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);

  const pushLog = useCallback((message: string) => {
    const now = Date.now();
    const time = new Date(now).toLocaleTimeString('he-IL');
    setSnapshot((prev) => ({
      ...prev,
      logs: [{ id: `ui_${now}_${Math.random()}`, time, message }, ...prev.logs].slice(0, 60),
    }));
  }, []);

  const refreshOverlaysAndRoster = useCallback(async () => {
    const [ovRes, rosterRes, genRes, playersRes] = await Promise.all([
      arielApi.getOverlays(),
      arielApi.getRoster(),
      safeGetJson<any>('/api/gen'),
      safeGetJson<any>('/api/players'),
    ]);

    setSnapshot((prev) => ({
      ...prev,
      overlays: Array.isArray(ovRes?.list)
        ? ovRes!.list
        : Array.isArray(ovRes)
        ? (ovRes as OverlayItem[])
        : prev.overlays,
      overlayJobs: ovRes?.jobs || prev.overlayJobs,
      roster: Array.isArray(rosterRes?.list) ? rosterRes!.list : prev.roster,
      genJobs: Array.isArray(genRes?.jobs) ? genRes.jobs : prev.genJobs,
      genHave: genRes?.have && typeof genRes.have === 'object' ? genRes.have : prev.genHave,
      players: Array.isArray(playersRes?.list) ? playersRes.list : prev.players,
    }));
  }, []);

  const refreshAll = useCallback(async () => {
    const [
      desk,
      tiktok,
      cloud,
      rosterRes,
      overlaysRes,
      genRes,
      headgame,
      setRes,
      fxRes,
      playersRes,
      catalogRes,
      directorRes,
    ] = await Promise.all([
      safeGetJson<any>('/api/desk'),
      safeGetJson<any>('/api/tiktok'),
      safeGetJson<any>('/api/cloud'),
      arielApi.getRoster(),
      arielApi.getOverlays(),
      safeGetJson<any>('/api/gen'),
      safeGetJson<any>('/api/headgame'),
      safeGetJson<any>('/api/set'),
      safeGetJson<any>('/api/fx'),
      safeGetJson<any>('/api/players'),
      safeGetJson<any>('/api/catalog'),
      safeGetJson<any>('/api/director'),
    ]);

    const connected = Boolean(desk || cloud || rosterRes || overlaysRes);

    setSnapshot((prev) => ({
      ...prev,
      connectedToServer: connected,
      serverError: connected ? null : 'לא ניתן להתחבר לשרת ARIEL כרגע',
      desk: desk ? { ...prev.desk, ...desk } : prev.desk,
      tiktok: tiktok
        ? { ...prev.tiktok, ...tiktok }
        : desk?.tiktok
        ? { ...prev.tiktok, ...desk.tiktok }
        : prev.tiktok,
      cloud: cloud ? { ...prev.cloud, ...cloud } : prev.cloud,
      roster: Array.isArray(rosterRes?.list) ? rosterRes!.list : prev.roster,
      overlays: Array.isArray(overlaysRes?.list)
        ? overlaysRes!.list
        : Array.isArray(overlaysRes)
        ? (overlaysRes as OverlayItem[])
        : prev.overlays,
      overlayJobs: overlaysRes?.jobs || prev.overlayJobs,
      genJobs: Array.isArray(genRes?.jobs) ? genRes.jobs : prev.genJobs,
      genHave: genRes?.have && typeof genRes.have === 'object' ? genRes.have : prev.genHave,
      headgame: headgame ? { ...prev.headgame, ...headgame } : prev.headgame,
      clips: Array.isArray(setRes?.clips) ? setRes.clips : prev.clips,
      assets: setRes?.assets
        ? {
            bg: Array.isArray(setRes.assets.bg) ? setRes.assets.bg : [],
            front: Array.isArray(setRes.assets.front) ? setRes.assets.front : [],
          }
        : prev.assets,
      scenes: Array.isArray(setRes?.scenes) ? setRes.scenes : prev.scenes,
      setConfig: setRes?.set ? { ...prev.setConfig, ...setRes.set } : prev.setConfig,
      fxLibrary: Array.isArray(fxRes?.fx) ? fxRes.fx : prev.fxLibrary,
      players: Array.isArray(playersRes?.list) ? playersRes.list : prev.players,
      catalog:
        catalogRes?.sets && catalogRes?.scenes
          ? { sets: catalogRes.sets, scenes: catalogRes.scenes }
          : prev.catalog,
      director: directorRes ? { ...prev.director, ...directorRes } : prev.director,
    }));

    setIsLoadingInitial(false);
  }, []);

  useEffect(() => {
    refreshAll();
    const rosterTimer = setInterval(() => {
      arielApi.getRoster().then((r) => {
        if (Array.isArray(r?.list)) {
          setSnapshot((prev) => ({ ...prev, roster: r!.list! }));
        }
      });
    }, 60_000);

    return () => clearInterval(rosterTimer);
  }, [refreshAll]);

  // Subscribe to real SSE `/api/events`
  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      es = new EventSource('/api/events');

      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          setSnapshot((prev) => applyArielSseEvent(prev, msg, Date.now()));

          if (msg.type === 'overlays') {
            refreshOverlaysAndRoster();
          } else if (msg.type === 'autolive' || msg.type === 'mute' || msg.type === 'tiktok') {
            safeGetJson<any>('/api/desk').then((d) => {
              if (d) {
                setSnapshot((prev) => ({
                  ...prev,
                  desk: { ...prev.desk, ...d },
                  tiktok: d.tiktok ? { ...prev.tiktok, ...d.tiktok } : prev.tiktok,
                }));
              }
            });
          }
        } catch {
          // Ignore malformed SSE frames
        }
      };

      es.onerror = () => {
        es?.close();
        es = null;
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 4000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [refreshOverlaysAndRoster]);

  return {
    snapshot,
    isLoadingInitial,
    pushLog,
    refreshAll,
    refreshOverlaysAndRoster,
    setSnapshot,
  };
}
