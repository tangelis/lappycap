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
        STANDBY_CHANGED: string;
        VISIBILITY_CHANGED: string;
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
  type: 'next' | 'prev' | 'shuffle' | 'pause' | 'resume' | 'debug';
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
  private mediaElSource: MediaElementAudioSourceNode | null = null;
  private webAudioConnected = false;
  private analyser: AnalyserNode | null = null;
  private audioEl: HTMLAudioElement;
  private castContext: CastReceiverContext | null = null;
  private started = false;
  private currentAudioUrl: string = '';
  private audioWatchdog: ReturnType<typeof setInterval> | null = null;
  private stationNameTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyPaused = false;
  private wakeLock: WakeLockSentinel | null = null;
  private wakeLockRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private debugMode = false;
  private debugTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    this.audioEl = document.getElementById('audio-element') as HTMLAudioElement;
    this.visualizer = new Visualizer(canvas);
    this.sceneManager = new SceneManager(scenes[0]);

    this.initScene(scenes[0]);
    this.initCast();
    this.acquireWakeLock();

    // DOM visibilitychange is unreliable in Cast receiver context — we use
    // Cast SDK STANDBY_CHANGED + VISIBILITY_CHANGED events in onCastReady() instead.
    // Keep this as a belt-and-suspenders fallback for non-Cast (standalone) mode.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('[Receiver] DOM visibility restored — re-acquiring wake lock');
        this.acquireWakeLock();
      }
    });
  }

  /**
   * Wake Lock: prevents the Android TV from sleeping while LappyCap is casting.
   * The Screen Wake Lock API is supported in Cast receiver context (Chrome-based).
   * If the TV OS releases the lock (screen dim/sleep), we retry automatically.
   */
  private async acquireWakeLock(): Promise<void> {
    if (this.wakeLockRetryTimer) {
      clearTimeout(this.wakeLockRetryTimer);
      this.wakeLockRetryTimer = null;
    }
    if (!('wakeLock' in navigator)) {
      console.warn('[Receiver] Wake Lock API not available on this device');
      return;
    }
    try {
      const wl = await (navigator as any).wakeLock.request('screen');
      this.wakeLock = wl;
      console.log('[Receiver] Wake lock acquired — screen will stay on');
      wl.addEventListener('release', () => {
        console.warn('[Receiver] Wake lock released by OS — will retry in 5s');
        this.wakeLock = null;
        // Auto-retry — Android TV may release the lock on certain events
        this.wakeLockRetryTimer = setTimeout(() => this.acquireWakeLock(), 5000);
      });
    } catch (err) {
      console.warn('[Receiver] Wake lock request failed:', err);
      // Retry after 30s — may succeed once the page is fully active
      this.wakeLockRetryTimer = setTimeout(() => this.acquireWakeLock(), 30_000);
    }
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

    // R2 URLs have proper CORS headers, so we can route through Web Audio
    // for audio-reactive visuals. Icecast streams (SomaFM) don't work with
    // createMediaElementSource on Chromecast, so those play directly.
    const isCorsSafe = url.includes('.r2.dev/');

    if (isCorsSafe) {
      this.audioEl.crossOrigin = 'anonymous';
    } else {
      this.audioEl.removeAttribute('crossorigin');
    }

    this.audioEl.src = url;
    this.audioEl.volume = 1;

    this.audioEl.onerror = () => {
      const err = this.audioEl.error;
      console.error('[Receiver] Audio error:', err?.message, 'code:', err?.code);

      // If CORS failed, retry without it
      if (this.audioEl.crossOrigin) {
        console.log('[Receiver] CORS audio failed, retrying without crossOrigin...');
        this.audioEl.removeAttribute('crossorigin');
        this.audioEl.src = url;
        this.audioEl.play().catch(e => console.error('[Receiver] Non-CORS retry failed:', e));
        return;
      }

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

    // Only connect Web Audio for CORS-safe (R2) URLs.
    // createMediaElementSource hijacks audio output — if CORS fails on Chromecast,
    // there's no sound at all. So for Icecast streams, skip Web Audio entirely.
    if (isCorsSafe && !this.mediaElSource) {
      try {
        this.mediaElSource = this.audioContext!.createMediaElementSource(this.audioEl);
        this.mediaElSource.connect(analyser);
        this.webAudioConnected = true;
        console.log('[Receiver] Web Audio connected — audio-reactive visuals enabled');
      } catch (err) {
        console.warn('[Receiver] Web Audio connect failed, playing direct:', err);
      }
    }

    if (!this.started) {
      this.visualizer.init(analyser);
      this.visualizer.start();
      this.sceneManager.start();
      this.started = true;
      document.getElementById('status')!.classList.add('hidden');
    }

    try {
      await this.audioEl.play();
      console.log(`[Receiver] Audio playing (Web Audio: ${this.webAudioConnected})`);
      this.startAudioWatchdog();
    } catch (err) {
      console.error('[Receiver] Audio play failed:', err);
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
    let stallCount = 0;

    this.audioWatchdog = setInterval(() => {
      // Don't fight an intentional pause
      if (this.intentionallyPaused) return;

      if (this.audioEl.paused || this.audioEl.ended) {
        console.warn('[Receiver] Watchdog: audio not playing, restarting...');
        this.audioEl.play().catch(e => console.error('[Receiver] Watchdog restart failed:', e));
        stallCount = 0;
        return;
      }

      // Detect stall: currentTime hasn't advanced
      if (lastTime === this.audioEl.currentTime && lastTime !== -1) {
        stallCount++;
        console.warn(`[Receiver] Watchdog: stream stalled (tick ${stallCount}, time frozen at ${lastTime})`);
        if (stallCount >= 2) {
          // Two consecutive stall ticks (60s total) → hard reload
          console.warn('[Receiver] Watchdog: hard reload after 60s stall');
          this.audioEl.load();
          this.audioEl.play().catch(e => console.error('[Receiver] Watchdog reload failed:', e));
          stallCount = 0;
        }
      } else {
        stallCount = 0;
      }
      lastTime = this.audioEl.currentTime;

      // Poke the wake lock — if it was released, try to reclaim it
      if (!this.wakeLock) {
        this.acquireWakeLock();
      }
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
      }
    );

    // STANDBY_CHANGED: fired when HDMI-CEC puts the TV into/out of standby.
    // This is the real root cause of the ~20-minute timeout on Android TV —
    // the TV's display sleep timer fires CEC standby, which can kill the Cast session.
    // We use this to log the event and attempt to re-acquire the wake lock on wakeup.
    this.castContext.addEventListener(
      cast.framework.system.EventType.STANDBY_CHANGED,
      (event: any) => {
        const isStandby = event.isStandby;
        console.log(`[Receiver] HDMI-CEC standby changed: isStandby=${isStandby}`);
        if (!isStandby) {
          // TV woke up — re-acquire wake lock immediately
          console.log('[Receiver] TV woke from standby — re-acquiring wake lock');
          this.acquireWakeLock();
          // Restart audio if it stopped during standby
          if (!this.intentionallyPaused && this.audioEl.paused && this.currentAudioUrl) {
            console.log('[Receiver] Resuming audio after standby');
            this.audioEl.play().catch(e => console.error('[Receiver] Post-standby resume failed:', e));
          }
        }
      }
    );

    // VISIBILITY_CHANGED: fired when the TV switches HDMI inputs (LappyCap loses/gains display).
    // Use this to re-acquire wake lock when we become the active input again.
    this.castContext.addEventListener(
      cast.framework.system.EventType.VISIBILITY_CHANGED,
      (event: any) => {
        const isVisible = event.isVisible;
        console.log(`[Receiver] Cast visibility changed: isVisible=${isVisible}`);
        if (isVisible) {
          console.log('[Receiver] Cast became visible — re-acquiring wake lock');
          this.acquireWakeLock();
        }
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

    // Auto-start with Groove Salad immediately. When the sender's 'load'
    // message arrives (usually within 1-2s), it overrides with the current audio.
    this.startStandalone();
  }

  private handleMessage(senderId: string, msg: ReceiverMessage): void {
    switch (msg.type) {
      case 'load': {
        this.intentionallyPaused = false; // new load always resumes
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
        // Show station name on TV if provided
        if (msg.stationName) {
          this.showStationName(msg.stationName);
        }
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
      case 'pause':
        this.intentionallyPaused = true;
        this.audioEl.pause();
        console.log('[Receiver] Paused by sender');
        break;
      case 'resume':
        this.intentionallyPaused = false;
        this.audioEl.play().catch(e => console.error('[Receiver] Resume failed:', e));
        console.log('[Receiver] Resumed by sender');
        break;
      case 'next':
        this.sceneManager.next();
        break;
      case 'prev':
        this.sceneManager.prev();
        break;
      case 'shuffle':
        this.sceneManager.toggleShuffle();
        break;
      case 'debug':
        this.toggleDebug();
        break;
      case 'settings':
        if (msg.cycleDuration !== undefined) this.sceneManager.setCycleDuration(msg.cycleDuration);
        if (msg.blendDuration !== undefined) this.sceneManager.setBlendDuration(msg.blendDuration);
        if (msg.volume !== undefined) this.audioEl.volume = Math.max(0, Math.min(1, msg.volume));
        break;
    }
  }

  private toggleDebug(): void {
    this.debugMode = !this.debugMode;
    const overlay = document.getElementById('debug-overlay')!;
    overlay.classList.toggle('visible', this.debugMode);

    if (this.debugMode) {


      this.debugTimer = setInterval(() => this.updateDebug(), 500);
    } else {
      if (this.debugTimer) clearInterval(this.debugTimer);
      this.debugTimer = null;
    }
  }

  private updateDebug(): void {
    const overlay = document.getElementById('debug-overlay')!;
    // Analyser data
    let audioLevel = 0;
    let peak = 0;
    let hasData = false;
    if (this.analyser) {
      const data = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(data);
      const sum = data.reduce((a, b) => a + b, 0);
      audioLevel = Math.round(sum / data.length);
      peak = Math.max(...data);
      hasData = sum > 0;
    }

    const lines = [
      `FPS: ${this.visualizer.fps}`,
      `Web Audio: ${this.webAudioConnected ? 'YES' : 'NO'}`,
      `Analyser data: ${hasData ? 'YES' : 'NO (zeroed)'}`,
      `Audio level: ${audioLevel} / peak: ${peak}`,
      `Audio src: ${this.audioEl.paused ? 'PAUSED' : 'PLAYING'}`,
      `CORS: ${this.audioEl.crossOrigin || 'none'}`,
      `URL: ${this.currentAudioUrl.split('/').pop()?.slice(0, 30) || 'none'}`,
      `UA: ${navigator.userAgent.includes('CrKey') ? 'Chromecast' : 'Browser'}`,
      `Canvas: ${document.querySelector('canvas')?.width}x${document.querySelector('canvas')?.height}`,
    ];

    overlay.innerHTML = lines.join('<br>');
  }

  /** Briefly display station name on screen: fade in 0.5s, hold 3s, fade out 1.5s */
  private showStationName(name: string): void {
    const el = document.getElementById('station-name')!;
    if (this.stationNameTimer) clearTimeout(this.stationNameTimer);

    el.textContent = `♪ ${name}`;
    el.className = 'fade-in';

    this.stationNameTimer = setTimeout(() => {
      el.className = 'fade-out';
      // Clean up text after fade-out completes
      this.stationNameTimer = setTimeout(() => {
        el.textContent = '';
        el.className = '';
      }, 1500);
    }, 3000);
  }

  /** Standalone mode for browser testing (no Cast device needed) */
  private startStandalone(): void {
    const status = document.getElementById('status')!;
    status.innerHTML = 'LappyCap Receiver<br><small>Standalone mode — pick a station</small>';

    // Auto-start with Groove Salad for testing
    const defaultStation = radioStations[0];
    this.playAudio(defaultStation.url).then(() => {
      status.classList.add('hidden');
      this.showStationName(defaultStation.name);
    }).catch(err => {
      status.innerHTML = `Error: ${err.message}`;
    });
  }
}

new LappyCapReceiver();
