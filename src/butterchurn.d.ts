declare module 'butterchurn' {
  interface VisualizerOptions {
    width: number;
    height: number;
    meshWidth?: number;
    meshHeight?: number;
    pixelRatio?: number;
    textureRatio?: number;
  }

  interface ButterchurnVisualizer {
    connectAudio(audioNode: AudioNode): void;
    loadPreset(preset: object, blendTime: number): void;
    setRendererSize(width: number, height: number): void;
    render(): void;
    launchSongTitleAnim(title: string): void;
  }

  const butterchurn: {
    createVisualizer(
      audioContext: BaseAudioContext,
      canvas: WebGLRenderingContext,
      options: VisualizerOptions
    ): ButterchurnVisualizer;
  };

  export default butterchurn;
}

declare module 'butterchurn-presets' {
  const presets: {
    getPresets(): Record<string, object>;
  };
  export default presets;
}

declare module 'butterchurn-presets/lib/butterchurnPresetsExtra.min.js' {
  const presets: {
    getPresets(): Record<string, object>;
  };
  export default presets;
}

declare module 'butterchurn-presets/lib/butterchurnPresetsExtra2.min.js' {
  const presets: {
    getPresets(): Record<string, object>;
  };
  export default presets;
}
