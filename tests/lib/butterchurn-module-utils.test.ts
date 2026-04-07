import { describe, expect, it, vi } from "vitest";
import {
  pickPresetIndex,
  unwrapPresetModule,
  unwrapVisualizerModule,
} from "../../src/lib/butterchurn-module-utils";

describe("butterchurn-module-utils", () => {
  describe("unwrapVisualizerModule", () => {
    it("accepts ESM default export shape", () => {
      const createVisualizer = vi.fn();
      const mod = { default: { createVisualizer } };
      expect(unwrapVisualizerModule(mod).createVisualizer).toBe(createVisualizer);
    });

    it("accepts direct export shape", () => {
      const createVisualizer = vi.fn();
      expect(unwrapVisualizerModule({ createVisualizer }).createVisualizer).toBe(createVisualizer);
    });

    it("throws when createVisualizer missing", () => {
      expect(() => unwrapVisualizerModule({})).toThrow(/butterchurn/);
    });
  });

  describe("unwrapPresetModule", () => {
    it("returns empty getPresets when module invalid", () => {
      expect(unwrapPresetModule({}).getPresets()).toEqual({});
    });

    it("unwraps default.getPresets", () => {
      const getPresets = () => ({ a: {} });
      expect(unwrapPresetModule({ default: { getPresets } }).getPresets()).toEqual({ a: {} });
    });
  });

  describe("pickPresetIndex", () => {
    it("returns 0 when total <= 1", () => {
      expect(pickPresetIndex(3, 1, () => 0.99)).toBe(0);
    });

    it("returns a different index than current when possible", () => {
      const idx = pickPresetIndex(2, 5, () => 0);
      expect(idx).toBe(0);
    });
  });
});
