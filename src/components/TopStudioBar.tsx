import React from 'react';
import { Square } from 'lucide-react';

export type StudioViewMode =
  | 'live-battle'
  | 'effects-library'
  | 'chino-host'
  | 'players-factory'
  | 'media-phone';

interface TopStudioBarProps {
  layoutMode: StudioViewMode;
  setLayoutMode: (mode: StudioViewMode) => void;
  onStopAll: () => void;
}

const NAV_ITEMS: Array<{ id: StudioViewMode; label: string }> = [
  { id: 'live-battle', label: 'קרב חי' },
  { id: 'effects-library', label: 'ספריית אפקטים' },
  { id: 'chino-host', label: 'צ׳ינו והאריה' },
  { id: 'players-factory', label: 'שחקנים ויצירה' },
  { id: 'media-phone', label: 'מדיה וטלפון' },
];

export const TopStudioBar: React.FC<TopStudioBarProps> = ({
  layoutMode,
  setLayoutMode,
  onStopAll,
}) => {
  return (
    <header
      dir="rtl"
      className="flex items-center justify-between gap-8 px-6 h-14 bg-[#0B0E14] border-b border-slate-800/90 z-30 shrink-0"
    >
      {/* Zone 1: Single-element Brand Wordmark */}
      <span className="text-base font-extrabold tracking-tight text-slate-100 font-['Rubik',sans-serif] whitespace-nowrap shrink-0">
        BOOSTERA STUDIO
      </span>

      {/* Zone 2: 4 Clean Single-Line Text Navigation Links */}
      <nav aria-label="ניווט ראשי" className="flex items-center gap-6 h-full overflow-x-auto no-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = layoutMode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLayoutMode(item.id)}
              className={`relative h-full flex items-center text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5B34B] ${
                isActive
                  ? 'text-[#E5B34B] border-b-2 border-[#E5B34B]'
                  : 'text-slate-400 hover:text-slate-100 border-b-2 border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Emergency Action */}
      <button
        type="button"
        onClick={onStopAll}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#DC2626] hover:bg-red-500 active:scale-[0.98] text-white text-xs font-bold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
      >
        <Square className="w-3.5 h-3.5 fill-current" />
        <span>עצור הכל</span>
      </button>
    </header>
  );
};
