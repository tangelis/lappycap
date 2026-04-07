import type { ParsedPreset } from "../../core/presets/interfaces";
import type { ParsedScene } from "../../core/scenes/interfaces";
import type { CompilerGateway } from "../interfaces";

export class MockCompilerGateway implements CompilerGateway {
  private readonly scenes = new Map<string, ParsedScene>();
  private readonly presets = new Map<string, ParsedPreset>();

  seedScene(scene: ParsedScene): void {
    this.scenes.set(scene.id, scene);
  }

  seedPreset(preset: ParsedPreset): void {
    this.presets.set(preset.id, preset);
  }

  getScene(sceneId: string): ParsedScene | null {
    return this.scenes.get(sceneId) ?? null;
  }

  getPreset(presetId: string): ParsedPreset | null {
    return this.presets.get(presetId) ?? null;
  }
}
