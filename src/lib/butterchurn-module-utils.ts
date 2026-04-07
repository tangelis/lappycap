export type ButterchurnRendererFactory = {
  createVisualizer: (...args: unknown[]) => unknown;
};

export type PresetModule = {
  getPresets: () => Record<string, object>;
};

/** UMD / ESM interop for butterchurn. */
export function unwrapVisualizerModule(mod: unknown): ButterchurnRendererFactory {
  const m = mod as {
    createVisualizer?: (...args: unknown[]) => unknown;
    default?: { createVisualizer?: (...args: unknown[]) => unknown };
  };
  if (typeof m?.createVisualizer === "function") return { createVisualizer: m.createVisualizer };
  if (typeof m?.default?.createVisualizer === "function") return { createVisualizer: m.default.createVisualizer };
  throw new Error("Failed to load butterchurn visualizer module.");
}

/** UMD / ESM interop for butterchurn-presets bundles. */
export function unwrapPresetModule(mod: unknown): PresetModule {
  const m = mod as {
    getPresets?: () => Record<string, object>;
    default?: { getPresets?: () => Record<string, object> };
  };
  if (typeof m?.getPresets === "function") return { getPresets: m.getPresets };
  if (typeof m?.default?.getPresets === "function") return { getPresets: m.default.getPresets };
  return { getPresets: () => ({}) };
}

/** Pick a different preset index than `current` (uniform random). */
export function pickPresetIndex(current: number, total: number, random: () => number = Math.random): number {
  if (total <= 1) return 0;
  let next = current;
  while (next === current) next = Math.floor(random() * total);
  return next;
}
