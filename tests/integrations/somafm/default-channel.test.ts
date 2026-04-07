import { describe, expect, it } from "vitest";
import { resolveDefaultSomaFMChannel } from "../../../src/integrations/somafm/default-channel";
import type { SomaFMChannel } from "../../../src/integrations/somafm/types";

function ch(id: string, title: string): SomaFMChannel {
  return {
    id,
    title,
    description: "",
    genre: "",
    image: "",
    playlists: [],
  };
}

describe("resolveDefaultSomaFMChannel", () => {
  it("returns null for empty list", () => {
    expect(resolveDefaultSomaFMChannel([])).toBeNull();
  });

  it("prefers groovesalad when present", () => {
    const list = [ch("other", "Other"), ch("groovesalad", "Groove Salad")];
    expect(resolveDefaultSomaFMChannel(list)?.id).toBe("groovesalad");
  });

  it("falls back to first channel", () => {
    const list = [ch("a", "A"), ch("b", "B")];
    expect(resolveDefaultSomaFMChannel(list)?.id).toBe("a");
  });
});
