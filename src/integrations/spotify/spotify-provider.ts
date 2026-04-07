import { PresetParseError } from "../../core/presets/interfaces";
import type { PlaybackState, SpotifyProvider, TrackFeatures } from "./interfaces";

interface SpotifyProviderOptions {
  connected?: boolean;
  playbackStateResolver?: () => Promise<PlaybackState>;
  trackFeaturesResolver?: (trackId: string) => Promise<TrackFeatures>;
}

const DEFAULT_FEATURES: TrackFeatures = {
  tempo: 100,
  energy: 0.5,
  valence: 0.5,
};

export class SpotifyProviderImpl implements SpotifyProvider {
  private connected = false;
  private readonly playbackStateResolver?: SpotifyProviderOptions["playbackStateResolver"];
  private readonly trackFeaturesResolver?: SpotifyProviderOptions["trackFeaturesResolver"];

  constructor(options: SpotifyProviderOptions = {}) {
    this.connected = options.connected ?? false;
    this.playbackStateResolver = options.playbackStateResolver;
    this.trackFeaturesResolver = options.trackFeaturesResolver;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async getPlaybackState(): Promise<PlaybackState> {
    this.assertConnected();
    if (this.playbackStateResolver) {
      return this.playbackStateResolver();
    }
    return {
      isPlaying: true,
      trackId: "spotify:track:mock",
      positionMs: 0,
    };
  }

  async getTrackFeatures(trackId: string): Promise<TrackFeatures> {
    this.assertConnected();
    if (!trackId) {
      throw new PresetParseError("INVALID_ARGUMENT", "Track id is required.");
    }
    if (this.trackFeaturesResolver) {
      return this.trackFeaturesResolver(trackId);
    }
    return DEFAULT_FEATURES;
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw new PresetParseError("AUDIO_SOURCE_UNAVAILABLE", "SPOTIFY_NOT_CONNECTED");
    }
  }
}
