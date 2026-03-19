import type { Scene, PresetEntry } from './types';

export class SceneManager {
  private scene: Scene;
  private presets: PresetEntry[] = [];
  private currentIndex: number = 0;
  private cycleTimer: ReturnType<typeof setTimeout> | null = null;
  private shuffle: boolean;
  private cycleDuration: number;
  private blendDuration: number;
  private playOrder: number[] = [];

  onPresetCycle?: (preset: PresetEntry, blendDuration: number) => void;
  onPresetInfo?: (index: number, total: number) => void;

  constructor(scene: Scene) {
    this.scene = scene;
    this.shuffle = scene.order === 'shuffle';
    this.cycleDuration = scene.cycleDuration;
    this.blendDuration = scene.blendDuration;
  }

  setPresets(presets: PresetEntry[]): void {
    this.presets = presets;
    this.buildPlayOrder();
    this.currentIndex = 0;
  }

  private buildPlayOrder(): void {
    this.playOrder = Array.from({ length: this.presets.length }, (_, i) => i);
    if (this.shuffle) {
      // Fisher-Yates shuffle
      for (let i = this.playOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.playOrder[i], this.playOrder[j]] = [this.playOrder[j], this.playOrder[i]];
      }
    }
  }

  getCurrentPreset(): PresetEntry | null {
    if (this.presets.length === 0) return null;
    return this.presets[this.playOrder[this.currentIndex]];
  }

  start(): void {
    if (this.presets.length === 0) return;

    // Load first preset immediately (no blend)
    const first = this.getCurrentPreset();
    if (first) {
      this.onPresetCycle?.(first, 0);
      this.emitInfo();
    }
    this.scheduleCycle();
  }

  stop(): void {
    if (this.cycleTimer) {
      clearTimeout(this.cycleTimer);
      this.cycleTimer = null;
    }
  }

  next(): void {
    this.stop();
    this.advance(1);
    this.scheduleCycle();
  }

  prev(): void {
    this.stop();
    this.advance(-1);
    this.scheduleCycle();
  }

  private advance(direction: number): void {
    if (this.presets.length === 0) return;
    this.currentIndex = (this.currentIndex + direction + this.playOrder.length) % this.playOrder.length;

    // Reshuffle when wrapping around
    if (this.currentIndex === 0 && this.shuffle) {
      this.buildPlayOrder();
    }

    const preset = this.getCurrentPreset();
    if (preset) {
      this.onPresetCycle?.(preset, this.blendDuration);
      this.emitInfo();
    }
  }

  private scheduleCycle(): void {
    this.cycleTimer = setTimeout(() => {
      this.advance(1);
      this.scheduleCycle();
    }, this.cycleDuration * 1000);
  }

  private emitInfo(): void {
    this.onPresetInfo?.(this.currentIndex + 1, this.presets.length);
  }

  toggleShuffle(): boolean {
    this.shuffle = !this.shuffle;
    if (this.shuffle) this.buildPlayOrder();
    else this.playOrder = Array.from({ length: this.presets.length }, (_, i) => i);
    return this.shuffle;
  }

  setCycleDuration(seconds: number): void {
    this.cycleDuration = seconds;
    // Restart timer with new duration
    if (this.cycleTimer) {
      this.stop();
      this.scheduleCycle();
    }
  }

  setBlendDuration(seconds: number): void {
    this.blendDuration = seconds;
  }

  getScene(): Scene {
    return this.scene;
  }
}
