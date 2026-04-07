import { describe, expect, it } from "vitest";
import { computeLiveAudioFromByteArrays } from "../../../src/integrations/somafm/spectral";

describe("computeLiveAudioFromByteArrays", () => {
  it("returns level 0 and flat bands for silence", () => {
    const freq = new Uint8Array(128).fill(0);
    const wave = new Uint8Array(256).fill(128);
    const out = computeLiveAudioFromByteArrays(freq, wave, 256, { freqBandCount: 8, waveformMaxSamples: 8 });
    expect(out.level).toBe(0);
    expect(out.frequencyBands).toHaveLength(8);
    expect(out.frequencyBands.every((b) => b === 0)).toBe(true);
    expect(out.waveform.every((s) => s === 0)).toBe(true);
    expect(out.fftSize).toBe(256);
  });

  it("returns level 1 when all frequency bins are max", () => {
    const freq = new Uint8Array(8).fill(255);
    const wave = new Uint8Array(8).fill(128);
    const out = computeLiveAudioFromByteArrays(freq, wave, 512, { freqBandCount: 4 });
    expect(out.level).toBe(1);
    expect(out.frequencyBands).toEqual([1, 1, 1, 1]);
  });

  it("downsamples waveform to at most waveformMaxSamples", () => {
    const freq = new Uint8Array(16).fill(0);
    const wave = new Uint8Array(256);
    for (let i = 0; i < wave.length; i++) wave[i] = i % 256;
    const out = computeLiveAudioFromByteArrays(freq, wave, 256, { waveformMaxSamples: 10 });
    expect(out.waveform.length).toBeLessThanOrEqual(10);
  });
});
