import type { PlaybackController } from "../../runtime/interfaces";

/** Fixed “mock Spotify features” for reproducible demos and tests. */
const MOCK_FEATURES = {
  tempo: 108,
  energy: 0.42,
  valence: 0.73,
} as const;

/**
 * Applies deterministic tempo / energy / valence as playback influence (no live Spotify).
 */
export async function applyMockSpotifyInfluence(
  controller: PlaybackController,
  sessionId: string,
): Promise<void> {
  controller.applyInfluence(sessionId, { ...MOCK_FEATURES });
}
