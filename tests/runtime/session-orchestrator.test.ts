import { describe, expect, it } from "vitest";
import { MockCompilerGateway } from "../../src/runtime/mocks/mock-compiler-gateway";
import { PlaybackControllerImpl } from "../../src/runtime/playback-controller";
import { startSessionWithFallback, syncSpotifyInfluence } from "../../src/runtime/session-orchestrator";
import { CastServiceImpl } from "../../src/integrations/cast/cast-service";
import { SpotifyProviderImpl } from "../../src/integrations/spotify/spotify-provider";
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
    defaultTransition: { type: "crossfade", easing: "cosine", durationSec: 8 },
    cues: [{ order: 1, presetId: "sunrise-glow", minDurationSec: 45, maxDurationSec: 90, intensity: "low" }],
    overlays: { vignette: 0.1 },
    warnings: [],
  };
}

function seededController(): PlaybackControllerImpl {
  const gateway = new MockCompilerGateway();
  gateway.seedScene(createScene());
  gateway.seedPreset(createPreset("sunrise-glow"));
  return new PlaybackControllerImpl({ compilerGateway: gateway });
}

describe("session orchestrator", () => {
  it("falls back to browser output when cast is unavailable", async () => {
    const controller = seededController();
    const cast = new CastServiceImpl({ sdkAvailable: false });

    const result = await startSessionWithFallback({
      controller,
      castService: cast,
      config: {
        sceneId: "sunday-morning-vibes",
        audioSource: "demo",
        outputTarget: "cast_receiver",
      },
    });

    expect(result.session.outputTarget).toBe("browser");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("syncs spotify metadata influence into playback controller", async () => {
    const controller = seededController();
    const session = controller.start({
      sceneId: "sunday-morning-vibes",
      audioSource: "demo",
      outputTarget: "browser",
    });
    const spotify = new SpotifyProviderImpl({
      connected: true,
      playbackStateResolver: async () => ({
        isPlaying: true,
        trackId: "spotify:track:abc",
        positionMs: 1000,
      }),
      trackFeaturesResolver: async () => ({
        tempo: 111.2,
        energy: 0.62,
        valence: 0.57,
      }),
    });

    await syncSpotifyInfluence({
      controller,
      spotifyProvider: spotify,
      sessionId: session.sessionId,
    });

    const influence = controller.getInfluence(session.sessionId);
    expect(influence?.tempo).toBeCloseTo(111.2, 1);
    expect(influence?.energy).toBeCloseTo(0.62, 2);
  });
});
