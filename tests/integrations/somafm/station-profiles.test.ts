import { describe, expect, it } from "vitest";
import {
  getNextSomaFMChannel,
  getRandomSomaFMChannel,
  resolveStationVisualProfile,
} from "../../../src/integrations/somafm/station-profiles";
import type { SomaFMChannel } from "../../../src/integrations/somafm/types";

function ch(id: string, title: string, genre: string, description = ""): SomaFMChannel {
  return {
    id,
    title,
    genre,
    description,
    image: "",
    playlists: [],
  };
}

describe("station-profiles", () => {
  it("maps ambient stations to cosmic drift", () => {
    const profile = resolveStationVisualProfile(
      ch("groovesalad", "Groove Salad", "ambient", "downtempo ambient")
    );
    expect(profile.label).toBe("Cosmic Drift");
    expect(profile.tuning.presetMode).toBe("cosmic-drift");
    expect(profile.tuning.motionPreset).toBe("slow-cinema");
  });

  it("maps electronic stations to liquid organic", () => {
    const profile = resolveStationVisualProfile(
      ch("cliqhop", "cliqhop idm", "electronic", "idm glitch beats")
    );
    expect(profile.label).toBe("Liquid Organic");
    expect(profile.tuning.presetMode).toBe("liquid-organic");
  });

  it("maps roots and soul stations to sunday morning", () => {
    const profile = resolveStationVisualProfile(
      ch("bootliquor", "Boot Liquor", "americana", "roots and americana")
    );
    expect(profile.label).toBe("Sunday Morning");
    expect(profile.tuning.presetMode).toBe("sunday-morning");
  });

  it("returns next station with wraparound", () => {
    const channels = [ch("a", "A", "x"), ch("b", "B", "y"), ch("c", "C", "z")];
    expect(getNextSomaFMChannel(channels, "b")?.id).toBe("c");
    expect(getNextSomaFMChannel(channels, "c")?.id).toBe("a");
  });

  it("returns a different random station when possible", () => {
    const channels = [ch("a", "A", "x"), ch("b", "B", "y")];
    const next = getRandomSomaFMChannel(channels, "a", () => 0.75);
    expect(next?.id).toBe("b");
  });
});
