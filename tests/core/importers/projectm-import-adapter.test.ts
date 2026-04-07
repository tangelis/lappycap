import { describe, expect, it } from "vitest";
import { importProjectMPreset } from "../../../src/core/importers/projectm-import-adapter";

const SIMPLE_PROJECTM = `[preset00]
fPresetName="Mellow Sunrise"
fDecay=0.45
zoom=1.02
warp=0.1`;

describe("importProjectMPreset", () => {
  it("converts a projectM-like preset into lappycap format", () => {
    const result = importProjectMPreset(SIMPLE_PROJECTM);
    expect(result.preset.schemaVersion).toBe("preset.v1");
    expect(result.preset.id).toBe("mellow-sunrise");
    expect(result.preset.effectChain.length).toBeGreaterThan(0);
    expect(result.preset.audioMap).toHaveLength(4);
  });

  it("returns diagnostics for unsupported tokens", () => {
    const result = importProjectMPreset(SIMPLE_PROJECTM);
    expect(result.diagnostics.some((diag) => diag.code === "UNSUPPORTED_FEATURE")).toBe(true);
  });

  it("throws for empty input", () => {
    expect(() => importProjectMPreset("")).toThrowError();
  });
});
