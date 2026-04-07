import { polishProfileForLeanBack } from "../../src/components/visualizer-leanback";
import { buildQualityProfile } from "../../src/components/visualizer-quality";
import { describe, expect, it } from "vitest";

describe("lean-back visual policy", () => {
  it("removes compositor-heavy flags and caps FPS", () => {
    const high = buildQualityProfile("high");
    const lean = polishProfileForLeanBack(high);

    expect(lean.showBackdropBlur).toBe(false);
    expect(lean.showAnimatedOverlay).toBe(false);
    expect(lean.targetFps).toBeLessThanOrEqual(24);
    expect(lean.pixelRatioCap).toBe(1);
    expect(lean.frequencyBarCount).toBeLessThanOrEqual(4);
    expect(lean.overlayOpacity).toBe(0);
    expect(lean.label).toContain("Lean-back");
  });

  it("clamps mesh size but keeps butterchurn enabled when base profile uses it", () => {
    const perf = buildQualityProfile("performance");
    const lean = polishProfileForLeanBack(perf);

    expect(lean.useButterchurn).toBe(true);
    expect(lean.meshWidth).toBeLessThanOrEqual(20);
    expect(lean.meshHeight).toBeLessThanOrEqual(15);
  });

  it("preserves fallback (no WebGL) path with ambient label", () => {
    const fb = buildQualityProfile("fallback");
    const lean = polishProfileForLeanBack(fb);

    expect(lean.useButterchurn).toBe(false);
    expect(lean.label).toMatch(/lean-back/i);
    expect(lean.label).toMatch(/ambient/i);
  });
});
