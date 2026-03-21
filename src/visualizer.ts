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
  private analyserRef: AnalyserNode | null = null;
  private contextLost: boolean = false;
  private hidden: boolean = false;
  private renderErrorCount: number = 0;
  private static readonly MAX_RENDER_ERRORS = 50;

  onPresetChange?: (name: string) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  init(analyser: AnalyserNode): void {
    // Store analyser for WebGL context recovery
    this.analyserRef = analyser;

    this.resize();
    this.createRenderer(analyser);

    window.addEventListener('resize', this.handleResize);

    // ── WebGL context loss/restore handlers ──
    this.canvas.addEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.handleContextRestored);

    // ── Page Visibility API — pause when hidden, resume when visible ──
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  /** Create (or recreate) the butterchurn renderer */
  private createRenderer(analyser: AnalyserNode): void {
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
    this.renderErrorCount = 0;
    console.log('[LappyCap] Visualizer initialized and audio connected');
  }

  /** Cap DPR on mobile to avoid rendering millions of unnecessary pixels */
  private getPixelRatio(): number {
    const dpr = window.devicePixelRatio || 1;
    return isMobile ? Math.min(dpr, 1.5) : dpr;
  }

  private handleResize = (): void => {
    this.resize();
  };

  // ── WebGL context loss recovery ──

  private handleContextLost = (e: Event): void => {
    e.preventDefault(); // Signal browser we intend to restore
    this.contextLost = true;
    console.warn('[LappyCap] WebGL context lost — pausing render loop');
    this.pauseLoop();
  };

  private handleContextRestored = (): void => {
    console.log('[LappyCap] WebGL context restored — reinitializing renderer');
    this.contextLost = false;

    if (this.analyserRef) {
      try {
        this.resize();
        this.createRenderer(this.analyserRef);
        // Restart the loop if we were running before the loss
        if (this.running) {
          this.resumeLoop();
        }
      } catch (err) {
        console.error('[LappyCap] Failed to reinitialize after context restore:', err);
      }
    }
  };

  // ── Page Visibility API ──

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.hidden = true;
      console.log('[LappyCap] Tab hidden — pausing render loop');
      this.pauseLoop();
    } else {
      this.hidden = false;
      console.log('[LappyCap] Tab visible — resuming render loop');
      // Don't resume if WebGL context is still lost
      if (!this.contextLost && this.running) {
        this.resumeLoop();
      }
    }
  };

  // ── Loop pause/resume helpers ──

  /** Cancel the current rAF without clearing the `running` flag */
  private pauseLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  /** Re-enter the rAF loop, resetting the frame timestamp to avoid delta spikes */
  private resumeLoop(): void {
    this.lastRenderTime = 0; // reset so first frame doesn't skip
    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(this.render);
    }
  }

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
    this.pauseLoop();
  }

  /** Set target FPS (lower = slower visuals). Range: 10-60 */
  setSpeed(fps: number): void {
    this.targetFps = Math.max(10, Math.min(60, fps));
  }

  private render = (now: number = 0): void => {
    if (!this.running || !this.renderer || this.contextLost || this.hidden) return;

    // Always schedule the next frame FIRST so errors can't kill the loop
    this.animFrameId = requestAnimationFrame(this.render);

    const interval = 1000 / this.targetFps;
    if (now - this.lastRenderTime < interval) return;
    this.lastRenderTime = now;

    try {
      this.renderer.render();
      // Reset error count on successful render
      if (this.renderErrorCount > 0) this.renderErrorCount = 0;
    } catch (err) {
      this.renderErrorCount++;
      if (this.renderErrorCount <= 5) {
        console.error(`[LappyCap] Render error (${this.renderErrorCount}):`, err);
      } else if (this.renderErrorCount === 6) {
        console.error('[LappyCap] Suppressing further render errors (too many consecutive failures)');
      }
      // If we hit MAX_RENDER_ERRORS consecutive failures, stop to avoid burning CPU
      if (this.renderErrorCount >= Visualizer.MAX_RENDER_ERRORS) {
        console.error('[LappyCap] Too many consecutive render errors — stopping loop');
        this.running = false;
        this.pauseLoop();
      }
      // Otherwise the next frame is already scheduled — loop continues
    }
  };

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }
}
