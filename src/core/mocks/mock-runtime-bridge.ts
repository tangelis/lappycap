import type { ParsedPreset } from "../presets/interfaces";
import type { ParsedScene } from "../scenes/interfaces";

export interface RuntimeBridge {
  registerPreset(preset: ParsedPreset): void;
  registerScene(scene: ParsedScene): void;
}

export class MockRuntimeBridge implements RuntimeBridge {
  readonly presets: ParsedPreset[] = [];
  readonly scenes: ParsedScene[] = [];

  registerPreset(preset: ParsedPreset): void {
    this.presets.push(preset);
  }

  registerScene(scene: ParsedScene): void {
    this.scenes.push(scene);
  }
}
