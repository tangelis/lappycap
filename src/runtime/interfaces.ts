import type { ParsedPreset } from "../core/presets/interfaces";
import type { ParsedScene } from "../core/scenes/interfaces";

export type OutputTarget = "browser" | "cast_receiver";
export type AudioSource = "spotify" | "mic" | "demo";
export type SessionStatus = "running" | "paused" | "ended";
export type QualityTier = "high" | "balanced" | "performance";

export interface SessionConfig {
  sceneId: string;
  audioSource: AudioSource;
  outputTarget: OutputTarget;
}

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  activeSceneId: string;
  activePresetId: string;
  activeCueIndex: number;
  outputTarget: OutputTarget;
}

export interface PlaybackStateInfluence {
  tempo: number;
  energy: number;
  valence: number;
}

export interface CompilerGateway {
  getScene(sceneId: string): ParsedScene | null;
  getPreset(presetId: string): ParsedPreset | null;
}

export interface PlaybackController {
  start(config: SessionConfig): SessionState;
  pause(sessionId: string): SessionState;
  resume(sessionId: string): SessionState;
  next(sessionId: string): SessionState;
  getSession(sessionId: string): SessionState | null;
  applyInfluence(sessionId: string, influence: PlaybackStateInfluence): void;
  getInfluence(sessionId: string): PlaybackStateInfluence | null;
}

export interface TransitionSnapshot {
  progress: number;
  easing: "linear" | "cosine" | "cubic" | "expo";
  fromPresetId: string;
  toPresetId: string;
}

export interface TransitionRequest {
  fromPresetId: string;
  toPresetId: string;
  durationSec: number;
  easing: "linear" | "cosine" | "cubic" | "expo";
}

export interface TransitionEngine {
  beginTransition(request: TransitionRequest): void;
  getSnapshot(nowMs: number): TransitionSnapshot | null;
}

export interface QualityDecision {
  previousTier: QualityTier;
  nextTier: QualityTier;
  reason: string;
}

export interface QualityManager {
  recordFrameTime(frameMs: number): void;
  evaluate(): QualityDecision;
  currentTier(): QualityTier;
}
