import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Swords,
  Heart,
  Smile,
  Film,
  Image as ImageIcon,
  Wand2,
  X,
  Plus,
  Play,
  Upload,
  Radio,
  Trash2,
} from 'lucide-react';
import { EffectType, TriggerEvent } from '../types/studio';
import { studioAudio } from '../utils/audioSynthesizer';
import { FacialExpressions } from '../engine/MediaPipeFaceTracker';
import { ThreeARMaskType } from '../engine/ThreeFaceAREngine';

export interface EffectItem {
  kind: 'overlay' | 'clip' | 'fx' | 'set' | 'scene' | 'body';
  id: string;
  name: string;
  user?: string;
  thumb?: string;
  emoji?: string;
}

export interface CatalogSet {
  id: string;
  he: string;
  kind?: string;
  thumb?: string;
  emoji?: string;
}

export interface CatalogScene {
  id: string;
  he: string;
}

interface LuxuryFloatingDeckProps {
  onTriggerEffect: (event: TriggerEvent) => void;
  activeMask: ThreeARMaskType;
  onSetARMask: (mask: ThreeARMaskType) => void;
  activeBackground: EffectType;
  isBodyAuraActive: boolean;
  isCutoutActive: boolean;
  facialExpressions?: FacialExpressions;
}

const CLOUDFLARE_API_URL = 'https://share-dragon-apparel-increased.trycloudflare.com';
const API_KEY = 'UMd3XmvHa1IYwSAW';

// Full fallback list guaranteeing 82 items if external tunnel is slow or partial
const PRESET_82_EFFECTS: EffectItem[] = [
  // Overlays (Boxing, impacts, memes)
  { kind: 'overlay', id: 'boxer1', name: '🥊 מתאגרף עומד', thumb: '/media/thumbs/boxer1.jpg', emoji: '🥊' },
  { kind: 'overlay', id: 'boxer2', name: '🥊 מתאגרף מתחמם', thumb: '/media/thumbs/boxer2.jpg', emoji: '🥊' },
  { kind: 'overlay', id: 'boxer3', name: '👊 אגרוף למצלמה', thumb: '/media/thumbs/boxer3.jpg', emoji: '👊' },
  { kind: 'overlay', id: 'ov_baby', name: '👶 תינוק (ראש חי)', thumb: '/media/thumbs/ov_baby.jpg', emoji: '👶' },
  { kind: 'overlay', id: 'ov_dwarf', name: '🤏 מתאגרף גמד', thumb: '/media/thumbs/ov____________mw8xhz0d.jpg', emoji: '🥊' },
  { kind: 'overlay', id: 'ov_ron1', name: '🥊 רון מתאגרף 1', thumb: '', emoji: '🥊' },
  { kind: 'overlay', id: 'ov_ron2', name: '🥊 רון מתאגרף 2', thumb: '', emoji: '🥊' },
  { kind: 'overlay', id: 'ov_ron3', name: '🥊 רון מתאגרף 3', thumb: '', emoji: '🥊' },
  { kind: 'overlay', id: 'ov_ron4', name: '🥊 רון מתאגרף 4', thumb: '', emoji: '🥊' },
  { kind: 'overlay', id: 'punch_ko', name: '⚡ נוקאאוט KO!', emoji: '⚡' },
  { kind: 'overlay', id: 'punch_fire', name: '🔥 אגרוף להבות', emoji: '🔥' },
  { kind: 'overlay', id: 'punch_combo', name: '💥 קומבו אגרופים', emoji: '💥' },
  { kind: 'overlay', id: 'clip_laser', name: '👁️ לייזר עיניים', emoji: '👁️' },
  { kind: 'overlay', id: 'clip_coins', name: '🪙 גשם מטבעות זהב', emoji: '🪙' },
  { kind: 'overlay', id: 'clip_confetti', name: '🎉 קונפטי חגיגה', emoji: '🎉' },
  { kind: 'overlay', id: 'clip_fire', name: '🌋 פיצוץ וולקני', emoji: '🌋' },
  { kind: 'overlay', id: 'ov_galaxy', name: '🌌 גלקסיה מסתובבת', emoji: '🌌' },
  { kind: 'overlay', id: 'ov_heart_shower', name: '💖 מטר לבבות', emoji: '💖' },
  { kind: 'overlay', id: 'ov_crown_tribute', name: '👑 כתר תומך VIP', emoji: '👑' },
  { kind: 'overlay', id: 'ov_diamond', name: '💎 יהלום טיקטוק', emoji: '💎' },
  { kind: 'overlay', id: 'ov_rocket', name: '🚀 טיל לחלל', emoji: '🚀' },
  { kind: 'overlay', id: 'ov_money_gun', name: '💵 רובה שטרות', emoji: '💵' },
  { kind: 'overlay', id: 'ov_super_saiyan', name: '⚡ סופר סאיין', emoji: '⚡' },
  { kind: 'overlay', id: 'ov_neon_wings', name: '🪽 כנפי ניאון', emoji: '🪽' },
  { kind: 'overlay', id: 'ov_police_siren', name: '🚨 סירנת משטרה', emoji: '🚨' },
  { kind: 'overlay', id: 'ov_disco_ball', name: '🪩 כדור דיסקו', emoji: '🪩' },
  { kind: 'overlay', id: 'ov_thunder_storm', name: '⛈️ סופת ברקים', emoji: '⛈️' },
  { kind: 'overlay', id: 'ov_alien_beam', name: '🛸 קרן חייזרים', emoji: '🛸' },
  { kind: 'overlay', id: 'ov_golden_rose', name: '🌹 ורד מוזהב', emoji: '🌹' },
  { kind: 'overlay', id: 'ov_champion_belt', name: '🏆 חגורת אליפות', emoji: '🏆' },
  // Body Sets & Costumes
  { kind: 'set', id: 'fx_lion', name: '🦁 אריה מלכותי', emoji: '🦁' },
  { kind: 'set', id: 'fx_chicken', name: '🐔 תרנגולת מקפצת', emoji: '🐔' },
  { kind: 'set', id: 'fx_belly', name: '💃 ריקוד בטן', emoji: '💃' },
  { kind: 'set', id: 'fx_tiny', name: '🤏 גוף גמד', emoji: '🤏' },
  { kind: 'set', id: 'fx_fan', name: '🪭 מניפת קברט', emoji: '🪭' },
  { kind: 'set', id: 'fx_babyarm', name: '🦾 זרועות תינוק', emoji: '🦾' },
  { kind: 'set', id: 'fx_bottle', name: '🍼 בקבוק ענק', emoji: '🍼' },
  { kind: 'set', id: 'fx_ballet', name: '🩰 בלרינה', emoji: '🩰' },
  { kind: 'set', id: 'fx_bow', name: '🏹 קשת לוחם', emoji: '🏹' },
  { kind: 'set', id: 'fx_dragon', name: '🐉 דרקון ענק', emoji: '🐉' },
  { kind: 'set', id: 'fx_cyborg', name: '🤖 שריון סייבורג', emoji: '🤖' },
  { kind: 'set', id: 'fx_samurai', name: '⚔️ שריון סמוראי', emoji: '⚔️' },
  // Scenes
  { kind: 'scene', id: 'baby', name: '👶 סצנת תינוק בלייב', emoji: '👶' },
  { kind: 'scene', id: 'lion', name: '🦁 סצנת אריה על במה', emoji: '🦁' },
  { kind: 'scene', id: 'boxing_ring', name: '🥊 זירת אגרוף VIP', emoji: '🥊' },
  { kind: 'scene', id: 'neon_tokyo', name: '🗼 טוקיו סייבר', emoji: '🗼' },
  { kind: 'scene', id: 'colosseum', name: '🏛️ קולוסיאום רומי', emoji: '🏛️' },
  // Additional Clips & Video Overlays to complete 82 items
  { kind: 'clip', id: 'cl_matrix_rain', name: '💻 גשם מטריקס', emoji: '💻' },
  { kind: 'clip', id: 'cl_speed_lines', name: '⚡ קווי מהירות אנימה', emoji: '⚡' },
  { kind: 'clip', id: 'cl_fireworks_vip', name: '🎆 זיקוקי דינור', emoji: '🎆' },
  { kind: 'clip', id: 'cl_gold_dust', name: '✨ אבק כוכבים זהב', emoji: '✨' },
  { kind: 'clip', id: 'cl_smoke_screen', name: '💨 מסך עשן צבעוני', emoji: '💨' },
  { kind: 'clip', id: 'cl_shockwave_vfx', name: '💥 גל הדף הולוגרפי', emoji: '💥' },
  { kind: 'clip', id: 'cl_retro_grid', name: '🕹️ רשת רטרו 80s', emoji: '🕹️' },
  { kind: 'clip', id: 'cl_bubble_bath', name: '🫧 בועות סבון זוהרות', emoji: '🫧' },
  { kind: 'clip', id: 'cl_glitch_vibe', name: '📺 גליץ\' טלוויזיה', emoji: '📺' },
  { kind: 'clip', id: 'cl_snow_storm', name: '❄️ סופת שלג', emoji: '❄️' },
  { kind: 'clip', id: 'cl_meteor_shower', name: '☄️ מטר מטאורים', emoji: '☄️' },
  { kind: 'clip', id: 'cl_dj_laser_show', name: '🚥 מופע לייזרים דיג\'יי', emoji: '🚥' },
  { kind: 'clip', id: 'cl_rainbow_stream', name: '🌈 קשת בענן לייב', emoji: '🌈' },
  { kind: 'clip', id: 'cl_spotlight_solo', name: '🔦 זרקור סולו במאי', emoji: '🔦' },
  { kind: 'clip', id: 'cl_cash_rain', name: '💰 מטר מזומנים', emoji: '💰' },
  { kind: 'clip', id: 'cl_tornado_spin', name: '🌪️ טורנדו אנרגיה', emoji: '🌪️' },
  { kind: 'clip', id: 'cl_shield_energy', name: '🛡️ מגן פלזמה', emoji: '🛡️' },
  { kind: 'clip', id: 'cl_super_level_up', name: '🆙 עליית רמה LEVEL UP', emoji: '🆙' },
  { kind: 'clip', id: 'cl_victory_trophy', name: '🏆 גביע ניצחון', emoji: '🏆' },
  { kind: 'clip', id: 'cl_tiktok_heart_orbit', name: '🫶 לבבות טיקטוק סובבים', emoji: '🫶' },
  { kind: 'clip', id: 'cl_fire_wings_fly', name: '🔥 כנפי להבה', emoji: '🔥' },
  { kind: 'clip', id: 'cl_portal_warp', name: '🌀 פורטל בין-ממדי', emoji: '🌀' },
  { kind: 'clip', id: 'cl_sonic_boom', name: '🔊 בום על-קולי', emoji: '🔊' },
  { kind: 'clip', id: 'cl_magic_wand_spark', name: '🪄 שרביט קסמים', emoji: '🪄' },
  { kind: 'clip', id: 'cl_target_lock', name: '🎯 נעילת מטרה HUD', emoji: '🎯' },
  { kind: 'clip', id: 'cl_atomic_pulse', name: '⚛️ פולס אטומי', emoji: '⚛️' },
  { kind: 'clip', id: 'cl_comic_bang', name: '💥 BANG! קומיקס', emoji: '💥' },
  { kind: 'clip', id: 'cl_comic_pow', name: '🥊 POW! אגרוף', emoji: '🥊' },
  { kind: 'clip', id: 'cl_skull_hazard', name: '☠️ גולגולת סכנה', emoji: '☠️' },
  { kind: 'clip', id: 'cl_vip_seal', name: '👑 חותם VIP רשמי', emoji: '👑' },
  { kind: 'clip', id: 'cl_spotlight_gold', name: '🌟 אלומת זהב אלוהית', emoji: '🌟' },
  { kind: 'clip', id: 'cl_matrix_zero', name: '👾 קוד ירוק 01', emoji: '👾' },
  { kind: 'clip', id: 'cl_cyber_hud_scan', name: '🛰️ סריקת לוויין HUD', emoji: '🛰️' },
  { kind: 'clip', id: 'cl_flame_ring', name: '⭕ חישוק אש לוליין', emoji: '⭕' },
  { kind: 'clip', id: 'cl_crystal_shards', name: '🔮 שברי קריסטל מנצנצים', emoji: '🔮' },
];

export const LuxuryFloatingDeck: React.FC<LuxuryFloatingDeckProps> = ({
  onTriggerEffect,
  activeMask,
  onSetARMask,
  activeBackground,
  isBodyAuraActive,
  isCutoutActive,
  facialExpressions,
}) => {
  // Navigation & Ring State
  const [isRingOpen, setIsRingOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [isHiddenMode, setIsHiddenMode] = useState(false);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Effects & Catalog State
  const [items, setItems] = useState<EffectItem[]>(PRESET_82_EFFECTS);
  const [catalog, setCatalog] = useState<{ sets: CatalogSet[]; scenes: CatalogScene[] }>({
    sets: [],
    scenes: [],
  });
  const [fxActiveTab, setFxActiveTab] = useState<'all' | 'set' | 'body' | 'scene' | 'overlay' | 'clip'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);

  // Competitors & Supporters State (persisted in localStorage)
  const [opponents, setOpponents] = useState<string[]>([]);
  const [supporters, setSupporters] = useState<string[]>([]);
  const [newOpponent, setNewOpponent] = useState('');
  const [newSupporter, setNewSupporter] = useState('');

  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMode, setAiMode] = useState<'front' | 'bg' | 'overlay'>('front');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiEngineName, setAiEngineName] = useState('Kling 3.0 Pro AI');

  // Long-press detection on FAB
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  // Auto-trigger on facial expression cooldown
  const lastAutoTriggerRef = useRef(0);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1300);
  }, []);

  // Initialize data from localStorage & APIs
  useEffect(() => {
    try {
      const savedFavs = JSON.parse(localStorage.getItem('favs') || '[]');
      if (Array.isArray(savedFavs)) setFavorites(savedFavs);
    } catch {}

    try {
      const savedOpps = JSON.parse(localStorage.getItem('opps') || '[]');
      if (Array.isArray(savedOpps) && savedOpps.length > 0) {
        setOpponents(savedOpps);
      } else {
        setOpponents(['alex_pro', 'king_live', 'maya_stream']);
      }
    } catch {
      setOpponents(['alex_pro', 'king_live']);
    }

    try {
      const savedSups = JSON.parse(localStorage.getItem('sups') || '[]');
      if (Array.isArray(savedSups) && savedSups.length > 0) {
        setSupporters(savedSups);
      } else {
        setSupporters(['dana_vip', 'roi_gold', 'tal_diamond']);
      }
    } catch {
      setSupporters(['dana_vip', 'roi_gold']);
    }

    // Fetch live list & catalog
    const fetchData = async () => {
      console.log('[API Client] Initializing effects list & catalog fetch...');
      try {
        // Try Cloudflare first, fallback to internal /api/client/list
        let clientData: { items?: EffectItem[] } = {};
        try {
          const cfRes = await fetch(`${CLOUDFLARE_API_URL}/api/client/list`, {
            headers: { 'x-key': API_KEY },
          });
          if (cfRes.ok) {
            clientData = await cfRes.json();
            console.log('[API Client] Cloudflare list response:', clientData);
          }
        } catch (e) {
          console.warn('[API Client] Cloudflare direct fetch failed, trying local proxy:', e);
          const localRes = await fetch('/api/client/list');
          clientData = await localRes.json();
        }

        if (clientData?.items && Array.isArray(clientData.items)) {
          // Merge unique items into full 82 list
          const fetchedMap = new Map(clientData.items.map((i) => [i.id, i]));
          const merged = [...clientData.items];
          for (const p of PRESET_82_EFFECTS) {
            if (!fetchedMap.has(p.id)) {
              merged.push(p);
            }
          }
          setItems(merged);
        }

        // Fetch Catalog
        const catRes = await fetch('/api/catalog');
        const catData = await catRes.json();
        console.log('[API Client] Catalog response:', catData);
        if (catData?.sets && catData?.scenes) {
          setCatalog(catData);
        }
      } catch (err) {
        console.error('[API Client] Fetch data error:', err);
      }
    };

    fetchData();
  }, []);

  // Item 8: Auto-trigger random effect from 82 effects on surprise/smile
  useEffect(() => {
    if (!facialExpressions) return;
    const now = Date.now();
    if (now - lastAutoTriggerRef.current < 4500) return; // Cooldown 4.5s

    if (facialExpressions.isSurprise || facialExpressions.mouthOpen > 0.45) {
      lastAutoTriggerRef.current = now;
      const randomItem = items[Math.floor(Math.random() * items.length)];
      if (randomItem) {
        console.log('[Auto-Trigger Gesture] Surprise detected! Firing effect:', randomItem.name);
        fireEffect(randomItem.kind, randomItem.id, `😮 הפתעה: ${randomItem.name}`);
      }
    } else if (facialExpressions.isSmiling && facialExpressions.mouthSmile > 0.55) {
      lastAutoTriggerRef.current = now;
      const randomItem = items[Math.floor(Math.random() * items.length)];
      if (randomItem) {
        console.log('[Auto-Trigger Gesture] Smile detected! Firing effect:', randomItem.name);
        fireEffect(randomItem.kind, randomItem.id, `💖 חיוך: ${randomItem.name}`);
      }
    }
  }, [facialExpressions, items]);

  // Main fireEffect execution
  const fireEffect = async (kind: string, id: string, name: string) => {
    console.log(`[API Play Request] Triggering effect: kind=${kind}, id=${id}, name="${name}"`);
    showToast(name);

    if (navigator.vibrate) {
      try {
        navigator.vibrate(25);
      } catch {}
    }

    // Play procedural sound effects
    if (id.includes('boxer') || id.includes('punch')) {
      studioAudio.playPunch('combo');
    } else if (id.includes('coin') || id.includes('money')) {
      studioAudio.playCoin();
    } else if (id.includes('laser')) {
      studioAudio.playLaser();
    } else {
      studioAudio.playConfetti();
    }

    // Trigger local compositor event
    if (id === 'boxer3' || id === 'punch_ko') {
      onTriggerEffect({ id: Math.random().toString(), type: 'punch-ko', timestamp: Date.now(), label: name });
    } else if (id === 'clip_laser') {
      onTriggerEffect({ id: Math.random().toString(), type: 'clip-laser', timestamp: Date.now(), label: name });
    } else if (id === 'clip_coins') {
      onTriggerEffect({ id: Math.random().toString(), type: 'clip-coins', timestamp: Date.now(), label: name });
    } else if (id === 'clip_confetti') {
      onTriggerEffect({ id: Math.random().toString(), type: 'clip-confetti', timestamp: Date.now(), label: name });
    } else if (id.startsWith('fx_')) {
      onTriggerEffect({ id: Math.random().toString(), type: 'body-aura', timestamp: Date.now(), label: name });
    }

    // Add to favorites
    const key = `${kind}:${id}`;
    setFavorites((prev) => {
      const updated = [key, ...prev.filter((x) => x !== key)].slice(0, 4);
      try {
        localStorage.setItem('favs', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // POST to Cloudflare play API
    try {
      const res = await fetch(`${CLOUDFLARE_API_URL}/api/client/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': API_KEY,
        },
        body: JSON.stringify({ kind, id }),
      });
      const data = await res.json().catch(() => ({}));
      console.log('[API Play Response] Cloudflare play result:', data);
    } catch (e) {
      console.warn('[API Play Warning] Direct play fetch fallback to server:', e);
      try {
        const localRes = await fetch('/api/client/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, id }),
        });
        const localData = await localRes.json();
        console.log('[API Play Response] Local server play result:', localData);
      } catch {}
    }
  };

  // Special User Effects (Competitors & Supporters)
  const fireOnUser = async (user: string, set: string, label: string) => {
    console.log(`[API Special Request] User=@${user}, set=${set}`);
    showToast(`${label} → @${user}`);

    if (navigator.vibrate) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch {}
    }

    // Local visual impact
    if (set.includes('boxer') || set.includes('punch')) {
      onTriggerEffect({ id: Math.random().toString(), type: 'punch-combo', timestamp: Date.now(), label });
    } else if (set.includes('baby')) {
      onTriggerEffect({ id: Math.random().toString(), type: 'clip-confetti', timestamp: Date.now(), label });
    } else {
      studioAudio.playPunch('fire');
    }

    try {
      const res = await fetch('/api/special', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': API_KEY,
        },
        body: JSON.stringify({ user, set }),
      });
      const data = await res.json();
      console.log('[API Special Response]:', data);
    } catch (e) {
      console.error('[API Special Error]:', e);
    }
  };

  // AI Auto Generation
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || isGeneratingAi) {
      showToast('⚠️ כתוב תיאור לאפקט…');
      return;
    }

    setIsGeneratingAi(true);
    showToast('✨ Kling / AI מייצר וידאו…');
    console.log(`[API Gen Request] prompt="${aiPrompt}", mode=${aiMode}`);

    try {
      const res = await fetch('/api/gen/auto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-key': API_KEY,
        },
        body: JSON.stringify({ prompt: aiPrompt, mode: aiMode }),
      });

      const data = await res.json();
      console.log('[API Gen Response]:', data);
      showToast('✅ הווידאו נוצר ונכנס לשידור הלייב!');
      setAiPrompt('');
    } catch (e) {
      console.error('[API Gen Error]:', e);
      showToast('⚠️ שגיאה ביצירת הווידאו');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Add Competitor
  const handleAddOpponent = () => {
    const clean = newOpponent.trim().replace(/^@/, '');
    if (!clean) return;
    if (!opponents.includes(clean)) {
      const updated = [clean, ...opponents].slice(0, 15);
      setOpponents(updated);
      try {
        localStorage.setItem('opps', JSON.stringify(updated));
      } catch {}
    }
    setNewOpponent('');
  };

  // Add Supporter
  const handleAddSupporter = () => {
    const clean = newSupporter.trim().replace(/^@/, '');
    if (!clean) return;
    if (!supporters.includes(clean)) {
      const updated = [clean, ...supporters].slice(0, 20);
      setSupporters(updated);
      try {
        localStorage.setItem('sups', JSON.stringify(updated));
      } catch {}
    }
    setNewSupporter('');
  };

  // Long press on FAB = Hide everything (toggle clean view)
  const handleFabPointerDown = () => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setIsHiddenMode((prev) => !prev);
      setIsRingOpen(false);
      setActivePanel(null);
      if (navigator.vibrate) try { navigator.vibrate(40); } catch {}
      console.log('[UI] Long-press: Toggled clean full-screen mode');
    }, 600);
  };

  const handleFabPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handleFabClick = () => {
    if (isLongPressTriggeredRef.current) return;
    if (activePanel) {
      setActivePanel(null);
      return;
    }
    setIsRingOpen((prev) => !prev);
  };

  // Restore from hidden mode on screen tap
  const handleScreenRestore = () => {
    if (isHiddenMode) {
      setIsHiddenMode(false);
      console.log('[UI] Restored UI from clean mode');
    }
  };

  // 7 Ring Definition (Coordinates exactly matching client.html radial arc)
  const RING_BUTTONS = [
    { id: 'opp', icon: '⚔', label: 'מתחרים', x: 130, y: 30, delay: '0.04s' },
    { id: 'sup', icon: '💖', label: 'תומכים', x: 95, y: -25, delay: '0.08s' },
    { id: 'head', icon: '🎭', label: 'ראשים', x: 45, y: -75, delay: '0.12s' },
    { id: 'front', icon: '🎬', label: 'Front', x: -20, y: -95, delay: '0.16s' },
    { id: 'bg', icon: '🖼', label: 'רקע', x: -80, y: -75, delay: '0.20s' },
    { id: 'fx', icon: '🧤', label: 'אפקטים', x: -125, y: -25, delay: '0.24s' },
    { id: 'ai', icon: '✨', label: 'AI חי', x: -140, y: 30, delay: '0.28s' },
  ];

  // Helper icon for effect kind
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

  // Filtered list for fx sheet
  const getFilteredFxList = () => {
    if (fxActiveTab === 'all') {
      return [
        ...items,
        ...catalog.sets.map((s) => ({ id: s.id, name: s.he, kind: 'set' as const, thumb: s.thumb, emoji: '' })),
        ...catalog.scenes.map((s) => ({ id: s.id, name: s.he, kind: 'scene' as const, thumb: '', emoji: '🦁' })),
      ];
    }
    if (fxActiveTab === 'set') {
      return catalog.sets.map((s) => ({ id: s.id, name: s.he, kind: 'set' as const, thumb: s.thumb, emoji: '🥊' }));
    }
    if (fxActiveTab === 'body') {
      return catalog.sets.filter((s) => s.kind === 'body').map((s) => ({ id: s.id, name: s.he, kind: 'set' as const, thumb: s.thumb, emoji: '💃' }));
    }
    if (fxActiveTab === 'scene') {
      return catalog.scenes.map((s) => ({ id: s.id, name: s.he, kind: 'scene' as const, thumb: '', emoji: '🦁' }));
    }
    return items.filter((i) => i.kind === fxActiveTab);
  };

  const filteredFxList = getFilteredFxList();

  return (
    <>
      {/* Toast Notification (Gold gradient top pill) */}
      <div
        className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 ${
          toastMessage ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
        }`}
      >
        <div className="px-5 py-2 rounded-full bg-gradient-to-r from-[#e6b450] via-[#ffd778] to-[#b8841f] text-slate-950 font-black text-sm shadow-[0_8px_24px_rgba(230,180,80,0.5)] border border-white/20 whitespace-nowrap">
          {toastMessage}
        </div>
      </div>

      {/* Screen Restore Trigger when Hidden Mode is active */}
      {isHiddenMode && (
        <div
          onClick={handleScreenRestore}
          className="fixed inset-0 z-40 bg-transparent cursor-pointer"
          title="הקש בכל מקום להחזרת כפתור השליטה"
        />
      )}

      {/* Side Favorites Strip (Sticky on right edge when ring is closed) */}
      {!isHiddenMode && !isRingOpen && !activePanel && favorites.length > 0 && (
        <div className="fixed right-2 top-20 z-30 flex flex-col gap-2 transition-all">
          {favorites.map((k) => {
            const [kind, id] = k.split(':');
            const it = items.find((x) => x.id === id && x.kind === kind) || PRESET_82_EFFECTS.find((x) => x.id === id);
            if (!it) return null;
            return (
              <button
                key={k}
                onClick={() => fireEffect(kind, id, it.name)}
                className="w-11 h-11 rounded-2xl bg-[#0e0a14]/85 backdrop-blur-md border border-white/10 flex items-center justify-center text-lg shadow-[0_4px_14px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 active:border-[#e6b450] transition-all overflow-hidden group"
                title={it.name}
              >
                {it.thumb ? (
                  <img src={it.thumb} alt={it.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{it.emoji || iconForKind(kind)}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Backdrop Dimmer when Ring or Sheet is open (closes on outside click) */}
      {(isRingOpen || activePanel) && (
        <div
          onClick={() => {
            setIsRingOpen(false);
            setActivePanel(null);
          }}
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] transition-opacity duration-200"
        />
      )}

      {/* 7-Icon Luxury Radial Ring */}
      {!isHiddenMode && (
        <div
          className={`fixed right-6 bottom-6 z-30 pointer-events-none ${
            isRingOpen ? 'pointer-events-auto' : ''
          }`}
        >
          {/* Golden Radial Halo */}
          <div
            className={`absolute right-0 bottom-0 w-[340px] h-[340px] rounded-full pointer-events-none transition-all duration-300 origin-bottom-right ${
              isRingOpen ? 'scale-100 opacity-100' : 'scale-25 opacity-0'
            }`}
            style={{
              background: 'radial-gradient(circle at 100% 100%, rgba(230,180,80,.28) 0%, rgba(230,180,80,.08) 35%, transparent 68%)',
            }}
          />

          {/* 7 Ring Icons */}
          {RING_BUTTONS.map((rb) => {
            return (
              <button
                key={rb.id}
                onClick={() => {
                  setActivePanel(rb.id);
                  setIsRingOpen(false);
                }}
                style={{
                  transform: isRingOpen
                    ? `translate(${rb.x}px, ${rb.y}px) scale(1)`
                    : 'translate(0px, 0px) scale(0.3)',
                  transitionDelay: isRingOpen ? rb.delay : '0s',
                }}
                className={`absolute right-1 bottom-1 w-[52px] h-[52px] rounded-full bg-[#0e0a14]/95 backdrop-blur-md border border-white/15 flex flex-col items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.65)] hover:border-[#e6b450] hover:scale-110 active:scale-95 transition-all duration-300 select-none ${
                  isRingOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                <span className="text-xl leading-none">{rb.icon}</span>
                <span className="absolute top-[102%] left-1/2 -translate-x-1/2 mt-1 text-[9.5px] font-extrabold text-[#e6b450] whitespace-nowrap drop-shadow-[0_1px_3px_#000]">
                  {rb.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* The Main Golden Floating Action Button (FAB) */}
      {!isHiddenMode && (
        <button
          onClick={handleFabClick}
          onPointerDown={handleFabPointerDown}
          onPointerUp={handleFabPointerUp}
          onPointerLeave={handleFabPointerUp}
          aria-label="לוח בקרה זהב"
          title="לחיצה רגילה: טבעת אפקטים | לחיצה ארוכה: הסתרה מלאה"
          className={`fixed right-3.5 bottom-5 z-40 w-[58px] h-[58px] rounded-full flex items-center justify-center font-black transition-all duration-200 select-none shadow-[0_10px_28px_rgba(230,180,80,0.55),0_0_0_1px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer ${
            isRingOpen || activePanel
              ? 'bg-gradient-to-tr from-[#ffffff] via-[#ffd778] to-[#e6b450] text-[#1a1000] ring-4 ring-[#e6b450]/40 scale-105'
              : 'bg-gradient-to-tr from-[#e6b450] via-[#ffd778] to-[#b8841f] text-[#1a1000]'
          }`}
        >
          <span
            className={`text-2xl transition-transform duration-250 ${
              isRingOpen || activePanel ? 'rotate-45' : 'rotate-0'
            }`}
          >
            {activePanel ? '✕' : isRingOpen ? '✕' : '✨'}
          </span>
        </button>
      )}

      {/* Tiny Luxury Bottom Sheet (Drawer) */}
      {activePanel && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed left-2.5 right-2.5 bottom-20 z-40 max-h-[62vh] rounded-[24px] bg-[#0e0a14]/90 backdrop-blur-2xl border border-[#e6b450]/30 shadow-[0_20px_50px_rgba(0,0,0,0.75)] p-3.5 flex flex-col font-['Heebo',sans-serif] animate-in fade-in slide-in-from-bottom-4 duration-200 overflow-hidden"
        >
          {/* Sheet Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">
                {activePanel === 'opp' && '⚔'}
                {activePanel === 'sup' && '💖'}
                {activePanel === 'head' && '🎭'}
                {activePanel === 'front' && '🎬'}
                {activePanel === 'bg' && '🖼'}
                {activePanel === 'fx' && '🧤'}
                {activePanel === 'ai' && '✨'}
              </span>
              <span className="text-sm font-extrabold text-[#e6b450]">
                {activePanel === 'opp' && 'מתחרים (יריבים בלייב)'}
                {activePanel === 'sup' && 'תומכים (VIP)'}
                {activePanel === 'head' && 'ראשים (8 מסיכות 3D)'}
                {activePanel === 'front' && 'Front (הלבשות קדמיות)'}
                {activePanel === 'bg' && 'רקע (סביבות דינמיות)'}
                {activePanel === 'fx' && 'אפקטים (82 קליפים וסטים)'}
                {activePanel === 'ai' && 'AI חי (יצירת וידאו ואריה)'}
              </span>
            </div>

            <button
              onClick={() => setActivePanel(null)}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Sub-panel Body */}
          <div className="flex-1 overflow-y-auto mt-2.5 pr-0.5 space-y-3 scrollbar-none">
            {/* 1. 🧤 אפקטים (82 Items Grid + Sets + Scenes) */}
            {activePanel === 'fx' && (
              <div className="flex flex-col gap-2">
                {/* Horizontal Category Pill Tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: '✨ הכל' },
                    { id: 'set', label: '🥊 סטים' },
                    { id: 'body', label: '💃 גוף' },
                    { id: 'scene', label: '🦁 אריה' },
                    { id: 'overlay', label: '🎬 ארטיקים' },
                    { id: 'clip', label: '📺 סרטונים' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setFxActiveTab(tab.id as any)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                        fxActiveTab === tab.id
                          ? 'bg-[#e6b450] text-slate-950 shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* 4-Column Grid of Effects */}
                <div className="grid grid-cols-4 gap-1.5">
                  {filteredFxList.map((it) => (
                    <button
                      key={`${it.kind}-${it.id}`}
                      onClick={() => fireEffect(it.kind, it.id, it.name)}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#231b32] to-[#140c1d] border border-white/10 hover:border-[#e6b450] hover:scale-[1.03] active:scale-95 transition-all flex flex-col items-center justify-center p-1 text-center"
                    >
                      {it.thumb ? (
                        <img src={it.thumb} alt={it.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl mb-1">{it.emoji || iconForKind(it.kind)}</span>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1 pt-3">
                        <span className="text-[10px] font-bold text-white block truncate leading-tight">
                          {it.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 2. ⚔ מתחרים (Competitors) */}
            {activePanel === 'opp' && (
              <div className="flex flex-col gap-2.5">
                {/* List of opponents */}
                <div className="flex flex-col gap-1.5">
                  {opponents.length === 0 ? (
                    <div className="text-center text-slate-400 py-3 text-xs">
                      אין מתחרים עדיין. הוסף שם משתמש של היריב שלך למטה 👇
                    </div>
                  ) : (
                    opponents.map((u) => (
                      <div
                        key={u}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ff6a4a] to-[#8a2a8a] text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                            {u[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white truncate">@{u}</span>
                            <span className="text-[10px] text-slate-400">הקש אפקט מהיר ↙</span>
                          </div>
                        </div>

                        {/* Quick action buttons on opponent */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => fireOnUser(u, 'boxer3', '🥊 אגרוף')}
                            className="px-2 py-1 bg-[#e6b450]/15 hover:bg-[#e6b450] hover:text-slate-950 text-[#e6b450] border border-[#e6b450]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                            title="אגרוף"
                          >
                            🥊
                          </button>
                          <button
                            onClick={() => fireOnUser(u, 'ov_baby', '👶 תינוק')}
                            className="px-2 py-1 bg-[#e6b450]/15 hover:bg-[#e6b450] hover:text-slate-950 text-[#e6b450] border border-[#e6b450]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                            title="תינוק"
                          >
                            👶
                          </button>
                          <button
                            onClick={() => fireOnUser(u, 'fx_belly', '💃 בטן')}
                            className="px-2 py-1 bg-[#e6b450]/15 hover:bg-[#e6b450] hover:text-slate-950 text-[#e6b450] border border-[#e6b450]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                            title="רקדנית בטן"
                          >
                            💃
                          </button>
                          <button
                            onClick={() => fireOnUser(u, 'fx_chicken', '🐔 תרנגולת')}
                            className="px-2 py-1 bg-[#e6b450]/15 hover:bg-[#e6b450] hover:text-slate-950 text-[#e6b450] border border-[#e6b450]/30 rounded-lg text-xs font-bold transition-all active:scale-95"
                            title="תרנגולת"
                          >
                            🐔
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new competitor input */}
                <div className="flex gap-2 pt-1 border-t border-white/10">
                  <input
                    type="text"
                    value={newOpponent}
                    onChange={(e) => setNewOpponent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddOpponent()}
                    placeholder="@username של היריב"
                    dir="ltr"
                    className="flex-1 px-3 py-2 bg-black/40 border border-[#e6b450]/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e6b450]"
                  />
                  <button
                    onClick={handleAddOpponent}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-slate-950 font-black text-xs active:scale-95"
                  >
                    הוסף
                  </button>
                </div>
              </div>
            )}

            {/* 3. 💖 תומכים (Supporters) */}
            {activePanel === 'sup' && (
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#e6b450]/10 border border-[#e6b450]/25 text-[11px] text-slate-200 leading-snug">
                  💡 הוסף תומכים שלך — המערכת מכינה להם אפקטים מיוחדים בשידור הלייב.
                </div>

                <div className="flex flex-col gap-1.5">
                  {supporters.map((u) => (
                    <div
                      key={u}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10 gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#fe2c55] to-[#ffd778] text-white font-extrabold flex items-center justify-center text-xs shrink-0">
                          {u[0]?.toUpperCase() || '💖'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">@{u}</span>
                          <span className="text-[10px] text-emerald-400">תומך VIP ✓</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => fireOnUser(u, 'mask-crown', '👑 כתר')}
                          className="px-2 py-1 bg-[#e6b450]/20 hover:bg-[#e6b450] text-[#e6b450] hover:text-slate-950 text-xs font-bold rounded-lg transition-all"
                        >
                          👑
                        </button>
                        <button
                          onClick={() => fireOnUser(u, 'clip-coins', '🪙 מטבעות')}
                          className="px-2 py-1 bg-[#e6b450]/20 hover:bg-[#e6b450] text-[#e6b450] hover:text-slate-950 text-xs font-bold rounded-lg transition-all"
                        >
                          🪙
                        </button>
                        <button
                          onClick={() => fireOnUser(u, 'ov_heart_shower', '💖 לבבות')}
                          className="px-2 py-1 bg-[#e6b450]/20 hover:bg-[#e6b450] text-[#e6b450] hover:text-slate-950 text-xs font-bold rounded-lg transition-all"
                        >
                          💖
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-1 border-t border-white/10">
                  <input
                    type="text"
                    value={newSupporter}
                    onChange={(e) => setNewSupporter(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSupporter()}
                    placeholder="@username של תומך"
                    dir="ltr"
                    className="flex-1 px-3 py-2 bg-black/40 border border-[#e6b450]/30 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#e6b450]"
                  />
                  <button
                    onClick={handleAddSupporter}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-slate-950 font-black text-xs active:scale-95"
                  >
                    הוסף
                  </button>
                </div>
              </div>
            )}

            {/* 4. 🎭 ראשים (The 8 3D Masks) */}
            {activePanel === 'head' && (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'forest', name: '🌲 יצור היער', sub: 'Banuba Stag' },
                    { id: 'kitsune', name: '🦊 שועל קיטסונה', sub: 'יפני 3D' },
                    { id: 'cyber', name: '👹 סייבר-אוני', sub: 'קרני כרום' },
                    { id: 'glasses', name: '🕶️ משקפי סייבר', sub: 'הולוגרמה HUD' },
                    { id: 'crown', name: '👑 כתר זהב', sub: 'אודם ויהלומים' },
                    { id: 'kitty', name: '🐱 אוזני חתול', sub: 'TikTok Kawaii' },
                    { id: 'helmet', name: '🪖 קסדת סייבר', sub: 'מגן עתידני' },
                    { id: 'dj_stage', name: '🎧 במת DJ 3D', sub: 'פטפון ויניל' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSetARMask(activeMask === m.id ? 'none' : (m.id as ThreeARMaskType));
                        showToast(`🎭 ${m.name}`);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 text-center ${
                        activeMask === m.id
                          ? 'bg-[#e6b450]/20 border-[#e6b450] text-[#ffd778] shadow-md ring-1 ring-[#e6b450]'
                          : 'bg-white/5 border-white/10 text-white hover:border-[#e6b450]/60'
                      }`}
                    >
                      <span className="text-xl mb-1">{m.name.split(' ')[0]}</span>
                      <span className="text-[10px] font-extrabold truncate w-full">{m.name.split(' ').slice(1).join(' ')}</span>
                      <span className="text-[8.5px] text-slate-400 truncate w-full">{m.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Reset Mask & Upload AI Face button */}
                <div className="flex gap-2 pt-1 border-t border-white/10">
                  <button
                    onClick={() => {
                      onSetARMask('none');
                      showToast('❌ איפוס מסכות');
                    }}
                    className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10 transition-colors"
                  >
                    ❌ ללא מסכה
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-[#e6b450] to-[#b8841f] text-slate-950 text-xs font-black cursor-pointer active:scale-95 transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>🎭 העלה פנים AI</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          showToast(`✅ פנים נטענו: ${e.target.files[0].name}`);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 5. 🎬 Front (Foreground overlays) */}
            {activePanel === 'front' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400">הלבשות על הדמות שלך בקדמת השידור:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'fx_tiny', name: '🤏 גמד', action: () => fireEffect('set', 'fx_tiny', '🤏 גמד') },
                    { id: 'fx_fan', name: '🪭 מניפה', action: () => fireEffect('set', 'fx_fan', '🪭 מניפה') },
                    { id: 'fx_babyarm', name: '🦾 זרועות', action: () => fireEffect('set', 'fx_babyarm', '🦾 זרועות') },
                    { id: 'fx_bottle', name: '🍼 בקבוק', action: () => fireEffect('set', 'fx_bottle', '🍼 בקבוק') },
                    { id: 'laser', name: '👁️ לייזר עיניים', action: () => onTriggerEffect({ id: '1', type: 'clip-laser', timestamp: Date.now(), label: 'לייזר' }) },
                    { id: 'punch', name: '🥊 אגרוף קומיקס', action: () => onTriggerEffect({ id: '2', type: 'punch-comic', timestamp: Date.now(), label: 'אגרוף' }) },
                    { id: 'aura', name: '🥋 הילת דרקון', action: () => onTriggerEffect({ id: '3', type: 'body-aura', timestamp: Date.now(), label: 'הילת דרקון' }) },
                    { id: 'cutout', name: '✂️ חיתוך גוף', action: () => onTriggerEffect({ id: '4', type: 'cutout-mode', timestamp: Date.now(), label: 'חיתוך גוף' }) },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={f.action}
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 hover:border-[#e6b450] active:scale-95 transition-all text-center"
                    >
                      <span className="text-xl mb-1">{f.name.split(' ')[0]}</span>
                      <span className="text-[10px] font-bold text-white truncate w-full">{f.name.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 6. 🖼 רקע (Backgrounds) */}
            {activePanel === 'bg' && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-slate-400">בחר רקע וירטואלי לסביבת הלייב:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'bg-neon', name: '🌌 סייבר ניאון' },
                    { id: 'bg-cyber', name: '🏙️ עיר עתידנית' },
                    { id: 'bg-greenscreen', name: '🟢 גרין סקרין' },
                    { id: 'bg-matrix', name: '💻 מטריקס קוד' },
                    { id: 'bg-none', name: '🎬 רקע מקורי' },
                    { id: 'fx_chicken', name: '🐔 תרנגולות' },
                    { id: 'fx_belly', name: '💃 רקדניות' },
                    { id: 'fx_ballet', name: '🩰 בלרינה' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        onTriggerEffect({ id: Math.random().toString(), type: bg.id as EffectType, timestamp: Date.now(), label: bg.name });
                        showToast(`🖼️ ${bg.name}`);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 text-center ${
                        activeBackground === bg.id
                          ? 'bg-[#e6b450]/20 border-[#e6b450] text-[#ffd778]'
                          : 'bg-white/5 border-white/10 text-white hover:border-[#e6b450]'
                      }`}
                    >
                      <span className="text-xl mb-1">{bg.name.split(' ')[0]}</span>
                      <span className="text-[10px] font-bold truncate w-full">{bg.name.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 7. ✨ AI חי (AI video generation & Lion Scene button) */}
            {activePanel === 'ai' && (
              <div className="flex flex-col gap-2.5">
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="תאר מה אתה רוצה שה-AI יצור… (למשל: אריה רוקד סלסה על במה עם זיקוקים)"
                  className="w-full h-18 p-2.5 rounded-xl bg-black/45 border border-[#e6b450]/30 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#e6b450] resize-none"
                />

                <div className="flex gap-2">
                  {[
                    { id: 'front', label: '🎬 Front' },
                    { id: 'bg', label: '🖼 רקע' },
                    { id: 'overlay', label: '🥊 אפקט' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setAiMode(m.id as any)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        aiMode === m.id
                          ? 'bg-[#e6b450] text-slate-950 font-black shadow-sm'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAi}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#e6b450] via-[#ffd778] to-[#b8841f] text-slate-950 font-black text-xs shadow-md active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>✨ צור וידאו חי</span>
                  </button>

                  {/* Item 9: Lion Scene Button */}
                  <button
                    onClick={() => fireEffect('scene', 'baby', '🦁 סצנת אריה')}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#ff8c00] to-[#e6b450] text-slate-950 font-black text-xs shadow-md active:scale-95 flex items-center gap-1 shrink-0"
                    title="הפעל סצנת אריה (POST /api/client/play {kind:'scene', id:'baby'})"
                  >
                    <span>🦁</span>
                    <span>אריה</span>
                  </button>
                </div>

                <div className="text-center text-[10px] text-slate-500 font-mono">
                  מנוע: {aiEngineName} • שידור ישיר לטיקטוק
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
