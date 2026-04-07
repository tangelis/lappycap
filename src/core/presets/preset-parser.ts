import {
  PresetParseError,
  type AudioMapping,
  type EffectStage,
  type ParsedPreset,
  type PresetCompiler,
} from "./interfaces";
import { assertPresetIsValid } from "./preset-validator";

const FORBIDDEN_EXPR_TOKENS = [
  "constructor",
  "__proto__",
  "prototype",
  "Function(",
  "eval(",
  "window.",
  "document.",
  "globalThis",
  "import(",
];

const FILE_SIZE_LIMIT_BYTES = 64 * 1024;
const AUDIO_KEYS = new Set(["low", "mid", "high", "wave"]);

type SectionName = "none" | "palette" | "audio" | "stages";

function requireLineMatch(line: string, regex: RegExp, lineNo: number, message: string): RegExpMatchArray {
  const match = line.match(regex);
  if (!match) {
    throw new PresetParseError("PARSE_ERROR", message, lineNo, line);
  }
  return match;
}

function parseBpm(value: string, lineNo: number): [number, number] {
  const match = requireLineMatch(value.trim(), /^(\d+)\s*-\s*(\d+)$/, lineNo, "Invalid bpm range format.");
  const min = Number(match[1]);
  const max = Number(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
    throw new PresetParseError("INVALID_ARGUMENT", "Preset bpm range is invalid.", lineNo, value);
  }
  return [min, max];
}

function parseAudioMapping(key: string, value: string, lineNo: number): AudioMapping {
  if (!AUDIO_KEYS.has(key)) {
    throw new PresetParseError("PARSE_ERROR", `Invalid audio key '${key}'.`, lineNo, value);
  }
  for (const token of FORBIDDEN_EXPR_TOKENS) {
    if (value.includes(token)) {
      throw new PresetParseError(
        "ILLEGAL_SHADER_EXPRESSION",
        `Expression contains forbidden token '${token}'.`,
        lineNo,
        value
      );
    }
  }

  const match = value.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\*\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    throw new PresetParseError(
      "PARSE_ERROR",
      "Audio mapping must follow format '<target>*<gain>'.",
      lineNo,
      value
    );
  }

  return {
    source: key as AudioMapping["source"],
    target: match[1],
    gain: Number(match[2]),
  };
}

function parseStageParam(raw: string): number | string | boolean {
  const text = raw.trim();
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if (text === "true") return true;
  if (text === "false") return false;
  return text;
}

function parseStage(stageKey: string, stageValue: string, lineNo: number): EffectStage {
  const nameMatch = stageValue.match(/^([a-zA-Z_][a-zA-Z0-9_]*)(?:\((.*)\))?$/);
  if (!nameMatch) {
    throw new PresetParseError("PARSE_ERROR", "Invalid stage expression.", lineNo, stageValue);
  }
  const [, stageType, paramsRaw = ""] = nameMatch;

  for (const token of FORBIDDEN_EXPR_TOKENS) {
    if (paramsRaw.includes(token)) {
      throw new PresetParseError(
        "ILLEGAL_SHADER_EXPRESSION",
        `Stage params contain forbidden token '${token}'.`,
        lineNo,
        stageValue
      );
    }
  }

  const params: Record<string, number | string | boolean> = {};
  if (paramsRaw.trim().length > 0) {
    const parts = paramsRaw.split(",");
    for (const part of parts) {
      const [k, v] = part.split("=").map((item) => item?.trim() ?? "");
      if (!k || !v) {
        throw new PresetParseError("PARSE_ERROR", "Invalid stage parameter.", lineNo, part);
      }
      params[k] = parseStageParam(v);
    }
  }

  return {
    id: stageKey,
    type: stageType,
    params,
  };
}

export function parsePresetText(source: string): ParsedPreset {
  if (!source || source.trim().length === 0) {
    throw new PresetParseError("INVALID_ARGUMENT", "Preset source cannot be empty.");
  }
  if (new TextEncoder().encode(source).length > FILE_SIZE_LIMIT_BYTES) {
    throw new PresetParseError(
      "INVALID_ARGUMENT",
      `Preset exceeds ${FILE_SIZE_LIMIT_BYTES / 1024}KB size limit.`
    );
  }

  const lines = source.split(/\r?\n/);
  let section: SectionName = "none";
  const header: Record<string, string> = {};
  const palette: Record<string, string> = {};
  const audioMap: AudioMapping[] = [];
  const effectChain: EffectStage[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const lineNo = i + 1;
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) continue;

    if (/^\[[a-zA-Z]+\]$/.test(line)) {
      const nextSection = line.slice(1, -1).toLowerCase();
      if (nextSection === "palette" || nextSection === "audio" || nextSection === "stages") {
        section = nextSection as SectionName;
        continue;
      }
      throw new PresetParseError("PARSE_ERROR", `Unknown section '${line}'.`, lineNo);
    }

    const pair = requireLineMatch(rawLine, /^\s*([^=:\s]+)\s*[:=]\s*(.+)\s*$/, lineNo, "Invalid key/value line.");
    const key = pair[1].trim();
    const value = pair[2].trim();

    if (section === "none") {
      header[key] = value;
      continue;
    }
    if (section === "palette") {
      palette[key] = value;
      continue;
    }
    if (section === "audio") {
      audioMap.push(parseAudioMapping(key, value, lineNo));
      continue;
    }
    if (section === "stages") {
      effectChain.push(parseStage(key, value, lineNo));
      continue;
    }
  }

  if (header.schema !== "preset.v1") {
    throw new PresetParseError("SCHEMA_UNSUPPORTED", "Only schema 'preset.v1' is supported.");
  }
  if (!header.id || !header.name || !header.bpm) {
    throw new PresetParseError("PARSE_ERROR", "Preset header requires schema, id, name, and bpm.");
  }

  const tags = (header.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const preset: ParsedPreset = {
    id: header.id,
    name: header.name,
    schemaVersion: "preset.v1",
    bpmRange: parseBpm(header.bpm, 0),
    tags,
    palette,
    audioMap,
    effectChain,
    warnings: [],
  };

  return assertPresetIsValid(preset);
}

export class PresetCompilerImpl implements PresetCompiler {
  parsePreset(source: string): ParsedPreset {
    return parsePresetText(source);
  }
}
