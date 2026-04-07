import { PresetParseError } from "../core/presets/interfaces";
import type { CastService } from "../integrations/cast/interfaces";
import type { SpotifyProvider } from "../integrations/spotify/interfaces";
import type { PlaybackController, SessionConfig, SessionState } from "./interfaces";

export interface StartSessionResult {
  session: SessionState;
  warnings: string[];
}

export async function startSessionWithFallback(args: {
  controller: PlaybackController;
  castService?: CastService;
  config: SessionConfig;
}): Promise<StartSessionResult> {
  const warnings: string[] = [];
  const { controller, castService, config } = args;

  if (config.outputTarget === "cast_receiver") {
    if (!castService) {
      warnings.push("CAST_UNAVAILABLE");
      const session = controller.start({ ...config, outputTarget: "browser" });
      return { session, warnings };
    }
    try {
      await castService.connect({ appId: "lappycap-mvp" });
    } catch (error) {
      const code =
        error instanceof PresetParseError && error.message.includes("CAST_SDK_NOT_LOADED")
          ? "CAST_SDK_NOT_LOADED"
          : "CAST_UNAVAILABLE";
      warnings.push(code);
      const session = controller.start({ ...config, outputTarget: "browser" });
      return { session, warnings };
    }
  }

  const session = controller.start(config);
  return { session, warnings };
}

export async function syncSpotifyInfluence(args: {
  controller: PlaybackController;
  spotifyProvider: SpotifyProvider;
  sessionId: string;
}): Promise<void> {
  const playback = await args.spotifyProvider.getPlaybackState();
  if (!playback.isPlaying || !playback.trackId) return;
  const features = await args.spotifyProvider.getTrackFeatures(playback.trackId);
  args.controller.applyInfluence(args.sessionId, {
    tempo: features.tempo,
    energy: features.energy,
    valence: features.valence,
  });
}
