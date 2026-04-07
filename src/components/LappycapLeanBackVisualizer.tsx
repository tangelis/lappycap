"use client";

import type { ButterchurnTuning } from "@/components/butterchurn-config";
import { ButterchurnVisualizer } from "@/components/ButterchurnVisualizer";
import { LEANBACK_LIVE_UI_INTERVAL_MS } from "@/components/visualizer-leanback";
import type {
  VisualizerAdaptiveDiagnostics,
  VisualizerQualityProfile,
  VisualizerQualityUserMode,
} from "@/components/visualizer-quality";
import type { LiveAudioData } from "@/integrations/somafm/types";
import type { PlaybackStateInfluence, SessionStatus } from "@/runtime/interfaces";
import { useEffect, useRef, useState } from "react";

export type LappycapLeanBackVisualizerSessionView = {
  status: SessionStatus;
  activeSceneId: string;
  sceneName?: string;
  activePresetId: string;
  presetName?: string | null;
  activeCueIndex: number;
};

export type LappycapLeanBackVisualizerProps = {
  title?: string;
  session: LappycapLeanBackVisualizerSessionView | null;
  influence: PlaybackStateInfluence | null;
  liveAudio?: LiveAudioData | null;
  analyserNode?: AnalyserNode | null;
  visualPresetName?: string | null;
  visualizerTuning?: ButterchurnTuning;
  visualizerQuality?: VisualizerQualityProfile | null;
  transitionNonce?: number;
  onVisualizerPresetChange?: (name: string) => void;
  onVisualizerQualityChange?: (profile: VisualizerQualityProfile) => void;
  onVisualizerAdaptiveDiagnostics?: (diagnostics: VisualizerAdaptiveDiagnostics) => void;
  qualityUserMode?: VisualizerQualityUserMode;
  playbackActive?: boolean;
  currentStationTitle?: string | null;
  onStartPlayback?: () => void;
  immersiveMode?: boolean;
  controlsVisible?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onVisualizerClick?: () => void;
  warnings: Array<{ code?: string; message: string }>;
  onNextCue: () => void;
  onPause: () => void;
  onResume: () => void;
  onMockInfluence: () => void;
  controlsDisabled?: boolean;
};

function useThrottledLiveAudio(live: LiveAudioData | null, intervalMs: number) {
  const [snap, setSnap] = useState<{ level: number; bands: number[] }>({
    level: 0,
    bands: [],
  });
  const liveRef = useRef(live);
  liveRef.current = live;
  const liveActive = Boolean(live);

  useEffect(() => {
    if (!liveActive) {
      setSnap({ level: 0, bands: [] });
      return;
    }

    const push = () => {
      const cur = liveRef.current;
      if (!cur) return;
      setSnap({ level: cur.level, bands: cur.frequencyBands });
    };

    push();
    const id = window.setInterval(push, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, liveActive]);

  return snap;
}

function statusBadgeClass(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "bg-emerald-100 text-emerald-800";
    case "paused":
      return "bg-amber-100 text-emerald-900";
    case "ended":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Lean-back / 10-foot UI: large type, few DOM layers, live level/bars updated on a fixed timer
 * (not every React render / analyser tick). Pairs with Butterchurn `qualityPolicy="leanback"`.
 */
export function LappycapLeanBackVisualizer({
  title = "Lappycap playback",
  session,
  influence,
  liveAudio = null,
  analyserNode = null,
  visualPresetName = null,
  visualizerTuning,
  visualizerQuality = null,
  transitionNonce = 0,
  onVisualizerPresetChange,
  onVisualizerQualityChange,
  onVisualizerAdaptiveDiagnostics,
  qualityUserMode = "auto",
  playbackActive = false,
  currentStationTitle = null,
  onStartPlayback,
  immersiveMode = false,
  controlsVisible = true,
  isFullscreen = false,
  onToggleFullscreen,
  onVisualizerClick,
  warnings,
  onNextCue,
  onPause,
  onResume,
  onMockInfluence,
  controlsDisabled = false,
}: LappycapLeanBackVisualizerProps) {
  const cueIndex = session?.activeCueIndex ?? 0;
  const energy = influence?.energy ?? 0.45;
  const throttled = useThrottledLiveAudio(liveAudio, LEANBACK_LIVE_UI_INTERVAL_MS);
  const level = liveAudio ? throttled.level : energy;
  const bands = liveAudio ? throttled.bands.slice(0, 4) : [];
  const displayVisualName = visualPresetName
    ? visualPresetName
    : playbackActive
      ? visualizerQuality?.tier === "fallback"
        ? "Reduced FX reactive mode"
        : "Loading live visual..."
      : currentStationTitle
        ? `Ready: ${currentStationTitle}`
        : "Start playback";
  const playbackHint = playbackActive
    ? visualizerQuality?.tier === "fallback"
      ? "Audio is live with the lean-back reduced-effects renderer."
      : "Audio is live and visuals are reacting."
    : currentStationTitle
      ? `Press Play to start ${currentStationTitle}.`
      : "Pick a station and press Play.";
  const overlayClass = controlsVisible
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 translate-y-4 pointer-events-none";

  const preview = (
    <div
      className={`relative overflow-hidden bg-slate-950 ${
        immersiveMode
          ? "h-screen min-h-screen rounded-none border-none"
          : "h-[24rem] md:h-[34rem] rounded-3xl border border-white/10"
      }`}
      aria-label="Visualizer preview"
      onClick={onVisualizerClick}
    >
      <ButterchurnVisualizer
        analyserNode={analyserNode}
        active={Boolean(analyserNode && (playbackActive || Boolean(liveAudio)))}
        className="absolute inset-0"
        tuning={visualizerTuning}
        transitionNonce={transitionNonce}
        qualityPolicy="leanback"
        qualityUserMode={qualityUserMode}
        onPresetChange={onVisualizerPresetChange}
        onQualityChange={onVisualizerQualityChange}
        onAdaptiveDiagnostics={onVisualizerAdaptiveDiagnostics}
      />

      {/* Static-ish wash: only throttled level drives opacity stops — no CSS filter animation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 20% 30%, rgba(56,189,248,${0.12 + level * 0.2}) 0%, rgba(15,23,42,0) 38%), radial-gradient(circle at 80% 25%, rgba(167,139,250,${0.1 + level * 0.14}) 0%, rgba(15,23,42,0) 32%), radial-gradient(circle at 50% 85%, rgba(2,6,23,0.2) 0%, rgba(2,6,23,0.95) 65%)`,
        }}
      />

      {/* Top strip: one panel, high contrast, no backdrop-blur */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 px-4 pt-4 pb-2 transition-opacity duration-300 ${overlayClass}`}
      >
        <div className="flex flex-wrap items-stretch justify-between gap-3">
          <div className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/55 px-4 py-3">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/85">Now showing</div>
            <div className="mt-1 text-lg md:text-xl font-semibold text-white leading-tight truncate">
              {displayVisualName}
            </div>
            <div className="mt-1 text-sm text-slate-300 truncate">{session?.sceneName ?? playbackHint}</div>
          </div>
          <div className="flex flex-wrap items-stretch gap-2">
            {visualizerQuality ? (
              <div
                className="rounded-2xl border border-cyan-400/25 bg-black/55 px-4 py-3 text-right min-w-[7.5rem]"
                aria-live="polite"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-cyan-100/80">Render</div>
                <div className="mt-1 text-sm font-semibold text-cyan-50 leading-tight">
                  {visualizerQuality.label}
                </div>
              </div>
            ) : null}
            {onToggleFullscreen ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFullscreen();
                }}
                className="rounded-2xl border border-white/15 bg-black/55 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 min-h-[48px] min-w-[48px]"
              >
                {isFullscreen ? "Exit" : "Full"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!playbackActive ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center px-6 pointer-events-none">
          <div className="max-w-xl rounded-3xl border border-white/15 bg-black/65 px-6 py-6 text-center pointer-events-auto">
            <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">SomaFM ready</div>
            <div className="mt-2 text-2xl md:text-3xl font-semibold text-white">
              {currentStationTitle ? currentStationTitle : "Select a station"}
            </div>
            <p className="mt-3 text-base text-slate-200">{playbackHint}</p>
            {onStartPlayback ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartPlayback();
                }}
                className="mt-5 min-h-[52px] rounded-2xl bg-emerald-500 px-6 text-base font-medium text-white hover:bg-emerald-400"
              >
                {currentStationTitle ? `Play ${currentStationTitle}` : "Play station"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Level meter: one cheap div, no shadows */}
      <div
        className={`absolute left-4 right-4 z-10 transition-opacity duration-300 ${
          immersiveMode ? "bottom-[7.5rem]" : "bottom-[6.75rem]"
        } ${controlsVisible ? "opacity-100" : "opacity-50"}`}
        aria-hidden
      >
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400/90 to-violet-400/90"
            style={{ width: `${Math.round(Math.min(1, Math.max(0, level)) * 100)}%` }}
          />
        </div>
      </div>

      {bands.length > 0 ? (
        <div
          className={`absolute left-4 right-4 flex gap-1.5 items-end justify-center h-10 z-10 transition-opacity duration-300 ${
            immersiveMode ? "bottom-[5.5rem]" : "bottom-[5rem]"
          } ${controlsVisible ? "opacity-100" : "opacity-45"}`}
          aria-label="Spectrum summary"
        >
          {bands.map((val, i) => (
            <div
              key={i}
              className="flex-1 min-w-[6px] max-w-[48px] rounded-sm bg-gradient-to-t from-indigo-600/90 to-sky-400/90"
              style={{ height: `${Math.max(14, Math.round(val * 100))}%` }}
            />
          ))}
        </div>
      ) : null}

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 pt-2 transition-opacity duration-300 ${overlayClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-white/85 font-mono mb-3">
          <span>c #{cueIndex}</span>
          <span>{liveAudio ? `lvl ${level.toFixed(2)}` : `nrg ${energy.toFixed(2)}`}</span>
        </div>
        <div
          className="flex flex-wrap gap-3"
          role="toolbar"
          aria-label="Session playback controls"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNextCue();
            }}
            disabled={controlsDisabled || !session}
            className="min-h-[48px] px-5 rounded-xl bg-indigo-500 text-white text-base font-medium hover:bg-indigo-400 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next cue
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPause();
            }}
            disabled={controlsDisabled || !session || session.status !== "running"}
            className="min-h-[48px] px-5 rounded-xl border border-white/15 bg-white/10 text-slate-50 text-base font-medium hover:bg-white/16 disabled:opacity-40 disabled:pointer-events-none"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResume();
            }}
            disabled={controlsDisabled || !session || session.status !== "paused"}
            className="min-h-[48px] px-5 rounded-xl bg-emerald-600 text-white text-base font-medium hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMockInfluence();
            }}
            disabled={controlsDisabled || !session}
            className="min-h-[48px] px-5 rounded-xl border border-violet-400/35 bg-violet-950/40 text-violet-100 text-base font-medium hover:bg-violet-900/50 disabled:opacity-40 disabled:pointer-events-none"
          >
            Mock influence
          </button>
        </div>
      </div>
    </div>
  );

  if (immersiveMode) {
    return (
      <div className="relative">
        <h1 className="sr-only">{title}</h1>
        {preview}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-300">
          Lean-back layout: predictable rendering, remote-friendly controls, lighter compositing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] gap-6">
        <div className="lg:col-span-2 space-y-4">{preview}</div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Session</h2>
            {!session ? (
              <p className="text-slate-400 text-sm">No session loaded.</p>
            ) : (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Preset</dt>
                  <dd className="font-medium text-white text-right truncate max-w-[12rem]">
                    {session.presetName ?? session.activePresetId}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Scene</dt>
                  <dd className="text-white text-right truncate max-w-[12rem]">
                    {session.sceneName ?? session.activeSceneId}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <dt className="text-slate-400">Status</dt>
                  <dd>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass(session.status)}`}
                    >
                      {session.status}
                    </span>
                  </dd>
                </div>
              </dl>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">Renderer</h2>
            <ul className="text-sm space-y-2 text-slate-200">
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Experience</span>
                <span className="font-medium text-right">Lean-back</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Live UI cadence</span>
                <span className="font-mono">{LEANBACK_LIVE_UI_INTERVAL_MS}ms</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Live preset</span>
                <span className="text-right truncate max-w-[11rem]">{visualPresetName ?? "Waiting"}</span>
              </li>
            </ul>
          </div>

          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <h2 className="text-sm font-semibold text-amber-200 mb-2">Warnings</h2>
              <ul className="text-sm text-amber-100 space-y-2 list-disc pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>
                    {w.code ? <span className="font-mono text-xs mr-1">{w.code}:</span> : null}
                    {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
