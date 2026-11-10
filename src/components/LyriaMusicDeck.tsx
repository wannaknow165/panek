import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Disc,
  Sparkles,
  Loader2,
  Radio,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { studioAudio } from '../utils/audioSynthesizer';

interface LyriaMusicDeckProps {
  onMusicPlayingChange?: (isPlaying: boolean) => void;
  onActivateDJStage?: () => void;
  isDJStageActive?: boolean;
}

export const LyriaMusicDeck: React.FC<LyriaMusicDeckProps> = ({
  onMusicPlayingChange,
  onActivateDJStage,
  isDJStageActive = false,
}) => {
  const [model, setModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [prompt, setPrompt] = useState<string>('ביט פונק סייברפאנק אנרגטי עם באס 808 עמוק לשידור לייב בטיקטוק');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Playback State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [injectIntoLive, setInjectIntoLive] = useState<boolean>(true);
  const [lyricsText, setLyricsText] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioConnectedRef = useRef<boolean>(false);

  const presets = [
    {
      id: 'phonk',
      label: '⚡ סייבר-פונק (Phonk)',
      prompt: 'High-energy cyberpunk phonk beat with aggressive 808 bass, dark synth bells, and drift rhythm for TikTok LIVE',
      emoji: '🏎️',
    },
    {
      id: 'lofi',
      label: '☕ צ\'יל לואו-פיי (Lo-Fi)',
      prompt: 'Chill lo-fi study hip hop with warm electric piano chords, dusty vinyl crackle, and mellow drums',
      emoji: '🎧',
    },
    {
      id: 'edm',
      label: '🔥 קרב בוס EDM (Epic)',
      prompt: 'Epic melodic dubstep and hybrid cinematic EDM with massive drop, heroic synth brass and pounding kick',
      emoji: '💥',
    },
    {
      id: 'funk',
      label: '🕺 פאנק טיקטוק ויראלי',
      prompt: 'Viral upbeat Brazilian funk house beat with bouncy bassline, energetic percussion and vocal chops',
      emoji: '🎵',
    },
  ];

  // Connect audio element to Studio Audio Mixer for WebRTC injection
  useEffect(() => {
    if (audioRef.current && !audioConnectedRef.current && injectIntoLive) {
      try {
        studioAudio.attachAudioElement(audioRef.current);
        audioConnectedRef.current = true;
      } catch (e) {
        console.warn('Audio mixer attach notice:', e);
      }
    }
  }, [audioUrl, injectIntoLive]);

  // Notify parent of playing status to drive 3D turntable spin
  useEffect(() => {
    onMusicPlayingChange?.(isPlaying);
  }, [isPlaying, onMusicPlayingChange]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'נכשל ביצירת המוזיקה');
      }

      setAudioUrl(data.audioDataUrl);
      setLyricsText(data.lyrics || null);

      // Reset playback to start new track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת מוזיקה';
      console.warn('Lyria API notice:', msg);
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col gap-3 font-['Heebo',sans-serif]">
      {/* Hidden HTML Audio element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          playsInline
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) setDuration(audioRef.current.duration);
          }}
          onEnded={() => {
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
        />
      )}

      {/* Header & Model Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-[#00f2fe] flex items-center justify-center text-white shadow-md shadow-[#fe2c55]/20">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white">יצירת מוזיקה ב-AI (Google Lyria)</span>
              <span className="px-1.5 py-0.2 rounded bg-red-950/80 border border-[#fe2c55]/40 text-[#fe2c55] text-[10px] font-bold">
                PRO 3D
              </span>
            </div>
            <span className="text-[10px] text-slate-400">הזרקת פסי-קול וירטואליים באיכות אולפן ל-TikTok LIVE</span>
          </div>
        </div>

        {/* Model selection pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setModel('lyria-3-clip-preview')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              model === 'lyria-3-clip-preview'
                ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff007f] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>קליפ מהיר (30s)</span>
          </button>

          <button
            onClick={() => setModel('lyria-3-pro-preview')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              model === 'lyria-3-pro-preview'
                ? 'bg-gradient-to-r from-[#00f2fe] to-[#00c0f9] text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>טרק מלא (Lyria Pro)</span>
          </button>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => setPrompt(p.prompt)}
            className="flex items-center gap-2 p-2 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-700/80 hover:border-[#00f2fe]/50 text-right transition-all active:scale-95 text-xs font-bold text-slate-200"
          >
            <span className="text-base">{p.emoji}</span>
            <span className="truncate">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Custom Prompt Input & Generate Action */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="תאר את סגנון המוזיקה, כלי הנגינה, הקצב ומצב הרוח..."
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00f2fe] transition-colors"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#fe2c55] via-[#ff007f] to-[#00f2fe] hover:opacity-95 text-white font-extrabold text-xs shadow-lg shadow-[#fe2c55]/20 disabled:opacity-50 transition-all shrink-0 active:scale-95"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>יוצר מוזיקה ב-Lyria...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>צור מוזיקה עכשיו</span>
            </>
          )}
        </button>
      </div>

      {/* Error / Quota Notice */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-300 text-[11px]">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <div className="flex-1">
            <span className="font-bold">הערת מודל: </span>
            <span>{errorMsg} (נדרש מפתח Gemini API עם הרשאת Lyria). כעת פועל בסנכרון מלא עם ביטים מתוכנתים באולפן!</span>
          </div>
        </div>
      )}

      {/* Built-in Stream Audio Player & DJ Stage Link */}
      <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-col gap-2.5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              disabled={!audioUrl}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                audioUrl
                  ? 'bg-gradient-to-r from-[#fe2c55] to-[#ff007f] text-white shadow-md shadow-[#fe2c55]/30 active:scale-90 hover:scale-105'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {audioUrl ? 'רצועת Lyria AI פעילה' : 'טרם נוצרה מוזיקה - בחר פריסט ולחץ צור מוזיקה'}
                {isPlaying && (
                  <span className="flex items-center gap-0.5 text-emerald-400 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    משדר
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Quick link to 3D Turntable Mask */}
          {onActivateDJStage && (
            <button
              onClick={onActivateDJStage}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                isDJStageActive
                  ? 'bg-gradient-to-r from-[#00f2fe]/30 to-slate-900 border-[#00f2fe] text-white shadow-md shadow-[#00f2fe]/30 ring-1 ring-[#00f2fe]'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:border-[#00f2fe]/50'
              }`}
            >
              <Disc className={`w-3.5 h-3.5 ${isDJStageActive ? 'text-[#00f2fe] animate-spin' : 'text-slate-400'}`} />
              <span>{isDJStageActive ? 'במת דיג\'יי 3D פעילה ✓' : 'הפעל עמדת DJ תלת-ממדית'}</span>
            </button>
          )}
        </div>

        {/* Scrub Bar */}
        {audioUrl && (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#fe2c55]"
            />
          </div>
        )}

        {/* Live Broadcast Audio Injection Switch */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={injectIntoLive}
              onChange={(e) => setInjectIntoLive(e.target.checked)}
              className="rounded accent-[#00f2fe] w-3.5 h-3.5 cursor-pointer"
            />
            <span className="text-slate-300 font-semibold">
              הזרק ישירות למיקרופון ולזרם השידור של TikTok LIVE (WebRTC Mixer)
            </span>
          </label>

          <span className="text-[10px] text-slate-500 font-mono">
            {model} • 48kHz Stereo
          </span>
        </div>
      </div>
    </div>
  );
};
