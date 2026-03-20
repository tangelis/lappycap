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
  };
};

interface CastReceiverContext {
  start(): void;
  stop(): void;
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
  private mediaElSource: MediaElementAudioSourceNode | null = null;
  private audioEl: HTMLAudioElement;
  private castContext: CastReceiverContext | null = null;
  private started = false;

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
    const analyser = this.ensureAudio();

    this.audioEl.src = url;
    this.audioEl.crossOrigin = 'anonymous';

    if (!this.mediaElSource) {
      this.mediaElSource = this.audioContext!.createMediaElementSource(this.audioEl);
      this.mediaElSource.connect(analyser);
    }

    if (!this.started) {
      this.visualizer.init(analyser);
      this.visualizer.start();
      this.sceneManager.start();
      this.started = true;
      document.getElementById('status')!.classList.add('hidden');
    }

    await this.audioEl.play();
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

    this.castContext.addCustomMessageListener(NAMESPACE, (event) => {
      console.log('[Receiver] Message:', event.data);
      this.handleMessage(event.senderId, event.data as ReceiverMessage);
    });

    this.castContext.start();
    console.log('[Receiver] Cast receiver started');

    // Auto-start with Groove Salad so the TV isn't just a black screen
    this.startStandalone();
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
