import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload } from 'lucide-react';
import { EffectType, TriggerEvent } from '../types/studio';
import { studioAudio } from '../utils/audioSynthesizer';
import { FacialExpressions } from '../engine/MediaPipeFaceTracker';
import { ThreeARMaskType } from '../engine/ThreeFaceAREngine';
import {
  ArielDashboardSnapshot,
  flattenPlayerClips,
  getPlayerAvatarUrl,
} from '../utils/arielState';
import { arielApi } from '../services/arielApi';
import { boosteraApi } from '../services/boosteraApi';

export interface EffectItem {
  kind: 'overlay' | 'clip' | 'fx' | 'set' | 'scene' | 'body';
  id: string;
  name: string;
  user?: string;
  thumb?: string;
  videoUrl?: string;
}

interface LuxuryFloatingDeckProps {
  snapshot: ArielDashboardSnapshot;
  onRefreshOverlays: () => Promise<void>;
  onTriggerEffect: (event: TriggerEvent) => void;
  activeMask: ThreeARMaskType;
  onSetARMask: (mask: ThreeARMaskType) => void;
  activeBackground: EffectType;
  facialExpressions?: FacialExpressions;
}

const RING_BUTTONS: Array<{
  id: string;
  icon: string;
  label: string;
  openPosClass: string;
}> = [
  { id: 'opp', icon: '⚔', label: 'מתחרים', openPosClass: '-translate-x-[12px] -translate-y-[178px] scale-100 delay-[25ms]' },
  { id: 'sup', icon: '💖', label: 'תומכים', openPosClass: '-translate-x-[75px] -translate-y-[161px] scale-100 delay-[50ms]' },
  { id: 'head', icon: '🎭', label: 'ראשים', openPosClass: '-translate-x-[128px] -translate-y-[124px] scale-100 delay-[75ms]' },
  { id: 'front', icon: '🎬', label: 'Front', openPosClass: '-translate-x-[165px] -translate-y-[67px] scale-100 delay-[100ms]' },
  { id: 'bg', icon: '🖼', label: 'רקע', openPosClass: '-translate-x-[178px] -translate-y-[3px] scale-100 delay-[125ms]' },
  { id: 'fx', icon: '🧤', label: 'אפקטים', openPosClass: '-translate-x-[24px] -translate-y-[97px] scale-100 delay-[150ms]' },
  { id: 'ai', icon: '✨', label: 'AI חי', openPosClass: '-translate-x-[73px] -translate-y-[68px] scale-100 delay-[175ms]' },
  { id: 'lion', icon: '🦁', label: 'אריה', openPosClass: '-translate-x-[99px] -translate-y-[14px] scale-100 delay-[200ms]' },
];

export const LuxuryFloatingDeck: React.FC<LuxuryFloatingDeckProps> = ({
  snapshot,
  onRefreshOverlays,
  onTriggerEffect,
  activeMask,
  onSetARMask,
  activeBackground,
  facialExpressions,
}) => {
  const [isRingOpen, setIsRingOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isHiddenMode, setIsHiddenMode] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real items fetched from /api/client/list + snapshot.overlays
  const [clientListItems, setClientListItems] = useState<EffectItem[]>([]);
  const [fxActiveTab, setFxActiveTab] = useState<'all' | 'set' | 'scene' | 'overlay' | 'clip'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  const [newOpponent, setNewOpponent] = useState('');
  const [newSupporter, setNewSupporter] = useState('');
  const [localSupporters, setLocalSupporters] = useState<string[]>([]);

  // AI Live Creation & Lion Cloud Source
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMode, setAiMode] = useState<'front' | 'bg' | 'overlay'>('front');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiEngineName, setAiEngineName] = useState('RunPod / Kling AI');
  const [cloudSource, setCloudSource] = useState<'lion' | 'camera'>('camera');

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const lastAutoTriggerRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1500);
  }, []);

  // Fetch real /api/client/list & /api/engines
  useEffect(() => {
    try {
      const savedFavs = JSON.parse(localStorage.getItem('ariel_favs') || '[]');
      if (Array.isArray(savedFavs)) setFavorites(savedFavs);
      const savedSups = JSON.parse(localStorage.getItem('ariel_sups') || '[]');
      if (Array.isArray(savedSups)) setLocalSupporters(savedSups);
    } catch {
      // ignore storage errors
    }

    fetch('/api/client/list')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.items)) {
          console.log(`[ARIEL API] Loaded ${data.items.length} real items from /api/client/list`);
          setClientListItems(data.items);
        }
      })
      .catch(() => {});

    fetch('/api/engines')
      .then((r) => (r.ok ? r.json() : null))
      .then((eng) => {
        const currentVid = eng?.current?.video;
        if (currentVid && eng?.names?.[currentVid]) {
          setAiEngineName(eng.names[currentVid]);
        }
      })
      .catch(() => {});

    arielApi.getCloudSource().then((s) => {
      if (s?.source === 'lion' || s?.source === 'camera') {
        setCloudSource(s.source);
      }
    });
  }, []);

  // Build unified real effects list strictly from server data (no fake presets)
  const realEffectsList: EffectItem[] = useMemo(() => {
    const map = new Map<string, EffectItem>();

    for (const item of clientListItems) {
      map.set(`${item.kind}:${item.id}`, item);
    }

    for (const ov of snapshot.overlays) {
      const key = `overlay:${ov.id}`;
      if (!map.has(key)) {
        map.set(key, {
          kind: 'overlay',
          id: ov.id,
          name: ov.he || ov.id,
          user: ov.user,
          videoUrl: `/media/overlays/${ov.id}.webm`,
        });
      }
    }

    for (const cl of snapshot.clips) {
      const key = `clip:${cl.id}`;
      if (!map.has(key)) {
        map.set(key, {
          kind: 'clip',
          id: cl.id,
          name: cl.name,
          thumb: cl.thumb,
        });
      }
    }

    for (const fx of snapshot.fxLibrary) {
      const key = `fx:${fx.id}`;
      if (!map.has(key)) {
        map.set(key, {
          kind: 'fx',
          id: fx.id,
          name: fx.name,
          thumb: fx.thumb,
        });
      }
    }

    return Array.from(map.values());
  }, [clientListItems, snapshot.overlays, snapshot.clips, snapshot.fxLibrary]);

  // Real Opponents from roster + players
  const realOpponents = useMemo(() => {
    const list = snapshot.roster.map((r) => ({
      user: r.user,
      alive: r.alive,
      sets: r.sets,
      total: r.total,
    }));
    const seen = new Set(list.map((x) => x.user.toLowerCase()));
    for (const p of snapshot.players) {
      if ((p.roles || []).includes('opp') && !seen.has(p.user.toLowerCase())) {
        seen.add(p.user.toLowerCase());
        list.push({
          user: p.user,
          alive: false,
          sets: flattenPlayerClips(p).length,
          total: 4,
        });
      }
    }
    return list;
  }, [snapshot.roster, snapshot.players]);

  // Real Supporters from server players (`fan` role or diamonds > 0) + local additions
  const realSupporters = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ user: string; diamonds?: number; head?: string }> = [];

    for (const p of snapshot.players) {
      if ((p.roles || []).includes('fan') || (p.diamonds ?? 0) > 0) {
        seen.add(p.user.toLowerCase());
        result.push({
          user: p.user,
          diamonds: p.diamonds,
          head: getPlayerAvatarUrl(p) || undefined,
        });
      }
    }

    for (const u of localSupporters) {
      if (!seen.has(u.toLowerCase())) {
        seen.add(u.toLowerCase());
        result.push({ user: u });
      }
    }

    return result;
  }, [snapshot.players, localSupporters]);

  const fireEffect = useCallback(
    async (kind: string, id: string, name: string) => {
      console.log(`[ARIEL Play] kind=${kind}, id=${id}, name="${name}"`);
      showToast(name);

      if (id.includes('boxer') || id.includes('punch')) {
        studioAudio.playPunch('combo');
      } else {
        studioAudio.playConfetti();
      }

      const favKey = `${kind}:${id}`;
      setFavorites((prev) => {
        const updated = [favKey, ...prev.filter((x) => x !== favKey)].slice(0, 4);
        try {
          localStorage.setItem('ariel_favs', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      if (kind === 'overlay') {
        await boosteraApi.triggerOverlay({
          id: `ov_${id}`,
          asset: `/media/overlays/${id}.webm`,
          name,
          anchor: 'center',
          scale: 0.8,
        });
        await arielApi.playOverlay({ id, loop: false, swap: false, pos: 'center', size: 0.75, bottom: 0.2 });
      } else if (kind === 'clip') {
        await boosteraApi.triggerEffect(`clip_${id}`);
        await arielApi.playClip(id);
      } else if (kind === 'fx') {
        await boosteraApi.triggerEffect(id);
        await arielApi.playFx(id, false);
      } else if (kind === 'scene') {
        await boosteraApi.setScene(id);
        await arielApi.clientPlay(kind, id);
      } else {
        await boosteraApi.triggerCharacter({
          characterId: id,
          name,
          target: 'rival',
          layerOrder: 'front',
          audio: true,
        });
        await arielApi.clientPlay(kind, id);
      }
    },
    [showToast]
  );

  // Auto-trigger real server effect on facial expression (surprise / big smile)
  useEffect(() => {
    if (!facialExpressions || realEffectsList.length === 0) return;
    const now = Date.now();
    if (now - lastAutoTriggerRef.current < 5000) return;

    if (facialExpressions.isSurprise || facialExpressions.mouthOpen > 0.48) {
      lastAutoTriggerRef.current = now;
      const randomItem = realEffectsList[Math.floor(Math.random() * realEffectsList.length)];
      if (randomItem) {
        fireEffect(randomItem.kind, randomItem.id, `😮 ${randomItem.name}`);
      }
    } else if (facialExpressions.isSmiling && facialExpressions.mouthSmile > 0.58) {
      lastAutoTriggerRef.current = now;
      const randomItem = realEffectsList[Math.floor(Math.random() * realEffectsList.length)];
      if (randomItem) {
        fireEffect(randomItem.kind, randomItem.id, `💖 ${randomItem.name}`);
      }
    }
  }, [facialExpressions, realEffectsList, fireEffect]);

  const fireOnUser = async (user: string, set: string, label: string) => {
    console.log(`[ARIEL Special] user=@${user}, set=${set}`);
    showToast(`${label} → @${user}`);
    await boosteraApi.triggerCharacter({
      characterId: set,
      name: `${label} (@${user})`,
      target: 'rival',
      layerOrder: 'front',
      audio: true,
    });
    await arielApi.triggerSpecial(user, set);
    await onRefreshOverlays();
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || isGeneratingAi) {
      showToast('⚠️ כתוב תיאור לאפקט');
      return;
    }
    setIsGeneratingAi(true);
    showToast('✨ שולח יצירת וידאו לשרת…');
    try {
      const res = await arielApi.generateAutoAi(aiPrompt.trim(), aiMode);
      if (res?.error) {
        showToast(`❌ ${res.error}`);
      } else {
        showToast('✅ בקשת ה-AI נשלחה לשרת!');
        setAiPrompt('');
        await onRefreshOverlays();
      }
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAddOpponent = async () => {
    const clean = newOpponent.trim().replace(/^@/, '');
    if (!clean) return;
    setNewOpponent('');
    await arielApi.addPlayer(clean);
    await onRefreshOverlays();
    showToast(`⚔ נוסף יריב: @${clean}`);
  };

  const handleAddSupporter = async () => {
    const clean = newSupporter.trim().replace(/^@/, '');
    if (!clean) return;
    setNewSupporter('');
    const next = [clean, ...localSupporters.filter((u) => u.toLowerCase() !== clean.toLowerCase())];
    setLocalSupporters(next);
    try {
      localStorage.setItem('ariel_sups', JSON.stringify(next));
    } catch {}
    await arielApi.addPlayer(clean);
    await onRefreshOverlays();
    showToast(`💖 נוסף תומך: @${clean}`);
  };

  const handleFabPointerDown = () => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsHiddenMode((prev) => !prev);
      setIsRingOpen(false);
      setActivePanel(null);
    }, 600);
  };

  const handleFabPointerUp = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  };

  const handleFabClick = () => {
    if (isLongPressTriggeredRef.current) return;
    if (activePanel) {
      setActivePanel(null);
      return;
    }
    setIsRingOpen((prev) => !prev);
  };

  const iconForKind = (k: string) => {
    const map: Record<string, string> = {
      overlay: '🥊',
      clip: '🎬',
      fx: '✨',
      set: '⭐',
      scene: '🦁',
      body: '💃',
    };
    return map[k] || '✨';
  };

  const filteredFxList: EffectItem[] = useMemo(() => {
    const setItems: EffectItem[] = snapshot.catalog.sets.map((s) => ({
      kind: 'set',
      id: s.id,
      name: s.he,
      thumb: s.thumb,
    }));
    const sceneItems: EffectItem[] = snapshot.catalog.scenes.map((s) => ({
      kind: 'scene',
      id: s.id,
      name: s.he,
    }));

    if (fxActiveTab === 'all') {
      return [...realEffectsList, ...setItems, ...sceneItems];
    }
    if (fxActiveTab === 'set') return setItems;
    if (fxActiveTab === 'scene') return sceneItems;
    return realEffectsList.filter((i) => i.kind === fxActiveTab);
  }, [fxActiveTab, realEffectsList, snapshot.catalog]);

  return (
    <>
      {/* Gold Toast Notification */}
      <div
        className={`fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
        }`}
      >
        <div className="px-5 py-2 rounded-full bg-gradient-to-r from-[#e6b450] via-[#ffd778] to-[#b8841f] text-[#1a1208] font-black text-sm shadow-xl border border-white/20 whitespace-nowrap">
          {toastMessage}
        </div>
      </div>

      {/* Tap anywhere to restore when hidden via long-press */}
      {isHiddenMode && (
        <button
          type="button"
          aria-label="החזר כפתור שליטה זהב"
          onClick={() => setIsHiddenMode(false)}
          className="fixed bottom-4 right-4 z-40 w-8 h-8 rounded-full bg-[#d9a441]/25 hover:bg-[#d9a441] border border-[#d9a441]/50 cursor-pointer"
        />
      )}

      {/* Recent Favorites Strip */}
      {!isHiddenMode && !isRingOpen && !activePanel && favorites.length > 0 && (
        <div className="fixed left-3 bottom-24 z-30 flex flex-col gap-2">
          {favorites.map((k) => {
            const [kind, id] = k.split(':');
            const it = realEffectsList.find((x) => x.id === id && x.kind === kind);
            if (!it) return null;
            return (
              <button
                key={k}
                type="button"
                onClick={() => fireEffect(kind, id, it.name)}
                title={it.name}
                className="w-11 h-11 rounded-2xl bg-[#17130f]/90 backdrop-blur-md border border-[#3a2f22] hover:border-[#e6b450] flex items-center justify-center text-lg shadow-lg overflow-hidden cursor-pointer"
              >
                {it.thumb ? (
                  <img src={it.thumb} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{iconForKind(kind)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Outside Click Dimmer */}
      {(isRingOpen || activePanel) && (
        <div
          onClick={() => {
            setIsRingOpen(false);
            setActivePanel(null);
          }}
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
        />
      )}

      {/* 7-Icon Luxury Gold Radial Ring */}
      {!isHiddenMode && (
        <div
          className={`fixed right-6 bottom-6 z-30 ${
            isRingOpen ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        >
          <div
            className={`absolute right-0 bottom-0 w-[330px] h-[330px] rounded-full bg-radial from-[#e6b450]/25 via-[#e6b450]/5 to-transparent pointer-events-none transition-all duration-300 origin-bottom-right ${
              isRingOpen ? 'scale-100 opacity-100' : 'scale-25 opacity-0'
            }`}
          />

          {RING_BUTTONS.map((rb) => (
            <button
              key={rb.id}
              type="button"
              onClick={() => {
                setActivePanel(rb.id);
                setIsRingOpen(false);
              }}
              className={`absolute right-1.5 bottom-1.5 w-[46px] h-[46px] rounded-full bg-[#17130f]/95 backdrop-blur-md border border-[#d9a441]/50 hover:border-[#ffd778] flex flex-col items-center justify-center shadow-2xl transition-all duration-300 select-none cursor-pointer ${
                isRingOpen
                  ? `${rb.openPosClass} opacity-100 pointer-events-auto`
                  : 'translate-x-0 translate-y-0 scale-30 opacity-0 pointer-events-none'
              }`}
            >
              <span className="text-xl leading-none">{rb.icon}</span>
              <span className="absolute top-[102%] left-1/2 -translate-x-1/2 mt-1 text-[9.5px] font-extrabold text-[#e6b450] whitespace-nowrap">
                {rb.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Floating Gold Button (#e6b450 -> #b8841f) */}
      {!isHiddenMode && (
        <button
          type="button"
          onClick={handleFabClick}
          onPointerDown={handleFabPointerDown}
          onPointerUp={handleFabPointerUp}
          onPointerLeave={handleFabPointerUp}
          aria-label="לוח בקרה זהב"
          title="לחיצה: טבעת 7 אייקונים | לחיצה ארוכה: הסתרה"
          className={`fixed right-3.5 bottom-5 z-40 w-[58px] h-[58px] rounded-full flex items-center justify-center font-black transition-all duration-200 select-none shadow-[0_10px_28px_rgba(230,180,80,0.5)] cursor-pointer ${
            isRingOpen || activePanel
              ? 'bg-gradient-to-tr from-[#ffffff] via-[#ffd778] to-[#e6b450] text-[#1a1000] ring-4 ring-[#e6b450]/40 scale-105'
              : 'bg-gradient-to-tr from-[#e6b450] via-[#ffd778] to-[#b8841f] text-[#1a1000]'
          }`}
        >
          <span className="text-2xl">{activePanel || isRingOpen ? '✕' : '✨'}</span>
        </button>
      )}

      {/* Mini Bottom Sheet */}
      {activePanel && (
        <div
          dir="rtl"
          onClick={(e) => e.stopPropagation()}
          className="fixed left-2.5 right-2.5 md:left-auto md:right-6 md:w-[460px] bottom-20 z-40 max-h-[64vh] rounded-[24px] bg-[#17130f]/95 backdrop-blur-2xl border border-[#e6b450]/40 shadow-2xl p-3.5 flex flex-col font-['Heebo',sans-serif] overflow-hidden"
        >
          <div className="flex items-center justify-between pb-2 border-b border-[#3a2f22]">
            <span className="text-sm font-extrabold text-[#e6b450]">
              {activePanel === 'opp' && `⚔ מתחרים חיים (${realOpponents.length})`}
              {activePanel === 'sup' && `💖 תומכים (${realSupporters.length})`}
              {activePanel === 'head' && '🎭 ראשים (8 מסיכות 3D)'}
              {activePanel === 'front' && '🎬 שכבות Front והלבשות'}
              {activePanel === 'bg' && '🖼 רקעים'}
              {activePanel === 'fx' && `🧤 אפקטים אמיתיים מהשרת (${filteredFxList.length})`}
              {activePanel === 'ai' && '✨ AI חי וסצנת אריה'}
              {activePanel === 'lion' && '🦁 אריאל (צ׳ינו האריה בלייב)'}
            </span>
            <button
              type="button"
              aria-label="סגור חלונית"
              onClick={() => setActivePanel(null)}
              className="w-7 h-7 rounded-full bg-[#1f180f] hover:bg-[#3a2f22] text-[#f3e7d3] flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mt-2.5 space-y-3">
            {/* 1. 🧤 אפקטים */}
            {activePanel === 'fx' && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: `✨ הכל (${realEffectsList.length + snapshot.catalog.sets.length + snapshot.catalog.scenes.length})` },
                    { id: 'overlay', label: `🥊 אוברליים (${snapshot.overlays.length})` },
                    { id: 'set', label: `⭐ סטים (${snapshot.catalog.sets.length})` },
                    { id: 'scene', label: `🦁 סצנות (${snapshot.catalog.scenes.length})` },
                    { id: 'clip', label: `🎬 קליפים (${snapshot.clips.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFxActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer ${
                        fxActiveTab === tab.id
                          ? 'bg-[#e6b450] text-[#1a1208]'
                          : 'bg-[#120e0a] text-[#f3e7d3] border border-[#3a2f22]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {filteredFxList.length === 0 ? (
                  <div className="text-center text-xs text-[#a8957a] py-6">
                    אין אפקטים בקטגוריה זו עדיין בשרת.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-1.5">
                    {filteredFxList.map((it) => (
                      <button
                        key={`${it.kind}-${it.id}`}
                        type="button"
                        onClick={() => fireEffect(it.kind, it.id, it.name)}
                        className="relative aspect-square rounded-xl overflow-hidden bg-[#120e0a] border border-[#3a2f22] hover:border-[#e6b450] flex flex-col items-center justify-center p-1 text-center cursor-pointer"
                      >
                        {it.thumb ? (
                          <img
                            src={it.thumb}
                            alt={it.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl mb-2">{iconForKind(it.kind)}</span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1 pt-3">
                          <span className="text-[10px] font-bold text-[#f3e7d3] block truncate">
                            {it.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. ⚔ מתחרים */}
            {activePanel === 'opp' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 max-h-[38vh] overflow-y-auto">
                  {realOpponents.length === 0 ? (
                    <div className="text-center text-xs text-[#a8957a] py-4">
                      אין יריבים ברשימה עדיין. הוסף למטה.
                    </div>
                  ) : (
                    realOpponents.map((opp) => (
                      <div
                        key={opp.user}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#120e0a] border border-[#3a2f22] gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{opp.alive ? '🟢' : '⚪'}</span>
                          <div className="flex flex-col min-w-0">
                            <span dir="ltr" className="text-xs font-bold text-[#f3e7d3] truncate">
                              @{opp.user}
                            </span>
                            <span className="text-[10px] text-[#a8957a]">
                              {opp.sets}/{opp.total} סטים מוכנים
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {[
                            { set: 'boxer3', icon: '🥊', lbl: 'אגרוף' },
                            { set: 'ov_baby', icon: '👶', lbl: 'תינוק' },
                            { set: 'fx_belly', icon: '💃', lbl: 'ריקוד בטן' },
                            { set: 'fx_chicken', icon: '🐔', lbl: 'תרנגולת' },
                          ].map((act) => (
                            <button
                              key={act.set}
                              type="button"
                              onClick={() => fireOnUser(opp.user, act.set, act.lbl)}
                              title={act.lbl}
                              className="px-2 py-1 rounded-lg bg-[#1f180f] hover:bg-[#e6b450] hover:text-[#1a1208] border border-[#3a2f22] text-xs font-bold cursor-pointer"
                            >
                              {act.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#3a2f22]">
                  <input
                    type="text"
                    value={newOpponent}
                    onChange={(e) => setNewOpponent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                    placeholder="@username של יריב"
                    aria-label="שם משתמש של יריב להוספה"
                    dir="ltr"
                    className="flex-1 px-3 py-2 bg-[#0f0c09] border border-[#3a2f22] rounded-xl text-xs text-[#f3e7d3]"
                  />
                  <button
                    type="button"
                    onClick={handleAddOpponent}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-[#1a1208] font-black text-xs cursor-pointer"
                  >
                    הוסף
                  </button>
                </div>
              </div>
            )}

            {/* 3. 💖 תומכים */}
            {activePanel === 'sup' && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1.5 max-h-[38vh] overflow-y-auto">
                  {realSupporters.length === 0 ? (
                    <div className="text-center text-xs text-[#a8957a] py-4">
                      עוד לא נוספו תומכים — הוסף שם משתמש למטה כדי להכין לו אפקטים מיוחדים.
                    </div>
                  ) : (
                    realSupporters.map((sup) => (
                      <div
                        key={sup.user}
                        className="flex items-center justify-between p-2 rounded-xl bg-[#120e0a] border border-[#3a2f22] gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">💖</span>
                          <div className="flex flex-col min-w-0">
                            <span dir="ltr" className="text-xs font-bold text-[#f3e7d3] truncate">
                              @{sup.user}
                            </span>
                            {sup.diamonds ? (
                              <span className="text-[10px] text-[#d9a441]">💎 {sup.diamonds}</span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {[
                            { set: 'lion_belly', icon: '🦁', lbl: 'עם אריה' },
                            { set: 'fx_ballet', icon: '🩰', lbl: 'בלט' },
                            { set: 'ov_baby', icon: '👶', lbl: 'תינוק' },
                          ].map((act) => (
                            <button
                              key={act.set}
                              type="button"
                              onClick={() => fireOnUser(sup.user, act.set, act.lbl)}
                              title={act.lbl}
                              className="px-2 py-1 rounded-lg bg-[#1f180f] hover:bg-[#e6b450] hover:text-[#1a1208] border border-[#3a2f22] text-xs font-bold cursor-pointer"
                            >
                              {act.icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#3a2f22]">
                  <input
                    type="text"
                    value={newSupporter}
                    onChange={(e) => setNewSupporter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSupporter()}
                    placeholder="@username של תומך"
                    aria-label="שם משתמש של תומך להוספה"
                    dir="ltr"
                    className="flex-1 px-3 py-2 bg-[#0f0c09] border border-[#3a2f22] rounded-xl text-xs text-[#f3e7d3]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSupporter}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-[#1a1208] font-black text-xs cursor-pointer"
                  >
                    הוסף
                  </button>
                </div>
              </div>
            )}

            {/* 4. 🎭 ראשים (8 Local 3D Masks) */}
            {activePanel === 'head' && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'forest', icon: '🌲', name: 'יצור היער' },
                    { id: 'kitsune', icon: '🦊', name: 'שועל קיטסונה' },
                    { id: 'cyber', icon: '👹', name: 'סייבר-אוני' },
                    { id: 'glasses', icon: '🕶️', name: 'משקפי סייבר' },
                    { id: 'crown', icon: '👑', name: 'כתר זהב' },
                    { id: 'kitty', icon: '🐱', name: 'אוזני חתול' },
                    { id: 'helmet', icon: '🪖', name: 'קסדת סייבר' },
                    { id: 'dj_stage', icon: '🎧', name: 'במת DJ 3D' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onSetARMask(activeMask === m.id ? 'none' : (m.id as ThreeARMaskType));
                        showToast(`🎭 ${m.name}`);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer ${
                        activeMask === m.id
                          ? 'bg-[#e6b450]/20 border-[#e6b450] text-[#ffd778]'
                          : 'bg-[#120e0a] border-[#3a2f22] text-[#f3e7d3]'
                      }`}
                    >
                      <span className="text-xl mb-1">{m.icon}</span>
                      <span className="text-[10px] font-bold truncate w-full">{m.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 border-t border-[#3a2f22]">
                  <button
                    type="button"
                    onClick={() => {
                      onSetARMask('none');
                      showToast('ללא מסכה');
                    }}
                    className="flex-1 py-2 rounded-xl bg-[#120e0a] border border-[#3a2f22] text-[#f3e7d3] text-xs font-bold cursor-pointer"
                  >
                    ❌ ללא מסכה
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-[#1a1208] text-xs font-black cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>העלה פנים לשחקן</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        const target = snapshot.desk.opponent || realOpponents[0]?.user;
                        if (f && target) {
                          await arielApi.uploadPlayerPhoto(target, f);
                          await onRefreshOverlays();
                          showToast(`✅ פנים נשמרו עבור @${target}`);
                        } else if (f) {
                          showToast('⚠️ בחר קודם יריב כדי לשייך לו תמונת פנים');
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. 🎬 Front */}
            {activePanel === 'front' && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'fx_tiny', icon: '🤏', name: 'גמד', fn: () => fireEffect('set', 'fx_tiny', '🤏 גמד') },
                  { id: 'fx_fan', icon: '🪭', name: 'מניפה', fn: () => fireEffect('set', 'fx_fan', '🪭 מניפה') },
                  { id: 'fx_babyarm', icon: '🦾', name: 'זרועות', fn: () => fireEffect('set', 'fx_babyarm', '🦾 זרועות') },
                  { id: 'fx_bottle', icon: '🍼', name: 'בקבוק', fn: () => fireEffect('set', 'fx_bottle', '🍼 בקבוק') },
                  { id: 'laser', icon: '👁️', name: 'לייזר AR', fn: () => onTriggerEffect({ id: '1', type: 'clip-laser', timestamp: Date.now(), label: 'לייזר' }) },
                  { id: 'punch', icon: '🥊', name: 'מכה משמאל', fn: () => arielApi.punchHit('left') },
                  { id: 'aura', icon: '🥋', name: 'הילת AR', fn: () => onTriggerEffect({ id: '3', type: 'body-aura', timestamp: Date.now(), label: 'הילת גוף' }) },
                  { id: 'cutout', icon: '✂️', name: 'חיתוך גוף', fn: () => onTriggerEffect({ id: '4', type: 'cutout-mode', timestamp: Date.now(), label: 'חיתוך גוף' }) },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={f.fn}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#120e0a] border border-[#3a2f22] hover:border-[#e6b450] text-center cursor-pointer"
                  >
                    <span className="text-xl mb-1">{f.icon}</span>
                    <span className="text-[10px] font-bold text-[#f3e7d3] truncate w-full">{f.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 6. 🖼 רקע */}
            {activePanel === 'bg' && (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'bg-none', icon: '🎬', name: 'ללא רקע' },
                  { id: 'bg-neon', icon: '🌌', name: 'סייבר ניאון' },
                  { id: 'bg-cyber', icon: '🏙️', name: 'עיר עתידנית' },
                  { id: 'bg-greenscreen', icon: '🟢', name: 'גרין סקרין' },
                  { id: 'bg-matrix', icon: '💻', name: 'מטריקס' },
                ].map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => {
                      onTriggerEffect({
                        id: String(Date.now()),
                        type: bg.id as EffectType,
                        timestamp: Date.now(),
                        label: bg.name,
                      });
                      showToast(`🖼 ${bg.name}`);
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center cursor-pointer ${
                      activeBackground === bg.id
                        ? 'bg-[#e6b450]/20 border-[#e6b450] text-[#ffd778]'
                        : 'bg-[#120e0a] border-[#3a2f22] text-[#f3e7d3]'
                    }`}
                  >
                    <span className="text-xl mb-1">{bg.icon}</span>
                    <span className="text-[10px] font-bold truncate w-full">{bg.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 7. ✨ AI חי */}
            {activePanel === 'ai' && (
              <div className="flex flex-col gap-2.5">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="תאר אפקט או סרטון ליצירה חיה בשרת…"
                  aria-label="תיאור אפקט ליצירת AI"
                  className="w-full h-20 p-2.5 rounded-xl bg-[#0f0c09] border border-[#3a2f22] text-[#f3e7d3] text-xs resize-none focus:outline-none focus:border-[#e6b450]"
                />

                <div className="flex gap-2">
                  {[
                    { id: 'front', label: '🎬 Front' },
                    { id: 'bg', label: '🖼 רקע' },
                    { id: 'overlay', label: '🥊 אפקט' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAiMode(m.id as any)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        aiMode === m.id
                          ? 'bg-[#e6b450] text-[#1a1208]'
                          : 'bg-[#120e0a] text-[#f3e7d3] border border-[#3a2f22]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAi}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#e6b450] via-[#ffd778] to-[#b8841f] text-[#1a1208] font-black text-xs disabled:opacity-50 cursor-pointer"
                  >
                    ✨ צור וידאו בשרת
                  </button>

                  <button
                    type="button"
                    onClick={() => fireEffect('scene', 'baby', '🦁 סצנת אריה')}
                    className="px-4 py-2.5 rounded-xl bg-[#d9a441] text-[#1a1208] font-black text-xs cursor-pointer"
                  >
                    🦁 אריה
                  </button>
                </div>

                <div className="text-center text-[10px] text-[#a8957a] font-mono">
                  מנוע שרת: {aiEngineName}
                </div>
              </div>
            )}

            {/* 8. 🦁 אריה (Chino Live Studio Source & Performer Actions) */}
            {activePanel === 'lion' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#a8957a] leading-relaxed">
                  החלף את השידור לבמה התלת-ממדית של אריאל האריה שמדבר, רוקד ועונה לצ׳אט החי.
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    const next = cloudSource === 'lion' ? 'camera' : 'lion';
                    const res = await arielApi.setCloudSource(next);
                    if (res?.error) {
                      showToast(`❌ ${res.error}`);
                    } else {
                      setCloudSource(next);
                      showToast(next === 'lion' ? '🦁 אריאל בשידור חי!' : '📷 חזרה למצלמה שלך');
                    }
                  }}
                  className={`w-full py-3 rounded-xl font-black text-sm cursor-pointer ${
                    cloudSource === 'lion'
                      ? 'bg-[#c0392b] text-white'
                      : 'bg-gradient-to-r from-[#e6b450] via-[#ffd778] to-[#b8841f] text-[#1a1208]'
                  }`}
                >
                  {cloudSource === 'lion' ? '🔙 חזור למצלמה שלך' : '🦁 הפעל את אריאל בלייב'}
                </button>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { action: 'dance', label: '💃 רקוד' },
                    { action: 'song', label: '🎵 שיר' },
                    { action: 'roar', label: '🗣 שאג' },
                  ].map((act) => (
                    <button
                      key={act.action}
                      type="button"
                      onClick={async () => {
                        showToast(`🦁 ${act.label}`);
                        await arielApi.triggerChinoAction(act.action);
                      }}
                      className="py-2.5 rounded-xl bg-[#120e0a] hover:bg-[#1f180f] border border-[#3a2f22] hover:border-[#e6b450] text-xs font-extrabold text-[#f3e7d3] cursor-pointer"
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
