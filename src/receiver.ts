/**
 * LappyCap Cast Receiver
 *
 * Runs the same Butterchurn visualizer on a Chromecast device.
 * The sender passes an audio URL + scene name via custom messages.
 * The receiver loads the audio, connects Web Audio, and renders locally.
 */

import { Visualizer } from './visualizer';
import { SceneManager } from './scene-manager';
import { loadPresetsForScene } from './preset-loader';
import { scenes } from './scenes';
import { radioStations } from './radio-stations';
import type { Scene } from './types';

// Cast Receiver SDK types (loaded via <script> from Google CDN at runtime)
declare const cast: {
  framework: {
    CastReceiverContext: {
      getInstance(): CastReceiverContext;
    };
    PlayerManager: new () => PlayerManager;
    system: {
      EventType: {
        SENDER_DISCONNECTED: string;
        SENDER_CONNECTED: string;
        READY: string;
        ERROR: string;
      };
    };
  };
};

interface PlayerManager {
  setMediaElement(el: HTMLMediaElement): void;
}

interface CastReceiverContext {
  start(options?: { disableIdleTimeout?: boolean; maxInactivity?: number; playbackConfig?: unknown }): void;
  stop(): void;
  setInactivityTimeout(seconds: number): void;
  getPlayerManager(): PlayerManager;
  addEventListener(type: string, handler: (event: unknown) => void): void;
  addCustomMessageListener(namespace: string, handler: (event: CustomMessageEvent) => void): void;
  sendCustomMessage(namespace: string, senderId: string | undefined, message: unknown): void;
}

interface CustomMessageEvent {
  senderId: string;
  data: unknown;
}

// Message types from sender
interface LoadMessage {
  type: 'load';
  audioUrl: string;
  sceneName?: string;
  stationName?: string;
  volume?: number;
}

interface SceneMessage {
  type: 'scene';
  sceneName: string;
}

interface ControlMessage {
  type: 'next' | 'prev' | 'shuffle';
}

interface SettingsMessage {
  type: 'settings';
  cycleDuration?: number;
  blendDuration?: number;
  volume?: number;
}

type ReceiverMessage = LoadMessage | SceneMessage | ControlMessage | SettingsMessage;

const NAMESPACE = 'urn:x-cast:com.lappycap';

class LappyCapReceiver {
  private visualizer: Visualizer;
  private sceneManager: SceneManager;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioEl: HTMLAudioElement;
  private castContext: CastReceiverContext | null = null;
  private started = false;
  private currentAudioUrl: string = '';
  private audioWatchdog: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.audioEl = document.getElementById('audio-element') as HTMLAudioElement;
    this.visualizer = new Visualizer(canvas);
    this.sceneManager = new SceneManager(scenes[0]);

    this.initScene(scenes[0]);
    this.initCast();
  }

  private initScene(scene: Scene): void {
    this.sceneManager.stop();
    this.sceneManager = new SceneManager(scene);
    const presets = loadPresetsForScene(scene);
    this.sceneManager.setPresets(presets);

    this.sceneManager.onPresetCycle = (preset, blendDuration) => {
      this.visualizer.loadPreset(preset, blendDuration);
    };
    this.sceneManager.onPresetInfo = (index, total) => {
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = `${index} / ${total}`;
    };
    this.visualizer.onPresetChange = (name) => {
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = name;
    };
  }

  private ensureAudio(): AnalyserNode {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.analyser!;
  }

  private async playAudio(url: string): Promise<void> {
    console.log('[Receiver] Loading audio:', url);
    this.currentAudioUrl = url;

    // Don't use createMediaElementSource — it hijacks the audio output through
    // Web Audio, which breaks on Chromecast due to CORS/Icecast issues.
    // Play audio directly through <audio> element; visualizer uses a disconnected
    // analyser (presets auto-cycle without audio reactivity, still looks great).
    this.audioEl.src = url;
    this.audioEl.volume = 1;

    this.audioEl.onerror = () => {
      const err = this.audioEl.error;
      console.error('[Receiver] Audio error:', err?.message, 'code:', err?.code);
      // Auto-retry after 5s on stream failure (Icecast disconnects happen)
      setTimeout(() => {
        if (this.currentAudioUrl === url) {
          console.log('[Receiver] Retrying audio after error...');
          this.audioEl.load();
          this.audioEl.play().catch(e => console.error('[Receiver] Retry failed:', e));
        }
      }, 5000);
    };

    const analyser = this.ensureAudio();

    if (!this.started) {
      this.visualizer.init(analyser);
      this.visualizer.start();
      this.sceneManager.start();
      this.started = true;
      document.getElementById('status')!.classList.add('hidden');
    }

    try {
      await this.audioEl.play();
      console.log('[Receiver] Audio playing directly (no Web Audio routing)');
      this.startAudioWatchdog();
    } catch (err) {
      console.error('[Receiver] Audio play failed:', err);
      // On Chromecast, autoplay may fail on first attempt — retry once after a tick
      setTimeout(() => {
        this.audioEl.play()
          .then(() => {
            console.log('[Receiver] Audio playing (retry succeeded)');
            this.startAudioWatchdog();
          })
          .catch(e => console.error('[Receiver] Audio retry also failed:', e));
      }, 1000);
    }
  }

  /**
   * Watchdog: every 30s check if audio has stalled and recover.
   * Chromecast Icecast streams can silently stall without firing an error event.
   */
  private startAudioWatchdog(): void {
    if (this.audioWatchdog) clearInterval(this.audioWatchdog);
    let lastTime = -1;
    this.audioWatchdog = setInterval(() => {
      if (this.audioEl.paused || this.audioEl.ended) {
        console.warn('[Receiver] Watchdog: audio not playing, restarting...');
        this.audioEl.play().catch(e => console.error('[Receiver] Watchdog restart failed:', e));
        return;
      }
      // Detect stall: currentTime hasn't advanced in 30s
      if (lastTime === this.audioEl.currentTime && lastTime !== -1) {
        console.warn('[Receiver] Watchdog: stream stalled (time frozen at', lastTime, '), reloading...');
        this.audioEl.load();
        this.audioEl.play().catch(e => console.error('[Receiver] Watchdog reload failed:', e));
      }
      lastTime = this.audioEl.currentTime;
    }, 30_000);
  }

  private initCast(): void {
    // Load Cast Receiver SDK dynamically
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.onload = () => this.onCastReady();
    script.onerror = () => {
      // Not running on a Cast device — start in standalone mode for testing
      console.log('[Receiver] Cast SDK not available, running standalone');
      this.startStandalone();
    };
    document.head.appendChild(script);
  }

  private onCastReady(): void {
    console.log('[Receiver] Cast SDK loaded');
    this.castContext = cast.framework.CastReceiverContext.getInstance();

    // IMPORTANT: The <audio> element has class="castMediaElement" in the HTML.
    // This is the preferred CAF v3 way to designate the media element — the SDK
    // picks it up automatically at start() time without needing setMediaElement().
    // setMediaElement() is kept as a belt-and-suspenders fallback only.
    try {
      const playerManager = this.castContext.getPlayerManager();
      playerManager.setMediaElement(this.audioEl);
      console.log('[Receiver] Audio element registered with Cast PlayerManager (pre-start)');
    } catch (err) {
      console.warn('[Receiver] Could not register media element:', err);
    }

    this.castContext.addCustomMessageListener(NAMESPACE, (event) => {
      console.log('[Receiver] Message:', event.data);
      this.handleMessage(event.senderId, event.data as ReceiverMessage);
    });

    // Listen for SENDER_DISCONNECTED — if all senders disconnect while we're a
    // non-media app (visualizer), CAF will shut us down unless we have disableIdleTimeout.
    this.castContext.addEventListener(
      cast.framework.system.EventType.SENDER_DISCONNECTED,
      () => {
        console.log('[Receiver] Sender disconnected — continuing playback (disableIdleTimeout is on)');
        // Keep visualizer alive. The OS won't kill us because disableIdleTimeout is set.
      }
    );

    // disableIdleTimeout: true — prevents receiver from being closed when idle
    // after active playback stops. Required for non-media apps like a visualizer.
    // maxInactivity: controls sender heartbeat timeout (not the idle kill timeout).
    // Setting it high prevents the SDK from disconnecting a sender that went quiet.
    this.castContext.start({
      disableIdleTimeout: true,
      maxInactivity: 3600, // 1 hour — don't disconnect senders that go quiet
    });
    console.log('[Receiver] Cast receiver started (idle timeout disabled, maxInactivity=3600)');

    // Auto-start with Groove Salad so the TV isn't just a black screen.
    // Short delay lets the Cast framework fully settle before we touch the audio element.
    setTimeout(() => this.startStandalone(), 500);
  }

  private handleMessage(senderId: string, msg: ReceiverMessage): void {
    switch (msg.type) {
      case 'load': {
        if (msg.sceneName) {
          const scene = scenes.find(s => s.name === msg.sceneName);
          if (scene) this.initScene(scene);
        }
        if (msg.volume !== undefined) {
          this.audioEl.volume = Math.max(0, Math.min(1, msg.volume));
        }
        this.playAudio(msg.audioUrl).catch(err => {
          console.error('[Receiver] Audio load failed:', err);
        });
        // Acknowledge
        this.castContext?.sendCustomMessage(NAMESPACE, senderId, {
          type: 'status',
          playing: true,
          scene: this.sceneManager.getScene().name,
        });
        break;
      }
      case 'scene': {
        const scene = scenes.find(s => s.name === msg.sceneName);
        if (scene) {
          this.initScene(scene);
          if (this.started) this.sceneManager.start();
        }
        break;
      }
      case 'next':
        this.sceneManager.next();
        break;
      case 'prev':
        this.sceneManager.prev();
        break;
      case 'shuffle':
        this.sceneManager.toggleShuffle();
        break;
      case 'settings':
        if (msg.cycleDuration !== undefined) this.sceneManager.setCycleDuration(msg.cycleDuration);
        if (msg.blendDuration !== undefined) this.sceneManager.setBlendDuration(msg.blendDuration);
        if (msg.volume !== undefined) this.audioEl.volume = Math.max(0, Math.min(1, msg.volume));
        break;
    }
  }

  /** Standalone mode for browser testing (no Cast device needed) */
  private startStandalone(): void {
    const status = document.getElementById('status')!;
    status.innerHTML = 'LappyCap Receiver<br><small>Standalone mode — pick a station</small>';

    // Auto-start with Groove Salad for testing
    const defaultStation = radioStations[0];
    this.playAudio(defaultStation.url).then(() => {
      status.classList.add('hidden');
    }).catch(err => {
      status.innerHTML = `Error: ${err.message}`;
    });
  }
}

new LappyCapReceiver();
