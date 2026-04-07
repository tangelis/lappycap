import { describe, expect, it } from "vitest";
import { QualityManagerImpl } from "../../src/runtime/quality-manager";

describe("QualityManagerImpl", () => {
  it("downgrades quality on sustained high frame times", () => {
    const manager = new QualityManagerImpl({ initialTier: "high", sampleWindow: 120 });
    for (let i = 0; i < 120; i += 1) manager.recordFrameTime(40);

    const decision = manager.evaluate();
    expect(decision.nextTier).toBe("balanced");
    expect(decision.reason).toContain("frame budget");
  });

  it("upgrades quality after stable low windows", () => {
    const manager = new QualityManagerImpl({ initialTier: "balanced", sampleWindow: 10 });
    for (let window = 0; window < 6; window += 1) {
      for (let i = 0; i < 10; i += 1) manager.recordFrameTime(12);
      manager.evaluate();
    }

    expect(manager.currentTier()).toBe("high");
  });
});
