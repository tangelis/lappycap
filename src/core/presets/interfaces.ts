export type ParseErrorCode =
  | "INVALID_ARGUMENT"
  | "SCHEMA_UNSUPPORTED"
  | "PARSE_ERROR"
  | "ILLEGAL_SHADER_EXPRESSION"
  | "UNKNOWN_EFFECT_STAGE"
  | "SCENE_EMPTY"
  | "TRANSITION_INVALID"
  | "PRESET_REFERENCE_MISSING"
  | "AUDIO_SOURCE_UNAVAILABLE"
  | "CAST_UNAVAILABLE"
  | "NOT_FOUND";

export interface ParseIssue {
  code: ParseErrorCode;
  message: string;
  line?: number;
  detail?: string;
}

export interface AudioMapping {
  source: "low" | "mid" | "high" | "wave";
  target: string;
  gain: number;
}

export interface EffectStage {
  id: string;
  type: string;
  params: Record<string, number | string | boolean>;
}

export interface ParsedPreset {
  id: string;
  name: string;
  schemaVersion: "preset.v1";
  bpmRange: [number, number];
  tags: string[];
  palette: Record<string, string>;
  effectChain: EffectStage[];
  audioMap: AudioMapping[];
  warnings: ParseIssue[];
}

export interface PresetCompiler {
  parsePreset(source: string): ParsedPreset;
}

export class PresetParseError extends Error {
  readonly code: ParseErrorCode;
  readonly line?: number;
  readonly detail?: string;

  constructor(code: ParseErrorCode, message: string, line?: number, detail?: string) {
    super(message);
    this.name = "PresetParseError";
    this.code = code;
    this.line = line;
    this.detail = detail;
  }
}
