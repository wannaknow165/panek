import React, { useState, useMemo } from 'react';
import {
  Upload,
  Copy,
  Check,
  Play,
  Square,
  Trash2,
  FolderOpen,
  Server,
  Camera,
} from 'lucide-react';
import { ArielDashboardSnapshot } from '../utils/arielState';
import { arielApi } from '../services/arielApi';
import { boosteraApi } from '../services/boosteraApi';
import { BoosteraEffectDefinition, ProgramOutputSnapshot } from '../types/boostera';
import { CloudphoneRemoteView } from './CloudphoneRemoteView';
import { ThreeARMaskType } from '../engine/ThreeFaceAREngine';
import { EffectType, TriggerEvent } from '../types/studio';

interface MediaAndPhoneWorkspaceProps {
  snapshot: ArielDashboardSnapshot;
  program: ProgramOutputSnapshot;
  effects: BoosteraEffectDefinition[];
  onApplyProgram: (next?: ProgramOutputSnapshot) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isCamActive: boolean;
  onToggleCamera: () => void;
  activeMask: ThreeARMaskType;
  onSetARMask: (mask: ThreeARMaskType) => void;
  activeBackground: EffectType;
  onTriggerEffect: (ev: TriggerEvent) => void;
  onRefreshAll: () => Promise<void>;
  onPushLog: (msg: string) => void;
  onOpenWorkspaceModal: () => void;
  onOpenServerModal: () => void;
}

const LOCAL_3D_MASKS: Array<{ id: ThreeARMaskType; label: string }> = [
  { id: 'none', label: 'ללא מסכה' },
  { id: 'forest', label: 'יצור היער' },
  { id: 'kitsune', label: 'שועל קיטסונה' },
  { id: 'cyber', label: 'סייבר-אוני' },
  { id: 'glasses', label: 'משקפי סייבר' },
  { id: 'crown', label: 'כתר זהב' },
  { id: 'kitty', label: 'אוזני חתול' },
  { id: 'helmet', label: 'קסדת סייבר' },
  { id: 'dj_stage', label: 'במת DJ 3D' },
];

export const MediaAndPhoneWorkspace: React.FC<MediaAndPhoneWorkspaceProps> = ({
  snapshot,
  program,
  effects,
  onApplyProgram,
  canvasRef,
  isCamActive,
  onToggleCamera,
  activeMask,
  onSetARMask,
  activeBackground,
  onTriggerEffect,
  onRefreshAll,
  onPushLog,
  onOpenWorkspaceModal,
  onOpenServerModal,
}) => {
  const [copiedKey, setCopiedKey] = useState<'clean' | 'phone' | null>(null);
  const [rtspInput, setRtspInput] = useState<string>(snapshot.cloud.rtsp || '');
  const [uploadingLabel, setUploadingLabel] = useState<string>('');

  const cleanFeedUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/clean-feed';
    return `${window.location.origin}/clean-feed`;
  }, []);

  // Server-driven DeepAR & Face AR filters (§4: never hardcoded in React)
  const serverDeepArEffects = useMemo(
    () => effects.filter((e) => e.category === 'AR' || e.category === 'Face'),
    [effects]
  );

  const handleCopy = async (text: string, key: 'clean' | 'phone') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onPushLog(
        key === 'phone'
          ? 'קישור הטלפון הועתק ללוח'
          : 'קישור ה-Clean Feed (1080×1920) הועתק עבור OBS / Virtual Camera'
      );
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      onPushLog('לא ניתן להעתיק אוטומטית בדפדפן זה');
    }
  };

  const handleUploadAssetFiles = async (
    kind: 'clips' | 'bg' | 'front',
    files: FileList | null
  ) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      setUploadingLabel(`מעלה ${file.name}...`);
      const res = await arielApi.uploadAsset(kind, file);
      if (!res?.error) {
        onPushLog(`נוסף לשרת: ${res?.name || file.name}`);
      } else {
        onPushLog(`שגיאת העלאה: ${res.error}`);
      }
    }
    setUploadingLabel('');
    await onRefreshAll();
  };

  return (
    <div
      dir="rtl"
      className="w-full h-full grid grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden bg-[#0B0E14]"
    >
      {/* RIGHT COLUMN: Media Libraries, DeepAR Server Filters, Layers & Clean Feed Links */}
      <div className="h-full overflow-y-auto p-6 space-y-8 border-b lg:border-b-0 lg:border-l border-slate-800/90">
        {/* Top Utilities & Links Section */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-extrabold text-slate-100 font-['Rubik',sans-serif]">
                מדיה, שכבות וחיבור BOOSTERA Camera
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                קישור Clean Feed ל-Virtual Camera / OBS, אפקטי DeepAR מהשרת, סרטונים ושכבות
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenWorkspaceModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#121721] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#E5B34B]" />
                <span>Google Drive &amp; Sheets</span>
              </button>

              <button
                type="button"
                onClick={onOpenServerModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#121721] hover:bg-[#19202E] border border-slate-800 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-slate-400" />
                <span>הגדרות גשר</span>
              </button>
            </div>
          </div>

          {/* Clean Feed & Cloud Phone Links Strip (Zero Admin Secrets Exposed) */}
          <div className="p-4 rounded-xl bg-[#121721] border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-bold">BOOSTERA Program Output:</span>
                <span className="text-[#16A34A] font-semibold">
                  1080×1920 מוכן ל-Virtual Camera
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {snapshot.cloud.phone ? 'טלפון מחובר' : 'שידור ענן זמין'}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  arielApi.setCloudCast(!snapshot.cloud.on).then(() => onRefreshAll())
                }
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  snapshot.cloud.on
                    ? 'bg-[#DC2626] text-white'
                    : 'bg-[#E5B34B] text-slate-950'
                }`}
              >
                {snapshot.cloud.on ? 'הפסק שידור לענן' : 'הפעל שידור לטלפון בענן'}
              </button>
            </div>

            {/* Clean Feed Receiver URL for OBS / BOOSTERA Virtual Camera (§18) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-44 shrink-0">
                Clean Feed (1080×1920 ללא UI):
              </span>
              <input
                type="text"
                readOnly
                dir="ltr"
                value={cleanFeedUrl}
                className="flex-1 bg-[#0B0E14] text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono select-all"
              />
              <button
                type="button"
                onClick={() => handleCopy(cleanFeedUrl, 'clean')}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'clean' ? (
                  <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'clean' ? 'הועתק' : 'העתק'}</span>
              </button>
            </div>

            {snapshot.cloud.phoneUrl && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-44 shrink-0">קישור מצלמת טלפון (Client):</span>
                <input
                  type="text"
                  readOnly
                  dir="ltr"
                  value={snapshot.cloud.phoneUrl}
                  className="flex-1 bg-[#0B0E14] text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(snapshot.cloud.phoneUrl, 'phone')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#19202E] hover:bg-slate-700 text-xs font-semibold text-slate-200 whitespace-nowrap cursor-pointer"
                >
                  {copiedKey === 'phone' ? (
                    <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'phone' ? 'הועתק' : 'העתק'}</span>
                </button>
              </div>
            )}

            <details className="text-xs text-slate-400 pt-1">
              <summary className="cursor-pointer hover:text-slate-200">
                כתובת מצלמת RTSP / LiveKit מתקדמת
              </summary>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  dir="ltr"
                  value={rtspInput}
                  onChange={(e) => setRtspInput(e.target.value)}
                  placeholder="ריק = אוטומטי מהגדרות הטלפון / LiveKit"
                  className="flex-1 bg-[#0B0E14] text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    arielApi.setCloudCast(false, rtspInput.trim()).then(() => {
                      onPushLog('נשמרה כתובת RTSP');
                      onRefreshAll();
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#19202E] text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  שמור
                </button>
              </div>
            </details>
          </div>
        </section>

        {/* Server-Driven DeepAR / Face AR Filters (§4 — Loaded dynamically from /api/v1/effects) */}
        <section className="space-y-3 pt-6 border-t border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-['Rubik',sans-serif]">
              פילטרים ומסכות DeepAR מהשרת ({serverDeepArEffects.length})
            </h2>
            <p className="text-xs text-slate-400">
              נטען ישירות מ-BOOSTERA Effects Server ומוחל בשכבת ה-Program לפני השידור
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {serverDeepArEffects.map((eff) => {
              const active =
                program.activeLayers.some((l) => l.effectId === eff.id) ||
                (eff.deepArEffectId
                  ? program.deepAr.activeFilterIds.includes(eff.deepArEffectId)
                  : false);

              return (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() =>
                    boosteraApi.triggerEffect(eff.id).then((r) => {
                      onApplyProgram(r?.program);
                      onPushLog(`DeepAR שרת: ${eff.nameHe}`);
                    })
                  }
                  className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#E5B34B] text-slate-950 border-[#E5B34B] font-bold'
                      : 'bg-[#121721] hover:bg-[#19202E] text-slate-200 border-slate-800'
                  }`}
                >
                  {eff.nameHe}
                </button>
              );
            })}
          </div>
        </section>

        {/* General Click-Videos Library */}
        <section className="space-y-3 pt-6 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-['Rubik',sans-serif]">
                סרטונים כלליים בלחיצה ({snapshot.clips.length})
              </h2>
              <p className="text-xs text-slate-400">
                תומך ב-WebM Alpha, WebM ו-MP4 לשילוב ב-Program Output
              </p>
            </div>

            <div className="flex items-center gap-2">
              {snapshot.desk.clip && (
                <button
                  type="button"
                  onClick={() => {
                    arielApi.stopClip();
                    boosteraApi.stopAllEffects().then((r) => onApplyProgram(r?.program));
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#DC2626] text-white text-xs font-bold cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>עצור סרטון</span>
                </button>
              )}

              <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 text-xs font-bold cursor-pointer whitespace-nowrap">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingLabel || 'העלה סרטון חדש'}</span>
                <input
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadAssetFiles('clips', e.target.files)}
                />
              </label>
            </div>
          </div>

          {snapshot.clips.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
              עדיין לא הועלו סרטונים כלליים. לחץ על &quot;העלה סרטון חדש&quot; למעלה להוספת WebM Alpha או MP4.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {snapshot.clips.map((clip) => {
                const playing = snapshot.desk.clip?.id === clip.id;
                return (
                  <div
                    key={clip.id}
                    className={`p-2.5 rounded-xl bg-[#121721] border flex flex-col gap-2 ${
                      playing ? 'border-[#16A34A]' : 'border-slate-800'
                    }`}
                  >
                    <div className="aspect-video rounded-lg bg-black overflow-hidden relative">
                      {clip.thumb ? (
                        <img
                          src={clip.thumb}
                          alt={clip.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                          וידאו
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {clip.name}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          arielApi.playClip(clip.id);
                          boosteraApi
                            .playOverlay({
                              id: clip.id,
                              name: clip.name,
                              asset: clip.file || `/media/clips/${clip.id}`,
                              anchor: 'fullscreen',
                              zIndex: 82,
                            })
                            .then((r) => {
                              onApplyProgram(r?.program);
                              onPushLog(`מנגן ב-Program: ${clip.name}`);
                            });
                        }}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#E5B34B] text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>נגן</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`מחק ${clip.name}`}
                        onClick={() =>
                          arielApi.deleteAsset('clips', clip.id).then(() => onRefreshAll())
                        }
                        className="p-1.5 rounded-lg bg-[#19202E] hover:bg-[#DC2626] text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Front & Background Stage Layers */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-800/80">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">שכבות מלפנים (Front · z:90)</h3>
              <label className="text-xs font-semibold text-[#E5B34B] hover:underline cursor-pointer">
                + העלה PNG / WebM שקוף
                <input
                  type="file"
                  accept="image/png,image/webp,video/webm,video/mp4"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadAssetFiles('front', e.target.files)}
                />
              </label>
            </div>

            {snapshot.assets.front.length === 0 ? (
              <p className="text-xs text-slate-500">אין שכבות קדמיות שמורות בשרת.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {snapshot.assets.front.map((it) => {
                  const active = (snapshot.setConfig.front || []).some((f) => f.file === it.file);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => {
                        const current = [...(snapshot.setConfig.front || [])];
                        const idx = current.findIndex((x) => x.file === it.file);
                        if (idx >= 0) current.splice(idx, 1);
                        else
                          current.push({
                            id: it.id,
                            file: it.file,
                            type: it.type,
                            opacity: 1,
                            name: it.name,
                            thumb: it.thumb,
                          });
                        arielApi.updateSet({ front: current }).then(() => onRefreshAll());
                        boosteraApi
                          .playOverlay({
                            id: it.id,
                            name: it.name,
                            asset: it.file,
                            zIndex: 90,
                            loop: true,
                            anchor: 'fullscreen',
                          })
                          .then((r) => onApplyProgram(r?.program));
                      }}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                        active
                          ? 'bg-[#E5B34B] text-slate-950 border-[#E5B34B]'
                          : 'bg-[#121721] text-slate-200 border-slate-800'
                      }`}
                    >
                      {it.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100">רקע במה מאחור (Background · z:10)</h3>
              <label className="text-xs font-semibold text-[#E5B34B] hover:underline cursor-pointer">
                + העלה תמונה או וידאו
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadAssetFiles('bg', e.target.files)}
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  arielApi.updateSet({ bg: null }).then(() => onRefreshAll());
                  boosteraApi
                    .setScene({ mode: 'camera', backgroundAssetUrl: null })
                    .then((r) => onApplyProgram(r?.program));
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  !snapshot.setConfig.bg && !program.backgroundAssetUrl
                    ? 'bg-[#19202E] text-[#E5B34B] border-[#E5B34B]'
                    : 'bg-[#121721] text-slate-400 border-slate-800'
                }`}
              >
                ללא רקע
              </button>
              {snapshot.assets.bg.map((it) => {
                const active =
                  snapshot.setConfig.bg?.file === it.file ||
                  program.backgroundAssetUrl === it.file;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      arielApi
                        .updateSet({
                          bg: {
                            id: it.id,
                            name: it.name,
                            file: it.file,
                            type: it.type,
                            thumb: it.thumb,
                          },
                        })
                        .then(() => onRefreshAll());
                      boosteraApi
                        .setScene({ mode: 'custom_bg', backgroundAssetUrl: it.file })
                        .then((r) => onApplyProgram(r?.program));
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      active
                        ? 'bg-[#E5B34B] text-slate-950 border-[#E5B34B]'
                        : 'bg-[#121721] text-slate-200 border-slate-800'
                    }`}
                  >
                    {it.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Local 3D AR Masks Engine (Preserved Untouched Engines) */}
        <section className="space-y-3 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100 font-['Rubik',sans-serif]">
                מנוע AR מקומי לבדיקת מצלמת מחשב (MediaPipe + Three.js)
              </h2>
              <p className="text-xs text-slate-400">
                לצפייה מקומית על מצלמת הרשת של המחשב שלך
              </p>
            </div>

            <button
              type="button"
              onClick={onToggleCamera}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer ${
                isCamActive
                  ? 'bg-[#16A34A]/15 border border-[#16A34A] text-[#16A34A]'
                  : 'bg-[#19202E] text-slate-200 border border-slate-700'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{isCamActive ? 'מצלמת AR פעילה' : 'הפעל מצלמת רשת'}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {LOCAL_3D_MASKS.map((mask) => (
              <button
                key={mask.id}
                type="button"
                onClick={() => onSetARMask(mask.id)}
                className={`px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeMask === mask.id
                    ? 'bg-[#E5B34B] text-slate-950 border-[#E5B34B]'
                    : 'bg-[#121721] hover:bg-[#19202E] text-slate-200 border-slate-800'
                }`}
              >
                {mask.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'bg-none', label: 'רקע מצלמה טבעי' },
              { id: 'bg-neon', label: 'רקע ניאון' },
              { id: 'bg-cyber', label: 'עיר עתידנית' },
              { id: 'bg-greenscreen', label: 'מסך ירוק' },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() =>
                  onTriggerEffect({
                    id: String(Date.now()),
                    type: b.id as EffectType,
                    timestamp: Date.now(),
                    label: b.label,
                  })
                }
                className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                  activeBackground === b.id
                    ? 'border-[#E5B34B] text-[#E5B34B] bg-[#19202E]'
                    : 'border-slate-800 text-slate-400 bg-[#0B0E14]'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* LEFT COLUMN: Interactive Cloudphone / AR Screen */}
      <div className="hidden lg:flex h-full items-center justify-center bg-[#0B0E14] p-4">
        <CloudphoneRemoteView
          canvasRef={canvasRef}
          snapshot={snapshot}
          isCamActive={isCamActive}
          onPushLog={onPushLog}
        />
      </div>
    </div>
  );
};
