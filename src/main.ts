import { AudioManager } from './audio';
import { Visualizer } from './visualizer';
import { SceneManager } from './scene-manager';
import { loadPresetsForScene } from './preset-loader';
import { scenes } from './scenes';
import { radioStations, djSets, defaultPlaybackStation, findStationByUrl, findStationByName } from './radio-stations';
import { CastSender } from './cast-sender';
import { Playlist, formatDuration } from './playlist';
import type { PlaylistTrack } from './playlist';

class LappyCap {
  private audio: AudioManager;
  private visualizer: Visualizer;
  private sceneManager: SceneManager;
  private castSender: CastSender;
  private playlist: Playlist;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private audioSourceCreated = false;
  private currentAudioUrl: string = '';
  private preCastVolume: number = 1;
  private isPaused = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private playingFromPlaylist = false;
  private dragSrcIndex: number = -1;
  private currentTrackTitle?: string;
  /** True when we paused `<audio>` only because the tab went to the background (not user pause). */
  private autoPausedForBackground = false;

  constructor() {
    const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;

    this.audio = new AudioManager(audioEl);
    this.visualizer = new Visualizer(canvas);
    this.sceneManager = new SceneManager(scenes[0]);
    this.castSender = new CastSender();
    this.playlist = new Playlist();
    this.setupCast();
    this.setupPlaylist();
    this.setupBackgroundAudioPause();

    this.init();
  }

  /**
   * Pause local `<audio>` when the tab is hidden so background sessions (especially on
   * Android) do not keep streaming with no UI. Chromecast audio runs on the receiver;
   * pausing the muted local element only saves phone battery and stops the analyser.
   */
  private setupBackgroundAudioPause(): void {
    const sync = (): void => {
      const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
      if (document.visibilityState === 'hidden') {
        if (!audioEl.paused) {
          audioEl.pause();
          this.autoPausedForBackground = !this.isPaused;
        }
        return;
      }
      if (this.autoPausedForBackground && !this.isPaused) {
        this.autoPausedForBackground = false;
        audioEl.play().catch((e) => console.warn('[LappyCap] Background resume failed:', e));
      } else {
        this.autoPausedForBackground = false;
      }
    };
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', sync);
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
      (document.getElementById('radio-select') as HTMLSelectElement).value = defaultPlaybackStation.url;

      // Apply URL params
      const urlParams = new URLSearchParams(window.location.search);
      const sceneParam = urlParams.get('scene');
      if (sceneParam) {
        const matchedScene = scenes.find(s => s.name.toLowerCase() === sceneParam.toLowerCase());
        if (matchedScene) {
          this.loadScene(matchedScene);
          (document.getElementById('scene-select') as HTMLSelectElement).value = matchedScene.name;
        }
      }

      loading.classList.add('hidden');

      // Show a prompt
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = '\u266B  Click anywhere or press any key to start the vibes  \u266B';
      nameEl.classList.add('splash');

      // Wait for user interaction to start audio context + auto-play a station
      const startOnInteraction = async () => {
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('keydown', startOnInteraction);
        // Wire URL audio into the analyser before Butterchurn connects so the first frame has real spectrum data.
        const stationParam = urlParams.get('station');
        const station = stationParam
          ? (findStationByName(stationParam) ?? defaultPlaybackStation)
          : defaultPlaybackStation;
        await this.playAudioURL(station.url);
        (document.getElementById('radio-select') as HTMLSelectElement).value = station.url;
        await this.startVisualizer();
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

    // Pause / Resume button
    const pauseBtn = document.getElementById('btn-pause')!;
    pauseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    // Shuffle toggle
    const shuffleBtn = document.getElementById('btn-shuffle')!;
    shuffleBtn.classList.add('active');
    shuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShuffled = this.sceneManager.toggleShuffle();
      shuffleBtn.classList.toggle('active', isShuffled);
    });

    // Settings panel toggle
    const settingsBtn = document.getElementById('btn-settings')!;
    const settingsPanel = document.getElementById('settings-panel')!;
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = settingsPanel.classList.toggle('open');
      settingsBtn.classList.toggle('active', isOpen);
      // Mutual exclusion with playlist
      if (isOpen) {
        document.getElementById('playlist-panel')!.classList.remove('open');
        document.getElementById('btn-playlist')!.classList.remove('active');
      }
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

    // Visual speed (FPS + audio smoothing)
    const speedSlider = document.getElementById('vis-speed') as HTMLInputElement;
    const speedLabel = document.getElementById('speed-label')!;
    speedSlider.addEventListener('input', () => {
      const fps = parseInt(speedSlider.value);
      const pct = Math.round((fps / 60) * 100);
      speedLabel.textContent = `${pct}%`;
      this.visualizer.setSpeed(fps);
      // Map speed to audio smoothing: slow speed = high smoothing (less reactive)
      const smoothing = 0.5 + (1 - fps / 60) * 0.48;
      this.audio.setSmoothing(smoothing);
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
        // Switching to radio — deactivate playlist
        this.playingFromPlaylist = false;
        this.renderPlaylistTracks();
        await this.playAudioURL(url);
      }
    });

    // Shuffle station — pick a random radio station
    document.getElementById('btn-shuffle-station')!.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.playingFromPlaylist = false;
      this.renderPlaylistTracks();
      const allStations = [...djSets, ...radioStations];
      const idx = Math.floor(Math.random() * allStations.length);
      const station = allStations[idx];
      (document.getElementById('radio-select') as HTMLSelectElement).value = station.url;
      await this.playAudioURL(station.url);
    });

    // Custom audio URL loading
    document.getElementById('btn-load-audio')!.addEventListener('click', async (e) => {
      e.stopPropagation();
      const urlInput = document.getElementById('audio-url') as HTMLInputElement;
      const url = urlInput.value.trim();
      if (url) {
        // Clear radio selection since we're using a custom URL
        this.playingFromPlaylist = false;
        this.renderPlaylistTracks();
        (document.getElementById('radio-select') as HTMLSelectElement).value = '';
        await this.playAudioURL(url);
      }
    });

    // Seek bar for DJ sets
    const seekSlider = document.getElementById('seek-slider') as HTMLInputElement;
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
    let seekDragging = false;

    seekSlider.addEventListener('input', () => {
      seekDragging = true;
      const time = (parseFloat(seekSlider.value) / 100) * (audioEl.duration || 0);
      document.getElementById('seek-current')!.textContent = this.formatTime(time);
    });
    seekSlider.addEventListener('change', () => {
      const time = (parseFloat(seekSlider.value) / 100) * (audioEl.duration || 0);
      audioEl.currentTime = time;
      seekDragging = false;
    });

    document.getElementById('btn-ff')!.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isFinite(audioEl.duration)) audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 30);
    });
    document.getElementById('btn-rw')!.addEventListener('click', (e) => {
      e.stopPropagation();
      audioEl.currentTime = Math.max(0, audioEl.currentTime - 30);
    });

    // Update seek bar position
    setInterval(() => {
      if (seekDragging || !isFinite(audioEl.duration) || audioEl.duration === 0) return;
      const pct = (audioEl.currentTime / audioEl.duration) * 100;
      seekSlider.value = String(pct);
      document.getElementById('seek-current')!.textContent = this.formatTime(audioEl.currentTime);
      document.getElementById('seek-duration')!.textContent = this.formatTime(audioEl.duration);
    }, 500);

    // Cast debug overlay toggle
    document.getElementById('btn-debug-cast')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.castSender.send({ type: 'debug' });
    });

    // Mic input (toggle)
    const micBtn = document.getElementById('btn-mic')!;
    micBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (this.audio.isMicActive) {
        this.audio.stopMic();
        micBtn.classList.remove('active');
      } else {
        try {
          (document.getElementById('radio-select') as HTMLSelectElement).value = '';
          await this.audio.startMic();
          micBtn.classList.add('active');
        } catch (err) {
          console.error('Mic error:', err);
        }
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
          if (e.shiftKey) {
            const ael = document.getElementById('audio-element') as HTMLAudioElement;
            if (isFinite(ael.duration)) { ael.currentTime = Math.min(ael.duration, ael.currentTime + 30); e.preventDefault(); }
          } else { this.sceneManager.next(); }
          break;
        case 'n':
          this.sceneManager.next();
          break;
        case 'ArrowLeft':
          if (e.shiftKey) {
            const ael = document.getElementById('audio-element') as HTMLAudioElement;
            ael.currentTime = Math.max(0, ael.currentTime - 30); e.preventDefault();
          } else { this.sceneManager.prev(); }
          break;
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
        case 'r': {
          this.playingFromPlaylist = false;
          this.renderPlaylistTracks();
          const allStations = [...djSets, ...radioStations];
          const idx = Math.floor(Math.random() * allStations.length);
          const station = allStations[idx];
          (document.getElementById('radio-select') as HTMLSelectElement).value = station.url;
          this.playAudioURL(station.url).catch(err => console.error('Radio error:', err));
          break;
        }
        case ' ':
          e.preventDefault();
          this.togglePause();
          break;
        case 'c':
          this.copyShareLink();
          break;
        case 'Escape':
          this.hideHelp();
          this.showControls();
          break;
        case '?':
          this.toggleHelp();
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

    if (this.castSender.isConnected) {
      this.castSender.send({ type: 'scene', sceneName: scene.name });
    }
  }

  /** Update the "Now Playing" pill in the top-right corner */
  private updateNowPlaying(): void {
    const pill = document.getElementById('now-playing')!;
    const nameEl = document.getElementById('np-station-name')!;
    const indicator = pill.querySelector('.np-indicator') as HTMLElement;
    const select = document.getElementById('radio-select') as HTMLSelectElement;

    // Find the station name from the currently selected option
    const station = findStationByUrl(select.value);
    if (station) {
      nameEl.textContent = station.name;
      indicator.textContent = this.isPaused ? '⏸' : '▶';
      pill.classList.add('visible');
    } else if (this.playingFromPlaylist && this.currentTrackTitle) {
      nameEl.textContent = this.currentTrackTitle;
      indicator.textContent = this.isPaused ? '⏸' : '▶';
      pill.classList.add('visible');
    } else if (this.currentAudioUrl) {
      // Custom URL — show truncated URL
      nameEl.textContent = 'Custom stream';
      indicator.textContent = this.isPaused ? '⏸' : '▶';
      pill.classList.add('visible');
    } else {
      pill.classList.remove('visible');
    }
  }

  /** Toggle audio pause/resume and show indicator */
  private togglePause(): void {
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
    const pauseBtn = document.getElementById('btn-pause')!;
    if (audioEl.paused) {
      audioEl.play().catch(err => console.error('Resume failed:', err));
      this.isPaused = false;
      pauseBtn.innerHTML = '&#9646;&#9646;';
      pauseBtn.classList.remove('active');
      this.showToast('▶', 1500);
      if (this.castSender.isConnected) this.castSender.send({ type: 'resume' });
    } else {
      audioEl.pause();
      this.isPaused = true;
      pauseBtn.innerHTML = '&#9654;';
      pauseBtn.classList.add('active');
      this.showToast('⏸', 1500);
      if (this.castSender.isConnected) this.castSender.send({ type: 'pause' });
    }
    this.updateNowPlaying();
  }

  /** Copy a shareable URL with current scene + station to clipboard */
  private copyShareLink(): void {
    const url = new URL(window.location.href);
    // Clear existing params and set current state
    url.search = '';
    url.searchParams.set('scene', this.sceneManager.getScene().name);
    const station = findStationByUrl(this.currentAudioUrl);
    if (station) {
      url.searchParams.set('station', station.name);
    }
    navigator.clipboard.writeText(url.toString()).then(() => {
      this.showToast('🔗 Link copied!', 2000);
    }).catch(() => {
      // Fallback: still show the URL
      this.showToast('🔗 ' + url.toString(), 3000);
    });
  }

  /** Show a centered toast message that auto-fades after `durationMs` */
  private showToast(message: string, durationMs = 2000): void {
    const toast = document.getElementById('toast')!;
    toast.textContent = message;
    toast.classList.add('visible');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, durationMs);
  }

  /** Get the currently-selected station name (or undefined for custom URLs) */
  private getCurrentStationName(): string | undefined {
    const select = document.getElementById('radio-select') as HTMLSelectElement;
    const station = findStationByUrl(select.value);
    return station?.name;
  }

  private async playAudioURL(url: string, trackTitle?: string): Promise<void> {
    this.currentAudioUrl = url;
    this.isPaused = false;
    this.currentTrackTitle = trackTitle;
    try {
      if (this.audioSourceCreated) {
        const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
        audioEl.crossOrigin = 'anonymous';
        audioEl.src = url;
        await audioEl.play();
      } else {
        await this.audio.loadURL(url);
        this.audioSourceCreated = true;
      }
      // Update now-playing display and seek bar
      this.updateNowPlaying();
      // Wait for metadata to determine if seekable
      const audioEl2 = document.getElementById('audio-element') as HTMLAudioElement;
      audioEl2.addEventListener('loadedmetadata', () => this.updateSeekBar(), { once: true });
      // Also check after a short delay for streams that don't fire loadedmetadata
      setTimeout(() => this.updateSeekBar(), 1000);
      // Forward to Chromecast if connected
      if (this.castSender.isConnected) {
        this.castSender.send({
          type: 'load',
          audioUrl: url,
          sceneName: this.sceneManager.getScene().name,
          stationName: trackTitle || this.getCurrentStationName(),
        });
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
      const nameEl = document.getElementById('preset-name')!;
      nameEl.textContent = `Audio error: ${err instanceof Error ? err.message : 'Failed to load'}`;
    }
  }

  private setupCast(): void {
    const castBtn = document.getElementById('btn-cast')!;
    const castLauncher = document.getElementById('cast-launcher')!;

    this.castSender.onAvailabilityChanged = (available) => {
      castBtn.classList.toggle('cast-unavailable', !available);
      // Hide the fallback button if the native launcher is rendering
      const launcherVisible = castLauncher.offsetWidth > 0;
      castBtn.style.display = launcherVisible ? 'none' : '';
    };

    this.castSender.onSessionChanged = (connected, deviceName) => {
      castBtn.classList.toggle('active', connected);
      const castStatus = document.getElementById('cast-status')!;
      if (connected) {
        // Show cast status with device name
        const name = deviceName || 'Chromecast';
        castStatus.textContent = `📺 ${name}`;
        this.showToast(`🎬 Casting to ${name}`, 3000);
        // Send current state to receiver — delay to let receiver finish booting
        if (this.currentAudioUrl) {
          const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
          const sendLoad = () => this.castSender.send({
            type: 'load',
            audioUrl: this.currentAudioUrl,
            sceneName: this.sceneManager.getScene().name,
            stationName: this.getCurrentStationName(),
            seekTime: isFinite(audioEl.duration) ? audioEl.currentTime : undefined,
          });
          // Send immediately and again after 2s in case receiver wasn't ready
          sendLoad();
          setTimeout(sendLoad, 2000);
        }
        // Silence local audio — Chromecast plays its own stream
        // Use volume=0 instead of muted to keep the stream alive for the analyser
        const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
        this.preCastVolume = audioEl.volume;
        audioEl.volume = 0;
      } else {
        castStatus.textContent = '';
        this.showToast('📺 Cast disconnected', 2000);
        // Restore local volume
        const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
        audioEl.volume = this.preCastVolume ?? 1;
      }
    };

    castBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.castSender.requestSession();
    });
  }

  // ── Playlist integration ──

  private setupPlaylist(): void {
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;

    // Load saved playlist from localStorage
    this.playlist.loadFromStorage();

    // Wire auto-advance on track end
    audioEl.addEventListener('ended', () => {
      if (!this.playingFromPlaylist) return;
      const next = this.playlist.next();
      if (next) {
        if (this.playlist.repeat === 'one') {
          // For repeat-one, we need to restart from the beginning
          audioEl.currentTime = 0;
          audioEl.play().catch(err => console.error('Repeat play failed:', err));
          this.renderPlaylistTracks();
        } else {
          this.playPlaylistTrack(next);
        }
      } else {
        this.playingFromPlaylist = false;
        this.updateNowPlaying();
        this.renderPlaylistTracks();
      }
    });

    // Wire playlist callbacks
    this.playlist.onTrackChange = (_track: PlaylistTrack, _index: number, _total: number) => {
      this.renderPlaylistTracks();
    };
    this.playlist.onListUpdated = () => {
      this.renderPlaylistTracks();
    };
    this.playlist.onPlaylistEmpty = () => {
      this.playingFromPlaylist = false;
      const audioEl2 = document.getElementById('audio-element') as HTMLAudioElement;
      audioEl2.pause();
      audioEl2.src = '';
      this.currentAudioUrl = '';
      this.updateNowPlaying();
      this.renderPlaylistTracks();
    };

    // Panel toggle button
    const plBtn = document.getElementById('btn-playlist')!;
    const plPanel = document.getElementById('playlist-panel')!;
    const settingsBtn = document.getElementById('btn-settings')!;
    const settingsPanel = document.getElementById('settings-panel')!;

    plBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = plPanel.classList.toggle('open');
      plBtn.classList.toggle('active', isOpen);
      // Mutual exclusion with settings
      if (isOpen) {
        settingsPanel.classList.remove('open');
        settingsBtn.classList.remove('active');
      }
    });

    // Close button
    document.getElementById('pl-close')!.addEventListener('click', (e) => {
      e.stopPropagation();
      plPanel.classList.remove('open');
      plBtn.classList.remove('active');
    });

    // Shuffle toggle
    const shuffleBtn = document.getElementById('pl-shuffle')!;
    if (this.playlist.isShuffled) shuffleBtn.classList.add('active');
    shuffleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const on = this.playlist.toggleShuffle();
      shuffleBtn.classList.toggle('active', on);
      this.playlist.saveToStorage();
    });

    // Repeat cycle
    const repeatBtn = document.getElementById('pl-repeat')!;
    this.updateRepeatButton(repeatBtn);
    repeatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playlist.cycleRepeat();
      this.updateRepeatButton(repeatBtn);
      this.playlist.saveToStorage();
    });

    // File upload
    const fileInput = document.getElementById('pl-file-input') as HTMLInputElement;
    document.getElementById('pl-upload-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        for (const f of Array.from(fileInput.files)) {
          this.playlist.addFile(f);
        }
        this.renderPlaylistTracks();
        this.playlist.saveToStorage();
      }
      fileInput.value = '';
    });

    // URL toggle + add
    const urlToggle = document.getElementById('pl-url-toggle')!;
    const urlRow = document.getElementById('pl-url-row')!;
    const urlInput = document.getElementById('pl-url-input') as HTMLInputElement;
    urlToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      urlRow.classList.toggle('visible');
      if (urlRow.classList.contains('visible')) {
        urlInput.focus();
      }
    });

    document.getElementById('pl-url-add')!.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = urlInput.value.trim();
      if (url) {
        this.playlist.addUrl(url);
        urlInput.value = '';
        this.renderPlaylistTracks();
        this.playlist.saveToStorage();
      }
    });

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        const url = urlInput.value.trim();
        if (url) {
          this.playlist.addUrl(url);
          urlInput.value = '';
          this.renderPlaylistTracks();
          this.playlist.saveToStorage();
        }
      }
    });

    // M3U export
    document.getElementById('pl-export')!.addEventListener('click', (e) => {
      e.stopPropagation();
      const m3u = this.playlist.exportM3U();
      const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'lappycap-playlist.m3u';
      a.click();
      URL.revokeObjectURL(a.href);
    });

    // M3U import
    const importInput = document.getElementById('pl-import-input') as HTMLInputElement;
    document.getElementById('pl-import-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      importInput.click();
    });
    importInput.addEventListener('change', () => {
      const file = importInput.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const text = reader.result as string;
          this.playlist.importM3U(text);
          this.renderPlaylistTracks();
          this.playlist.saveToStorage();
        };
        reader.readAsText(file);
      }
      importInput.value = '';
    });

    // Clear all
    document.getElementById('pl-clear')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.playlist.clear();
      this.renderPlaylistTracks();
      this.playlist.saveToStorage();
    });

    // Render initial track list
    this.renderPlaylistTracks();
  }

  private updateRepeatButton(btn: HTMLElement): void {
    const mode = this.playlist.repeat;
    const labels: Record<string, string> = { none: '➡️', one: '🔂', all: '🔁' };
    const titles: Record<string, string> = { none: 'Repeat: Off', one: 'Repeat: One', all: 'Repeat: All' };
    btn.textContent = labels[mode];
    btn.title = titles[mode];
    btn.classList.toggle('active', mode !== 'none');
  }

  private renderPlaylistTracks(): void {
    const container = document.getElementById('pl-track-list')!;
    const tracks = this.playlist.getTracks();
    const currentPos = this.playlist.currentPosition;

    if (tracks.length === 0) {
      container.innerHTML = '<div class="pl-empty">No tracks — upload files or add URLs</div>';
      return;
    }

    container.innerHTML = '';
    tracks.forEach((track, idx) => {
      const el = document.createElement('div');
      el.className = 'pl-track';
      if (idx === currentPos && this.playingFromPlaylist) {
        el.classList.add('active');
      }
      el.dataset.index = String(idx);
      el.draggable = true;

      const drag = document.createElement('span');
      drag.className = 'pl-drag';
      drag.textContent = '⠿';

      const indicator = document.createElement('span');
      indicator.className = 'pl-indicator';
      indicator.textContent = (idx === currentPos && this.playingFromPlaylist) ? '▶' : '○';

      const title = document.createElement('span');
      title.className = 'pl-track-title';
      title.textContent = track.title;
      title.title = track.title;

      const duration = document.createElement('span');
      duration.className = 'pl-duration';
      duration.textContent = track.duration ? formatDuration(track.duration) : '';

      const del = document.createElement('button');
      del.className = 'pl-delete';
      del.textContent = '✕';
      del.title = 'Remove track';

      el.appendChild(drag);
      el.appendChild(indicator);
      el.appendChild(title);
      el.appendChild(duration);
      el.appendChild(del);

      // Click to play
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if ((e.target as HTMLElement).classList.contains('pl-delete')) return;
        if ((e.target as HTMLElement).classList.contains('pl-drag')) return;
        const t = this.playlist.jumpTo(idx);
        if (t) {
          this.playPlaylistTrack(t);
        }
      });

      // Delete
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasPlaying = idx === currentPos && this.playingFromPlaylist;
        this.playlist.removeTrack(track.id);
        if (wasPlaying && this.playlist.length > 0) {
          const cur = this.playlist.getCurrentTrack();
          if (cur) this.playPlaylistTrack(cur);
        }
        this.renderPlaylistTracks();
        this.playlist.saveToStorage();
      });

      // Drag events
      el.addEventListener('dragstart', (e) => {
        this.dragSrcIndex = idx;
        el.style.opacity = '0.4';
        e.dataTransfer!.effectAllowed = 'move';
      });
      el.addEventListener('dragend', () => {
        el.style.opacity = '1';
        this.dragSrcIndex = -1;
        // Remove all drag-over classes
        container.querySelectorAll('.drag-over').forEach(el2 => el2.classList.remove('drag-over'));
      });
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        el.classList.add('drag-over');
      });
      el.addEventListener('dragleave', () => {
        el.classList.remove('drag-over');
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.classList.remove('drag-over');
        const toIdx = parseInt(el.dataset.index!);
        if (this.dragSrcIndex >= 0 && this.dragSrcIndex !== toIdx) {
          this.playlist.moveTrack(this.dragSrcIndex, toIdx);
          this.renderPlaylistTracks();
          this.playlist.saveToStorage();
        }
      });

      container.appendChild(el);
    });
  }

  private playPlaylistTrack(track: PlaylistTrack): void {
    this.playingFromPlaylist = true;
    // Clear radio station selection
    (document.getElementById('radio-select') as HTMLSelectElement).value = '';
    // Stop mic if active
    if (this.audio.isMicActive) {
      this.audio.stopMic();
      document.getElementById('btn-mic')!.classList.remove('active');
    }
    // Play the track
    this.playAudioURL(track.url, track.title);
    this.renderPlaylistTracks();
  }

  private populateRadioSelector(): void {
    const select = document.getElementById('radio-select') as HTMLSelectElement;

    if (djSets.length > 0) {
      const setsGroup = document.createElement('optgroup');
      setsGroup.label = 'DJ Sets';
      for (const set of djSets) {
        const opt = document.createElement('option');
        opt.value = set.url;
        opt.textContent = `${set.name} — ${set.genre}`;
        setsGroup.appendChild(opt);
      }
      select.appendChild(setsGroup);
    }

    const radioGroup = document.createElement('optgroup');
    radioGroup.label = 'Radio Stations';
    for (const station of radioStations) {
      const opt = document.createElement('option');
      opt.value = station.url;
      opt.textContent = `${station.name} — ${station.genre}`;
      radioGroup.appendChild(opt);
    }
    select.appendChild(radioGroup);
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

  private toggleHelp(): void {
    const overlay = document.getElementById('help-overlay')!;
    overlay.classList.toggle('hidden');
  }

  private hideHelp(): void {
    const overlay = document.getElementById('help-overlay')!;
    overlay.classList.add('hidden');
  }

  private showControls(): void {
    const controls = document.getElementById('controls')!;
    const presetName = document.getElementById('preset-name')!;
    controls.classList.remove('hidden');
    presetName.classList.remove('hidden');
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = String(m).padStart(h > 0 ? 2 : 1, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${ms}:${ss}` : `${m}:${ss}`;
  }

  private updateSeekBar(): void {
    const audioEl = document.getElementById('audio-element') as HTMLAudioElement;
    const seekBar = document.getElementById('seek-bar')!;
    // Show seek bar only for finite-duration sources (DJ sets, not live radio)
    const isSeekable = isFinite(audioEl.duration) && audioEl.duration > 0;
    seekBar.classList.toggle('visible', isSeekable);
  }
}

new LappyCap();
