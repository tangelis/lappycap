import { PresetParseError } from "../core/presets/interfaces";
import type { SpotifyProvider } from "../integrations/spotify/interfaces";
import type { PlaybackController, PlaybackStateInfluence, SessionConfig, SessionState } from "./interfaces";
import type { CompilerGateway } from "./interfaces";
import { TransitionEngineImpl } from "./transition-engine";

interface PlaybackControllerOptions {
  compilerGateway: CompilerGateway;
  spotifyProvider?: SpotifyProvider;
}

export class PlaybackControllerImpl implements PlaybackController {
  private readonly compilerGateway: CompilerGateway;
  private readonly spotifyProvider?: SpotifyProvider;
  private readonly transitionEngine = new TransitionEngineImpl();
  private readonly sessions = new Map<string, SessionState>();
  private readonly influences = new Map<string, PlaybackStateInfluence>();

  constructor(options: PlaybackControllerOptions) {
    this.compilerGateway = options.compilerGateway;
    this.spotifyProvider = options.spotifyProvider;
  }

  start(config: SessionConfig): SessionState {
    const scene = this.compilerGateway.getScene(config.sceneId);
    if (!scene) {
      throw new PresetParseError("PARSE_ERROR", "SCENE_NOT_LOADED");
    }
    if (scene.cues.length === 0) {
      throw new PresetParseError("SCENE_EMPTY", "Scene has no cues.");
    }
    if (config.audioSource === "spotify" && !this.spotifyProvider) {
      throw new PresetParseError("AUDIO_SOURCE_UNAVAILABLE", "SPOTIFY_NOT_CONNECTED");
    }

    const firstCue = scene.cues[0];
    const firstPreset = this.compilerGateway.getPreset(firstCue.presetId);
    if (!firstPreset) {
      throw new PresetParseError("PRESET_REFERENCE_MISSING", "First cue preset not found.");
    }

    const sessionId = `sess_${cryptoRandomId()}`;
    const state: SessionState = {
      sessionId,
      status: "running",
      activeSceneId: scene.id,
      activePresetId: firstPreset.id,
      activeCueIndex: 0,
      outputTarget: config.outputTarget,
    };
    this.sessions.set(sessionId, state);
    return state;
  }

  pause(sessionId: string): SessionState {
    const current = this.sessions.get(sessionId);
    if (!current) {
      throw new PresetParseError("NOT_FOUND", "Session not found.");
    }
    const next = { ...current, status: "paused" as const };
    this.sessions.set(sessionId, next);
    return next;
  }

  resume(sessionId: string): SessionState {
    const current = this.sessions.get(sessionId);
    if (!current) {
      throw new PresetParseError("NOT_FOUND", "Session not found.");
    }
    const next = { ...current, status: "running" as const };
    this.sessions.set(sessionId, next);
    return next;
  }

  next(sessionId: string): SessionState {
    const current = this.sessions.get(sessionId);
    if (!current) {
      throw new PresetParseError("NOT_FOUND", "Session not found.");
    }
    const scene = this.compilerGateway.getScene(current.activeSceneId);
    if (!scene) {
      throw new PresetParseError("PARSE_ERROR", "SCENE_NOT_LOADED");
    }
    const nextCueIndex = (current.activeCueIndex + 1) % scene.cues.length;
    const nextCue = scene.cues[nextCueIndex];
    const nextPreset = this.compilerGateway.getPreset(nextCue.presetId);
    if (!nextPreset) {
      throw new PresetParseError("PRESET_REFERENCE_MISSING", "Cue preset not found.");
    }

    this.transitionEngine.beginTransition({
      fromPresetId: current.activePresetId,
      toPresetId: nextPreset.id,
      durationSec: scene.defaultTransition.durationSec,
      easing: scene.defaultTransition.easing,
    });

    const nextState: SessionState = {
      ...current,
      activeCueIndex: nextCueIndex,
      activePresetId: nextPreset.id,
      status: "running",
    };
    this.sessions.set(sessionId, nextState);
    return nextState;
  }

  getSession(sessionId: string): SessionState | null {
    return this.sessions.get(sessionId) ?? null;
  }

  applyInfluence(sessionId: string, influence: PlaybackStateInfluence): void {
    if (!this.sessions.has(sessionId)) {
      throw new PresetParseError("NOT_FOUND", "Session not found.");
    }
    this.influences.set(sessionId, influence);
  }

  getInfluence(sessionId: string): PlaybackStateInfluence | null {
    return this.influences.get(sessionId) ?? null;
  }
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10);
}
