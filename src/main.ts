import { AudioManager } from './audio';
import { Visualizer } from './visualizer';
import { SceneManager } from './scene-manager';
import { loadPresetsForScene } from './preset-loader';
import { scenes } from './scenes';
import { radioStations } from './radio-stations';

class LappyCap {
  private audio: AudioManager;
  private visualizer: Visualizer;
  private sceneManager: SceneManager;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private audioSourceCreated = false;

  constructor() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;

    this.audio = new AudioManager(audioEl);
    this.visualizer = new Visualizer(canvas);
    this.sceneManager = new SceneManager(scenes[0]);

    this.init();
  }

  private async init(): Promise<void> {
    const loading = document.getElementById('loading')!;

    try {
      // Load presets for the default scene
      const presets = loadPresetsForScene(scenes[0]);
      this.sceneManager.setPresets(presets);

      // Show initial preset count
      const counter = document.getElementById('preset-counter')!;
      counter.textContent = `- / ${presets.length}`;

      // Wire up scene manager to visualizer
      this.sceneManager.onPresetCycle = (preset, blendDuration) => {
        this.visualizer.loadPreset(preset, blendDuration);
      };
      this.sceneManager.onPresetInfo = (index, total) => {
        const counter = document.getElementById('preset-counter')!;
        counter.textContent = `${index} / ${total}`;
      };

      // Init visualizer with audio analyser
      this.visualizer.onPresetChange = (name) => {
        const nameEl = document.getElementById('preset-name')!;
        nameEl.textContent = name;
      };

      // Set up all UI handlers
      this.setupControls();
      this.setupAutoHide();

      // Populate selectors
      this.populateSceneSelector();
      this.populateRadioSelector();

      loading.classList.add('hidden');

      // Show a prompt
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = '\u266B  Click anywhere or press any key to start the vibes  \u266B';
      nameEl.classList.add('splash');

      // Wait for user interaction to start audio context + auto-play Groove Salad
      const startOnInteraction = async () => {
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('keydown', startOnInteraction);
        await this.startVisualizer();
        // Auto-play Groove Salad on first interaction
        const defaultStation = radioStations[0];
        await this.playAudioURL(defaultStation.url);
        (document.getElementById('radio-select') as HTMLSelectElement).value = defaultStation.url;
      };
      document.addEventListener('click', startOnInteraction);
      document.addEventListener('keydown', startOnInteraction);

    } catch (err) {
      loading.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
      console.error(err);
    }
  }

  private async startVisualizer(): Promise<void> {
    try {
      const nameEl = document.getElementById('preset-name')!;
      nameEl.classList.remove('splash');
      const analyser = this.audio.getAnalyser();
      this.visualizer.init(analyser);
      this.sceneManager.start();
      this.visualizer.start();
    } catch (err) {
      console.error('[LappyCap] Failed to start visualizer:', err);
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = `Error: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  private setupControls(): void {
    // Preset navigation
    document.getElementById('btn-prev')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sceneManager.prev();
    });

    document.getElementById('btn-next')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.sceneManager.next();
    });

    // Shuffle toggle
    const shuffleBtn = document.getElementById('btn-shuffle')!;
    shuffleBtn.classList.add('active');
    shuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShuffled = this.sceneManager.toggleShuffle();
      shuffleBtn.classList.toggle('active', isShuffled);
    });

    // Fullscreen
    document.getElementById('btn-fullscreen')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });

    // Cycle speed
    const cycleSlider = document.getElementById('cycle-speed') as HTMLInputElement;
    const cycleLabel = document.getElementById('cycle-label')!;
    cycleSlider.addEventListener('input', () => {
      const val = parseInt(cycleSlider.value);
      cycleLabel.textContent = `${val}s`;
      this.sceneManager.setCycleDuration(val);
    });

    // Blend speed
    const blendSlider = document.getElementById('blend-speed') as HTMLInputElement;
    const blendLabel = document.getElementById('blend-label')!;
    blendSlider.addEventListener('input', () => {
      const val = parseInt(blendSlider.value);
      blendLabel.textContent = `${val}s`;
      this.sceneManager.setBlendDuration(val);
    });

    // Volume
    const volumeSlider = document.getElementById('volume') as HTMLInputElement;
    const volLabel = document.getElementById('vol-label')!;
    volumeSlider.addEventListener('input', () => {
      const val = parseInt(volumeSlider.value);
      volLabel.textContent = `${val}%`;
      this.audio.setVolume(val / 100);
    });

    // Radio station selector
    document.getElementById('radio-select')!.addEventListener('change', async (e) => {
      e.stopPropagation();
      const select = e.target as HTMLSelectElement;
      const url = select.value;
      if (url) {
        await this.playAudioURL(url);
      }
    });

    // Custom audio URL loading
    document.getElementById('btn-load-audio')!.addEventListener('click', async (e) => {
      e.stopPropagation();
      const urlInput = document.getElementById('audio-url') as HTMLInputElement;
      const url = urlInput.value.trim();
      if (url) {
        // Clear radio selection since we're using a custom URL
        (document.getElementById('radio-select') as HTMLSelectElement).value = '';
        await this.playAudioURL(url);
      }
    });

    // Mic input
    document.getElementById('btn-mic')!.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        // Clear radio selection
        (document.getElementById('radio-select') as HTMLSelectElement).value = '';
        await this.audio.startMic();
      } catch (err) {
        console.error('Mic error:', err);
      }
    });

    // Scene selector
    document.getElementById('scene-select')!.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      const scene = scenes.find(s => s.name === select.value);
      if (scene) {
        this.loadScene(scene);
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't intercept when typing in input fields
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          this.sceneManager.next();
          break;
        case 'ArrowLeft':
        case 'p':
          this.sceneManager.prev();
          break;
        case 'f':
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
          break;
        case 's':
          this.sceneManager.toggleShuffle();
          break;
        case 'Escape':
          this.showControls();
          break;
      }
    });
  }

  private loadScene(scene: typeof scenes[0]): void {
    this.sceneManager.stop();
    const newManager = new SceneManager(scene);
    const presets = loadPresetsForScene(scene);
    newManager.setPresets(presets);
    newManager.onPresetCycle = (preset, blendDuration) => {
      this.visualizer.loadPreset(preset, blendDuration);
    };
    newManager.onPresetInfo = (index, total) => {
      document.getElementById('preset-counter')!.textContent = `${index} / ${total}`;
    };
    this.sceneManager = newManager;

    const cycleSlider = document.getElementById('cycle-speed') as HTMLInputElement;
    const blendSlider = document.getElementById('blend-speed') as HTMLInputElement;
    cycleSlider.value = String(scene.cycleDuration);
    document.getElementById('cycle-label')!.textContent = `${scene.cycleDuration}s`;
    blendSlider.value = String(scene.blendDuration);
    document.getElementById('blend-label')!.textContent = `${scene.blendDuration}s`;

    this.sceneManager.start();
  }

  private async playAudioURL(url: string): Promise<void> {
    try {
      if (this.audioSourceCreated) {
        const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
        audioEl.src = url;
        await audioEl.play();
      } else {
        await this.audio.loadURL(url);
        this.audioSourceCreated = true;
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = `Audio error: ${err instanceof Error ? err.message : 'Failed to load'}`;
    }
  }

  private populateRadioSelector(): void {
    const select = document.getElementById('radio-select') as HTMLSelectElement;
    for (const station of radioStations) {
      const opt = document.createElement('option');
      opt.value = station.url;
      opt.textContent = `${station.name} — ${station.genre}`;
      select.appendChild(opt);
    }
  }

  private populateSceneSelector(): void {
    const select = document.getElementById('scene-select') as HTMLSelectElement;
    select.innerHTML = '';
    for (const scene of scenes) {
      const opt = document.createElement('option');
      opt.value = scene.name;
      opt.textContent = scene.name;
      select.appendChild(opt);
    }
  }

  private setupAutoHide(): void {
    const controls = document.getElementById('controls')!;
    const presetName = document.getElementById('preset-name')!;

    const show = () => {
      controls.classList.remove('hidden');
      presetName.classList.remove('hidden');
      if (this.hideTimer) clearTimeout(this.hideTimer);
      this.hideTimer = setTimeout(() => {
        controls.classList.add('hidden');
        presetName.classList.add('hidden');
      }, 4000);
    };

    document.addEventListener('mousemove', show);
    document.addEventListener('touchstart', show);

    controls.addEventListener('mouseenter', () => {
      if (this.hideTimer) clearTimeout(this.hideTimer);
    });
    controls.addEventListener('mouseleave', show);
  }

  private showControls(): void {
    const controls = document.getElementById('controls')!;
    const presetName = document.getElementById('preset-name')!;
    controls.classList.remove('hidden');
    presetName.classList.remove('hidden');
  }
}

new LappyCap();
