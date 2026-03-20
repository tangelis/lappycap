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
}

export type CastMessage =
  | { type: 'load'; audioUrl: string; sceneName?: string; volume?: number }
  | { type: 'scene'; sceneName: string }
  | { type: 'next' | 'prev' | 'shuffle' }
  | { type: 'settings'; cycleDuration?: number; blendDuration?: number; volume?: number };

export class CastSender {
  private available = false;
  private connected = false;

  onAvailabilityChanged?: (available: boolean) => void;
  onSessionChanged?: (connected: boolean) => void;

  constructor() {
    this.loadSdk();
  }

  private loadSdk(): void {
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) this.initCast();
    };

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    document.head.appendChild(script);
  }

  private initCast(): void {
    const context = cast.framework.CastContext.getInstance();

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
        console.log('[Cast] State:', state);
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
          this.onSessionChanged?.(this.connected);
        }
        console.log('[Cast] Session:', state);
      },
    );

    console.log('[Cast] CAF SDK initialized');
  }

  /** Request a cast session (shows device picker with audio + video devices) */
  async requestSession(): Promise<void> {
    try {
      const context = cast.framework.CastContext.getInstance();
      await context.requestSession();
    } catch (err) {
      console.error('[Cast] Session request error:', err);
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
}
