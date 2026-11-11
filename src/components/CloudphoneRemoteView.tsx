import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Circle,
  Square,
  Smartphone,
  Camera,
  RefreshCw,
} from 'lucide-react';
import { normalizeTouch } from '../utils/touchCoordinates';
import { SmartAudienceFeed } from './SmartAudienceFeed';
import { ArielDashboardSnapshot, isTiktokActivelyLive } from '../utils/arielState';
import { arielApi } from '../services/arielApi';

interface CloudphoneRemoteViewProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  snapshot: ArielDashboardSnapshot;
  isCamActive?: boolean;
  onPushLog?: (msg: string) => void;
}

export const CloudphoneRemoteView: React.FC<CloudphoneRemoteViewProps> = ({
  canvasRef,
  snapshot,
  isCamActive = false,
  onPushLog,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Default to live server camera output ('mjpeg-view') so user sees real broadcast feed immediately
  const [streamSource, setStreamSource] = useState<'local-ar' | 'mjpeg-screen' | 'mjpeg-view'>(
    isCamActive ? 'local-ar' : 'mjpeg-view'
  );
  const [mjpegFailed, setMjpegFailed] = useState<boolean>(false);
  const [mjpegNonce, setMjpegNonce] = useState<number>(() => Date.now());
  const [lastAdbStatus, setLastAdbStatus] = useState<string>('');

  useEffect(() => {
    if (isCamActive) {
      setStreamSource('local-ar');
    }
  }, [isCamActive]);

  // Mirror local 3D AR compositor canvas only when local webcam is actively running
  useEffect(() => {
    if (streamSource !== 'local-ar' || !isCamActive) return;
    let animId: number;
    const renderLoop = () => {
      const mirror = mirrorCanvasRef.current;
      const src = canvasRef.current;
      if (mirror && src) {
        const ctx = mirror.getContext('2d');
        if (ctx) {
          ctx.drawImage(src, 0, 0, mirror.width, mirror.height);
        }
      }
      animId = requestAnimationFrame(renderLoop);
    };
    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [canvasRef, streamSource, isCamActive]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || !touchStartRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const duration = Math.max(120, Math.min(1000, Date.now() - touchStartRef.current.time));
    const start = normalizeTouch(touchStartRef.current.x, touchStartRef.current.y, rect);
    touchStartRef.current = null;

    if (Math.hypot(dx, dy) > 36) {
      const end = normalizeTouch(e.clientX, e.clientY, rect);
      setLastAdbStatus(`החלקה: ${start.androidX},${start.androidY} → ${end.androidX},${end.androidY}`);
      const res = await arielApi.phoneTap({
        x: Number(start.normX.toFixed(4)),
        y: Number(start.normY.toFixed(4)),
        x2: Number(end.normX.toFixed(4)),
        y2: Number(end.normY.toFixed(4)),
        ms: duration,
      });
      if (res?.error) {
        onPushLog?.(`ADB: ${res.error}`);
      }
    } else {
      setLastAdbStatus(`לחיצה: ${start.androidX},${start.androidY}`);
      const res = await arielApi.phoneTap({
        x: Number(start.normX.toFixed(4)),
        y: Number(start.normY.toFixed(4)),
      });
      if (res?.error) {
        onPushLog?.(`ADB: ${res.error}`);
      }
    }
  };

  const handleAndroidNavKey = async (k: 'back' | 'home' | 'recents') => {
    setLastAdbStatus(`מקש אנדרואיד: ${k}`);
    const res = await arielApi.phoneKey(k);
    if (res?.error) {
      onPushLog?.(`ADB Key: ${res.error}`);
    }
  };

  const handleOpenTiktokApp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLastAdbStatus('פותח טיקטוק בטלפון…');
    const res = await arielApi.phoneOpenApp('tiktok');
    if (res?.error) {
      onPushLog?.(`פתיחת טיקטוק: ${res.error}`);
    } else {
      onPushLog?.('נשלחה פקודה לפתיחת טיקטוק בטלפון בענן');
    }
  };

  const isLive = isTiktokActivelyLive(snapshot.tiktok);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#0B0E14]">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className="relative w-full h-full max-w-[390px] max-h-[820px] aspect-[9/16] rounded-2xl overflow-hidden border border-slate-800 bg-black flex flex-col select-none touch-none"
      >
        {/* Video / MJPEG / AR Stream Surface */}
        <div className="absolute inset-0 z-0 bg-black overflow-hidden flex items-center justify-center">
          {streamSource === 'local-ar' ? (
            isCamActive ? (
              <canvas
                ref={mirrorCanvasRef}
                width={720}
                height={1280}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="p-6 text-center space-y-2 text-xs text-slate-400">
                <p className="font-bold text-slate-200 text-sm">מצלמת רשת מקומית כבויה</p>
                <p>לחץ על &quot;הפעל מצלמת רשת&quot; כדי לראות את מסכות ה-AR בזמן אמת.</p>
              </div>
            )
          ) : !mjpegFailed ? (
            <img
              src={
                streamSource === 'mjpeg-screen'
                  ? `/api/phone/screen.mjpeg?t=${mjpegNonce}`
                  : `/api/phone/view.mjpeg?t=${mjpegNonce}`
              }
              alt="מסך הטלפון בענן"
              onError={() => setMjpegFailed(true)}
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="p-6 text-center space-y-3 text-xs text-slate-400">
              <p className="font-bold text-slate-200 text-sm">
                זרם ה-MJPEG של הטלפון אינו משדר כרגע
              </p>
              <p>וודא שהטלפון בענן מחובר או נסה לרענן את הזרם.</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMjpegFailed(false);
                  setMjpegNonce(Date.now());
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#E5B34B] text-slate-950 font-bold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>נסה שוב</span>
              </button>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-transparent to-black/85 pointer-events-none" />
        </div>

        {/* Top Real Status Header & Source Switcher */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 flex flex-col gap-2 px-3 pt-3 pb-2"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? 'bg-[#16A34A]' : 'bg-slate-500'
                }`}
              />
              <span dir="ltr" className="font-bold text-slate-100">
                @{snapshot.tiktok.user || 'tiktok'}
              </span>
              <span className="text-[11px] text-slate-400">
                · {isLive ? 'בלייב' : 'אופליין'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleOpenTiktokApp}
              className="px-2.5 py-1 rounded-lg bg-[#E5B34B] text-slate-950 text-[11px] font-bold whitespace-nowrap cursor-pointer"
            >
              פתח טיקטוק בטלפון
            </button>
          </div>

          {/* Stream Source Selector */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121721]/90 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setMjpegFailed(false);
                setMjpegNonce(Date.now());
                setStreamSource('mjpeg-view');
              }}
              className={`flex-1 py-1 rounded-md font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                streamSource === 'mjpeg-view'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>מצלמת ענן</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMjpegFailed(false);
                setMjpegNonce(Date.now());
                setStreamSource('mjpeg-screen');
              }}
              className={`flex-1 py-1 rounded-md font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                streamSource === 'mjpeg-screen'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>מסך אנדרואיד</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStreamSource('local-ar');
              }}
              className={`flex-1 py-1 rounded-md font-bold flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                streamSource === 'local-ar'
                  ? 'bg-[#19202E] text-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3 h-3" />
              <span>AR מקומי</span>
            </button>
          </div>

          {lastAdbStatus && (
            <div className="self-end text-[11px] font-mono tabular-nums text-[#E5B34B]">
              {lastAdbStatus}
            </div>
          )}
        </div>

        <div className="flex-1 pointer-events-none" />

        {/* Real Incoming TikTok Events Log */}
        <div className="relative z-10 px-3 pb-2">
          <SmartAudienceFeed
            events={snapshot.liveEvents}
            tiktokStatusText={snapshot.tiktok.status}
            isLiveConnected={isLive}
          />
        </div>

        {/* Real Android Navigation Keys (/api/phone/key) */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="relative z-20 flex items-center justify-around py-2 bg-[#121721] border-t border-slate-800 text-slate-400 pointer-events-auto"
        >
          <button
            type="button"
            aria-label="מקש חזור באנדרואיד"
            onClick={() => handleAndroidNavKey('back')}
            className="p-2 rounded-lg hover:text-slate-100 hover:bg-[#19202E] cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="מקש בית באנדרואיד"
            onClick={() => handleAndroidNavKey('home')}
            className="p-2 rounded-lg hover:text-slate-100 hover:bg-[#19202E] cursor-pointer"
          >
            <Circle className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="יישומים אחרונים באנדרואיד"
            onClick={() => handleAndroidNavKey('recents')}
            className="p-2 rounded-lg hover:text-slate-100 hover:bg-[#19202E] cursor-pointer"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
