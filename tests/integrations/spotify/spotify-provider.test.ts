import { describe, expect, it } from "vitest";
import { SpotifyProviderImpl } from "../../../src/integrations/spotify/spotify-provider";

describe("SpotifyProviderImpl", () => {
  it("returns playback and feature metadata when connected", async () => {
    const provider = new SpotifyProviderImpl({
      connected: true,
      playbackStateResolver: async () => ({
        isPlaying: true,
        trackId: "spotify:track:abc",
        positionMs: 1234,
      }),
      trackFeaturesResolver: async () => ({
        tempo: 108.4,
        energy: 0.54,
        valence: 0.61,
      }),
    });

    const playback = await provider.getPlaybackState();
    const features = await provider.getTrackFeatures(playback.trackId!);

    expect(playback.isPlaying).toBe(true);
    expect(features.tempo).toBeCloseTo(108.4, 1);
  });

  it("throws when not connected", async () => {
    const provider = new SpotifyProviderImpl();
    await expect(provider.getPlaybackState()).rejects.toThrow(/SPOTIFY_NOT_CONNECTED/);
  });
});
