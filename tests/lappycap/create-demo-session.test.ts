import { describe, expect, it } from "vitest";
import { createLappycapDemoSession } from "../../src/lappycap/lib/create-demo-session";

describe("createLappycapDemoSession", () => {
  it("starts session with first cue preset and advances next() to second preset", () => {
    const { controller, session, gateway } = createLappycapDemoSession();

    expect(gateway.getPreset("sunrise-glow")).not.toBeNull();
    expect(gateway.getPreset("sunset-haze")).not.toBeNull();
    expect(session.activePresetId).toBe("sunrise-glow");

    const afterNext = controller.next(session.sessionId);
    expect(afterNext.activePresetId).toBe("sunset-haze");
  });
});
