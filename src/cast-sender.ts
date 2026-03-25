/**
 * Cast Sender — connects the main app to a Chromecast running the LappyCap receiver.
 *
 * Uses the CAF (Cast Application Framework) sender SDK which discovers
 * both audio and video Cast devices (Chromecast, Google TV, etc.).
 */

const APP_ID = '8315CD49';
const NAMESPACE = 'urn:x-cast:com.lappycap';

// CAF sender SDK types
declare const cast: {
  framework: {
    CastContext: {
      getInstance(): CastContext;
    };
    SessionState: {
      SESSION_STARTED: string;
      SESSION_RESUMED: string;
      SESSION_ENDED: string;
    };
    CastContextEventType: {
      SESSION_STATE_CHANGED: string;
      CAST_STATE_CHANGED: string;
    };
    CastState: {
      NO_DEVICES_AVAILABLE: string;
      NOT_CONNECTED: string;
      CONNECTING: string;
      CONNECTED: string;
    };
  };
};

interface CastContext {
  setOptions(options: {
    receiverApplicationId: string;
    autoJoinPolicy: string;
  }): void;
  addEventListener(type: string, handler: (event: any) => void): void;
  getCurrentSession(): CastSession | null;
  requestSession(): Promise<void>;
  getCastState(): string;
}

interface CastSession {
  sendMessage(namespace: string, message: object): Promise<void>;
  getSessionId(): string;
  getCastDevice(): { friendlyName: string };
}

export type CastMessage =
  | { type: 'load'; audioUrl: string; sceneName?: string; stationName?: string; volume?: number; seekTime?: number }
  | { type: 'scene'; sceneName: string }
  | { type: 'next' | 'prev' | 'shuffle' | 'pause' | 'resume' }
  | { type: 'settings'; cycleDuration?: number; blendDuration?: number; volume?: number };

export class CastSender {
  private available = false;
  private connected = false;
  private keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  onAvailabilityChanged?: (available: boolean) => void;
  onSessionChanged?: (connected: boolean, deviceName?: string) => void;

  constructor() {
    this.loadSdk();
  }

  private loadSdk(): void {
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      console.log('[Cast] SDK available:', isAvailable);
      if (isAvailable) this.initCast();
      else console.warn('[Cast] Cast API reported unavailable');
    };

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.onerror = (e) => console.error('[Cast] Failed to load SDK:', e);
    document.head.appendChild(script);
  }

  private initCast(): void {
    const context = cast.framework.CastContext.getInstance();

    console.log('[Cast] Initializing with APP_ID:', APP_ID);

    context.setOptions({
      receiverApplicationId: APP_ID,
      autoJoinPolicy: 'ORIGIN_SCOPED',
    });

    context.addEventListener(
      cast.framework.CastContextEventType.CAST_STATE_CHANGED,
      (event: any) => {
        const state = event.castState;
        const wasAvailable = this.available;
        this.available = state !== cast.framework.CastState.NO_DEVICES_AVAILABLE;
        if (this.available !== wasAvailable) {
          this.onAvailabilityChanged?.(this.available);
        }
        console.log('[Cast] State:', state, '| Available:', this.available);
      },
    );

    context.addEventListener(
      cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
      (event: any) => {
        const state = event.sessionState;
        const wasConnected = this.connected;
        this.connected =
          state === cast.framework.SessionState.SESSION_STARTED ||
          state === cast.framework.SessionState.SESSION_RESUMED;

        if (this.connected !== wasConnected) {
          if (this.connected) {
            this.startKeepalive();
          } else {
            this.stopKeepalive();
          }
          // Extract device name from active session
          const deviceName = this.connected ? this.getDeviceName() : undefined;
          this.onSessionChanged?.(this.connected, deviceName);
        }
        console.log('[Cast] Session:', state, '| Connected:', this.connected);
      },
    );

    console.log('[Cast] CAF SDK initialized, current state:', context.getCastState());
  }

  /** Request a cast session (shows device picker with audio + video devices) */
  async requestSession(): Promise<void> {
    try {
      const context = cast.framework.CastContext.getInstance();
      console.log('[Cast] Requesting session... APP_ID:', APP_ID, 'castState:', context.getCastState());
      await context.requestSession();
      console.log('[Cast] Session request succeeded');
    } catch (err: any) {
      console.error('[Cast] Session request error:', err);
      console.error('[Cast] Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }
  }

  /** Send a custom message to the receiver */
  send(message: CastMessage): void {
    const context = cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session) return;
    session.sendMessage(NAMESPACE, message).catch((err) => {
      console.error('[Cast] Send error:', err);
    });
  }

  get isConnected(): boolean {
    return this.connected;
  }

  get isAvailable(): boolean {
    return this.available;
  }

  /** Get the friendly name of the connected Cast device */
  getDeviceName(): string | undefined {
    try {
      const context = cast.framework.CastContext.getInstance();
      const session = context.getCurrentSession();
      return session?.getCastDevice()?.friendlyName;
    } catch {
      return undefined;
    }
  }

  private startKeepalive(): void {
    this.stopKeepalive();
    // Ping the receiver every 30s — aggressive enough to prevent Android TV idle kill
    // (2 minutes was too long; TV OS considers sessions idle after ~60s of quiet)
    this.keepaliveTimer = setInterval(() => {
      this.send({ type: 'ping' } as any);
      console.log('[Cast] Keepalive ping sent');
    }, 30_000);
  }

  private stopKeepalive(): void {
    if (this.keepaliveTimer) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = null;
    }
  }
}
