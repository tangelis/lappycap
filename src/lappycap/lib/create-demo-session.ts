import { PresetCompilerImpl } from "../../core/presets/preset-parser";
import { SceneCompilerImpl } from "../../core/scenes/scene-parser";
import { CompilerRuntimeGateway } from "../../integration/compiler-runtime-gateway";
import { PlaybackControllerImpl } from "../../runtime/playback-controller";
import type { SessionState } from "../../runtime/interfaces";
import { sunriseGlowPresetV1, sunsetHazePresetV1 } from "../content/presets";
import { sundayMorningVibesSceneV1 } from "../content/scenes";

export interface LappycapDemoSessionBundle {
  controller: PlaybackControllerImpl;
  session: SessionState;
  gateway: CompilerRuntimeGateway;
}

/**
 * Wires core compilers + integration gateway + playback controller and starts a demo session
 * for the Sunday Morning Vibes scene (browser output, demo audio).
 */
export function createLappycapDemoSession(): LappycapDemoSessionBundle {
  const gateway = new CompilerRuntimeGateway({
    presetCompiler: new PresetCompilerImpl(),
    sceneCompiler: new SceneCompilerImpl(),
  });

  gateway.loadSources({
    presets: [sunriseGlowPresetV1, sunsetHazePresetV1],
    scenes: [sundayMorningVibesSceneV1],
  });

  const controller = new PlaybackControllerImpl({ compilerGateway: gateway });
  const session = controller.start({
    sceneId: "sunday-morning-vibes",
    audioSource: "demo",
    outputTarget: "browser",
  });

  return { controller, session, gateway };
}
