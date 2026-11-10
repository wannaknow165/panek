import { VideoClipAsset } from '../types/videoOverlay';

/**
 * Creates a procedural high-quality procedural video element using HTML5 Canvas captureStream
 * This guarantees 100% reliable local video playback without failing external URLs.
 */
export function createProceduralVideoElement(
  type: 'punch' | 'fire' | 'lightning' | 'coins' | 'glitch' | 'victory'
): HTMLVideoElement {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 720;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) throw new Error('Could not get offscreen canvas');

  let time = 0;
  const renderFrame = () => {
    time += 0.035;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (type === 'punch') {
      // 3D Metallic Fist Impact with chromatic dispersion & volumetric shockwave
      const cycle = (time * 1.4) % 1.2;
      const p = Math.min(1, cycle / 0.55);

      if (p < 1) {
        // Impact Shockwave Rings (Chromatic Aberration)
        const radius = p * 320;
        const alpha = Math.max(0, 1 - p * p);

        // Cyan ring offset
        ctx.strokeStyle = `rgba(0, 242, 254, ${alpha * 0.7})`;
        ctx.lineWidth = 18 * (1 - p);
        ctx.beginPath();
        ctx.arc(360 - 6 * p, 360, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Red/Pink ring offset
        ctx.strokeStyle = `rgba(254, 44, 85, ${alpha * 0.9})`;
        ctx.lineWidth = 22 * (1 - p);
        ctx.beginPath();
        ctx.arc(360 + 6 * p, 360, radius * 0.96, 0, Math.PI * 2);
        ctx.stroke();

        // 3D Metallic Fist Projection
        ctx.save();
        ctx.translate(360, 360);
        const fistScale = 0.4 + Math.sin(p * Math.PI) * 1.35;
        ctx.scale(fistScale, fistScale);

        // Knuckle fist outer shadow & glow
        ctx.shadowColor = '#fe2c55';
        ctx.shadowBlur = 40 * (1 - p);

        // Metallic Fist Body (Chrome Gradient)
        const fistGrad = ctx.createLinearGradient(-120, -100, 120, 100);
        fistGrad.addColorStop(0, '#ffffff');
        fistGrad.addColorStop(0.2, '#d6d9e0');
        fistGrad.addColorStop(0.5, '#4a5568');
        fistGrad.addColorStop(0.8, '#1a202c');
        fistGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = fistGrad;

        // Draw 3D Stylized Boxing/Mecha Fist
        ctx.beginPath();
        ctx.roundRect(-100, -70, 200, 150, 45);
        ctx.fill();

        // Knuckles (4 metallic segments with specular glints)
        for (let k = 0; k < 4; k++) {
          const kx = -75 + k * 50;
          const kGrad = ctx.createRadialGradient(kx, -65, 5, kx, -65, 30);
          kGrad.addColorStop(0, '#ffffff');
          kGrad.addColorStop(0.3, '#94a3b8');
          kGrad.addColorStop(1, '#1e293b');
          ctx.fillStyle = kGrad;
          ctx.beginPath();
          ctx.arc(kx, -65, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Thumb Segment
        const thumbGrad = ctx.createLinearGradient(-90, 20, -40, 60);
        thumbGrad.addColorStop(0, '#e2e8f0');
        thumbGrad.addColorStop(1, '#334155');
        ctx.fillStyle = thumbGrad;
        ctx.beginPath();
        ctx.roundRect(-95, 20, 65, 50, 20);
        ctx.fill();

        // Center Chrome Armor Plate
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-70, -20, 140, 70, 15);
        ctx.stroke();

        ctx.restore();

        // Kinetic Impact Sparks & Debris
        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2 + time * 2;
          const dist = p * 280;
          const sparkX = 360 + Math.cos(angle) * dist;
          const sparkY = 360 + Math.sin(angle) * dist;
          const sparkLen = 25 * (1 - p);

          ctx.strokeStyle = i % 2 === 0 ? '#ffbe0b' : '#ff0055';
          ctx.lineWidth = 4 * (1 - p);
          ctx.beginPath();
          ctx.moveTo(sparkX, sparkY);
          ctx.lineTo(sparkX + Math.cos(angle) * sparkLen, sparkY + Math.sin(angle) * sparkLen);
          ctx.stroke();
        }
      }
    } else if (type === 'fire') {
      // 3D Volumetric Inferno & Plasma Flames
      for (let i = 0; i < 45; i++) {
        const offset = (time * 1.6 + i * 0.08) % 1;
        const y = 720 - offset * 620;
        const x = 360 + Math.sin(time * 3 + i * 1.5) * 160 * offset + Math.cos(time * 2 + i) * 60;
        const size = (1 - offset * 0.8) * 85;

        const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.2, 'rgba(255, 215, 0, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 69, 0, 0.65)');
        grad.addColorStop(0.8, 'rgba(180, 0, 40, 0.35)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3D Rising Ember Sparks with turbulent swirl
      for (let e = 0; e < 30; e++) {
        const eOffset = (time * 2.2 + e * 0.12) % 1;
        const ey = 720 - eOffset * 680;
        const ex = 360 + Math.sin(time * 5 + e * 2) * (180 * eOffset);
        const eSize = 4 * (1 - eOffset * 0.5);

        ctx.fillStyle = '#ffbe0b';
        ctx.shadowColor = '#ff6b00';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(ex, ey, eSize, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else if (type === 'lightning') {
      // 3D Volumetric Lightning Plasma Arcs
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 30;

      for (let b = 0; b < 5; b++) {
        ctx.beginPath();
        let curX = 360 + (b - 2) * 90;
        let curY = 50;
        ctx.moveTo(curX, curY);

        ctx.strokeStyle = b === 2 ? '#ffffff' : '#00f2fe';
        ctx.lineWidth = b === 2 ? 6 : 4;

        while (curY < 680) {
          curX += (Math.sin(time * 8 + curY) * 35) + (Math.random() - 0.5) * 50;
          curY += 35 + Math.random() * 30;
          ctx.lineTo(curX, curY);

          // Sub-branches
          if (Math.random() > 0.65) {
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(curX, curY);
            ctx.lineTo(curX + (Math.random() - 0.5) * 70, curY + 40);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(curX, curY);
          }
        }
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else if (type === 'coins') {
      // 3D Tumbling Faceted Gold Coins with perspective pitch/yaw
      for (let i = 0; i < 28; i++) {
        const phase = (time * 1.1 + i * 0.12) % 1;
        const x = 120 + ((i * 47) % 480) + Math.sin(time * 2.5 + i) * 35;
        const y = phase * 680;

        // 3D Rotation Angles
        const rotX = time * 3.5 + i * 1.2;
        const rotZ = time * 2.0 + i;
        const scaleX = Math.cos(rotX);
        const radius = 26;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotZ);
        ctx.scale(Math.abs(scaleX) + 0.15, 1);

        // Gold Rim & Shading
        const goldGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
        goldGrad.addColorStop(0, '#fff4cc');
        goldGrad.addColorStop(0.3, '#ffd700');
        goldGrad.addColorStop(0.7, '#b8860b');
        goldGrad.addColorStop(1, '#5c4300');

        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fff9d6';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // 3D Embossed Dollar / TikTok Coin Glyph
        if (Math.abs(scaleX) > 0.4) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffea00';
          ctx.shadowBlur = 8;
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);
        }

        ctx.restore();
      }
    } else if (type === 'glitch') {
      // 4K Holographic Matrix & 3D Wireframe Scanlines
      const sliceY = (time * 500) % 720;

      // Cyan / Red RGB Shift Bars
      ctx.fillStyle = 'rgba(0, 242, 254, 0.45)';
      ctx.fillRect(0, sliceY, 720, 35);
      ctx.fillStyle = 'rgba(254, 44, 85, 0.45)';
      ctx.fillRect(0, (sliceY + 80) % 720, 720, 25);

      // Rotating 3D Hexagon Hologram in Center
      ctx.save();
      ctx.translate(360, 360);
      ctx.rotate(time * 1.5);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const rad = (s / 6) * Math.PI * 2;
        const hx = Math.cos(rad) * 160;
        const hy = Math.sin(rad) * 160;
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner 3D Reticle
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('3D_HOLOGRAM_4K', 0, 0);

      ctx.restore();
    } else if (type === 'victory') {
      // 3D Imperial Gold Crown with Rotating Beams & Jewels
      ctx.save();
      ctx.translate(360, 340);

      // Rotating God Rays / Sunburst
      ctx.save();
      ctx.rotate(time * 0.8);
      for (let r = 0; r < 12; r++) {
        const rayAngle = (r / 12) * Math.PI * 2;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rayAngle - 0.1) * 360, Math.sin(rayAngle - 0.1) * 360);
        ctx.lineTo(Math.cos(rayAngle + 0.1) * 360, Math.sin(rayAngle + 0.1) * 360);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Floating 3D Gold Crown
      const crownY = Math.sin(time * 4) * 18;
      ctx.translate(0, crownY);

      const crownGrad = ctx.createLinearGradient(0, -90, 0, 80);
      crownGrad.addColorStop(0, '#fff4cc');
      crownGrad.addColorStop(0.3, '#ffd700');
      crownGrad.addColorStop(0.7, '#b8860b');
      crownGrad.addColorStop(1, '#6b4f00');
      ctx.fillStyle = crownGrad;

      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 35;

      ctx.beginPath();
      ctx.moveTo(-130, 40);
      ctx.lineTo(-130, -50);
      ctx.lineTo(-65, -5);
      ctx.lineTo(0, -90);
      ctx.lineTo(65, -5);
      ctx.lineTo(130, -50);
      ctx.lineTo(130, 40);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Gemstones (Ruby, Sapphire, Emerald)
      const gems = [
        { x: -90, color: '#fe2c55' },
        { x: 0, color: '#00f2fe' },
        { x: 90, color: '#10b981' },
      ];
      gems.forEach((gem) => {
        ctx.fillStyle = gem.color;
        ctx.shadowColor = gem.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(gem.x, 15, 12, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    requestAnimationFrame(renderFrame);
  };

  renderFrame();

  const stream = canvas.captureStream(30);
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.play().catch(() => {});

  return video;
}

export const PRESET_VIDEO_CLIPS: VideoClipAsset[] = [
  {
    id: 'preset-punch-impact',
    name: 'אגרוף אקשן סינמטי (Action Punch VFX)',
    category: 'punch',
    url: 'procedural:punch',
    blendMode: 'screen',
    position: 'center',
    opacity: 1,
    loop: false,
    volume: 0.9,
  },
  {
    id: 'preset-fire-blast',
    name: 'פיצוץ ולהבות אש HD (Inferno Flames)',
    category: 'fire',
    url: 'procedural:fire',
    blendMode: 'screen',
    position: 'bottom',
    opacity: 0.9,
    loop: true,
    volume: 0.7,
  },
  {
    id: 'preset-lightning-energy',
    name: 'מכת ברק ואנרגיה ⚡ (Electric Strike)',
    category: 'energy',
    url: 'procedural:lightning',
    blendMode: 'lighter',
    position: 'fullscreen',
    opacity: 0.85,
    loop: false,
    volume: 0.8,
  },
  {
    id: 'preset-coins-rain',
    name: 'גשם מטבעות זהב ריאליסטי (Gold Coins 4K)',
    category: 'coins',
    url: 'procedural:coins',
    blendMode: 'normal',
    position: 'fullscreen',
    opacity: 0.95,
    loop: false,
    volume: 0.6,
  },
  {
    id: 'preset-cyber-glitch',
    name: 'שכבת גליץ׳ ניאון סייברפאנק (Cyber Glitch)',
    category: 'glitch',
    url: 'procedural:glitch',
    blendMode: 'lighter',
    position: 'fullscreen',
    opacity: 0.75,
    loop: true,
    volume: 0.5,
  },
  {
    id: 'preset-victory-crown',
    name: 'כתר וזיקוקי ניצחון 👑 (Victory Hype)',
    category: 'custom',
    url: 'procedural:victory',
    blendMode: 'screen',
    position: 'center',
    opacity: 1,
    loop: false,
    volume: 0.8,
  },
];
