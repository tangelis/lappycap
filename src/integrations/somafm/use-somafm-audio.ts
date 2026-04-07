"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveAudioData, SomaFMChannel } from "./types";
import { fetchSomaFMChannels, getStreamUrl } from "./api";
import { resolveDefaultSomaFMChannel } from "./default-channel";
import { computeLiveAudioFromByteArrays } from "./spectral";

const FFT_SIZE = 2048;
const FREQ_BAND_COUNT = 8;
const SMOOTHING = 0.75;

export interface UseSomaFMAudioResult {
  channels: SomaFMChannel[];
  loading: boolean;
  error: string | null;
  currentChannel: SomaFMChannel | null;
  setChannel: (channel: SomaFMChannel | null) => void;
  play: (channel: SomaFMChannel) => void;
  stop: () => void;
  isPlaying: boolean;
  liveData: LiveAudioData | null;
  analyserNode: AnalyserNode | null;
}

/**
 * Fetches SomaFM channels and provides Web Audio pipeline for a selected stream:
 * HTMLAudioElement → AudioContext → MediaElementSourceNode → AnalyserNode.
 * Exposes live frequency bands and amplitude for the visualizer.
 */
export function useSomaFMAudio(): UseSomaFMAudioResult {
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentChannel, setCurrentChannel] = useState<SomaFMChannel | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveData, setLiveData] = useState<LiveAudioData | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const waveformArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSomaFMChannels()
      .then((list) => {
        if (!cancelled) setChannels(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load SomaFM channels");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentChannel || channels.length === 0) return;
    const preferred = resolveDefaultSomaFMChannel(channels);
    if (preferred) setCurrentChannel(preferred);
  }, [channels, currentChannel]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (sourceRef.current && contextRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // ignore
      }
    }
    sourceRef.current = null;
    analyserRef.current = null;
    setAnalyserNode(null);
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
    dataArrayRef.current = null;
    waveformArrayRef.current = null;
    setLiveData(null);
    setIsPlaying(false);
  }, []);

  const play = useCallback((channel: SomaFMChannel) => {
    stop();

    const audio = document.createElement("audio");
    audio.crossOrigin = "anonymous";
    audio.preload = "none";

    const streamUrl = getStreamUrl(channel.id);
    audio.src = streamUrl;

    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;
    analyser.minDecibels = -70;
    analyser.maxDecibels = -20;
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioRef.current = audio;
    contextRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;
    setAnalyserNode(analyser);

    const bufferLength = analyser.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);
    waveformArrayRef.current = new Uint8Array(analyser.fftSize);

    setCurrentChannel(channel);
    setIsPlaying(true);

    const playPromise = audio.play();
    playPromise.catch((e) => {
      stop();
      setError(e instanceof Error ? e.message : "Playback failed");
    });

    function tick() {
      const anal = analyserRef.current;
      const freqData = dataArrayRef.current;
      const waveData = waveformArrayRef.current;
      if (!anal || !freqData || !waveData) return;

      anal.getByteFrequencyData(freqData as unknown as Uint8Array<ArrayBuffer>);
      anal.getByteTimeDomainData(waveData as unknown as Uint8Array<ArrayBuffer>);

      setLiveData(
        computeLiveAudioFromByteArrays(freqData, waveData, anal.fftSize, {
          freqBandCount: FREQ_BAND_COUNT,
          waveformMaxSamples: 64,
        })
      );

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    channels,
    loading,
    error,
    currentChannel,
    setChannel: setCurrentChannel,
    play,
    stop,
    isPlaying,
    liveData,
    analyserNode,
  };
}
