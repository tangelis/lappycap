import type { PresetEntry } from './types';

// butterchurn UMD wraps under .default — Vite may or may not unwrap it
import butterchurnImport from 'butterchurn';
const butterchurn = (() => {
  const mod = butterchurnImport as any;
  if (typeof mod.createVisualizer === 'function') return mod;
  if (mod.default && typeof mod.default.createVisualizer === 'function') return mod.default;
  console.error('[LappyCap] butterchurn import structure:', Object.keys(mod), mod);
  throw new Error('Failed to resolve butterchurn.createVisualizer');
})();

interface ButterchurnRenderer {
  connectAudio(node: AudioNode): void;
  loadPreset(preset: object, blendTime: number): void;
  setRendererSize(width: number, height: number): void;
  render(): void;
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export class Visualizer {
  private renderer: ButterchurnRenderer | null = null;
  private canvas: HTMLCanvasElement;
  private animFrameId: number = 0;
  private running: boolean = false;
  private targetFps: number = isMobile ? 30 : 60;
  private lastRenderTime: number = 0;

  onPresetChange?: (name: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  init(analyser: AnalyserNode): void {
    this.resize();

    // Mobile: reduce mesh density and cap DPR to keep GPU happy
    const mesh = isMobile
      ? { meshWidth: 24, meshHeight: 18 }
      : { meshWidth: 48, meshHeight: 36 };

    console.log(`[LappyCap] Init butterchurn: ${this.canvas.width}x${this.canvas.height}, mobile=${isMobile}, mesh=${mesh.meshWidth}x${mesh.meshHeight}`);

    try {
      this.renderer = butterchurn.createVisualizer(
        analyser.context,
        this.canvas,
        {
          width: this.canvas.width,
          height: this.canvas.height,
          ...mesh,
          pixelRatio: this.getPixelRatio(),
        }
      );
    } catch (err) {
      console.error('[LappyCap] butterchurn.createVisualizer failed:', err);
      throw err;
    }

    this.renderer!.connectAudio(analyser);
    console.log('[LappyCap] Visualizer initialized and audio connected');

    window.addEventListener('resize', this.handleResize);
  }

  /** Cap DPR on mobile to avoid rendering millions of unnecessary pixels */
  private getPixelRatio(): number {
    const dpr = window.devicePixelRatio || 1;
    return isMobile ? Math.min(dpr, 1.5) : dpr;
  }

  private handleResize = (): void => {
    this.resize();
  };

  resize(): void {
    const dpr = this.getPixelRatio();
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;

    if (this.renderer) {
      this.renderer.setRendererSize(this.canvas.width, this.canvas.height);
    }
  }

  loadPreset(preset: PresetEntry, blendDuration: number = 0): void {
    if (!this.renderer) return;
    this.renderer.loadPreset(preset.preset, blendDuration);
    this.onPresetChange?.(preset.name);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.render();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  /** Set target FPS (lower = slower visuals). Range: 10-60 */
  setSpeed(fps: number): void {
    this.targetFps = Math.max(10, Math.min(60, fps));
  }

  private render = (now: number = 0): void => {
    if (!this.running || !this.renderer) return;
    this.animFrameId = requestAnimationFrame(this.render);

    const interval = 1000 / this.targetFps;
    if (now - this.lastRenderTime < interval) return;
    this.lastRenderTime = now;

    this.renderer.render();
  };

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
  }
}
