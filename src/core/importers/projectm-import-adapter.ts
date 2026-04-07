import type { ImportDiagnostic, ImportResult, ProjectMImportAdapter } from "./interfaces";
import type { ParsedPreset } from "../presets/interfaces";
import { PresetParseError } from "../presets/interfaces";
import { assertPresetIsValid } from "../presets/preset-validator";

function coerceId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function deriveBpmRange(lines: string[]): [number, number] {
  const tempoLine = lines.find((line) => /^f(?:Decay|WaveAlpha|VideoEchoZoom)=/i.test(line));
  if (!tempoLine) return [90, 120];
  const match = tempoLine.match(/=(-?\d+(?:\.\d+)?)/);
  const scalar = match ? Number(match[1]) : 0.5;
  // Keep v1 simple: map scalar into mellow-friendly BPM range.
  const min = Math.max(70, Math.round(80 + scalar * 20));
  const max = Math.max(min + 10, Math.round(min + 30));
  return [min, max];
}

export function importProjectMPreset(source: string): ImportResult {
  if (!source || source.trim().length === 0) {
    throw new PresetParseError("INVALID_ARGUMENT", "projectM source cannot be empty.");
  }

  const lines = source.split(/\r?\n/).map((line) => line.trim());
  const diagnostics: ImportDiagnostic[] = [];
  const titleLine = lines.find((line) => /^fPresetName=/i.test(line));
  const name = titleLine?.split("=")[1]?.replace(/^["']|["']$/g, "").trim() || "Imported projectM preset";
  const id = coerceId(name) || "imported-projectm-preset";

  const unsupportedTokens = ["warp", "wavecode", "comp", "per_pixel", "shader"];
  for (const token of unsupportedTokens) {
    if (lines.some((line) => line.toLowerCase().includes(token))) {
      diagnostics.push({
        code: "UNSUPPORTED_FEATURE",
        message: `Feature token '${token}' is not fully supported in v1 import.`,
      });
    }
  }

  const bpmRange = deriveBpmRange(lines);
  const parsed: ParsedPreset = {
    id,
    name,
    schemaVersion: "preset.v1",
    bpmRange,
    tags: ["imported", "projectm-compatible"],
    palette: {
      base: "#1b2230",
      accent: "#7fd9ff",
      highlight: "#ffd69b",
    },
    audioMap: [
      { source: "low", target: "blob_scale", gain: 0.25 },
      { source: "mid", target: "fractal_mix", gain: 0.35 },
      { source: "high", target: "bloom_gain", gain: 0.2 },
      { source: "wave", target: "phase_shift", gain: 0.2 },
    ],
    effectChain: [
      { id: "stage1", type: "gradient_horizon", params: { speed: 0.08, drift: 0.12 } },
      { id: "stage2", type: "fractal_bloom", params: { zoom: 1.01, mix: 0.42 } },
      { id: "stage3", type: "film_grain", params: { amount: 0.04 } },
    ],
    warnings: diagnostics.map((item) => ({
      code: "PARSE_ERROR",
      message: item.message,
    })),
  };

  return {
    preset: assertPresetIsValid(parsed),
    diagnostics,
  };
}

export class ProjectMImportAdapterImpl implements ProjectMImportAdapter {
  importToLappycap(source: string): ImportResult {
    return importProjectMPreset(source);
  }
}
