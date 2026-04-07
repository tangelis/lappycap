import type { SomaFMChannel } from "./types";

/** Prefer Groove Salad when present; otherwise first channel. */
export function resolveDefaultSomaFMChannel(channels: SomaFMChannel[]): SomaFMChannel | null {
  if (channels.length === 0) return null;
  return channels.find((c) => c.id === "groovesalad") ?? channels[0]!;
}
