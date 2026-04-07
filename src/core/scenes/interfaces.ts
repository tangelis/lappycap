import type { ParseIssue } from "../presets/interfaces";

export type CycleMode = "time" | "beat" | "hybrid";
export type CueIntensity = "low" | "medium" | "high" | "adaptive";
export type TransitionEasing = "linear" | "cosine" | "cubic" | "expo";

export interface TransitionSpec {
  type: "crossfade";
  easing: TransitionEasing;
  durationSec: number;
}

export interface SceneCue {
  order: number;
  presetId: string;
  minDurationSec: number;
  maxDurationSec: number;
  intensity: CueIntensity;
}

export interface ParsedScene {
  id: string;
  name: string;
  schemaVersion: "scene.v1";
  targetBpm: [number, number];
  cycleMode: CycleMode;
  defaultTransition: TransitionSpec;
  cues: SceneCue[];
  overlays: Record<string, number>;
  warnings: ParseIssue[];
}

export interface SceneCompiler {
  parseScene(source: string): ParsedScene;
}
