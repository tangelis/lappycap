import type { SomaFMChannelsResponse, SomaFMChannel } from "./types";

const CHANNELS_URL = "https://somafm.com/channels.json";

/** Quality suffix for direct Icecast stream path (e.g. "128" or "256") */
export type StreamQuality = "128" | "256";

/**
 * SomaFM direct stream hosts (from their direct stream links).
 * Use first available; fallback for CORS or load balancing.
 */
const ICE_HOSTS = ["https://ice5.somafm.com", "https://ice3.somafm.com"];

/**
 * Fetch SomaFM channel list from the public JSON API.
 */
export async function fetchSomaFMChannels(): Promise<SomaFMChannel[]> {
  const res = await fetch(CHANNELS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`SomaFM channels failed: ${res.status}`);
  const data = (await res.json()) as SomaFMChannelsResponse;
  return data.channels ?? [];
}

/**
 * Build direct Icecast stream URL for a channel.
 * Pattern: https://ice5.somafm.com/{channelId}-{quality}-mp3
 * Uses first ICE host; 128k is widely supported.
 */
export function getStreamUrl(channelId: string, quality: StreamQuality = "128"): string {
  const base = ICE_HOSTS[0];
  return `${base}/${channelId}-${quality}-mp3`;
}
