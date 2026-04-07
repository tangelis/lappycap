import type { VisualizerQualityProfile } from "@/components/visualizer-quality";

/** How often lean-back UI syncs live level / spectrum from the audio thread (ms). */
export const LEANBACK_LIVE_UI_INTERVAL_MS = 220;

/**
 * Caps WebGL load and strips compositor-heavy overlay hints for 10-foot / SoC devices.
 * Keeps Butterchurn when the base profile allows it; otherwise stays on ambient fallback.
 */
export function polishProfileForLeanBack(profile: VisualizerQualityProfile): VisualizerQualityProfile {
  const tier = profile.tier;
  const useBc = profile.useButterchurn;
  const label =
    tier === "fallback"
      ? "Lean-back · Ambient"
      : tier === "performance"
        ? "Lean-back · Smooth"
        : tier === "balanced"
          ? "Lean-back · Balanced"
          : "Lean-back · Full";

  return {
    ...profile,
    label,
    targetFps: Math.min(profile.targetFps, 24),
    meshWidth: useBc ? Math.max(12, Math.min(profile.meshWidth, 20)) : 0,
    meshHeight: useBc ? Math.max(10, Math.min(profile.meshHeight, 15)) : 0,
    pixelRatioCap: 1,
    showBackdropBlur: false,
    showAnimatedOverlay: false,
    showFrequencyBars: profile.showFrequencyBars,
    frequencyBarCount: Math.min(profile.frequencyBarCount, 4),
    overlayOpacity: 0,
    showFrequencyBarGlow: false,
    useStrictContainment: true,
  };
}
