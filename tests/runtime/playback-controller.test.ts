import { describe, expect, it } from "vitest";
import { PlaybackControllerImpl } from "../../src/runtime/playback-controller";
import { MockCompilerGateway } from "../../src/runtime/mocks/mock-compiler-gateway";
import type { ParsedPreset } from "../../src/core/presets/interfaces";
import type { ParsedScene } from "../../src/core/scenes/interfaces";

function createPreset(id: string): ParsedPreset {
  return {
    id,
    name: id,
    schemaVersion: "preset.v1",
    bpmRange: [90, 120],
    tags: ["mellow"],
    palette: { base: "#000000" },
    effectChain: [{ id: "stage1", type: "gradient_horizon", params: { speed: 0.1 } }],
    audioMap: [{ source: "low", target: "blob_scale", gain: 0.25 }],
    warnings: [],
  };
}

function createScene(): ParsedScene {
  return {
    id: "sunday-morning-vibes",
    name: "Sunday Morning Vibes",
    schemaVersion: "scene.v1",
    targetBpm: [90, 120],
    cycleMode: "hybrid",
    defaultTransition: { type: "crossfade", easing: "cosine", durationSec: 12 },
    cues: [
      { order: 1, presetId: "sunrise-glow", minDurationSec: 45, maxDurationSec: 90, intensity: "low" },
      { order: 2, presetId: "sunset-haze", minDurationSec: 60, maxDurationSec: 120, intensity: "medium" },
    ],
    overlays: { vignette: 0.1 },
    warnings: [],
  };
}

describe("PlaybackControllerImpl", () => {
  it("starts a session with first cue preset", () => {
    const gateway = new MockCompilerGateway();
    gateway.seedScene(createScene());
    gateway.seedPreset(createPreset("sunrise-glow"));
    gateway.seedPreset(createPreset("sunset-haze"));

    const controller = new PlaybackControllerImpl({ compilerGateway: gateway, spotifyProvider: { connect: async () => {}, disconnect: async () => {}, getPlaybackState: async () => ({ isPlaying: true, trackId: "x", positionMs: 0 }), getTrackFeatures: async () => ({ tempo: 100, energy: 0.5, valence: 0.5 }) } });
    const session = controller.start({
      sceneId: "sunday-morning-vibes",
      audioSource: "spotify",
      outputTarget: "browser",
    });

    expect(session.status).toBe("running");
    expect(session.activePresetId).toBe("sunrise-glow");
  });

  it("moves to next cue and wraps around", () => {
    const gateway = new MockCompilerGateway();
    gateway.seedScene(createScene());
    gateway.seedPreset(createPreset("sunrise-glow"));
    gateway.seedPreset(createPreset("sunset-haze"));
    const controller = new PlaybackControllerImpl({ compilerGateway: gateway });

    const session = controller.start({
      sceneId: "sunday-morning-vibes",
      audioSource: "demo",
      outputTarget: "browser",
    });

    const second = controller.next(session.sessionId);
    expect(second.activePresetId).toBe("sunset-haze");
    const wrapped = controller.next(session.sessionId);
    expect(wrapped.activePresetId).toBe("sunrise-glow");
  });
});
