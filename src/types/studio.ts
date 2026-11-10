export type EffectType =
  | 'punch-comic'
  | 'punch-combo'
  | 'punch-fire'
  | 'punch-ko'
  | 'head-bulge'
  | 'head-crown'
  | 'head-alien'
  | 'clip-laser'
  | 'clip-coins'
  | 'clip-confetti'
  | 'clip-fire'
  | 'bg-neon'
  | 'bg-cyber'
  | 'bg-matrix'
  | 'bg-greenscreen'
  | 'bg-none'
  | 'mask-forest'
  | 'mask-cyber'
  | 'mask-glasses'
  | 'mask-crown'
  | 'mask-kitty'
  | 'mask-kitsune'
  | 'mask-helmet'
  | 'mask-dj'
  | 'mask-stage'
  | 'body-aura'
  | 'cutout-mode';

export interface TriggerEvent {
  id: string;
  type: EffectType;
  timestamp: number;
  x?: number;
  y?: number;
  label: string;
  duration?: number;
}

export interface TouchCommand {
  id: string;
  action: 'down' | 'move' | 'up';
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  targetW: number;
  targetH: number;
  adbCommand: string;
  timestamp: number;
}

export interface CloudphoneConfig {
  ip: string;
  port: number;
  adbPort: number;
  connected: boolean;
  isSimulator: boolean;
  ping: number;
  fps: number;
  resolution: string;
  bitrate: string;
}

export interface LiveChatMessage {
  id: string;
  user: string;
  avatar: string;
  message: string;
  badge?: string;
  gift?: {
    name: string;
    icon: string;
    count: number;
  };
  color?: string;
  timestamp: number;
}

export interface FloatingHeart {
  id: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  rotation: number;
}
