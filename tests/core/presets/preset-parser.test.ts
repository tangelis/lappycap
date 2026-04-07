import { describe, expect, it } from "vitest";
import { parsePresetText } from "../../../src/core/presets/preset-parser";
import { PresetParseError } from "../../../src/core/presets/interfaces";

const VALID_PRESET = `schema: preset.v1
id: sunrise-glow
name: Sunrise Glow
bpm: 90-120
tags: mellow,sunrise,warm

[palette]
base=#201a2e
accent=#ffb36b
highlight=#ffe9b5

[audio]
low=blob_scale*0.25
mid=fractal_mix*0.40
high=bloom_gain*0.30
wave=phase_shift*0.20

[stages]
stage1=gradient_horizon(speed=0.08, drift=0.12)
stage2=lava_metaballs(count=6, wobble=0.22)
stage3=film_grain(amount=0.05)`;

describe("parsePresetText", () => {
  it("parses a valid preset file", () => {
    const result = parsePresetText(VALID_PRESET);
    expect(result.id).toBe("sunrise-glow");
    expect(result.schemaVersion).toBe("preset.v1");
    expect(result.bpmRange).toEqual([90, 120]);
    expect(result.effectChain).toHaveLength(3);
    expect(result.audioMap).toHaveLength(4);
  });

  it("throws schema error when schema is missing", () => {
    expect(() =>
      parsePresetText(VALID_PRESET.replace("schema: preset.v1\n", ""))
    ).toThrowError(PresetParseError);
    expect(() =>
      parsePresetText(VALID_PRESET.replace("schema: preset.v1\n", ""))
    ).toThrowError(/schema/i);
  });

  it("blocks forbidden expression tokens", () => {
    const bad = VALID_PRESET.replace("low=blob_scale*0.25", "low=eval(foo)*0.25");
    try {
      parsePresetText(bad);
      throw new Error("Expected parse to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PresetParseError);
      const parseError = error as PresetParseError;
      expect(parseError.code).toBe("ILLEGAL_SHADER_EXPRESSION");
    }
  });
});
