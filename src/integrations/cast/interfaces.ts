export interface CastConfig {
  appId: string;
  autoJoin?: boolean;
}

export interface CastSession {
  sessionId: string;
  receiverState: "ready" | "connecting" | "ended";
  latencyMs: number;
}

export interface CastService {
  connect(config: CastConfig): Promise<CastSession>;
  disconnect(sessionId: string): Promise<void>;
}
