import React, { useState, useRef } from 'react';
import { Maximize2, Minimize2, Video, Sparkles, CheckCircle2 } from 'lucide-react';

interface VirtualCameraPiPProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSwapView?: () => void;
  isFrontCamera: boolean;
  onSwitchCamera: () => void;
  isVisible?: boolean;
}

export const VirtualCameraPiP: React.FC<VirtualCameraPiPProps> = ({
  canvasRef,
  isExpanded,
  onToggleExpand,
  onSwapView,
  isFrontCamera,
  onSwitchCamera,
  isVisible = true,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const pipMirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 60 FPS Continuous Virtual Camera Mirror Loop
  React.useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      const mirror = pipMirrorCanvasRef.current;
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
  }, [canvasRef]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from header handle
    const target = e.target as HTMLElement;
    if (!target.closest('.pip-drag-handle')) return;

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const maxX = window.innerWidth - (isExpanded ? 320 : 180);
    const maxY = window.innerHeight - (isExpanded ? 520 : 300);
    setPosition({
      x: Math.max(10, Math.min(maxX, e.clientX - dragOffset.x)),
      y: Math.max(60, Math.min(maxY, e.clientY - dragOffset.y)),
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`fixed z-40 transition-all rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/95 backdrop-blur-md shadow-2xl ${
        isVisible === false ? 'opacity-0 pointer-events-none -z-50' : 'opacity-100'
      } ${
        isDragging ? 'shadow-[#00f2fe]/20 cursor-grabbing' : 'cursor-default'
      } ${isExpanded ? 'w-[260px] md:w-[320px]' : 'w-[150px] md:w-[180px]'}`}
    >
      {/* PiP Header Drag Handle */}
      <div className="pip-drag-handle flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-800 cursor-grab select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold text-slate-200 whitespace-nowrap">
            מצלמה וירטואלית (PiP)
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-750 transition-colors"
            title={isExpanded ? 'הקטן PiP' : 'הגדל PiP'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Canvas Viewport (9:16 Aspect Ratio) */}
      <div className="relative aspect-[9/16] bg-black overflow-hidden group">
        {/* The Live Compositor Canvas */}
        <canvas
          ref={pipMirrorCanvasRef}
          className="w-full h-full object-cover"
          width={720}
          height={1280}
        />

        {/* Live Overlay Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-bold text-white pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-ping" />
          <span>מוזרק 60 FPS</span>
        </div>

        {/* Hover / Touch Quick Controls */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-1 opacity-90 transition-opacity">
          <button
            onClick={onSwitchCamera}
            className="px-2 py-1 bg-black/70 hover:bg-black/90 text-white rounded-lg text-[10px] font-medium backdrop-blur-sm border border-white/10 flex items-center gap-1 active:scale-95"
            title="החלף מצלמה קדמית / אחורית"
          >
            <Video className="w-3 h-3 text-[#00f2fe]" />
            <span>{isFrontCamera ? 'סלפי' : 'אחורית'}</span>
          </button>

          {onSwapView && (
            <button
              onClick={onSwapView}
              className="px-2 py-1 bg-[#fe2c55]/80 hover:bg-[#fe2c55] text-white rounded-lg text-[10px] font-bold backdrop-blur-sm flex items-center gap-1 active:scale-95"
              title="החלף לתצוגה ראשית"
            >
              <Sparkles className="w-3 h-3" />
              <span>החלף למסך מלא</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-2.5 py-1.5 bg-slate-900/90 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-800">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          מוכן להזרקה ב-WebRTC
        </span>
        <span className="font-mono text-slate-500">720x1280</span>
      </div>
    </div>
  );
};
