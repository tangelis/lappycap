import { describe, expect, it } from "vitest";
import { PresetCompilerImpl } from "../../src/core/presets/preset-parser";
import { SceneCompilerImpl } from "../../src/core/scenes/scene-parser";
import { CompilerRuntimeGateway } from "../../src/integration/compiler-runtime-gateway";
import { PlaybackControllerImpl } from "../../src/runtime/playback-controller";

const SUNRISE_PRESET = `schema: preset.v1
id: sunrise-glow
name: Sunrise Glow
bpm: 90-120
tags: mellow,sunrise,warm

[palette]
base=#201a2e
accent=#ffb36b
highlight=#ffe9b5

[audio]
low=blob_scale*0.25
mid=fractal_mix*0.40
high=bloom_gain*0.30
wave=phase_shift*0.20

[stages]
stage1=gradient_horizon(speed=0.08, drift=0.12)
stage2=film_grain(amount=0.05)`;

const SUNSET_PRESET = `schema: preset.v1
id: sunset-haze
name: Sunset Haze
bpm: 90-120
tags: mellow,sunset,warm

[palette]
base=#1f1933
accent=#f28772
highlight=#ffd4b8

[audio]
low=blob_scale*0.30
mid=fractal_mix*0.25
high=bloom_gain*0.35
wave=phase_shift*0.15

[stages]
stage1=gradient_horizon(speed=0.06, drift=0.10)
stage2=film_grain(amount=0.06)`;

const SUNDAY_SCENE = `schema: scene.v1
id: sunday-morning-vibes
name: Sunday Morning Vibes
target_bpm: 90-120
cycle_mode: hybrid
default_transition: crossfade(cosine,8s)

[cues]
1: sunrise-glow duration=45-90s intensity=low
2: sunset-haze duration=60-120s intensity=medium

[overlays]
film_grain=0.03
vignette=0.08`;

describe("CompilerRuntimeGateway integration", () => {
  it("loads real preset and scene sources into runtime gateway", () => {
    const gateway = new CompilerRuntimeGateway({
      presetCompiler: new PresetCompilerImpl(),
      sceneCompiler: new SceneCompilerImpl(),
    });

    const result = gateway.loadSources({
      presets: [SUNRISE_PRESET, SUNSET_PRESET],
      scenes: [SUNDAY_SCENE],
    });

    expect(result.presetsLoaded).toBe(2);
    expect(result.scenesLoaded).toBe(1);
    expect(gateway.getScene("sunday-morning-vibes")?.cues).toHaveLength(2);
    expect(gateway.getPreset("sunrise-glow")?.schemaVersion).toBe("preset.v1");
  });

  it("runs playback transitions using compiled gateway data", () => {
    const gateway = new CompilerRuntimeGateway({
      presetCompiler: new PresetCompilerImpl(),
      sceneCompiler: new SceneCompilerImpl(),
    });
    gateway.loadSources({
      presets: [SUNRISE_PRESET, SUNSET_PRESET],
      scenes: [SUNDAY_SCENE],
    });

    const controller = new PlaybackControllerImpl({ compilerGateway: gateway });
    const session = controller.start({
      sceneId: "sunday-morning-vibes",
      audioSource: "demo",
      outputTarget: "browser",
    });

    expect(session.activePresetId).toBe("sunrise-glow");
    const next = controller.next(session.sessionId);
    expect(next.activePresetId).toBe("sunset-haze");
  });
});
