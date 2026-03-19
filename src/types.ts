export interface PresetEntry {
  name: string;
  preset: object;
}

export interface Scene {
  name: string;
  description: string;
  bpmRange: [number, number];
  blendDuration: number;
  cycleDuration: number;
  order: 'shuffle' | 'sequential';
  presetNames: string[];
}

export interface AppState {
  currentScene: Scene;
  presets: PresetEntry[];
  currentIndex: number;
  nextIndex: number;
  blendProgress: number;
  isBlending: boolean;
  shuffle: boolean;
  cycleDuration: number;
  blendDuration: number;
  isPlaying: boolean;
  volume: number;
  isFullscreen: boolean;
}
