import type { PresetEntry, Scene } from './types';

import butterchurnPresetsRaw from 'butterchurn-presets';
import butterchurnPresetsExtraRaw from 'butterchurn-presets/lib/butterchurnPresetsExtra.min.js';
import butterchurnPresetsExtra2Raw from 'butterchurn-presets/lib/butterchurnPresetsExtra2.min.js';

// UMD modules may or may not be wrapped under .default by Vite's ESM interop.
// Handle both cases.
function unwrapModule(mod: any): { getPresets(): Record<string, object> } {
  if (mod && typeof mod.getPresets === 'function') return mod;
  if (mod && mod.default && typeof mod.default.getPresets === 'function') return mod.default;
  console.error('[LappyCap] Failed to unwrap preset module:', mod);
  return { getPresets: () => ({}) };
}

const butterchurnPresets = unwrapModule(butterchurnPresetsRaw);
const butterchurnPresetsExtra = unwrapModule(butterchurnPresetsExtraRaw);
const butterchurnPresetsExtra2 = unwrapModule(butterchurnPresetsExtra2Raw);

let allPresetsCache: Record<string, object> | null = null;

function getAllPresets(): Record<string, object> {
  if (!allPresetsCache) {
    const base = butterchurnPresets.getPresets();
    const extra = butterchurnPresetsExtra.getPresets();
    const extra2 = butterchurnPresetsExtra2.getPresets();
    allPresetsCache = { ...base, ...extra, ...extra2 };
    console.log(`[LappyCap] Loaded ${Object.keys(base).length} + ${Object.keys(extra).length} + ${Object.keys(extra2).length} = ${Object.keys(allPresetsCache).length} presets`);
  }
  return allPresetsCache;
}

export function loadPresetsForScene(scene: Scene): PresetEntry[] {
  const all = getAllPresets();
  const loaded: PresetEntry[] = [];
  const missing: string[] = [];

  for (const name of scene.presetNames) {
    if (all[name]) {
      loaded.push({ name, preset: all[name] });
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    console.warn(`[LappyCap] ${missing.length} presets not found:`, missing);
  }

  // If we got fewer than 3 presets, pad with random ones from the full library
  if (loaded.length < 3) {
    const allKeys = Object.keys(all);
    while (loaded.length < 8 && allKeys.length > loaded.length) {
      const key = allKeys[Math.floor(Math.random() * allKeys.length)];
      if (!loaded.some(p => p.name === key)) {
        loaded.push({ name: key, preset: all[key] });
      }
    }
    console.warn('[LappyCap] Padded scene with random presets');
  }

  console.log(`[LappyCap] Scene "${scene.name}": ${loaded.length} presets loaded, ${missing.length} missing`);
  return loaded;
}

export function getAllPresetNames(): string[] {
  return Object.keys(getAllPresets()).sort();
}
