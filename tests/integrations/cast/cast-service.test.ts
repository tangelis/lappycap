import { describe, expect, it } from "vitest";
import { CastServiceImpl } from "../../../src/integrations/cast/cast-service";

describe("CastServiceImpl", () => {
  it("connects when SDK is available", async () => {
    const service = new CastServiceImpl({ sdkAvailable: true, connectDelayMs: 1 });
    const session = await service.connect({ appId: "app-123", autoJoin: true });
    expect(session.receiverState).toBe("ready");
    expect(session.sessionId).toContain("cast_");
  });

  it("throws when SDK is unavailable", async () => {
    const service = new CastServiceImpl({ sdkAvailable: false });
    await expect(service.connect({ appId: "app-123" })).rejects.toThrow(/CAST_SDK_NOT_LOADED/);
  });
});
