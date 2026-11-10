export type VideoBlendMode = 'normal' | 'screen' | 'lighter' | 'chroma-green' | 'multiply';

export type VideoPosition = 'fullscreen' | 'center' | 'bottom' | 'top-right' | 'top-left';

export interface VideoClipAsset {
  id: string;
  name: string;
  category: 'punch' | 'fire' | 'energy' | 'coins' | 'glitch' | 'custom';
  url: string;
  thumbnail?: string;
  blendMode: VideoBlendMode;
  position: VideoPosition;
  opacity: number;
  loop: boolean;
  volume: number;
  isCustom?: boolean;
}

export interface ActiveVideoOverlay {
  id: string;
  asset: VideoClipAsset;
  videoEl: HTMLVideoElement;
  startTime: number;
  duration: number;
  isPlaying: boolean;
}
