import {
  BLEND_PRESET_VALUES,
  DEFAULT_BUTTERCHURN_TUNING,
  MOTION_PRESET_VALUES,
  type ButterchurnTuning,
} from "@/components/butterchurn-config";
import type { SomaFMChannel } from "./types";

export interface StationVisualProfile {
  label: string;
  tuning: ButterchurnTuning;
}

function textForChannel(channel: SomaFMChannel): string {
  return `${channel.id} ${channel.title} ${channel.genre} ${channel.description}`.toLowerCase();
}

export function resolveStationVisualProfile(channel: SomaFMChannel | null): StationVisualProfile {
  if (!channel) {
    return {
      label: "Sunday Morning",
      tuning: DEFAULT_BUTTERCHURN_TUNING,
    };
  }

  const text = textForChannel(channel);

  if (
    /ambient|drone|space|cosmic|deepspace|lush|groovesalad|spacestation|meditation/.test(text)
  ) {
    return {
      label: "Cosmic Drift",
      tuning: {
        presetMode: "cosmic-drift",
        motionPreset: "slow-cinema",
        blendPreset: "dreamy",
        ...MOTION_PRESET_VALUES["slow-cinema"],
        ...BLEND_PRESET_VALUES.dreamy,
      },
    };
  }

  if (
    /idm|glitch|electronic|house|trip|vapor|beat|defcon|cliqhop|fluid|progressive/.test(text)
  ) {
    return {
      label: "Liquid Organic",
      tuning: {
        presetMode: "liquid-organic",
        motionPreset: "balanced-flow",
        blendPreset: "classic",
        ...MOTION_PRESET_VALUES["balanced-flow"],
        ...BLEND_PRESET_VALUES.classic,
      },
    };
  }

  if (/jazz|lounge|soul|roots|americana|seventies|oldies|bootliquor|7soul/.test(text)) {
    return {
      label: "Sunday Morning",
      tuning: {
        presetMode: "sunday-morning",
        motionPreset: "milkdrop-smooth",
        blendPreset: "silky",
        ...MOTION_PRESET_VALUES["milkdrop-smooth"],
        ...BLEND_PRESET_VALUES.silky,
      },
    };
  }

  return {
    label: "Milkdrop Smooth",
    tuning: {
      presetMode: "milkdrop-smooth",
      motionPreset: "milkdrop-smooth",
      blendPreset: "classic",
      ...MOTION_PRESET_VALUES["milkdrop-smooth"],
      ...BLEND_PRESET_VALUES.classic,
    },
  };
}

export function getNextSomaFMChannel(
  channels: SomaFMChannel[],
  currentChannelId?: string | null
): SomaFMChannel | null {
  if (channels.length === 0) return null;
  if (!currentChannelId) return channels[0] ?? null;
  const index = channels.findIndex((channel) => channel.id === currentChannelId);
  if (index === -1) return channels[0] ?? null;
  return channels[(index + 1) % channels.length] ?? null;
}

export function getRandomSomaFMChannel(
  channels: SomaFMChannel[],
  currentChannelId?: string | null,
  random: () => number = Math.random
): SomaFMChannel | null {
  if (channels.length === 0) return null;
  if (channels.length === 1) return channels[0] ?? null;

  let next = channels[Math.floor(random() * channels.length)] ?? null;
  while (next && next.id === currentChannelId) {
    next = channels[Math.floor(random() * channels.length)] ?? null;
  }
  return next;
}
