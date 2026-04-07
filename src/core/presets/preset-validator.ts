import { PresetParseError, type ParseIssue, type ParsedPreset } from "./interfaces";

const ALLOWED_STAGE_TYPES = new Set([
  "gradient_horizon",
  "lava_metaballs",
  "film_grain",
  "fractal_bloom",
  "oil_projection",
  "bokeh_field",
  "color_shift",
  "vignette",
]);

const MAX_STAGES = 16;

export function validatePreset(preset: ParsedPreset): ParseIssue[] {
  const issues: ParseIssue[] = [];
  const [minBpm, maxBpm] = preset.bpmRange;

  if (!preset.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(preset.id)) {
    issues.push({
      code: "INVALID_ARGUMENT",
      message: "Preset id must be kebab-case.",
    });
  }

  if (minBpm < 0 || maxBpm < minBpm) {
    issues.push({
      code: "INVALID_ARGUMENT",
      message: "Preset bpm range must be valid and non-negative.",
    });
  }

  if (preset.effectChain.length === 0) {
    issues.push({
      code: "PARSE_ERROR",
      message: "Preset must contain at least one stage.",
    });
  }

  if (preset.effectChain.length > MAX_STAGES) {
    issues.push({
      code: "INVALID_ARGUMENT",
      message: `Preset cannot have more than ${MAX_STAGES} stages.`,
    });
  }

  for (const stage of preset.effectChain) {
    if (!ALLOWED_STAGE_TYPES.has(stage.type)) {
      issues.push({
        code: "UNKNOWN_EFFECT_STAGE",
        message: `Stage type '${stage.type}' is not allowed.`,
        detail: stage.id,
      });
    }
  }

  return issues;
}

export function assertPresetIsValid(preset: ParsedPreset): ParsedPreset {
  const issues = validatePreset(preset);
  if (issues.length > 0) {
    const issue = issues[0];
    throw new PresetParseError(issue.code, issue.message, issue.line, issue.detail);
  }
  return preset;
}
