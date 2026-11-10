import React, { useState, useRef } from 'react';
import {
  Upload,
  Play,
  Square,
  Film,
  Sparkles,
  Sliders,
  Check,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import { VideoClipAsset, VideoBlendMode, VideoPosition, ActiveVideoOverlay } from '../types/videoOverlay';
import { PRESET_VIDEO_CLIPS } from '../utils/presetVideos';

interface VideoOverlayDeckProps {
  onPlayVideoOverlay: (asset: VideoClipAsset) => void;
  onStopVideoOverlay: (assetId: string) => void;
  activeOverlays: ActiveVideoOverlay[];
  customClips: VideoClipAsset[];
  onAddCustomClip: (clip: VideoClipAsset) => void;
  onDeleteCustomClip: (clipId: string) => void;
}

export const VideoOverlayDeck: React.FC<VideoOverlayDeckProps> = ({
  onPlayVideoOverlay,
  onStopVideoOverlay,
  activeOverlays,
  customClips,
  onAddCustomClip,
  onDeleteCustomClip,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Upload Form State
  const [selectedBlendMode, setSelectedBlendMode] = useState<VideoBlendMode>('screen');
  const [selectedPosition, setSelectedPosition] = useState<VideoPosition>('center');
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [clipOpacity, setClipOpacity] = useState<number>(1);
  const [uploadName, setUploadName] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const videoUrl = URL.createObjectURL(file);
    const name = uploadName.trim() || file.name.replace(/\.[^/.]+$/, '');

    const newClip: VideoClipAsset = {
      id: `custom-${Date.now()}`,
      name,
      category: 'custom',
      url: videoUrl,
      blendMode: selectedBlendMode,
      position: selectedPosition,
      opacity: clipOpacity,
      loop: isLooping,
      volume: 0.8,
      isCustom: true,
    };

    onAddCustomClip(newClip);
    setIsUploading(false);
    setUploadName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isPlaying = (id: string) => activeOverlays.some((o) => o.asset.id === id);

  return (
    <div dir="rtl" className="flex flex-col gap-3">
      {/* Upload Custom Video Bar */}
      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-[#00f2fe]" />
            <span className="text-xs font-black text-white">הלבשת וידאו אישי (העלאת קבצים מהטלפון/מחשב)</span>
          </div>
          <span className="text-[10px] text-slate-400">תומך MP4, WebM, MOV</span>
        </div>

        {/* Upload Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
          {/* Custom Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-medium">שם הקליפ:</label>
            <input
              type="text"
              placeholder="לדוגמה: אגרוף אש מותאם / כניסה"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f2fe]"
            />
          </div>

          {/* Blend Mode Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-400 font-medium">מצב הלבשה (Blend Mode):</label>
            <select
              value={selectedBlendMode}
              onChange={(e) => setSelectedBlendMode(e.target.value as VideoBlendMode)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f2fe]"
            >
              <option value="screen">Screen (שקיפות רקע שחור - מומלץ!)</option>
              <option value="chroma-green">Chroma Key (הסרת רקע ירוק)</option>
              <option value="lighter">Lighter (הילת אור ואנרגיה)</option>
              <option value="normal">רגיל (כיסוי וידאו מלא)</option>
            </select>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#fe2c55] to-[#ff0055] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>בחר והעלה וידאו להלבשה</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Custom Uploaded Clips */}
      {customClips.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-amber-300">הווידאוים שלי שהועלו:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {customClips.map((clip) => {
              const active = isPlaying(clip.id);
              return (
                <div
                  key={clip.id}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    active
                      ? 'bg-[#fe2c55]/20 border-[#fe2c55] shadow-lg shadow-[#fe2c55]/20'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-extrabold text-white truncate max-w-[110px]">
                      {clip.name}
                    </span>
                    <button
                      onClick={() => onDeleteCustomClip(clip.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="מחק קליפ"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[9px] text-slate-400 font-mono mb-2">
                    {clip.blendMode === 'screen' ? 'שקיפות שחורה' : clip.blendMode === 'chroma-green' ? 'גרין סקרין' : 'רגיל'}
                  </span>

                  <button
                    onClick={() => {
                      if (active) onStopVideoOverlay(clip.id);
                      else onPlayVideoOverlay(clip);
                    }}
                    className={`w-full py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                      active
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {active ? <Square className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
                    <span>{active ? 'עצור הלבשה' : 'שגר וידאו לייב'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preset High-Definition Action & VFX Videos */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-bold text-slate-300">קליפי וידאו באיכות גבוהה מוכנים להלבשה:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PRESET_VIDEO_CLIPS.map((clip) => {
            const active = isPlaying(clip.id);
            return (
              <div
                key={clip.id}
                className={`p-3 rounded-2xl border flex flex-col justify-between transition-all ${
                  active
                    ? 'bg-[#00f2fe]/15 border-[#00f2fe] shadow-lg shadow-[#00f2fe]/20'
                    : 'bg-slate-850 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">{clip.name}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {clip.blendMode === 'screen'
                        ? 'הלבשת שקיפות שחורה (Screen)'
                        : clip.blendMode === 'lighter'
                        ? 'תוספת תאורה ואנרגיה'
                        : 'הלבשה מלאה'}
                    </span>
                  </div>
                  {active && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />}
                </div>

                <button
                  onClick={() => {
                    if (active) onStopVideoOverlay(clip.id);
                    else onPlayVideoOverlay(clip);
                  }}
                  className={`w-full py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                    active
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-gradient-to-r from-slate-800 to-slate-750 hover:from-slate-700 hover:to-slate-700 text-white'
                  }`}
                >
                  {active ? <Square className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white text-[#00f2fe]" />}
                  <span>{active ? 'עצור הלבשת וידאו' : 'הלבש וידאו עכשיו'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
