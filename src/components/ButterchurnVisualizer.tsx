"use client";

import type { ButterchurnTuning } from "@/components/butterchurn-config";
import {
  DEFAULT_BUTTERCHURN_TUNING,
  normalizeTuning,
  presetNamesForMode,
  SUNDAY_MORNING_PRESET_NAMES,
} from "@/components/butterchurn-config";
import {
  buildAdaptiveDiagnostics,
  buildQualityProfile,
  collectVisualizerRuntimeContext,
  degradeQualityTier,
  initialQualityTier,
  resolveEffectiveQualityTier,
  type VisualizerAdaptiveDiagnostics,
  type VisualizerQualityProfile,
  type VisualizerQualityTier,
  type VisualizerQualityUserMode,
  type VisualizerRuntimeContext,
} from "@/components/visualizer-quality";
import { polishProfileForLeanBack } from "@/components/visualizer-leanback";
import { pickPresetIndex, unwrapPresetModule, unwrapVisualizerModule } from "@/lib/butterchurn-module-utils";
import { useEffect, useMemo, useRef, useState } from "react";

type ButterchurnRenderer = {
  connectAudio: (node: AudioNode) => void;
  loadPreset: (preset: object, blendTime?: number) => void;
  setRendererSize: (width: number, height: number) => void;
  render: () => void;
};

type PresetEntry = {
  name: string;
  preset: object;
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function fpsSustainRatioForTier(tier: VisualizerQualityTier): number {
  switch (tier) {
    case "performance":
      return 0.62;
    case "balanced":
      return 0.68;
    default:
      return 0.74;
  }
}

function slowWindowsBeforeDegrade(tier: VisualizerQualityTier): number {
  return tier === "performance" ? 2 : 3;
}

const RUNTIME_PLACEHOLDER: VisualizerRuntimeContext = {
  acceleration: { webglSupported: true, accelerated: true, webglVersion: 2 },
  deviceKind: "desktop",
  prefersReducedMotion: false,
  network: { saveData: false },
  display: {
    devicePixelRatio: 1,
    estimatedFillPixels: 1_000_000,
    prefersReducedMotion: false,
    prefersSlowUpdate: false,
  },
};

export type ButterchurnVisualizerProps = {
  analyserNode: AnalyserNode | null;
  active: boolean;
  className?: string;
  onPresetChange?: (name: string) => void;
  onQualityChange?: (profile: VisualizerQualityProfile) => void;
  /** Fired once after capability probe (for badges / debug readouts). */
  onAdaptiveDiagnostics?: (diagnostics: VisualizerAdaptiveDiagnostics) => void;
  /** Lean-back caps mesh resolution and strips heavy compositor hints (Android TV). */
  qualityPolicy?: "standard" | "leanback";
  qualityUserMode?: VisualizerQualityUserMode;
  tuning?: ButterchurnTuning;
  transitionNonce?: number;
};

export function ButterchurnVisualizer({
  analyserNode,
  active,
  className,
  onPresetChange,
  onQualityChange,
  onAdaptiveDiagnostics,
  tuning = DEFAULT_BUTTERCHURN_TUNING,
  transitionNonce = 0,
  qualityPolicy = "standard",
  qualityUserMode = "auto",
}: ButterchurnVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ButterchurnRenderer | null>(null);
  const rafRef = useRef<number>(0);
  const cycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presetListRef = useRef<PresetEntry[]>([]);
  const presetIndexRef = useRef(0);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const transitionNowRef = useRef<(() => void) | null>(null);
  const visibilityHandlerRef = useRef<(() => void) | null>(null);
  const lastRenderTimeRef = useRef(0);
  const renderedFramesRef = useRef(0);
  const fpsWindowStartRef = useRef(0);
  const slowFrameWindowsRef = useRef(0);
  const qualityDegradedRef = useRef(false);
  const diagnosticsFiredRef = useRef(false);
  const onAdaptiveDiagnosticsRef = useRef(onAdaptiveDiagnostics);
  onAdaptiveDiagnosticsRef.current = onAdaptiveDiagnostics;
  const qualityUserModeRef = useRef(qualityUserMode);
  qualityUserModeRef.current = qualityUserMode;
  const batteryListenerRef = useRef<{ remove: () => void } | null>(null);
  const prevQualityUserModeRef = useRef<VisualizerQualityUserMode | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [runtimeContext, setRuntimeContext] = useState<VisualizerRuntimeContext | null>(null);
  const [intrinsicAutoTier, setIntrinsicAutoTier] = useState<VisualizerQualityTier>("balanced");

  const isReady = useMemo(() => Boolean(analyserNode && active), [analyserNode, active]);
  const normalizedTuning = useMemo(() => normalizeTuning(tuning), [tuning]);

  const contextForResolve = runtimeContext ?? RUNTIME_PLACEHOLDER;
  const effectiveTier = useMemo(
    () => resolveEffectiveQualityTier(qualityUserMode, intrinsicAutoTier, contextForResolve),
    [qualityUserMode, intrinsicAutoTier, contextForResolve]
  );

  const qualityProfile = useMemo(() => {
    const raw = buildQualityProfile(effectiveTier, qualityUserMode);
    return qualityPolicy === "leanback" ? polishProfileForLeanBack(raw) : raw;
  }, [effectiveTier, qualityPolicy, qualityUserMode]);

  useEffect(() => {
    const context = collectVisualizerRuntimeContext();
    setRuntimeContext(context);
    setIntrinsicAutoTier(initialQualityTier(context));
    if (!diagnosticsFiredRef.current) {
      diagnosticsFiredRef.current = true;
      onAdaptiveDiagnosticsRef.current?.(buildAdaptiveDiagnostics(context));
    }
  }, []);

  useEffect(() => {
    if (!runtimeContext) return;
    const prev = prevQualityUserModeRef.current;
    if (qualityUserMode === "auto" && prev !== null && prev !== "auto") {
      setIntrinsicAutoTier(initialQualityTier(runtimeContext));
    }
    prevQualityUserModeRef.current = qualityUserMode;
  }, [qualityUserMode, runtimeContext]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const onChange = () => {
      if (mq.matches) {
        setIntrinsicAutoTier("fallback");
      } else {
        setIntrinsicAutoTier(initialQualityTier(collectVisualizerRuntimeContext()));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;
    if (!nav.getBattery) return;
    let cancelled = false;
    void nav.getBattery().then((battery) => {
      if (cancelled) return;
      const maybeDegrade = () => {
        if (qualityPolicy === "leanback") return;
        if (qualityUserModeRef.current !== "auto") return;
        if (battery.level < 0.16 && !battery.charging) {
          setIntrinsicAutoTier((t) => (t === "fallback" ? t : degradeQualityTier(t)));
        }
      };
      maybeDegrade();
      battery.addEventListener("levelchange", maybeDegrade);
      battery.addEventListener("chargingchange", maybeDegrade);
      batteryListenerRef.current = {
        remove: () => {
          battery.removeEventListener("levelchange", maybeDegrade);
          battery.removeEventListener("chargingchange", maybeDegrade);
        },
      };
    });
    return () => {
      cancelled = true;
      batteryListenerRef.current?.remove();
      batteryListenerRef.current = null;
    };
  }, [qualityPolicy]);

  useEffect(() => {
    onQualityChange?.(qualityProfile);
  }, [onQualityChange, qualityProfile]);

  useEffect(() => {
    let disposed = false;

    const cycleScale = qualityPolicy === "leanback" ? 1.45 : 1;

    function scheduleCycle() {
      if (disposed) return;
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
      }
      cycleTimerRef.current = setTimeout(() => {
        transitionNowRef.current?.();
      }, randomBetween(normalizedTuning.cycleMinSec * cycleScale, normalizedTuning.cycleMaxSec * cycleScale) * 1000);
    }

    async function init() {
      if (!canvasRef.current || !analyserNode || !active) return;
      setInitError(null);
      qualityDegradedRef.current = false;
      lastRenderTimeRef.current = 0;
      renderedFramesRef.current = 0;
      fpsWindowStartRef.current = performance.now();
      slowFrameWindowsRef.current = 0;

      if (!qualityProfile.useButterchurn) {
        onPresetChange?.(qualityProfile.label);
        return;
      }

      try {
        const [visualizerMod, presetBaseMod, presetExtraMod, presetExtra2Mod] = await Promise.all([
          import("butterchurn"),
          import("butterchurn-presets"),
          import("butterchurn-presets/lib/butterchurnPresetsExtra.min.js"),
          import("butterchurn-presets/lib/butterchurnPresetsExtra2.min.js"),
        ]);
        if (disposed || !canvasRef.current) return;

        const butterchurn = unwrapVisualizerModule(visualizerMod);
        const base = unwrapPresetModule(presetBaseMod).getPresets();
        const extra = unwrapPresetModule(presetExtraMod).getPresets();
        const extra2 = unwrapPresetModule(presetExtra2Mod).getPresets();
        const allPresets = { ...base, ...extra, ...extra2 };
        const preferredNames = presetNamesForMode(normalizedTuning.presetMode);
        const preferredSet = preferredNames ? new Set(preferredNames) : null;

        const selected: PresetEntry[] = [];
        const fallbackCurated: PresetEntry[] = [];
        const fallbackLibrary: PresetEntry[] = [];

        for (const [name, preset] of Object.entries(allPresets)) {
          if (preferredSet?.has(name)) {
            selected.push({ name, preset });
          } else if (SUNDAY_MORNING_PRESET_NAMES.includes(name)) {
            fallbackCurated.push({ name, preset });
          } else {
            fallbackLibrary.push({ name, preset });
          }
        }

        const list =
          normalizedTuning.presetMode === "full-library"
            ? [...selected, ...fallbackCurated, ...fallbackLibrary]
            : selected.length >= 8
              ? selected
              : [...selected, ...fallbackCurated, ...fallbackLibrary];

        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        presetListRef.current = list;

        const canvas = canvasRef.current;
        const dpr = Math.min(window.devicePixelRatio || 1, qualityProfile.pixelRatioCap);
        const setSize = () => {
          if (!canvasRef.current) return;
          const rect = canvasRef.current.getBoundingClientRect();
          const width = Math.max(1, Math.floor(rect.width * dpr));
          const height = Math.max(1, Math.floor(rect.height * dpr));
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          rendererRef.current?.setRendererSize(width, height);
        };
        setSize();
        resizeHandlerRef.current = setSize;
        window.addEventListener("resize", setSize);

        const renderer = butterchurn.createVisualizer(analyserNode.context, canvas, {
          width: canvas.width,
          height: canvas.height,
          meshWidth: qualityProfile.meshWidth,
          meshHeight: qualityProfile.meshHeight,
          pixelRatio: dpr,
        }) as ButterchurnRenderer;
        renderer.connectAudio(analyserNode);
        rendererRef.current = renderer;

        if (list.length > 0) {
          presetIndexRef.current = 0;
          const first = list[0];
          renderer.loadPreset(first.preset, 0);
          onPresetChange?.(first.name);
        }

        transitionNowRef.current = () => {
          const currentRenderer = rendererRef.current;
          const presets = presetListRef.current;
          if (!currentRenderer || presets.length === 0 || disposed) return;
          presetIndexRef.current = pickPresetIndex(presetIndexRef.current, presets.length);
          const next = presets[presetIndexRef.current];
          currentRenderer.loadPreset(
            next.preset,
            randomBetween(normalizedTuning.blendMinSec, normalizedTuning.blendMaxSec)
          );
          onPresetChange?.(next.name);
          scheduleCycle();
        };

        const targetFps = qualityProfile.targetFps;
        const minFpsRatio = fpsSustainRatioForTier(effectiveTier);
        const slowWindowsNeeded = slowWindowsBeforeDegrade(effectiveTier);

        const renderLoop = () => {
          if (disposed || !rendererRef.current) return;
          rafRef.current = requestAnimationFrame(renderLoop);
          if (document.hidden) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            return;
          }

          const now = performance.now();
          const interval = 1000 / targetFps;
          if (now - fpsWindowStartRef.current >= 1000) {
            const actualFps = renderedFramesRef.current;
            renderedFramesRef.current = 0;
            fpsWindowStartRef.current = now;
            if (actualFps < targetFps * minFpsRatio) {
              slowFrameWindowsRef.current += 1;
            } else {
              slowFrameWindowsRef.current = 0;
            }
            if (
              qualityUserMode === "auto" &&
              qualityPolicy !== "leanback" &&
              slowFrameWindowsRef.current >= slowWindowsNeeded &&
              !qualityDegradedRef.current
            ) {
              qualityDegradedRef.current = true;
              setIntrinsicAutoTier((current) => degradeQualityTier(current));
              return;
            }
          }
          if (now - lastRenderTimeRef.current < interval) return;
          lastRenderTimeRef.current = now;
          rendererRef.current.render();
          renderedFramesRef.current += 1;
        };
        const handleVisibilityChange = () => {
          if (document.hidden && rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
            return;
          }
          if (!document.hidden && !disposed && !rafRef.current) {
            fpsWindowStartRef.current = performance.now();
            slowFrameWindowsRef.current = 0;
            rafRef.current = requestAnimationFrame(renderLoop);
          }
        };
        visibilityHandlerRef.current = handleVisibilityChange;
        document.addEventListener("visibilitychange", handleVisibilityChange);

        rafRef.current = requestAnimationFrame(renderLoop);

        scheduleCycle();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to initialize visualizer.";
        setInitError(message);
        setIntrinsicAutoTier("fallback");
      }
    }

    void init();

    return () => {
      disposed = true;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      if (cycleTimerRef.current) {
        clearTimeout(cycleTimerRef.current);
        cycleTimerRef.current = null;
      }
      transitionNowRef.current = null;
      if (resizeHandlerRef.current) {
        window.removeEventListener("resize", resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      if (visibilityHandlerRef.current) {
        document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
        visibilityHandlerRef.current = null;
      }
      rendererRef.current = null;
      presetListRef.current = [];
    };
  }, [active, analyserNode, effectiveTier, normalizedTuning, onPresetChange, qualityPolicy, qualityProfile, qualityUserMode]);

  useEffect(() => {
    if (!active || transitionNonce === 0) return;
    transitionNowRef.current?.();
  }, [active, transitionNonce]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className={`h-full w-full block ${qualityProfile.useButterchurn ? "opacity-100" : "opacity-0"}`}
        aria-label="Milkdrop visualizer canvas"
      />
      {!isReady ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70 bg-black/35">
          Start SomaFM playback to begin the visualizer
        </div>
      ) : null}
      {isReady && !qualityProfile.useButterchurn ? (
        <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-xs text-white/75">
          {qualityUserMode === "full"
            ? "Full quality needs GPU acceleration — showing the lightweight layer. Try Auto, Smooth, or Balanced on this device."
            : "Reduced FX mode keeps playback smooth when GPU acceleration is limited or unavailable."}
        </div>
      ) : null}
      {initError ? (
        <div className="absolute bottom-2 left-2 right-2 text-xs text-red-200 bg-red-900/55 border border-red-400/50 rounded px-2 py-1">
          Visualizer error: {initError}
        </div>
      ) : null}
    </div>
  );
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    addEventListener(type: "levelchange" | "chargingchange", listener: () => void): void;
    removeEventListener(type: "levelchange" | "chargingchange", listener: () => void): void;
  }>;
}
