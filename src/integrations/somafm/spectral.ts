import type { LiveAudioData } from "./types";

export interface ComputeLiveAudioOptions {
  freqBandCount?: number;
  waveformMaxSamples?: number;
}

/**
 * Pure snapshot from analyser byte buffers (used by SomaFM hook and unit tests).
 */
export function computeLiveAudioFromByteArrays(
  freqData: Uint8Array,
  waveData: Uint8Array,
  fftSize: number,
  options: ComputeLiveAudioOptions = {}
): LiveAudioData {
  const freqBandCount = options.freqBandCount ?? 8;
  const waveformMaxSamples = options.waveformMaxSamples ?? 64;

  let sum = 0;
  for (let i = 0; i < freqData.length; i++) sum += freqData[i];
  const level = Math.min(1, (sum / freqData.length) / 255);

  const bandSize = Math.floor(freqData.length / freqBandCount);
  const frequencyBands: number[] = [];
  for (let b = 0; b < freqBandCount; b++) {
    let bandSum = 0;
    const start = b * bandSize;
    const end = Math.min(start + bandSize, freqData.length);
    for (let i = start; i < end; i++) bandSum += freqData[i];
    frequencyBands.push(Math.min(1, (bandSum / (end - start)) / 255));
  }

  const waveform: number[] = [];
  const waveStep = Math.max(1, Math.floor(waveData.length / waveformMaxSamples));
  for (let i = 0; i < waveData.length && waveform.length < waveformMaxSamples; i += waveStep) {
    waveform.push((waveData[i] - 128) / 128);
  }

  return {
    level,
    frequencyBands,
    fftSize,
    waveform,
  };
}
