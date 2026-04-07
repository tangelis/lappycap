"use client";

import {
  BLEND_PRESET_LABELS,
  BLEND_PRESET_VALUES,
  DEFAULT_BUTTERCHURN_TUNING,
  MOTION_PRESET_LABELS,
  MOTION_PRESET_VALUES,
  PRESET_MODE_LABELS,
} from "@/components/butterchurn-config";
import { LappycapLeanBackVisualizer } from "@/components/LappycapLeanBackVisualizer";
import {
  LappycapVisualizer,
  type LappycapVisualizerSessionView,
} from "@/components/LappycapVisualizer";
import {
  VISUALIZER_QUALITY_STORAGE_KEY,
  VISUALIZER_QUALITY_USER_MODE_LABELS,
  parseVisualizerQualityUserMode,
  type VisualizerAdaptiveDiagnostics,
  type VisualizerQualityProfile,
  type VisualizerQualityUserMode,
} from "@/components/visualizer-quality";
import {
  createLappycapDemoSession,
  type LappycapDemoSessionBundle,
} from "@/lappycap/lib/create-demo-session";
import { applyMockSpotifyInfluence } from "@/lappycap/lib/apply-mock-spotify-influence";
import { useSomaFMAudio } from "@/integrations/somafm/use-somafm-audio";
import {
  getNextSomaFMChannel,
  getRandomSomaFMChannel,
  resolveStationVisualProfile,
} from "@/integrations/somafm/station-profiles";
import type { PlaybackStateInfluence } from "@/runtime/interfaces";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const CONTROLS_IDLE_MS = 2500;

export default function VisualizerPage() {
  const bootstrap = useMemo(() => {
    try {
      return { demo: createLappycapDemoSession(), error: null as string | null };
    } catch (e) {
      return {
        demo: null,
        error: e instanceof Error ? e.message : "Failed to start demo session.",
      };
    }
  }, []);
  const demo = bootstrap.demo;

  const buildSessionView = (demo: LappycapDemoSessionBundle): LappycapVisualizerSessionView | null => {
    const s = demo.controller.getSession(demo.session.sessionId);
    if (!s) return null;
    const sceneName = demo.gateway.getScene(s.activeSceneId)?.name ?? s.activeSceneId;
    const presetName = demo.gateway.getPreset(s.activePresetId)?.name ?? s.activePresetId;
    return {
      status: s.status,
      activeSceneId: s.activeSceneId,
      sceneName,
      activePresetId: s.activePresetId,
      presetName,
      activeCueIndex: s.activeCueIndex,
    };
  };

  const [sessionView, setSessionView] = useState<LappycapVisualizerSessionView | null>(
    demo ? buildSessionView(demo) : null
  );
  const [influence, setInfluence] = useState<PlaybackStateInfluence | null>(
    demo ? demo.controller.getInfluence(demo.session.sessionId) : null
  );
  const [visualPresetName, setVisualPresetName] = useState<string | null>(null);
  const [stationProfileLabel, setStationProfileLabel] = useState("Sunday Morning");
  const [transitionNonce, setTransitionNonce] = useState(0);
  const [tuning, setTuning] = useState(DEFAULT_BUTTERCHURN_TUNING);
  const [visualizerQuality, setVisualizerQuality] = useState<VisualizerQualityProfile | null>(null);
  const [adaptiveDiag, setAdaptiveDiag] = useState<VisualizerAdaptiveDiagnostics | null>(null);
  const [visualExperience, setVisualExperience] = useState<"standard" | "leanback">("standard");
  const [qualityUserMode, setQualityUserMode] = useState<VisualizerQualityUserMode>("auto");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const somafm = useSomaFMAudio();
  const visualizerShellRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnings = useMemo(() => {
    const w: Array<{ code: string; message: string }> = [];
    if (somafm.error) w.push({ code: "SOMA", message: somafm.error });
    return w;
  }, [somafm.error]);
  const ready = Boolean(bootstrap.demo);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VISUALIZER_QUALITY_STORAGE_KEY);
      setQualityUserMode(parseVisualizerQualityUserMode(raw));
    } catch {
      /* storage denied */
    }
  }, []);

  const persistQualityUserMode = useCallback((mode: VisualizerQualityUserMode) => {
    setQualityUserMode(mode);
    try {
      localStorage.setItem(VISUALIZER_QUALITY_STORAGE_KEY, mode);
    } catch {
      /* storage denied */
    }
  }, []);

  const syncFromDemo = (demo: LappycapDemoSessionBundle) => {
    setSessionView(buildSessionView(demo));
    setInfluence(demo.controller.getInfluence(demo.session.sessionId));
  };

  const handleNextCue = () => {
    if (!demo) return;
    demo.controller.next(demo.session.sessionId);
    syncFromDemo(demo);
  };

  const handlePause = () => {
    if (!demo) return;
    demo.controller.pause(demo.session.sessionId);
    syncFromDemo(demo);
  };

  const handleResume = () => {
    if (!demo) return;
    demo.controller.resume(demo.session.sessionId);
    syncFromDemo(demo);
  };

  const handleMockInfluence = async () => {
    if (!demo) return;
    await applyMockSpotifyInfluence(demo.controller, demo.session.sessionId);
    syncFromDemo(demo);
  };

  const applyMotionPreset = (preset: keyof typeof MOTION_PRESET_VALUES) => {
    setTuning((current) => ({
      ...current,
      motionPreset: preset,
      ...MOTION_PRESET_VALUES[preset],
    }));
  };

  const applyBlendPreset = (preset: keyof typeof BLEND_PRESET_VALUES) => {
    setTuning((current) => ({
      ...current,
      blendPreset: preset,
      ...BLEND_PRESET_VALUES[preset],
    }));
  };

  useEffect(() => {
    const profile = resolveStationVisualProfile(somafm.currentChannel);
    setStationProfileLabel(profile.label);
    setTuning(profile.tuning);
  }, [somafm.currentChannel]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setControlsVisible(true);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const showControls = () => {
      setControlsVisible(true);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, CONTROLS_IDLE_MS);
    };

    showControls();
    document.addEventListener("mousemove", showControls);
    document.addEventListener("touchstart", showControls, { passive: true });
    document.addEventListener("keydown", showControls);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      document.removeEventListener("mousemove", showControls);
      document.removeEventListener("touchstart", showControls);
      document.removeEventListener("keydown", showControls);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (visualizerShellRef.current) {
        await visualizerShellRef.current.requestFullscreen();
      }
    } catch {
      // Ignore browsers that block fullscreen requests.
    } finally {
      setControlsVisible(true);
    }
  };

  const activateChannel = (channelId: string | null | undefined) => {
    if (!channelId) return;
    const channel = somafm.channels.find((item) => item.id === channelId) ?? null;
    if (!channel) return;
    somafm.setChannel(channel);
    somafm.play(channel);
  };

  const handleNextStation = () => {
    const next = getNextSomaFMChannel(somafm.channels, somafm.currentChannel?.id);
    if (!next) return;
    activateChannel(next.id);
  };

  const handleRandomStation = () => {
    const next = getRandomSomaFMChannel(somafm.channels, somafm.currentChannel?.id);
    if (!next) return;
    activateChannel(next.id);
  };

  if (bootstrap.error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-red-800 mb-2">Visualizer unavailable</h1>
          <p className="text-sm text-gray-700 mb-4">{bootstrap.error}</p>
          <Link
            href="/"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(30,41,59,0.92),_rgba(2,6,23,1)_45%,_rgba(2,8,23,1)_100%)] text-white">
      <header
        className={`fixed top-0 inset-x-0 z-40 border-b border-white/10 bg-black/15 backdrop-blur-md transition-all duration-500 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm text-slate-300 hover:text-white">
            ← Home
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span className="hidden sm:inline">Experience</span>
              <select
                aria-label="Visualizer experience"
                className="rounded-lg border border-white/15 bg-slate-950/90 px-2 py-1.5 text-xs text-white min-w-[10rem]"
                value={visualExperience}
                onChange={(e) => setVisualExperience(e.target.value as "standard" | "leanback")}
              >
                <option value="standard">Standard (rich overlays)</option>
                <option value="leanback">Lean-back (TV / predictable)</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <span className="hidden sm:inline">Render</span>
              <select
                aria-label="Visualizer GPU quality"
                title="Auto adapts to device and live FPS. Manual modes pin Smooth, Balanced, or Full when the GPU allows."
                className="rounded-lg border border-white/15 bg-slate-950/90 px-2 py-1.5 text-xs text-white min-w-[9rem]"
                value={qualityUserMode}
                onChange={(e) =>
                  persistQualityUserMode(e.target.value as VisualizerQualityUserMode)
                }
              >
                {(Object.keys(VISUALIZER_QUALITY_USER_MODE_LABELS) as VisualizerQualityUserMode[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {VISUALIZER_QUALITY_USER_MODE_LABELS[key]}
                    </option>
                  )
                )}
              </select>
            </label>
            <span className="text-xs text-slate-400 font-mono">/visualizer</span>
          </div>
        </div>
      </header>
      <div ref={visualizerShellRef}>
        {visualExperience === "leanback" ? (
          <LappycapLeanBackVisualizer
            title="Lappycap demo visualizer"
            session={sessionView}
            influence={influence}
            liveAudio={somafm.liveData}
            analyserNode={somafm.analyserNode}
            visualPresetName={visualPresetName}
            visualizerTuning={tuning}
            visualizerQuality={visualizerQuality}
            transitionNonce={transitionNonce}
            onVisualizerPresetChange={setVisualPresetName}
            onVisualizerQualityChange={setVisualizerQuality}
            onVisualizerAdaptiveDiagnostics={setAdaptiveDiag}
            qualityUserMode={qualityUserMode}
            immersiveMode
            controlsVisible={controlsVisible}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onVisualizerClick={() => setControlsVisible(true)}
            warnings={warnings}
            onNextCue={handleNextCue}
            onPause={handlePause}
            onResume={handleResume}
            onMockInfluence={handleMockInfluence}
            controlsDisabled={!ready}
          />
        ) : (
          <LappycapVisualizer
            title="Lappycap demo visualizer"
            session={sessionView}
            influence={influence}
            liveAudio={somafm.liveData}
            analyserNode={somafm.analyserNode}
            visualPresetName={visualPresetName}
            visualizerTuning={tuning}
            visualizerQuality={visualizerQuality}
            transitionNonce={transitionNonce}
            onVisualizerPresetChange={setVisualPresetName}
            onVisualizerQualityChange={setVisualizerQuality}
            onVisualizerAdaptiveDiagnostics={setAdaptiveDiag}
            qualityUserMode={qualityUserMode}
            immersiveMode
            controlsVisible={controlsVisible}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onVisualizerClick={() => setControlsVisible(true)}
            warnings={warnings}
            onNextCue={handleNextCue}
            onPause={handlePause}
            onResume={handleResume}
            onMockInfluence={handleMockInfluence}
            controlsDisabled={!ready}
          />
        )}
      </div>
      <div
        className={`max-w-6xl mx-auto px-4 pb-8 transition-all duration-500 ${
          controlsVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-6 pointer-events-none select-none"
        }`}
      >
        <div className="grid grid-cols-1 gap-4 pt-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-5 shadow-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-cyan-200 uppercase tracking-[0.2em] mb-2">
                    SomaFM Live Stream
                  </h2>
                  <p className="text-sm text-slate-300">
                    Jump stations fast and auto-pair them with visuals that fit the vibe.
                  </p>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  {somafm.isPlaying ? "Live" : "Idle"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="SomaFM station"
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm bg-slate-950/80 text-white min-w-[14rem]"
                  value={somafm.currentChannel?.id ?? ""}
                  onChange={(e) => activateChannel(e.target.value)}
                  disabled={somafm.loading}
                >
                  <option value="">
                    {somafm.loading ? "Loading..." : "Select station"}
                  </option>
                  {somafm.channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => activateChannel(somafm.currentChannel?.id)}
                  disabled={somafm.loading || !somafm.currentChannel}
                  className="px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Play
                </button>
                <button
                  type="button"
                  onClick={handleNextStation}
                  disabled={somafm.loading || somafm.channels.length === 0}
                  className="px-4 py-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 text-sm font-medium hover:bg-cyan-500/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Next station
                </button>
                <button
                  type="button"
                  onClick={handleRandomStation}
                  disabled={somafm.loading || somafm.channels.length === 0}
                  className="px-4 py-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100 text-sm font-medium hover:bg-fuchsia-500/20 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Random station
                </button>
                <button
                  type="button"
                  onClick={somafm.stop}
                  disabled={!somafm.isPlaying}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/8 text-slate-100 text-sm font-medium hover:bg-white/14 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/8 text-slate-100 text-sm font-medium hover:bg-white/14"
                >
                  {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-300">
                Station:{" "}
                <span className="font-medium text-white">
                  {somafm.currentChannel?.title ?? "Waiting for station list"}
                </span>
              </span>
              {somafm.currentChannel?.genre ? (
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-slate-200">
                  {somafm.currentChannel.genre}
                </span>
              ) : null}
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                Visual profile: {stationProfileLabel}
              </span>
              {visualizerQuality ? (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                  Render mode: {visualizerQuality.label}
                </span>
              ) : null}
              {adaptiveDiag ? (
                <span
                  className="rounded-full border border-slate-500/30 bg-slate-800/80 px-3 py-1 text-xs text-slate-200 max-w-[28rem] truncate"
                  title={[
                    adaptiveDiag.webglRenderer && `GPU: ${adaptiveDiag.webglRenderer}`,
                    adaptiveDiag.scoreFactors.length > 0 && adaptiveDiag.scoreFactors.join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                >
                  Device: {adaptiveDiag.deviceKind.replace("-", " ")} · capability {adaptiveDiag.capabilityScore}
                  {adaptiveDiag.saveData ? " · save-data" : ""}
                  {adaptiveDiag.effectiveType ? ` · ${adaptiveDiag.effectiveType}` : ""}
                </span>
              ) : null}
              {somafm.isPlaying && somafm.currentChannel ? (
                <span className="text-slate-300">
                  Now playing: <span className="text-white font-medium">{somafm.currentChannel.title}</span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-5 shadow-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-violet-200 uppercase tracking-[0.2em] mb-2">
                  Visual Tuning
                </h2>
                <p className="text-sm text-slate-300">
                  Slow the morphing down, change the mood, or force a manual transition.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTransitionNonce((v) => v + 1)}
                  className="px-3 py-2 rounded-xl bg-violet-500/90 text-white text-sm font-medium hover:bg-violet-400"
                >
                  Morph now
                </button>
                <button
                  type="button"
                  onClick={() => setTuning(DEFAULT_BUTTERCHURN_TUNING)}
                  className="px-3 py-2 rounded-xl border border-white/10 bg-white/8 text-slate-100 text-sm font-medium hover:bg-white/14"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Preset pack</span>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-slate-950/80 text-white"
                  value={tuning.presetMode}
                  onChange={(e) =>
                    setTuning((current) => ({
                      ...current,
                      presetMode: e.target.value as typeof current.presetMode,
                    }))
                  }
                >
                  {Object.entries(PRESET_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Motion pace</span>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-slate-950/80 text-white"
                  value={tuning.motionPreset}
                  onChange={(e) => {
                    const preset = e.target.value as keyof typeof MOTION_PRESET_VALUES | "custom";
                    if (preset === "custom") {
                      setTuning((current) => ({ ...current, motionPreset: "custom" }));
                    } else {
                      applyMotionPreset(preset);
                    }
                  }}
                >
                  {Object.entries(MOTION_PRESET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wide text-slate-400">Blend style</span>
                <select
                  className="mt-2 w-full rounded-xl border border-white/10 px-3 py-2 text-sm bg-slate-950/80 text-white"
                  value={tuning.blendPreset}
                  onChange={(e) => {
                    const preset = e.target.value as keyof typeof BLEND_PRESET_VALUES | "custom";
                    if (preset === "custom") {
                      setTuning((current) => ({ ...current, blendPreset: "custom" }));
                    } else {
                      applyBlendPreset(preset);
                    }
                  }}
                >
                  {Object.entries(BLEND_PRESET_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Cycle range</span>
                  <span>{tuning.cycleMinSec}s - {tuning.cycleMaxSec}s</span>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs text-slate-400">Minimum hold</span>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      value={tuning.cycleMinSec}
                      onChange={(e) =>
                        setTuning((current) => ({
                          ...current,
                          motionPreset: "custom",
                          cycleMinSec: Math.min(Number(e.target.value), current.cycleMaxSec),
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-400">Maximum hold</span>
                    <input
                      type="range"
                      min={15}
                      max={180}
                      value={tuning.cycleMaxSec}
                      onChange={(e) =>
                        setTuning((current) => ({
                          ...current,
                          motionPreset: "custom",
                          cycleMaxSec: Math.max(Number(e.target.value), current.cycleMinSec),
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span>Blend range</span>
                  <span>{tuning.blendMinSec}s - {tuning.blendMaxSec}s</span>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-xs text-slate-400">Minimum blend</span>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={tuning.blendMinSec}
                      onChange={(e) =>
                        setTuning((current) => ({
                          ...current,
                          blendPreset: "custom",
                          blendMinSec: Math.min(Number(e.target.value), current.blendMaxSec),
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-400">Maximum blend</span>
                    <input
                      type="range"
                      min={2}
                      max={30}
                      value={tuning.blendMaxSec}
                      onChange={(e) =>
                        setTuning((current) => ({
                          ...current,
                          blendPreset: "custom",
                          blendMaxSec: Math.max(Number(e.target.value), current.blendMinSec),
                        }))
                      }
                      className="mt-2 w-full"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                {PRESET_MODE_LABELS[tuning.presetMode]}
              </span>
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                {MOTION_PRESET_LABELS[tuning.motionPreset]}
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
                {BLEND_PRESET_LABELS[tuning.blendPreset]}
              </span>
              {visualizerQuality ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                  {visualizerQuality.label} {visualizerQuality.targetFps} FPS
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
