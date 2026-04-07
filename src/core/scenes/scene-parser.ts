import { PresetParseError } from "../presets/interfaces";
import type { ParsedScene, SceneCompiler, SceneCue, TransitionSpec } from "./interfaces";

const FILE_SIZE_LIMIT_BYTES = 32 * 1024;
const ALLOWED_EASINGS = new Set(["linear", "cosine", "cubic", "expo"]);
const ALLOWED_CYCLE_MODES = new Set(["time", "beat", "hybrid"]);
const ALLOWED_INTENSITY = new Set(["low", "medium", "high", "adaptive"]);

function parseBpm(value: string): [number, number] {
  const match = value.match(/^(\d+)\s*-\s*(\d+)$/);
  if (!match) {
    throw new PresetParseError("PARSE_ERROR", "Invalid target_bpm format.");
  }
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    throw new PresetParseError("INVALID_ARGUMENT", "Invalid target_bpm range.");
  }
  return [min, max];
}

function parseTransition(raw: string): TransitionSpec {
  const match = raw.match(/^crossfade\((linear|cosine|cubic|expo),\s*(\d+(?:\.\d+)?)s\)$/);
  if (!match) {
    throw new PresetParseError("TRANSITION_INVALID", "Invalid default_transition format.");
  }
  const easing = match[1];
  const durationSec = Number(match[2]);
  if (!ALLOWED_EASINGS.has(easing) || durationSec < 0.5 || durationSec > 30) {
    throw new PresetParseError("TRANSITION_INVALID", "Transition easing or duration is out of bounds.");
  }
  return {
    type: "crossfade",
    easing: easing as TransitionSpec["easing"],
    durationSec,
  };
}

function parseCue(line: string): SceneCue {
  const match = line.match(
    /^(\d+):\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s+duration=(\d+)-(\d+)s\s+intensity=(low|medium|high|adaptive)$/
  );
  if (!match) {
    throw new PresetParseError("PARSE_ERROR", "Invalid cue line.", undefined, line);
  }
  const order = Number(match[1]);
  const presetId = match[2];
  const minDurationSec = Number(match[3]);
  const maxDurationSec = Number(match[4]);
  const intensity = match[5];

  if (maxDurationSec < minDurationSec || minDurationSec <= 0) {
    throw new PresetParseError("PARSE_ERROR", "Cue duration range is invalid.", undefined, line);
  }
  if (!ALLOWED_INTENSITY.has(intensity)) {
    throw new PresetParseError("PARSE_ERROR", "Cue intensity is invalid.", undefined, line);
  }

  return {
    order,
    presetId,
    minDurationSec,
    maxDurationSec,
    intensity: intensity as SceneCue["intensity"],
  };
}

export function parseSceneText(source: string): ParsedScene {
  if (!source || source.trim().length === 0) {
    throw new PresetParseError("INVALID_ARGUMENT", "Scene source cannot be empty.");
  }
  if (new TextEncoder().encode(source).length > FILE_SIZE_LIMIT_BYTES) {
    throw new PresetParseError(
      "INVALID_ARGUMENT",
      `Scene exceeds ${FILE_SIZE_LIMIT_BYTES / 1024}KB size limit.`
    );
  }

  const lines = source.split(/\r?\n/);
  const header: Record<string, string> = {};
  const overlays: Record<string, number> = {};
  const cues: SceneCue[] = [];
  let section: "none" | "cues" | "overlays" = "none";

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    if (line === "[cues]") {
      section = "cues";
      continue;
    }
    if (line === "[overlays]") {
      section = "overlays";
      continue;
    }

    if (section === "none") {
      const match = raw.match(/^\s*([^=:\s]+)\s*[:=]\s*(.+)\s*$/);
      if (!match) {
        throw new PresetParseError("PARSE_ERROR", "Invalid scene header line.", undefined, raw);
      }
      header[match[1].trim()] = match[2].trim();
      continue;
    }
    if (section === "cues") {
      cues.push(parseCue(line));
      continue;
    }
    if (section === "overlays") {
      const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)=(\d+(?:\.\d+)?)$/);
      if (!match) {
        throw new PresetParseError("PARSE_ERROR", "Invalid overlay line.", undefined, line);
      }
      overlays[match[1]] = Number(match[2]);
    }
  }

  if (header.schema !== "scene.v1") {
    throw new PresetParseError("SCHEMA_UNSUPPORTED", "Only schema 'scene.v1' is supported.");
  }
  if (!header.id || !header.name || !header.target_bpm || !header.default_transition) {
    throw new PresetParseError("PARSE_ERROR", "Scene header requires schema, id, name, target_bpm, and default_transition.");
  }
  if (cues.length === 0) {
    throw new PresetParseError("SCENE_EMPTY", "Scene must contain at least one cue.");
  }

  const cycleMode = header.cycle_mode ?? "hybrid";
  if (!ALLOWED_CYCLE_MODES.has(cycleMode)) {
    throw new PresetParseError("PARSE_ERROR", "Invalid cycle mode.");
  }

  cues.sort((a, b) => a.order - b.order);

  return {
    id: header.id,
    name: header.name,
    schemaVersion: "scene.v1",
    targetBpm: parseBpm(header.target_bpm),
    cycleMode: cycleMode as ParsedScene["cycleMode"],
    defaultTransition: parseTransition(header.default_transition),
    cues,
    overlays,
    warnings: [],
  };
}

export class SceneCompilerImpl implements SceneCompiler {
  parseScene(source: string): ParsedScene {
    return parseSceneText(source);
  }
}
