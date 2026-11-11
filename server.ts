import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';
import { BoosteraEffectsEngine, RateLimiter } from './src/server/boosteraEngine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// ============================================================================
// Backend-Only Secrets & Legacy ARIEL_* Compatibility Adapter (§23 & §24)
// Admin keys NEVER leave the server or appear in browser responses.
// ============================================================================
const UPSTREAM_BASE = (
  process.env.BOOSTERA_UPSTREAM_URL ||
  process.env.ARIEL_SERVER_URL ||
  'https://share-dragon-apparel-increased.trycloudflare.com'
).replace(/\/+$/, '');

const BOOSTERA_ADMIN_KEY =
  process.env.BOOSTERA_ADMIN_KEY ||
  process.env.ARIEL_ADMIN_KEY ||
  '4ufZYKGkimR_UbCWw3sXmg23';

const BOOSTERA_CLIENT_KEY =
  process.env.BOOSTERA_CLIENT_KEY ||
  process.env.ARIEL_CLIENT_KEY ||
  'UMd3XmvHa1IYwSAW';

const LIVEKIT_CONFIGURED = Boolean(
  process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET
);
const DEEPAR_CONFIGURED = process.env.DEEPAR_CONFIG !== 'disabled';

function buildUpstreamHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    Cookie: `ak=${BOOSTERA_ADMIN_KEY}; bk=${BOOSTERA_CLIENT_KEY}`,
    'x-key': BOOSTERA_CLIENT_KEY,
    ...extra,
  };
}

function redactAdminSecretsFromJson(rawText: string): string {
  if (!BOOSTERA_ADMIN_KEY || !rawText.includes(BOOSTERA_ADMIN_KEY)) {
    return rawText;
  }
  return rawText.split(BOOSTERA_ADMIN_KEY).join('[REDACTED_SERVER_KEY]');
}

// ============================================================================
// Authoritative BOOSTERA Effects Server Engine + Security Middleware
// ============================================================================
const boosteraEngine = new BoosteraEffectsEngine({
  signingSecret: `${BOOSTERA_ADMIN_KEY}_boostera_sig`,
  livekitConfigured: LIVEKIT_CONFIGURED,
  deepArConfigured: DEEPAR_CONFIGURED,
});

const triggerRateLimiter = new RateLimiter(45, 18);

function extractClientToken(req: Request): string {
  const headerKey = req.headers['x-boostera-key'] || req.headers['x-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.ck === 'string' && req.query.ck.trim()) {
    return req.query.ck.trim();
  }
  return '';
}

function isValidClientToken(token: string): boolean {
  if (!token) return false;
  return token === BOOSTERA_CLIENT_KEY;
}

function requireBoosteraAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractClientToken(req);
  if (!isValidClientToken(token)) {
    return res.status(401).json({
      error: 'Unauthorized: Valid BOOSTERA_CLIENT_KEY is required for /api/v1 endpoints',
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const actorKey = String(req.ip || req.socket.remoteAddress || 'studio');
    if (!triggerRateLimiter.allow(actorKey)) {
      return res.status(429).json({
        error: 'Rate limit exceeded for live effect triggers',
      });
    }
  }

  return next();
}

// Asynchronously sync upstream media catalog into BOOSTERA Effects Registry
let lastCatalogSyncAt = 0;
async function syncUpstreamMediaIntoBoostera(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastCatalogSyncAt < 15_000) return;
  lastCatalogSyncAt = now;

  try {
    const [ovRes, setRes] = await Promise.all([
      fetch(`${UPSTREAM_BASE}/api/overlays`, { headers: buildUpstreamHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${UPSTREAM_BASE}/api/set`, { headers: buildUpstreamHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);

    const connected = Boolean(ovRes || setRes);
    boosteraEngine.setUpstreamConnected(connected);

    if (connected) {
      boosteraEngine.syncUpstreamCatalog({
        overlays: Array.isArray(ovRes?.list)
          ? ovRes.list
          : Array.isArray(ovRes)
            ? ovRes
            : [],
        clips: Array.isArray(setRes?.clips) ? setRes.clips : [],
        frontAssets: Array.isArray(setRes?.assets?.front) ? setRes.assets.front : [],
        bgAssets: Array.isArray(setRes?.assets?.bg) ? setRes.assets.bg : [],
      });
    }
  } catch {
    boosteraEngine.setUpstreamConnected(false);
  }
}

async function postUpstreamFireAndForget(pathname: string, body: Record<string, unknown>) {
  try {
    await fetch(`${UPSTREAM_BASE}${pathname}`, {
      method: 'POST',
      headers: buildUpstreamHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
  } catch {
    // Non-blocking upstream bridge dispatch (keeps Program Output <500ms latency)
  }
}

// 1. Raw binary PUT upload pass-through (must run before express.json)
const RAW_PUT_PATHS = [
  '/api/upload',
  '/api/fx/upload',
  '/api/overlay/upload',
  '/api/players/photo',
];

app.put(
  RAW_PUT_PATHS,
  express.raw({ type: '*/*', limit: '150mb' }),
  async (req, res) => {
    try {
      const targetUrl = `${UPSTREAM_BASE}${req.originalUrl}`;
      const contentType = req.headers['content-type'] || 'application/octet-stream';
      const upstreamRes = await fetch(targetUrl, {
        method: 'PUT',
        headers: buildUpstreamHeaders({ 'Content-Type': String(contentType) }),
        body: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : undefined,
      });
      const text = await upstreamRes.text();
      await syncUpstreamMediaIntoBoostera(true);
      res.status(upstreamRes.status);
      res.setHeader(
        'Content-Type',
        upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8'
      );
      return res.send(redactAdminSecretsFromJson(text));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upstream upload failed';
      console.error('[BOOSTERA Proxy PUT Error]:', msg);
      return res.status(502).json({ error: msg });
    }
  }
);

app.use(express.json({ limit: '25mb' }));

// ============================================================================
// 2. BOOSTERA Effects Server REST API (/api/v1/* — §14)
// ============================================================================
app.use('/api/v1', requireBoosteraAuth);

app.get('/api/v1/effects', async (req, res) => {
  await syncUpstreamMediaIntoBoostera(false);
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const q = typeof req.query.q === 'string' ? req.query.q : undefined;
  const enabled =
    req.query.enabled === 'true'
      ? true
      : req.query.enabled === 'false'
        ? false
        : undefined;
  const favoritesOnly = req.query.favorites === 'true';

  const items = boosteraEngine.listEffects({ category, q, enabled, favoritesOnly });
  return res.json({
    ok: true,
    count: items.length,
    effects: items,
  });
});

app.get('/api/v1/effects/:id', async (req, res) => {
  await syncUpstreamMediaIntoBoostera(false);
  const effect = boosteraEngine.getEffect(req.params.id);
  if (!effect) {
    return res.status(404).json({ ok: false, error: 'Effect not found' });
  }
  return res.json({ ok: true, effect });
});

app.patch('/api/v1/effects/:id', (req, res) => {
  const updated = boosteraEngine.updateEffect(req.params.id, req.body || {});
  if (!updated) {
    return res.status(404).json({ ok: false, error: 'Effect not found' });
  }
  return res.json({ ok: true, effect: updated });
});

app.get('/api/v1/assets', async (req, res) => {
  await syncUpstreamMediaIntoBoostera(false);
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const assets = boosteraEngine.listAssets(category);
  return res.json({
    ok: true,
    count: assets.length,
    assets,
  });
});

app.post('/api/v1/effects/:id/trigger', (req, res) => {
  const effectId = req.params.id;
  const body = req.body || {};
  const result = boosteraEngine.triggerEffect(effectId, {
    target: body.target,
    opponentUser: body.opponentUser || body.user,
    anchor: body.anchor,
    position: body.position,
    variationIndex: typeof body.variationIndex === 'number' ? body.variationIndex : undefined,
    loop: typeof body.loop === 'boolean' ? body.loop : undefined,
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : undefined,
    layerOrder: body.layerOrder,
    triggerSource: 'manual',
    actorIp: req.ip,
  });

  if (!result.ok) {
    return res.status(400).json(result);
  }

  // Bridge to upstream device stage asynchronously if mapped
  const bridge = result.effect?.upstreamBridge;
  if (bridge) {
    const user = String(body.opponentUser || body.user || bridge.user || '');
    if (bridge.kind === 'overlay') {
      void postUpstreamFireAndForget('/api/overlay/play', {
        id: bridge.refId,
        loop: Boolean(result.layer?.loop),
      });
    } else if (bridge.kind === 'clip') {
      void postUpstreamFireAndForget('/api/clip/play', { id: bridge.refId });
    } else if (bridge.kind === 'special' && user) {
      void postUpstreamFireAndForget('/api/special', { user, set: bridge.refId });
    } else if (bridge.kind === 'scene') {
      void postUpstreamFireAndForget('/api/cloud/source', { source: 'lion' });
    }
  } else if (result.layer?.asset?.startsWith('/media/overlays/')) {
    const match = result.layer.asset.match(/\/media\/overlays\/([^/.]+)\.webm/);
    if (match?.[1]) {
      void postUpstreamFireAndForget('/api/overlay/play', {
        id: match[1],
        loop: Boolean(result.layer.loop),
      });
    }
  }

  return res.json({
    ok: true,
    layer: result.layer,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.post('/api/v1/effects/stop', (req, res) => {
  const targetId = String(req.body?.instanceId || req.body?.id || '');
  if (!targetId) {
    return res.status(400).json({ ok: false, error: 'id or instanceId is required' });
  }
  const stopped = boosteraEngine.stopEffect(targetId);
  void postUpstreamFireAndForget('/api/overlay/stop', {});
  return res.json({
    ok: true,
    stopped,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.post('/api/v1/effects/stop-all', (_req, res) => {
  const stopped = boosteraEngine.stopAllEffects();
  void postUpstreamFireAndForget('/api/desk/stop', {});
  void postUpstreamFireAndForget('/api/overlay/stop', {});
  void postUpstreamFireAndForget('/api/clip/stop', {});
  return res.json({
    ok: true,
    stopped,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.post('/api/v1/camera/front', (_req, res) => {
  const camera = boosteraEngine.setCameraFacing('front');
  return res.json({ ok: true, camera, program: boosteraEngine.getProgramSnapshot() });
});

app.post('/api/v1/camera/back', (_req, res) => {
  const camera = boosteraEngine.setCameraFacing('back');
  return res.json({ ok: true, camera, program: boosteraEngine.getProgramSnapshot() });
});

app.post('/api/v1/camera/switch', (_req, res) => {
  const camera = boosteraEngine.setCameraFacing('switch');
  return res.json({ ok: true, camera, program: boosteraEngine.getProgramSnapshot() });
});

app.post('/api/v1/scene', (req, res) => {
  const mode =
    req.body?.mode === 'lion'
      ? 'lion'
      : req.body?.mode === 'custom_bg'
        ? 'custom_bg'
        : 'camera';
  const program = boosteraEngine.setScene({
    mode,
    backgroundAssetUrl: req.body?.backgroundAssetUrl,
    sourceStreamUrl: req.body?.sourceStreamUrl,
  });

  if (mode === 'lion' || mode === 'camera') {
    void postUpstreamFireAndForget('/api/cloud/source', { source: mode });
  }

  return res.json({ ok: true, program });
});

app.post('/api/v1/overlay', (req, res) => {
  const body = req.body || {};
  const overlayId = String(body.id || '');
  const asset = String(
    body.asset || (overlayId ? `/media/overlays/${overlayId}.webm` : '')
  );
  if (!asset) {
    return res.status(400).json({ ok: false, error: 'asset or id is required' });
  }

  const layer = boosteraEngine.playCustomOverlay({
    id: overlayId || undefined,
    name: body.name,
    asset,
    durationMs: body.durationMs,
    zIndex: body.zIndex,
    anchor: body.anchor,
    target: body.target,
    opponentUser: body.opponentUser || body.user,
    position: body.position,
    loop: body.loop,
    audio: body.audio,
  });

  if (overlayId) {
    void postUpstreamFireAndForget('/api/overlay/play', {
      id: overlayId,
      loop: Boolean(body.loop),
      swap: Boolean(body.swap),
      pos: body.pos || 'center',
      size: body.size ?? 0.75,
      bottom: body.bottom ?? 0.2,
      head: body.head ?? 1,
      hitAt: body.hitAt,
      dir: body.dir,
    });
  }

  return res.json({
    ok: true,
    layer,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.post('/api/v1/character', (req, res) => {
  const body = req.body || {};
  const layer = boosteraEngine.playCharacterInBattle({
    id: body.id,
    name: body.name,
    asset: body.asset,
    durationMs: body.durationMs,
    anchor: body.anchor,
    target: body.target,
    opponentUser: body.opponentUser || body.user,
    layerOrder: body.layerOrder === 'behind' ? 'behind' : 'front',
    audio: body.audio,
    loop: body.loop,
    position: body.position,
  });

  if (body.set && (body.opponentUser || body.user)) {
    void postUpstreamFireAndForget('/api/special', {
      user: body.opponentUser || body.user,
      set: body.set,
    });
  } else if (body.overlayId) {
    void postUpstreamFireAndForget('/api/overlay/play', {
      id: body.overlayId,
      loop: Boolean(body.loop),
    });
  }

  return res.json({
    ok: true,
    layer,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.post('/api/v1/audio', (req, res) => {
  const audio = boosteraEngine.updateAudio(req.body || {});
  return res.json({
    ok: true,
    audio,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

app.get('/api/v1/status', async (_req, res) => {
  await syncUpstreamMediaIntoBoostera(false);
  return res.json(boosteraEngine.getStatusSnapshot());
});

app.get('/api/v1/program', (_req, res) => {
  return res.json({
    ok: true,
    program: boosteraEngine.getProgramSnapshot(),
  });
});

// Shared Gemini Client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Lyria AI Music Generation Endpoint
app.post('/api/music/generate', async (req, res) => {
  try {
    const { prompt, model = 'lyria-3-clip-preview' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt string is required' });
    }

    const selectedModel =
      model === 'lyria-3-pro-preview' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    const responseStream = await ai.models.generateContentStream({
      model: selectedModel,
      contents: prompt,
    });

    const audioChunks: Buffer[] = [];
    let lyrics = '';
    let mimeType = 'audio/mpeg';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;

      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
        if (part.text) {
          lyrics += part.text;
        }
      }
    }

    if (audioChunks.length === 0) {
      return res.status(500).json({ error: 'No audio data was returned by the Lyria model' });
    }

    const audioBase64 = Buffer.concat(audioChunks).toString('base64');
    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

    return res.json({
      success: true,
      audioDataUrl,
      lyrics,
      model: selectedModel,
      prompt,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown music generation error';
    return res.status(500).json({
      error: errorMessage,
      isQuotaOrKeyError: /PERMISSION_DENIED|RESOURCE_EXHAUSTED|API_KEY/i.test(errorMessage),
    });
  }
});

// Health check endpoint (no secrets exposed)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'BOOSTERA Effects Server',
    cleanFeedPath: '/clean-feed',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 3. Real-time Server-Sent Events (SSE) pass-through + Bridge into BOOSTERA Event Bus
app.get('/api/events', async (req, res) => {
  const ac = new AbortController();
  req.on('close', () => {
    ac.abort();
  });

  try {
    const upstreamRes = await fetch(`${UPSTREAM_BASE}/api/events`, {
      headers: buildUpstreamHeaders({ Accept: 'text/event-stream' }),
      signal: ac.signal,
    });

    if (!upstreamRes.ok || !upstreamRes.body) {
      return res
        .status(upstreamRes.status || 502)
        .json({ error: `Upstream SSE status ${upstreamRes.status}` });
    }

    boosteraEngine.setUpstreamConnected(true);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const decoder = new TextDecoder();
    let sseBuf = '';
    const reader = upstreamRes.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        const buf = Buffer.from(value);
        res.write(buf);

        // Also parse upstream events into BOOSTERA Realtime Event Bus
        sseBuf += decoder.decode(value, { stream: true });
        const lines = sseBuf.split('\n');
        sseBuf = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const parsed = JSON.parse(line.slice(5).trim());
              boosteraEngine.ingestExternalEvent(parsed);
            } catch {
              // ignore non-json SSE heartbeat
            }
          }
        }
      }
    }
    res.end();
  } catch (err: unknown) {
    if (!ac.signal.aborted) {
      const msg = err instanceof Error ? err.message : 'SSE connection error';
      if (!res.headersSent) {
        res.status(502).json({ error: msg });
      } else {
        res.end();
      }
    }
  }
});

// 4. Live MJPEG Phone Screen & Camera Output Streams
app.get(['/api/phone/screen.mjpeg', '/api/phone/view.mjpeg'], async (req, res) => {
  const ac = new AbortController();
  req.on('close', () => {
    ac.abort();
  });

  try {
    const upstreamRes = await fetch(`${UPSTREAM_BASE}${req.originalUrl}`, {
      headers: buildUpstreamHeaders(),
      signal: ac.signal,
    });

    boosteraEngine.setUpstreamConnected(upstreamRes.ok);
    res.status(upstreamRes.status);
    const ct = upstreamRes.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'no-store');

    if (!upstreamRes.body) {
      return res.end();
    }

    res.flushHeaders();
    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.on('error', () => {
      res.end();
    });
    nodeStream.pipe(res);
  } catch (err: unknown) {
    if (!ac.signal.aborted && !res.headersSent) {
      const msg = err instanceof Error ? err.message : 'MJPEG stream error';
      res.status(502).json({ error: msg });
    } else {
      res.end();
    }
  }
});

// 5. Media, Avatars, Cutout Heads, Overlays (.webm / .mp4 / .png / .jpg) & FLV Proxy
app.get(['/media/*', '/data/*', '/proxy/flv/*'], async (req, res) => {
  const ac = new AbortController();
  req.on('close', () => {
    ac.abort();
  });

  try {
    const forwardHeaders: Record<string, string> = {};
    if (req.headers.range) {
      forwardHeaders.Range = String(req.headers.range);
    }
    if (req.headers['if-none-match']) {
      forwardHeaders['If-None-Match'] = String(req.headers['if-none-match']);
    }
    if (req.headers['if-modified-since']) {
      forwardHeaders['If-Modified-Since'] = String(req.headers['if-modified-since']);
    }

    const upstreamRes = await fetch(`${UPSTREAM_BASE}${req.originalUrl}`, {
      headers: buildUpstreamHeaders(forwardHeaders),
      signal: ac.signal,
    });

    res.status(upstreamRes.status);
    const passHeaders = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'etag',
      'last-modified',
    ];
    for (const h of passHeaders) {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    }

    if (!upstreamRes.body) {
      return res.end();
    }

    const nodeStream = Readable.fromWeb(upstreamRes.body as any);
    nodeStream.on('error', () => {
      res.end();
    });
    nodeStream.pipe(res);
  } catch {
    if (!ac.signal.aborted && !res.headersSent) {
      res.status(502).end();
    } else {
      res.end();
    }
  }
});

// 6. Legacy Upstream Compatibility Proxy (with automatic Admin Key redaction)
app.all('/api/*', async (req, res) => {
  try {
    const targetUrl = `${UPSTREAM_BASE}${req.originalUrl}`;
    const method = req.method.toUpperCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    const upstreamRes = await fetch(targetUrl, {
      method,
      headers: buildUpstreamHeaders(
        hasBody ? { 'Content-Type': 'application/json' } : {}
      ),
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    });

    const contentType = upstreamRes.headers.get('content-type') || 'application/json; charset=utf-8';
    const rawBody = await upstreamRes.text();

    res.status(upstreamRes.status);
    res.setHeader('Content-Type', contentType);
    return res.send(redactAdminSecretsFromJson(rawBody));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upstream server unreachable';
    console.error(`[BOOSTERA Proxy Error] ${req.method} ${req.originalUrl}:`, msg);
    return res.status(502).json({ error: msg });
  }
});

async function startServer() {
  // Initial catalog sync on server startup
  void syncUpstreamMediaIntoBoostera(true);

  const isCompiledDistBundle =
    __filename.endsWith('.js') && path.basename(__dirname) === 'dist';
  const isProduction = process.env.NODE_ENV === 'production' || isCompiledDistBundle;

  const httpServer = http.createServer(app);

  // ==========================================================================
  // 7. Authenticated Realtime WebSocket Server at /ws/live (§14 & §15)
  // ==========================================================================
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket) => {
    boosteraEngine.setWsClientsCount(wss.clients.size);

    // Send authoritative initial Program Output + Status snapshot immediately
    const initPayload = JSON.stringify({
      event: 'program_sync',
      timestamp: Date.now(),
      payload: {
        status: boosteraEngine.getStatusSnapshot(),
      },
      program: boosteraEngine.getProgramSnapshot(),
    });
    ws.send(initPayload);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg?.action === 'ping') {
          ws.send(
            JSON.stringify({
              event: 'program_sync',
              timestamp: Date.now(),
              payload: { pong: true },
              program: boosteraEngine.getProgramSnapshot(),
            })
          );
        }
      } catch {
        // Ignore malformed client frames
      }
    });

    ws.on('close', () => {
      boosteraEngine.setWsClientsCount(wss.clients.size);
    });
  });

  // Broadcast every BOOSTERA Realtime Event to all connected /ws/live clients
  boosteraEngine.subscribe((eventMsg) => {
    const serialized = JSON.stringify(eventMsg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  });

  httpServer.on('upgrade', (req, socket, head) => {
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (parsedUrl.pathname !== '/ws/live') {
        return; // Let other upgrade handlers (if any) proceed
      }

      const queryToken = parsedUrl.searchParams.get('ck') || '';
      const headerToken = String(req.headers['x-boostera-key'] || '');
      const token = queryToken || headerToken;

      if (!isValidClientToken(token)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } catch {
      socket.destroy();
    }
  });

  if (isProduction) {
    const distPath =
      path.basename(__dirname) === 'dist' ? __dirname : path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`BOOSTERA Effects Server & Studio running at http://0.0.0.0:${PORT}`);
    console.log(`Clean Program Feed (1080x1920) ready at http://0.0.0.0:${PORT}/clean-feed`);
  });
}

startServer();
