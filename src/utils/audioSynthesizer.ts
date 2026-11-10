/**
 * WebAudio procedural sound synthesizer & mic analyzer
 * Generates punch impacts, laser zaps, coins chimes, and mixes them into the virtual stream.
 */

class StudioAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private analyser: AnalyserNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Create stream destination for virtual camera audio injection
      this.destNode = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.destNode);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public getMixedAudioTrack(): MediaStreamTrack | null {
    this.initContext();
    return this.destNode?.stream.getAudioTracks()[0] || null;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.85, this.ctx.currentTime);
    }
  }

  /**
   * Powerful Comic Punch Impact: Whoosh + Sub Thud + Crisp Impact Click
   */
  public playPunch(type: 'comic' | 'combo' | 'fire' | 'ko' = 'comic') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Sub Bass Impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = type === 'fire' || type === 'ko' ? 'sawtooth' : 'triangle';

    const startFreq = type === 'ko' ? 320 : type === 'combo' ? 240 : 200;
    const endFreq = 35;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + (type === 'ko' ? 0.35 : 0.22));

    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + (type === 'ko' ? 0.4 : 0.25));

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + (type === 'ko' ? 0.45 : 0.3));

    // 2. White Noise Impact Crackle / Slap
    const bufferSize = this.ctx.sampleRate * (type === 'ko' ? 0.2 : 0.12);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(type === 'ko' ? 1200 : 1800, t);
    filter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + (type === 'ko' ? 0.2 : 0.12));

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Golden Coin / Diamond Chime (TikTok Gift effect)
   */
  public playCoin() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    // Note 1 (B5 ~ 987Hz)
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, t);
    g1.gain.setValueAtTime(0.4, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc1.connect(g1);
    g1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.16);

    // Note 2 (E6 ~ 1318Hz)
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, t + 0.08);
    g2.gain.setValueAtTime(0.5, t + 0.08);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start(t + 0.08);
    osc2.stop(t + 0.46);
  }

  /**
   * Laser Eyes Sci-Fi Beam Zap
   */
  public playLaser() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.28);

    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Confetti / Crowd Cheer fanfare
   */
  public playConfetti() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.04);
      g.gain.setValueAtTime(0.3, t + idx * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.35);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.36);
    });
  }

  /**
   * Dramatic Comic/Snapchat Surprise Sound (Jaw Drop + Energy Surge)
   */
  public playSurprise() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // 1. Rising whoosh/gasp
    const sweep = this.ctx.createOscillator();
    const sweepGain = this.ctx.createGain();
    sweep.type = 'sine';
    sweep.frequency.setValueAtTime(140, t);
    sweep.frequency.exponentialRampToValueAtTime(680, t + 0.18);
    sweepGain.gain.setValueAtTime(0.45, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);
    sweep.connect(sweepGain);
    sweepGain.connect(this.masterGain);
    sweep.start(t);
    sweep.stop(t + 0.24);

    // 2. Shock chord burst (Electric C-Major 7 high arpeggio)
    const shockNotes = [523.25, 659.25, 783.99, 987.77, 1318.51];
    shockNotes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = i === 4 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + 0.08);
      g.gain.setValueAtTime(0.28, t + 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + 0.45);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + 0.08);
      osc.stop(t + 0.55);
    });

    // 3. Sub punch impact
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(160, t + 0.06);
    sub.frequency.exponentialRampToValueAtTime(45, t + 0.25);
    subGain.gain.setValueAtTime(0.6, t + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(t + 0.06);
    sub.stop(t + 0.32);
  }

  /**
   * Magical Rosy Smile Sparkle (Warm Ascending Bells)
   */
  public playSmile() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [659.25, 830.61, 987.77, 1244.51];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.06);
      g.gain.setValueAtTime(0.25, t + idx * 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.25);
      osc.connect(g);
      g.connect(this.masterGain!);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.26);
    });
  }

  /**
   * Star Wink / Blink Twinkle
   */
  public playBlink() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.13);
  }

  /**
   * Connects microphone stream for real-time volume analysis and virtual cam mixing
   */
  public attachMicrophoneStream(stream: MediaStream, onVolume: (vol: number) => void) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    try {
      if (this.micSource) {
        this.micSource.disconnect();
      }
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;

      this.micSource = this.ctx.createMediaStreamSource(stream);
      this.micSource.connect(this.analyser);
      // Route to destination node for stream output, but avoid feedback into local speakers
      if (this.destNode) {
        this.micSource.connect(this.destNode);
      }

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        // Map 0-255 to percentage 0-100
        const percentage = Math.min(100, Math.round((avg / 128) * 100));
        onVolume(percentage);

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.warn('Microphone attach error:', e);
    }
  }

  public attachAudioElement(audioEl: HTMLAudioElement): MediaElementAudioSourceNode | null {
    this.initContext();
    if (!this.ctx || !this.masterGain) return null;
    try {
      const source = this.ctx.createMediaElementSource(audioEl);
      source.connect(this.masterGain);
      return source;
    } catch (e) {
      console.warn('Audio element already connected or failed:', e);
      return null;
    }
  }

  public cleanup() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
    this.ctx = null;
  }
}

export const studioAudio = new StudioAudioManager();
