export interface PlaybackState {
  isPlaying: boolean;
  trackId: string | null;
  positionMs: number;
}

export interface TrackFeatures {
  tempo: number;
  energy: number;
  valence: number;
}

export interface SpotifyProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getPlaybackState(): Promise<PlaybackState>;
  getTrackFeatures(trackId: string): Promise<TrackFeatures>;
}
