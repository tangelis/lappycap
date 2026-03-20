export class AudioManager {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null = null;
  private mediaElSource: MediaElementAudioSourceNode | null = null;
  private audioEl: HTMLAudioElement;
  private micStream: MediaStream | null = null;
  private usingMic: boolean = false;

  constructor(audioEl: HTMLAudioElement) {
    this.audioEl = audioEl;
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
      this.analyser = this.context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;

      // Gain node sits between analyser and destination
      // so we can mute output for mic mode (prevent feedback)
      this.gainNode = this.context.createGain();
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  getAnalyser(): AnalyserNode {
    this.ensureContext();
    return this.analyser!;
  }

  async loadURL(url: string): Promise<void> {
    this.stopMic();
    const ctx = this.ensureContext();

    // Disconnect previous source
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }

    this.audioEl.src = url;
    this.audioEl.crossOrigin = 'anonymous';

    // MediaElementSource can only be created once per element per context
    if (!this.mediaElSource) {
      this.mediaElSource = ctx.createMediaElementSource(this.audioEl);
    }
    this.source = this.mediaElSource;
    this.source.connect(this.analyser!);

    // Enable output for URL audio
    this.usingMic = false;
    this.gainNode!.gain.value = 1;

    await this.audioEl.play();
  }

  async startMic(): Promise<void> {
    const ctx = this.ensureContext();

    // Disconnect previous source
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    this.audioEl.pause();
    this.audioEl.src = '';

    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = ctx.createMediaStreamSource(this.micStream);
    this.source.connect(this.analyser!);

    // Mute output to prevent feedback — analyser still gets data
    this.usingMic = true;
    this.gainNode!.gain.value = 0;
  }

  stopMic(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }
    if (this.usingMic) {
      this.usingMic = false;
      if (this.gainNode) this.gainNode.gain.value = 1;
    }
  }

  get isMicActive(): boolean {
    return this.usingMic;
  }

  setVolume(v: number): void {
    this.audioEl.volume = Math.max(0, Math.min(1, v));
  }

  /** Set smoothing 0-1 (higher = smoother/slower audio reactivity) */
  setSmoothing(v: number): void {
    if (this.analyser) {
      this.analyser.smoothingTimeConstant = Math.max(0, Math.min(0.98, v));
    }
  }

  destroy(): void {
    this.stopMic();
    if (this.source) this.source.disconnect();
    if (this.context) this.context.close();
  }
}
