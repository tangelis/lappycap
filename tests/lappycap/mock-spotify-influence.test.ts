import { describe, expect, it } from "vitest";
import { applyMockSpotifyInfluence } from "../../src/lappycap/lib/apply-mock-spotify-influence";
import { createLappycapDemoSession } from "../../src/lappycap/lib/create-demo-session";

describe("applyMockSpotifyInfluence", () => {
  it("stores deterministic influence on the controller for the session", async () => {
    const { controller, session } = createLappycapDemoSession();

    await applyMockSpotifyInfluence(controller, session.sessionId);

    expect(controller.getInfluence(session.sessionId)).toEqual({
      tempo: 108,
      energy: 0.42,
      valence: 0.73,
    });
  });
});
