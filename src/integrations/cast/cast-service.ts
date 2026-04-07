import { PresetParseError } from "../../core/presets/interfaces";
import type { CastConfig, CastService, CastSession } from "./interfaces";

interface CastServiceOptions {
  sdkAvailable?: boolean;
  connectDelayMs?: number;
}

export class CastServiceImpl implements CastService {
  private readonly sdkAvailable: boolean;
  private readonly connectDelayMs: number;
  private readonly sessions = new Map<string, CastSession>();

  constructor(options: CastServiceOptions = {}) {
    this.sdkAvailable = options.sdkAvailable ?? true;
    this.connectDelayMs = options.connectDelayMs ?? 50;
  }

  async connect(config: CastConfig): Promise<CastSession> {
    if (!this.sdkAvailable) {
      throw new PresetParseError("CAST_UNAVAILABLE", "CAST_SDK_NOT_LOADED");
    }
    if (!config.appId) {
      throw new PresetParseError("INVALID_ARGUMENT", "appId is required for cast.");
    }

    await sleep(this.connectDelayMs);
    const session: CastSession = {
      sessionId: `cast_${Math.random().toString(36).slice(2, 10)}`,
      receiverState: "ready",
      latencyMs: 120,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  async disconnect(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
