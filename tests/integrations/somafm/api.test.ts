import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSomaFMChannels, getStreamUrl } from "../../../src/integrations/somafm/api";

describe("SomaFM api", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("getStreamUrl", () => {
    it("builds icecast mp3 URL for channel id and quality", () => {
      expect(getStreamUrl("groovesalad")).toBe("https://ice5.somafm.com/groovesalad-128-mp3");
      expect(getStreamUrl("dronezone", "256")).toBe("https://ice5.somafm.com/dronezone-256-mp3");
    });
  });

  describe("fetchSomaFMChannels", () => {
    it("returns channels array from JSON", async () => {
      const payload = {
        channels: [
          {
            id: "x",
            title: "X",
            description: "",
            genre: "g",
            image: "",
            playlists: [],
          },
        ],
      };
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => payload,
      } as Response);

      const list = await fetchSomaFMChannels();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe("x");
      expect(fetch).toHaveBeenCalledWith("https://somafm.com/channels.json", { cache: "no-store" });
    });

    it("throws when response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response);
      await expect(fetchSomaFMChannels()).rejects.toThrow(/503/);
    });

    it("returns empty array when channels missing", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response);
      await expect(fetchSomaFMChannels()).resolves.toEqual([]);
    });
  });
});
