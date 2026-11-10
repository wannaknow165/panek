import React from 'react';
import { Camera, Server, Monitor, LayoutGrid, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import { CloudphoneConfig } from '../types/studio';

interface TopStudioBarProps {
  layoutMode: 'cloudphone-pip' | 'studio-dual' | 'camera-full';
  setLayoutMode: (mode: 'cloudphone-pip' | 'studio-dual' | 'camera-full') => void;
  cloudConfig: CloudphoneConfig;
  onOpenServerModal: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isCamActive: boolean;
  onToggleCamera: () => void;
  audioLevel: number;
}

export const TopStudioBar: React.FC<TopStudioBarProps> = ({
  layoutMode,
  setLayoutMode,
  cloudConfig,
  onOpenServerModal,
  isMuted,
  onToggleMute,
  isCamActive,
  onToggleCamera,
  audioLevel,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-6 py-2.5 bg-[#0d1017]/90 backdrop-blur-md border-b border-slate-800/80 z-30 shrink-0">
      {/* Zone 1: Brand title wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#fe2c55] to-[#00f2fe] flex items-center justify-center shadow-lg shadow-[#fe2c55]/20">
          <Camera className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-base md:text-lg font-black tracking-tight text-white whitespace-nowrap">
            TIKTOK LIVE INJECTOR
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            סטודיו הזרקה ומצלמה וירטואלית
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / View Modes */}
      <nav className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800 rounded-xl">
        <button
          onClick={() => setLayoutMode('cloudphone-pip')}
          aria-label="מסך ענן מלא + PiP"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            layoutMode === 'cloudphone-pip'
              ? 'bg-[#fe2c55] text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">מסך ענן מלא + PiP</span>
        </button>

        <button
          onClick={() => setLayoutMode('studio-dual')}
          aria-label="תצוגת סטודיו כפולה"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
            layoutMode === 'studio-dual'
              ? 'bg-[#00f2fe] text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">תצוגת סטודיו כפולה</span>
        </button>
      </nav>

      {/* Status Bar Indicator */}
      <div className="hidden sm:flex items-center gap-3 text-xs">
        {/* Audio Volume Bar */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-800 rounded-lg">
          <button
            onClick={onToggleMute}
            className="text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'בטל השתקה' : 'השתק סאונד'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-[#00f2fe]" />}
          </button>
          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden flex items-center">
            <div
              className="h-full bg-gradient-to-r from-[#00f2fe] to-[#fe2c55] transition-all duration-75"
              style={{ width: `${isMuted ? 0 : audioLevel}%` }}
            />
          </div>
        </div>

        {/* Camera Toggle Button */}
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
            isCamActive
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <RefreshCw className={`w-3 h-3 ${isCamActive ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
          <span>{isCamActive ? 'מצלמה חיה' : 'הפעל מצלמה'}</span>
        </button>
      </div>

      {/* Zone 3: 1 Primary Action (Cloudphone Server Setup & Connect) */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenServerModal}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700 rounded-lg shadow-sm transition-all whitespace-nowrap shrink-0 active:scale-95"
        >
          <Server className="w-3.5 h-3.5 text-[#00f2fe]" />
          <span>הגדרות שרת ענן</span>
        </button>
      </div>
    </header>
  );
};
