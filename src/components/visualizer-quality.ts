/**
 * Adaptive visualizer quality: device class, WebGL signals, network/display hints,
 * and a capability score map to render tiers. Designed for TV, phone, and desktop
 * with stable FPS and graceful loss of VFX when acceleration is weak or absent.
 */

export type VisualizerDeviceKind = "android-tv" | "mobile" | "desktop";

export type VisualizerQualityTier = "high" | "balanced" | "performance" | "fallback";

export interface VisualizerAccelerationInfo {
  webglSupported: boolean;
  /** True when ANGLE/software renderers are not detected on the active GL context. */
  accelerated: boolean;
  renderer?: string;
  vendor?: string;
  /** 2 if webgl2 context was created, 1 if webgl only (Butterchurn prefers webgl2). */
  webglVersion?: 1 | 2;
  maxTextureSize?: number;
}

export interface NetworkHints {
  saveData: boolean;
  effectiveType?: string;
}

export interface DisplayHints {
  devicePixelRatio: number;
  /** Approximate physical pixels (width × height × DPR² contribution capped). */
  estimatedFillPixels: number;
  prefersReducedMotion: boolean;
  /** True when the UA reports a slow display refresh policy. */
  prefersSlowUpdate: boolean;
}

export interface VisualizerRuntimeContext {
  acceleration: VisualizerAccelerationInfo;
  deviceKind: VisualizerDeviceKind;
  deviceMemoryGb?: number;
  hardwareConcurrency?: number;
  prefersReducedMotion: boolean;
  network: NetworkHints;
  display: DisplayHints;
}

export interface CapabilityScoreResult {
  score: number;
  /** Human-readable factors that lowered the score (for diagnostics). */
  factors: string[];
}

export interface VisualizerAdaptiveDiagnostics {
  deviceKind: VisualizerDeviceKind;
  capabilityScore: number;
  scoreFactors: string[];
  webglRenderer?: string;
  webglVendor?: string;
  effectiveType?: string;
  saveData: boolean;
}

/** User-chosen render budget. Auto follows capability score + live FPS; manual modes pin the target (still clamped if WebGL is missing or software-rendered). */
export type VisualizerQualityUserMode = "auto" | "smooth" | "balanced" | "full";

export const VISUALIZER_QUALITY_STORAGE_KEY = "nest-visualizer-quality-mode";

export const VISUALIZER_QUALITY_USER_MODE_LABELS: Record<VisualizerQualityUserMode, string> = {
  auto: "Auto",
  smooth: "Smooth",
  balanced: "Balanced",
  full: "Full",
};

export interface VisualizerQualityProfile {
  tier: VisualizerQualityTier;
  label: string;
  userMode: VisualizerQualityUserMode;
  useButterchurn: boolean;
  targetFps: number;
  meshWidth: number;
  meshHeight: number;
  pixelRatioCap: number;
  showBackdropBlur: boolean;
  showAnimatedOverlay: boolean;
  showFrequencyBars: boolean;
  frequencyBarCount: number;
  overlayOpacity: number;
  /** Extra box-shadow / glow on spectrum bars (expensive on weak GPUs). */
  showFrequencyBarGlow: boolean;
  /** Hint for container CSS (`contain`, etc.). */
  useStrictContainment: boolean;
}

const TV_UA =
  /\b(android tv|google tv|crkey|aft[a-z0-9]{2,}|bravia|mibox|shield|fire tv|smart-tv|smarttv|hbbtv|appletv|tvos)\b/i;
const MOBILE_UA = /\b(android|iphone|ipod|mobile|tablet|ipad)\b/i;

export function inferDeviceKind(userAgent: string): VisualizerDeviceKind {
  const ua = userAgent;
  if (TV_UA.test(ua)) return "android-tv";
  if (MOBILE_UA.test(ua)) return "mobile";
  return "desktop";
}

export function isLikelySoftwareRenderer(renderer?: string | null): boolean {
  if (!renderer) return false;
  const normalized = renderer.toLowerCase();
  return (
    normalized.includes("swiftshader") ||
    normalized.includes("llvmpipe") ||
    normalized.includes("software") ||
    normalized.includes("softpipe") ||
    normalized.includes("microsoft basic render") ||
    normalized.includes("angle (google, vulkan 1.3.0 (swiftshader device") ||
    normalized.includes("virgl") ||
    normalized.includes("mesa offscreen")
  );
}

function readGlStrings(gl: WebGLRenderingContext): { renderer?: string; vendor?: string } {
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info") as
    | { UNMASKED_RENDERER_WEBGL: number; UNMASKED_VENDOR_WEBGL: number }
    | null;
  if (debugInfo) {
    return {
      renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string,
      vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string,
    };
  }
  return {
    renderer: gl.getParameter(gl.RENDERER) as string,
    vendor: gl.getParameter(gl.VENDOR) as string,
  };
}

/**
 * Probes WebGL the same way Butterchurn does (webgl2 first) so tier matches real init.
 */
export function probeWebGlAcceleration(): VisualizerAccelerationInfo {
  const canvas = document.createElement("canvas");
  const gl2 = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
  }) as WebGL2RenderingContext | null;

  if (gl2) {
    const { renderer, vendor } = readGlStrings(gl2);
    const maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) as number;
    return {
      webglSupported: true,
      accelerated: !isLikelySoftwareRenderer(renderer),
      renderer,
      vendor,
      webglVersion: 2,
      maxTextureSize,
    };
  }

  const gl =
    (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
    (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

  if (!gl) {
    return { webglSupported: false, accelerated: false };
  }

  const { renderer, vendor } = readGlStrings(gl);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  return {
    webglSupported: true,
    accelerated: !isLikelySoftwareRenderer(renderer),
    renderer,
    vendor,
    webglVersion: 1,
    maxTextureSize,
  };
}

function readNetworkHints(): NetworkHints {
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return {
    saveData: Boolean(conn?.saveData),
    effectiveType: conn?.effectiveType,
  };
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function estimateFillPixels(): number {
  if (typeof window === "undefined") return 0;
  const sw = window.screen?.width ?? 0;
  const sh = window.screen?.height ?? 0;
  const dpr = window.devicePixelRatio ?? 1;
  // Cap DPR contribution so 3x phones don't explode the estimate.
  const eff = Math.min(dpr, 3);
  return Math.round(sw * sh * eff * eff);
}

function readDisplayHints(): DisplayHints {
  const devicePixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  let prefersReducedMotion = false;
  let prefersSlowUpdate = false;
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    prefersSlowUpdate = window.matchMedia("(update: slow)").matches;
  }
  return {
    devicePixelRatio,
    estimatedFillPixels: estimateFillPixels(),
    prefersReducedMotion,
    prefersSlowUpdate,
  };
}

export function collectVisualizerRuntimeContext(): VisualizerRuntimeContext {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const display = readDisplayHints();
  return {
    acceleration: probeWebGlAcceleration(),
    deviceKind: inferDeviceKind(nav.userAgent || ""),
    deviceMemoryGb: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    prefersReducedMotion: display.prefersReducedMotion,
    network: readNetworkHints(),
    display,
  };
}

export function computeCapabilityScore(context: VisualizerRuntimeContext): CapabilityScoreResult {
  const factors: string[] = [];
  let score = 100;

  if (!context.acceleration.webglSupported) {
    return { score: 0, factors: ["no-webgl"] };
  }
  if (!context.acceleration.accelerated) {
    score -= 60;
    factors.push("software-renderer");
  }

  const cores = context.hardwareConcurrency ?? 8;
  if (cores <= 2) {
    score -= 22;
    factors.push("low-cpu-cores");
  } else if (cores <= 4) {
    score -= 10;
    factors.push("moderate-cpu-cores");
  }

  const mem = context.deviceMemoryGb;
  if (mem !== undefined) {
    if (mem <= 2) {
      score -= 28;
      factors.push("low-device-memory");
    } else if (mem <= 4) {
      score -= 12;
      factors.push("moderate-device-memory");
    }
  }

  if (context.network.saveData) {
    score -= 18;
    factors.push("save-data");
  }
  const et = context.network.effectiveType;
  if (et === "slow-2g" || et === "2g") {
    score -= 14;
    factors.push("slow-network");
  } else if (et === "3g") {
    score -= 6;
    factors.push("medium-network");
  }

  if (context.display.estimatedFillPixels > 4_500_000) {
    score -= 12;
    factors.push("large-display-fill");
  } else if (context.display.estimatedFillPixels > 2_800_000) {
    score -= 6;
    factors.push("medium-display-fill");
  }

  if (context.display.prefersSlowUpdate) {
    score -= 8;
    factors.push("slow-display-update");
  }

  const tex = context.acceleration.maxTextureSize;
  if (tex !== undefined && tex < 4096) {
    score -= 15;
    factors.push("low-max-texture");
  }

  if (context.deviceKind === "android-tv") {
    score -= 8;
    factors.push("tv-form-factor");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, factors };
}

function tierFromScore(score: number): VisualizerQualityTier {
  if (score >= 80) return "high";
  if (score >= 58) return "balanced";
  return "performance";
}

function applyTierCeiling(
  tier: VisualizerQualityTier,
  context: VisualizerRuntimeContext,
  score: number
): VisualizerQualityTier {
  if (context.deviceKind === "android-tv") {
    if (tier === "high") {
      if (score >= 92 && (context.hardwareConcurrency ?? 0) >= 6) return "balanced";
      return "performance";
    }
    if (tier === "balanced" && score < 62) return "performance";
    return tier;
  }

  if (context.deviceKind === "mobile") {
    if (tier === "high") {
      const memOk = (context.deviceMemoryGb ?? 6) >= 6;
      const coreOk = (context.hardwareConcurrency ?? 0) >= 6;
      if (score >= 88 && memOk && coreOk) return "high";
      return "balanced";
    }
    return tier;
  }

  return tier;
}

function downgradeTier(tier: VisualizerQualityTier): VisualizerQualityTier {
  switch (tier) {
    case "high":
      return "balanced";
    case "balanced":
      return "performance";
    case "performance":
      return "fallback";
    default:
      return "fallback";
  }
}

/** One step down when save-data or very slow network is active (in addition to score). */
function applyNetworkDowngrade(tier: VisualizerQualityTier, context: VisualizerRuntimeContext): VisualizerQualityTier {
  let t = tier;
  if (context.network.saveData) {
    t = downgradeTier(t);
  }
  const et = context.network.effectiveType;
  if (et === "slow-2g" || et === "2g") {
    t = downgradeTier(t);
  }
  return t;
}

export function initialQualityTier(context: VisualizerRuntimeContext): VisualizerQualityTier {
  if (
    context.prefersReducedMotion ||
    !context.acceleration.webglSupported ||
    !context.acceleration.accelerated
  ) {
    return "fallback";
  }

  const { score } = computeCapabilityScore(context);
  let tier = tierFromScore(score);
  tier = applyTierCeiling(tier, context, score);
  tier = applyNetworkDowngrade(tier, context);

  if (tier === "high" && context.display.devicePixelRatio >= 2.75 && context.deviceKind === "mobile") {
    tier = "balanced";
  }

  return tier;
}

export function buildAdaptiveDiagnostics(context: VisualizerRuntimeContext): VisualizerAdaptiveDiagnostics {
  const { score, factors } = computeCapabilityScore(context);
  return {
    deviceKind: context.deviceKind,
    capabilityScore: score,
    scoreFactors: factors,
    webglRenderer: context.acceleration.renderer,
    webglVendor: context.acceleration.vendor,
    effectiveType: context.network.effectiveType,
    saveData: context.network.saveData,
  };
}

export function degradeQualityTier(tier: VisualizerQualityTier): VisualizerQualityTier {
  switch (tier) {
    case "high":
      return "balanced";
    case "balanced":
      return "performance";
    case "performance":
      return "fallback";
    default:
      return "fallback";
  }
}

export function parseVisualizerQualityUserMode(raw: string | null | undefined): VisualizerQualityUserMode {
  if (raw === "smooth" || raw === "balanced" || raw === "full" || raw === "auto") return raw;
  return "auto";
}

/** Maximum tier before expensive milkdrop VFX; `fallback` when acceleration is weak or absent. */
export function hardwareMaxQualityTier(context: VisualizerRuntimeContext): VisualizerQualityTier {
  if (
    context.prefersReducedMotion ||
    !context.acceleration.webglSupported ||
    !context.acceleration.accelerated
  ) {
    return "fallback";
  }
  return "high";
}

export function userModeTargetTier(mode: VisualizerQualityUserMode): VisualizerQualityTier | null {
  switch (mode) {
    case "auto":
      return null;
    case "smooth":
      return "performance";
    case "balanced":
      return "balanced";
    case "full":
      return "high";
    default:
      return null;
  }
}

const TIER_RANK: Record<VisualizerQualityTier, number> = {
  fallback: 0,
  performance: 1,
  balanced: 2,
  high: 3,
};

function tierAtOrBelow(tier: VisualizerQualityTier, ceiling: VisualizerQualityTier): VisualizerQualityTier {
  return TIER_RANK[tier] <= TIER_RANK[ceiling] ? tier : ceiling;
}

/**
 * Combines auto-tuned tier (heuristics + FPS watchdog) with explicit user mode.
 * Manual modes pin the quality target; hardware caps still force Reduced FX when needed.
 */
export function resolveEffectiveQualityTier(
  userMode: VisualizerQualityUserMode,
  autoTier: VisualizerQualityTier,
  context: VisualizerRuntimeContext
): VisualizerQualityTier {
  const maxTier = hardwareMaxQualityTier(context);
  if (maxTier === "fallback") {
    return "fallback";
  }

  if (userMode === "auto") {
    return tierAtOrBelow(autoTier, maxTier);
  }

  const target = userModeTargetTier(userMode);
  if (!target) return tierAtOrBelow(autoTier, maxTier);
  return tierAtOrBelow(target, maxTier);
}

export function profileLabelForTier(
  tier: VisualizerQualityTier,
  userMode: VisualizerQualityUserMode
): string {
  const name =
    tier === "high" ? "Full" : tier === "balanced" ? "Balanced" : tier === "performance" ? "Smooth" : "Reduced FX";

  if (userMode === "auto") {
    if (tier === "fallback") return "Reduced FX";
    return `Auto (${name})`;
  }
  return name;
}

export function buildQualityProfile(
  tier: VisualizerQualityTier,
  userMode: VisualizerQualityUserMode = "auto"
): VisualizerQualityProfile {
  switch (tier) {
    case "high":
      return {
        tier,
        label: profileLabelForTier(tier, userMode),
        userMode,
        useButterchurn: true,
        targetFps: 60,
        meshWidth: 64,
        meshHeight: 48,
        pixelRatioCap: 2,
        showBackdropBlur: true,
        showAnimatedOverlay: true,
        showFrequencyBars: true,
        frequencyBarCount: 8,
        overlayOpacity: 0.3,
        showFrequencyBarGlow: true,
        useStrictContainment: false,
      };
    case "balanced":
      return {
        tier,
        label: profileLabelForTier(tier, userMode),
        userMode,
        useButterchurn: true,
        targetFps: 40,
        meshWidth: 40,
        meshHeight: 28,
        pixelRatioCap: 1.5,
        showBackdropBlur: true,
        showAnimatedOverlay: true,
        showFrequencyBars: true,
        frequencyBarCount: 6,
        overlayOpacity: 0.22,
        showFrequencyBarGlow: true,
        useStrictContainment: false,
      };
    case "performance":
      return {
        tier,
        label: profileLabelForTier(tier, userMode),
        userMode,
        useButterchurn: true,
        targetFps: 30,
        meshWidth: 24,
        meshHeight: 18,
        pixelRatioCap: 1,
        showBackdropBlur: false,
        showAnimatedOverlay: false,
        showFrequencyBars: true,
        frequencyBarCount: 4,
        overlayOpacity: 0.14,
        showFrequencyBarGlow: false,
        useStrictContainment: true,
      };
    case "fallback":
    default:
      return {
        tier: "fallback",
        label: profileLabelForTier("fallback", userMode),
        userMode,
        useButterchurn: false,
        targetFps: 20,
        meshWidth: 0,
        meshHeight: 0,
        pixelRatioCap: 1,
        showBackdropBlur: false,
        showAnimatedOverlay: false,
        showFrequencyBars: true,
        frequencyBarCount: 4,
        overlayOpacity: 0.08,
        showFrequencyBarGlow: false,
        useStrictContainment: true,
      };
  }
}
