import type { PresetCompiler, ParsedPreset } from "../core/presets/interfaces";
import type { SceneCompiler, ParsedScene } from "../core/scenes/interfaces";
import type { CompilerGateway } from "../runtime/interfaces";

export interface GatewayLoadResult {
  presetsLoaded: number;
  scenesLoaded: number;
}

export class CompilerRuntimeGateway implements CompilerGateway {
  private readonly presetCompiler: PresetCompiler;
  private readonly sceneCompiler: SceneCompiler;
  private readonly presets = new Map<string, ParsedPreset>();
  private readonly scenes = new Map<string, ParsedScene>();

  constructor(args: { presetCompiler: PresetCompiler; sceneCompiler: SceneCompiler }) {
    this.presetCompiler = args.presetCompiler;
    this.sceneCompiler = args.sceneCompiler;
  }

  loadSources(args: { presets: string[]; scenes: string[] }): GatewayLoadResult {
    for (const source of args.presets) {
      const parsed = this.presetCompiler.parsePreset(source);
      this.presets.set(parsed.id, parsed);
    }

    for (const source of args.scenes) {
      const parsed = this.sceneCompiler.parseScene(source);
      this.scenes.set(parsed.id, parsed);
    }

    return {
      presetsLoaded: args.presets.length,
      scenesLoaded: args.scenes.length,
    };
  }

  getScene(sceneId: string): ParsedScene | null {
    return this.scenes.get(sceneId) ?? null;
  }

  getPreset(presetId: string): ParsedPreset | null {
    return this.presets.get(presetId) ?? null;
  }
}
