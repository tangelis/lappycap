import {
  buildQualityProfile,
  inferDeviceKind,
  initialQualityTier,
  isLikelySoftwareRenderer,
  parseVisualizerQualityUserMode,
  resolveEffectiveQualityTier,
  type VisualizerRuntimeContext,
} from "../../src/components/visualizer-quality";
import { describe, expect, it } from "vitest";

function testContext(overrides: Partial<VisualizerRuntimeContext> = {}): VisualizerRuntimeContext {
  const base: VisualizerRuntimeContext = {
    acceleration: { webglSupported: true, accelerated: true, webglVersion: 2 },
    deviceKind: "desktop",
    prefersReducedMotion: false,
    network: { saveData: false },
    display: {
      devicePixelRatio: 1,
      estimatedFillPixels: 1_000_000,
      prefersReducedMotion: false,
      prefersSlowUpdate: false,
    },
  };
  return {
    ...base,
    ...overrides,
    acceleration: { ...base.acceleration, ...overrides.acceleration },
    network: { ...base.network, ...overrides.network },
    display: { ...base.display, ...overrides.display },
  };
}

describe("visualizer quality heuristics", () => {
  it("detects Android TV and mobile user agents", () => {
    expect(inferDeviceKind("Mozilla/5.0 (Linux; Android TV 12; Chromecast)")).toBe("android-tv");
    expect(inferDeviceKind("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("mobile");
    expect(inferDeviceKind("Mozilla/5.0 (X11; Linux x86_64)")).toBe("desktop");
  });

  it("flags common software renderers", () => {
    expect(isLikelySoftwareRenderer("ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))")).toBe(true);
    expect(isLikelySoftwareRenderer("llvmpipe (LLVM 17.0.0, 256 bits)")).toBe(true);
    expect(isLikelySoftwareRenderer("ANGLE (Intel, Mesa Intel(R) Xe Graphics)")).toBe(false);
  });

  it("starts in fallback when acceleration is not available", () => {
    expect(
      initialQualityTier(
        testContext({
          acceleration: { webglSupported: false, accelerated: false },
        })
      )
    ).toBe("fallback");
  });

  it("prefers performance mode on Android TV", () => {
    expect(
      initialQualityTier(
        testContext({
          acceleration: { webglSupported: true, accelerated: true, renderer: "Mali-G52" },
          deviceKind: "android-tv",
          hardwareConcurrency: 4,
          deviceMemoryGb: 2,
        })
      )
    ).toBe("performance");
  });

  it("builds a reduced-effects fallback profile", () => {
    const profile = buildQualityProfile("fallback");

    expect(profile.useButterchurn).toBe(false);
    expect(profile.showBackdropBlur).toBe(false);
    expect(profile.targetFps).toBe(20);
    expect(profile.frequencyBarCount).toBe(4);
    expect(profile.userMode).toBe("auto");
  });

  it("parseVisualizerQualityUserMode defaults sensibly", () => {
    expect(parseVisualizerQualityUserMode(null)).toBe("auto");
    expect(parseVisualizerQualityUserMode("full")).toBe("full");
    expect(parseVisualizerQualityUserMode("garbage")).toBe("auto");
  });

  it("resolveEffectiveQualityTier clamps manual full to fallback without GPU", () => {
    const c = testContext({
      acceleration: { webglSupported: false, accelerated: false },
    });
    expect(resolveEffectiveQualityTier("full", "high", c)).toBe("fallback");
  });

  it("resolveEffectiveQualityTier pins smooth under a high auto tier", () => {
    const c = testContext();
    expect(resolveEffectiveQualityTier("smooth", "high", c)).toBe("performance");
  });

  it("resolveEffectiveQualityTier follows auto tier when accelerated", () => {
    const c = testContext();
    expect(resolveEffectiveQualityTier("auto", "balanced", c)).toBe("balanced");
  });
});
