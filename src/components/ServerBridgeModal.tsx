import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  FileCode,
  Server,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { CloudphoneConfig } from '../types/studio';

interface ServerBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CloudphoneConfig;
  onUpdateConfig: (newConfig: Partial<CloudphoneConfig>) => void;
}

export const ServerBridgeModal: React.FC<ServerBridgeModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'server' | 'instructions' | 'connection'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dockerComposeCode = `# ==============================================================================
# Cloudphone (Redroid Android 12) + Virtual Camera Injector (/dev/video10)
# ==============================================================================
version: '3.8'

services:
  # 1. Android 12 Cloudphone Container
  redroid:
    image: redroid/redroid:12.0.0-latest
    container_name: tiktok_cloudphone
    privileged: true
    restart: unless-stopped
    ports:
      - "5555:5555" # Remote ADB Debug Port
    devices:
      - /dev/video10:/dev/video10 # Virtual Camera Device injected by host
    volumes:
      - ./data:/data
    command:
      - "androidboot.redroid_width=1080"
      - "androidboot.redroid_height=1920"
      - "androidboot.redroid_dpi=420"
      - "androidboot.redroid_fps=60"
      - "ro.camera.sound.forced=0"
      - "ro.media.camera.virtual=1"

  # 2. WebRTC Virtual Camera Injector & ADB Touch Bridge
  webrtc_bridge:
    build: .
    container_name: tiktok_bridge
    restart: unless-stopped
    privileged: true
    network_mode: host
    environment:
      - VIRTUAL_DEVICE=/dev/video10
      - ANDROID_ADB_HOST=localhost:5555
      - WS_PORT=8080
    devices:
      - /dev/video10:/dev/video10
    depends_on:
      - redroid
`;

  const serverJsCode = `/**
 * TikTok LIVE Studio - Cloudphone WebRTC Virtual Camera Injector & ADB Bridge
 * Runs on the Cloudphone host server. Takes WebRTC stream from client app,
 * decodes and pipes frames directly into /dev/video10 for native TikTok app,
 * and executes ADB touch inputs in real-time.
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const WS_PORT = process.env.WS_PORT || 8080;
const VIRTUAL_VIDEO_DEV = process.env.VIRTUAL_DEVICE || '/dev/video10';
const ADB_TARGET = process.env.ANDROID_ADB_HOST || '127.0.0.1:5555';

console.log('🚀 Starting TikTok LIVE Cloudphone Injector Bridge...');
console.log('📹 Target Virtual Camera Device:', VIRTUAL_VIDEO_DEV);

// 1. Initialize ffmpeg pipe to write raw video into v4l2loopback
const ffmpeg = spawn('ffmpeg', [
  '-re',
  '-f', 'webm',
  '-i', 'pipe:0',
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=1080:1920',
  '-f', 'v4l2',
  VIRTUAL_VIDEO_DEV
]);

ffmpeg.stderr.on('data', (data) => {
  // console.log(\`[ffmpeg]: \${data}\`);
});

// 2. Start WebSocket Signaling & ADB Touch Receiver
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'TikTok LIVE Injector' }));
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('📱 Phone Client Connected to Bridge!');

  // Connect ADB to Redroid container
  exec(\`adb connect \${ADB_TARGET}\`, (err, stdout) => {
    console.log('[ADB Connect]:', stdout.trim());
  });

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle ADB Touch & Keyevent Commands
      if (data.type === 'adb') {
        const adbCommand = data.command;
        // Execute directly into Android shell
        exec(\`adb -s \${ADB_TARGET} shell \${adbCommand}\`, (err) => {
          if (err) console.error('ADB error:', err.message);
        });
      }

      // Handle WebRTC Video Pipe Chunks
      if (data.type === 'video_chunk' && data.buffer) {
        const buf = Buffer.from(data.buffer, 'base64');
        ffmpeg.stdin.write(buf);
      }
    } catch (e) {
      console.error('Bridge parse error:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected from bridge');
  });
});

server.listen(WS_PORT, () => {
  console.log(\`✅ Bridge WebSocket running on port \${WS_PORT}\`);
});
`;

  const instructionsCode = `# 1. התקנת מודול מצלמה וירטואלית בשרת הלינוקס (v4l2loopback):
sudo apt update && sudo apt install -y v4l2loopback-dkms ffmpeg adb
sudo modprobe v4l2loopback video_nr=10 card_label="TikTok_Virtual_Cam" exclusive_caps=1

# 2. אימות יצירת התקן המצלמה:
ls -l /dev/video10

# 3. הפעלת מכולות ה-Cloudphone והגשר:
docker-compose up -d

# 4. התחברות לטיקטוק באנדרואיד:
adb connect localhost:5555
# המצלמה בתוך TikTok LIVE תזהה ישירות את /dev/video10!
`;

  const downloadAllFiles = () => {
    const files = [
      { name: 'docker-compose.yml', content: dockerComposeCode },
      { name: 'server.js', content: serverJsCode },
      { name: 'README.md', content: instructionsCode },
    ];

    files.forEach((f) => {
      const blob = new Blob([f.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c1018] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-[#00f2fe] flex items-center justify-center text-white shadow-md">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                הגדרות שרת ענן ואינג'קטור (Cloudphone Bridge)
              </h2>
              <p className="text-xs text-slate-400">
                הזרקת זרם המצלמה והאפקטים לתוך TikTok LIVE ב-Redroid Android 12
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('docker')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'docker'
                ? 'bg-[#fe2c55] text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>docker-compose.yml</span>
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'server'
                ? 'bg-[#00f2fe] text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>server.js (אינג'קטור)</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'instructions'
                ? 'bg-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>מדריך פקודות לינוקס</span>
          </button>

          <button
            onClick={() => setActiveTab('connection')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'connection'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>בדיקת חיבור IP לענן</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 text-sm">
          {/* Architecture Flow Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
            <span className="font-bold text-white">ארכיטקטורת הזרימה:</span>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 flex-wrap">
              <span className="text-[#00f2fe]">מצלמה</span>
              <span>→</span>
              <span className="text-yellow-400">אפקטים (Canvas)</span>
              <span>→</span>
              <span className="text-pink-400">זרם וירטואלי</span>
              <span>→</span>
              <span className="text-emerald-400">/dev/video10</span>
              <span>→</span>
              <span className="text-[#fe2c55] font-bold">TikTok LIVE</span>
            </div>
          </div>

          {activeTab === 'docker' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  קובץ Docker Compose לפריסת Redroid Android 12 עם מיפוי מצלמה וירטואלית ו-ADB:
                </span>
                <button
                  onClick={() => copyToClipboard(dockerComposeCode, 'docker')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'docker' ? 'הועתק!' : 'העתק'}</span>
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 rounded-2xl bg-black/70 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[360px]"
              >
                {dockerComposeCode}
              </pre>
            </div>
          )}

          {activeTab === 'server' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">
                  סקריפט Node.js המקבל את שידור ה-WebRTC ומזרים אותו ל-/dev/video10 + מגע ADB:
                </span>
                <button
                  onClick={() => copyToClipboard(serverJsCode, 'server')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {copiedKey === 'server' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'server' ? 'הועתק!' : 'העתק'}</span>
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 rounded-2xl bg-black/70 border border-slate-800 text-slate-300 font-mono text-xs overflow-x-auto max-h-[360px]"
              >
                {serverJsCode}
              </pre>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">פקודות התקנה מהירה בשרת הלינוקס:</span>
                <button
                  onClick={() => copyToClipboard(instructionsCode, 'instructions')}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  {copiedKey === 'instructions' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'instructions' ? 'הועתק!' : 'העתק'}</span>
                </button>
              </div>
              <pre
                dir="ltr"
                className="p-4 rounded-2xl bg-black/70 border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[360px]"
              >
                {instructionsCode}
              </pre>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white">חיבור לשרת Cloudphone מרוחק</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">כתובת IP של השרת:</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={config.ip}
                      onChange={(e) => onUpdateConfig({ ip: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#00f2fe]"
                      placeholder="192.168.1.100 או IP ענן"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">פורט WebRTC / WebSocket:</label>
                    <input
                      type="number"
                      dir="ltr"
                      value={config.port}
                      onChange={(e) => onUpdateConfig({ port: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#00f2fe]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-slate-300">
                      מצב סימולטור מקומי פעיל (אינטראקטיבי מלא בדפדפן)
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onUpdateConfig({ connected: !config.connected });
                    }}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      config.connected
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-[#fe2c55] text-white shadow-md'
                    }`}
                  >
                    {config.connected ? 'מחובר ל-Cloudphone ✓' : 'התחבר עכשיו'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-t border-slate-800">
          <button
            onClick={downloadAllFiles}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-[#00f2fe]" />
            <span>הורד קבצי שרת (docker-compose & server.js)</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#fe2c55] to-[#ff0055] hover:opacity-95 rounded-xl shadow-md transition-all active:scale-95"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};
