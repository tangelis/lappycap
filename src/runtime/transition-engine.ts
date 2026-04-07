import { PresetParseError } from "../core/presets/interfaces";
import type { TransitionEngine, TransitionRequest, TransitionSnapshot } from "./interfaces";

interface ActiveTransition {
  fromPresetId: string;
  toPresetId: string;
  easing: TransitionRequest["easing"];
  startMs: number;
  endMs: number;
}

const MIN_DURATION_SEC = 0.5;
const MAX_DURATION_SEC = 30;

export class TransitionEngineImpl implements TransitionEngine {
  private active: ActiveTransition | null = null;

  beginTransition(request: TransitionRequest): void {
    if (request.durationSec < MIN_DURATION_SEC || request.durationSec > MAX_DURATION_SEC) {
      throw new PresetParseError("TRANSITION_INVALID", "Transition duration out of bounds.");
    }
    const startMs = Date.now();
    const durationMs = request.durationSec * 1000;
    this.active = {
      fromPresetId: request.fromPresetId,
      toPresetId: request.toPresetId,
      easing: request.easing,
      startMs,
      endMs: startMs + durationMs,
    };
  }

  getSnapshot(nowMs: number): TransitionSnapshot | null {
    if (!this.active) return null;
    const total = this.active.endMs - this.active.startMs;
    const elapsed = Math.max(0, nowMs - this.active.startMs);
    const t = total <= 0 ? 1 : Math.min(1, elapsed / total);
    const progress = applyEasing(this.active.easing, t);

    const snapshot: TransitionSnapshot = {
      progress,
      easing: this.active.easing,
      fromPresetId: this.active.fromPresetId,
      toPresetId: this.active.toPresetId,
    };

    if (t >= 1) {
      this.active = null;
    }
    return snapshot;
  }
}

function applyEasing(easing: TransitionRequest["easing"], t: number): number {
  if (easing === "linear") return t;
  if (easing === "cosine") return (1 - Math.cos(Math.PI * t)) / 2;
  if (easing === "cubic") return t * t * (3 - 2 * t);
  // expo
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}
