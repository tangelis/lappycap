"use client";

import type { ButterchurnTuning } from "@/components/butterchurn-config";
import type {
  VisualizerAdaptiveDiagnostics,
  VisualizerQualityProfile,
  VisualizerQualityUserMode,
} from "@/components/visualizer-quality";
import type { PlaybackStateInfluence, SessionStatus } from "@/runtime/interfaces";
import type { LiveAudioData } from "@/integrations/somafm/types";
import { ButterchurnVisualizer } from "@/components/ButterchurnVisualizer";

export type LappycapVisualizerSessionView = {
  status: SessionStatus;
  activeSceneId: string;
  sceneName?: string;
  activePresetId: string;
  presetName?: string | null;
  activeCueIndex: number;
};

export type LappycapVisualizerProps = {
  title?: string;
  session: LappycapVisualizerSessionView | null;
  influence: PlaybackStateInfluence | null;
  /** When set, visuals react to real frequency/amplitude (e.g. SomaFM stream). */
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

function statusBadgeClass(status: SessionStatus): string {
  switch (status) {
    case "running":
      return "bg-emerald-100 text-emerald-800";
    case "paused":
      return "bg-amber-100 text-amber-900";
    case "ended":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export function LappycapVisualizer({
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
}: LappycapVisualizerProps) {
  const cueIndex = session?.activeCueIndex ?? 0;
  const energy = influence?.energy ?? 0.45;
  const tempo = influence?.tempo ?? 108;
  const level = liveAudio?.level ?? 0;
  const energyOrLevel = liveAudio ? 0.3 + level * 0.7 : energy;
  const animationPeriodSec = Math.max(0.85, 3.2 - cueIndex * 0.35 - energyOrLevel * 0.8);
  const scale = 1 + energyOrLevel * 0.08 + cueIndex * 0.02 + level * 0.15;
  const hueRotate = cueIndex * 42 + tempo * 0.35;
  const frequencyBands = liveAudio?.frequencyBands ?? [];
  const quality = visualizerQuality;
  const barGlow = quality?.showFrequencyBarGlow !== false;
  const strictContain = quality?.useStrictContainment === true;
  const backdropClass = quality?.showBackdropBlur ? "backdrop-blur-md" : "";
  const visibleFrequencyBands =
    quality?.showFrequencyBars === false
      ? []
      : frequencyBands.slice(0, quality?.frequencyBarCount ?? frequencyBands.length);
  const overlayClass = controlsVisible
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 translate-y-3 pointer-events-none";

  const preview = (
    <div
      className={`relative overflow-hidden bg-slate-950 shadow-[0_20px_80px_rgba(15,23,42,0.55)] ${
        immersiveMode
          ? "h-screen min-h-screen rounded-none border-none"
          : "h-[24rem] md:h-[34rem] rounded-3xl border border-white/10"
      }`}
      style={strictContain ? { contain: "layout paint" } : undefined}
      aria-label="Visualizer preview"
      onClick={onVisualizerClick}
    >
      <ButterchurnVisualizer
        analyserNode={analyserNode}
        active={Boolean(liveAudio)}
        className="absolute inset-0"
        tuning={visualizerTuning}
        transitionNonce={transitionNonce}
        qualityUserMode={qualityUserMode}
        onPresetChange={onVisualizerPresetChange}
        onQualityChange={onVisualizerQualityChange}
        onAdaptiveDiagnostics={onVisualizerAdaptiveDiagnostics}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 18% 24%, rgba(56,189,248,${0.18 + level * 0.22}) 0%, rgba(15,23,42,0) 34%), radial-gradient(circle at 82% 20%, rgba(168,85,247,${0.14 + energyOrLevel * 0.16}) 0%, rgba(15,23,42,0) 28%), radial-gradient(circle at 50% 78%, rgba(245,158,11,${0.1 + level * 0.12}) 0%, rgba(2,6,23,0.35) 32%, rgba(2,6,23,0.92) 72%)`,
          opacity: quality?.tier === "fallback" ? 1 : 0.82,
          transition: "background 0.18s ease-out, opacity 0.3s ease-out",
        }}
      />
      {quality?.showAnimatedOverlay !== false ? (
      <div
        className={`absolute inset-4 rounded-[1.25rem] motion-safe:animate-pulse pointer-events-none mix-blend-screen ${
          immersiveMode ? "inset-0 rounded-none" : ""
        }`}
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(245,158,11,0.25) 50%, rgba(59,130,246,0.3) 100%)",
          animationDuration: `${animationPeriodSec}s`,
          opacity: quality?.overlayOpacity ?? 0.3,
          transform: `scale(${scale}) rotate(${cueIndex * 1.5}deg)`,
          filter: `hue-rotate(${hueRotate % 360}deg) saturate(${1.1 + energyOrLevel * 0.4})`,
          transition: "transform 0.15s ease-out, filter 0.2s ease-out",
        }}
      />
      ) : null}

      <div
        className={`absolute top-4 left-4 right-4 z-20 flex items-start justify-between gap-3 transition-all duration-500 ${overlayClass}`}
      >
        <div className={`rounded-2xl border border-white/10 bg-black/35 px-4 py-3 max-w-[70%] ${backdropClass}`}>
          <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-200/80">
            Current preset
          </div>
          <div className="mt-1 text-sm md:text-base font-medium text-white truncate">
            {visualPresetName ?? "Waiting for playback"}
          </div>
          {session?.sceneName ? (
            <div className="mt-1 text-xs text-slate-300 truncate">{session.sceneName}</div>
          ) : null}
        </div>
        <div className="flex items-start gap-2">
          <div className={`rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-right ${backdropClass}`}>
            <div className="text-[11px] uppercase tracking-[0.2em] text-violet-200/80">
              Audio level
            </div>
            <div className="mt-1 text-base font-semibold text-white">
              {liveAudio ? level.toFixed(2) : energy.toFixed(2)}
            </div>
          </div>
          {quality ? (
            <div
              className={`rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-right min-w-[5.5rem] ${backdropClass}`}
              title={
                quality.tier === "fallback"
                  ? "WebGL Milkdrop off; lightweight 2D layers only."
                  : `${quality.targetFps} FPS target · mesh ${quality.meshWidth}×${quality.meshHeight}`
              }
            >
              <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/80">Mode</div>
              <div className="mt-1 text-sm font-semibold text-cyan-50">{quality.label}</div>
              <div className="mt-0.5 text-[10px] text-cyan-200/60 tabular-nums">
                {quality.targetFps} fps
              </div>
            </div>
          ) : null}
          {onToggleFullscreen ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleFullscreen();
              }}
              className={`rounded-2xl border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-white hover:bg-white/12 ${backdropClass}`}
            >
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          ) : null}
        </div>
      </div>

      {visibleFrequencyBands.length > 0 ? (
        <div
          className={`absolute left-4 right-4 flex gap-1 items-end justify-center h-12 transition-all duration-500 ${
            immersiveMode ? "bottom-20" : "bottom-14"
          } ${controlsVisible ? "opacity-100" : "opacity-55"} `}
          aria-label="Frequency bands"
        >
          {visibleFrequencyBands.map((val, i) => (
            <div
              key={i}
              className="flex-1 min-w-[4px] rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(10, val * 100)}%`,
                background:
                  "linear-gradient(180deg, rgba(125,211,252,0.95) 0%, rgba(99,102,241,0.88) 55%, rgba(168,85,247,0.85) 100%)",
                boxShadow: barGlow ? "0 0 18px rgba(125,211,252,0.22)" : undefined,
              }}
            />
          ))}
        </div>
      ) : null}

      <div
        className={`absolute bottom-4 left-4 right-4 z-20 transition-all duration-500 ${overlayClass}`}
      >
        <div className="flex justify-between text-xs text-white/80 font-mono">
          <span>cue #{cueIndex}</span>
          <span>{liveAudio ? `level ${level.toFixed(2)}` : `energy ${energy.toFixed(2)}`}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNextCue();
            }}
            disabled={controlsDisabled || !session}
            className="px-4 py-2 rounded-xl bg-indigo-500/90 text-white text-sm font-medium hover:bg-indigo-400 disabled:opacity-40 disabled:pointer-events-none"
          >
            Next cue
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPause();
            }}
            disabled={controlsDisabled || !session || session.status !== "running"}
            className="px-4 py-2 rounded-xl border border-white/10 bg-white/8 text-slate-100 text-sm font-medium hover:bg-white/14 disabled:opacity-40 disabled:pointer-events-none"
          >
            Pause
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onResume();
            }}
            disabled={controlsDisabled || !session || session.status !== "paused"}
            className="px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none"
          >
            Resume
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMockInfluence();
            }}
            disabled={controlsDisabled || !session}
            className="px-4 py-2 rounded-xl border border-violet-400/30 bg-violet-500/10 text-violet-100 text-sm font-medium hover:bg-violet-500/20 disabled:opacity-40 disabled:pointer-events-none"
          >
            Mock Spotify influence
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
          Slow-burn Milkdrop visuals with live audio-driven motion.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)] gap-6">
        <div className="lg:col-span-2 space-y-4">
          {preview}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
              Session
            </h2>
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
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-400">Scene id</dt>
                  <dd className="font-mono text-xs text-slate-300">{session.activeSceneId}</dd>
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

          <div className="rounded-2xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
              Renderer
            </h2>
            <ul className="text-sm space-y-2 text-slate-200">
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Preset pack</span>
                <span className="font-medium text-right capitalize">
                  {visualizerTuning?.presetMode?.replace(/-/g, " ") ?? "default"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Cycle range</span>
                <span className="font-mono">
                  {visualizerTuning
                    ? `${visualizerTuning.cycleMinSec}s-${visualizerTuning.cycleMaxSec}s`
                    : "--"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Blend range</span>
                <span className="font-mono">
                  {visualizerTuning
                    ? `${visualizerTuning.blendMinSec}s-${visualizerTuning.blendMaxSec}s`
                    : "--"}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">Live preset</span>
                <span className="text-right truncate max-w-[11rem]">
                  {visualPresetName ?? "Waiting"}
                </span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/75 backdrop-blur-md p-4 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
              Influence
            </h2>
            {!influence ? (
              <p className="text-slate-400 text-sm">No mock influence yet.</p>
            ) : (
              <ul className="text-sm space-y-1 font-mono text-slate-200">
                <li>tempo {influence.tempo.toFixed(1)}</li>
                <li>energy {influence.energy.toFixed(3)}</li>
                <li>valence {influence.valence.toFixed(3)}</li>
              </ul>
            )}
          </div>

          {warnings.length > 0 ? (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
              <h2 className="text-sm font-semibold text-amber-200 mb-2">Warnings</h2>
              <ul className="text-sm text-amber-100 space-y-2 list-disc pl-4">
                {warnings.map((w, i) => (
                  <li key={i}>
                    {w.code ? (
                      <span className="font-mono text-xs mr-1">{w.code}:</span>
                    ) : null}
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
