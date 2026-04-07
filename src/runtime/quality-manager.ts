import type { QualityDecision, QualityManager, QualityTier } from "./interfaces";

interface QualityManagerOptions {
  initialTier?: QualityTier;
  sampleWindow?: number;
}

const TIER_ORDER: QualityTier[] = ["high", "balanced", "performance"];
const DOWNGRADE_THRESHOLD_MS = 33;
const UPGRADE_THRESHOLD_MS = 18;

export class QualityManagerImpl implements QualityManager {
  private tier: QualityTier;
  private readonly samples: number[] = [];
  private readonly sampleWindow: number;
  private stableLowFrameWindows = 0;

  constructor(options: QualityManagerOptions = {}) {
    this.tier = options.initialTier ?? "high";
    this.sampleWindow = options.sampleWindow ?? 600; // ~10s at 60fps
  }

  recordFrameTime(frameMs: number): void {
    this.samples.push(frameMs);
    if (this.samples.length > this.sampleWindow) {
      this.samples.shift();
    }
  }

  evaluate(): QualityDecision {
    const previousTier = this.tier;
    if (this.samples.length === 0) {
      return { previousTier, nextTier: this.tier, reason: "no samples" };
    }

    const p95 = percentile(this.samples, 0.95);
    if (p95 > DOWNGRADE_THRESHOLD_MS && this.tier !== "performance") {
      this.tier = TIER_ORDER[TIER_ORDER.indexOf(this.tier) + 1];
      this.stableLowFrameWindows = 0;
      return {
        previousTier,
        nextTier: this.tier,
        reason: `p95 frame budget breached (${p95.toFixed(2)}ms)`,
      };
    }

    if (p95 < UPGRADE_THRESHOLD_MS && this.tier !== "high") {
      this.stableLowFrameWindows += 1;
      if (this.stableLowFrameWindows >= 6) {
        this.tier = TIER_ORDER[TIER_ORDER.indexOf(this.tier) - 1];
        this.stableLowFrameWindows = 0;
        return {
          previousTier,
          nextTier: this.tier,
          reason: `stable low frame times (${p95.toFixed(2)}ms)`,
        };
      }
      return {
        previousTier,
        nextTier: this.tier,
        reason: "collecting stable windows before upgrade",
      };
    }

    this.stableLowFrameWindows = 0;
    return {
      previousTier,
      nextTier: this.tier,
      reason: "within target range",
    };
  }

  currentTier(): QualityTier {
    return this.tier;
  }
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1));
  return sorted[index];
}
