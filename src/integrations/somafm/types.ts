/**
 * SomaFM channel list from https://somafm.com/channels.json
 */
export interface SomaFMPlaylistEntry {
  url: string;
  format: string;
  quality: string;
}

export interface SomaFMChannel {
  id: string;
  title: string;
  description: string;
  genre: string;
  image: string;
  playlists: SomaFMPlaylistEntry[];
  listeners?: string;
  lastPlaying?: string;
}

export interface SomaFMChannelsResponse {
  channels: SomaFMChannel[];
}

/**
 * Live audio analysis for visualizer (frequency bands + amplitude).
 * Values are 0–1 normalized where applicable.
 */
export interface LiveAudioData {
  /** Overall level (RMS-like), 0–1 */
  level: number;
  /** Frequency bands (e.g. 8 bars: low to high). 0–1 each. */
  frequencyBands: number[];
  /** Raw FFT bin count used for frequencyBands */
  fftSize: number;
  /** Time-domain waveform slice (optional), -1 to 1 */
  waveform: number[];
}
