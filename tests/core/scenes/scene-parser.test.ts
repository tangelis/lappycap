import { describe, expect, it } from "vitest";
import { parseSceneText } from "../../../src/core/scenes/scene-parser";
import { PresetParseError } from "../../../src/core/presets/interfaces";

const VALID_SCENE = `schema: scene.v1
id: sunday-morning-vibes
name: Sunday Morning Vibes
target_bpm: 90-120
cycle_mode: hybrid
default_transition: crossfade(cosine,12s)

[cues]
1: sunrise-glow duration=45-90s intensity=low
2: lava-lamp-lofi duration=60-120s intensity=medium
3: sunset-haze duration=60-150s intensity=low

[overlays]
film_grain=0.03
vignette=0.08`;

describe("parseSceneText", () => {
  it("parses a valid scene file", () => {
    const scene = parseSceneText(VALID_SCENE);
    expect(scene.id).toBe("sunday-morning-vibes");
    expect(scene.targetBpm).toEqual([90, 120]);
    expect(scene.defaultTransition.durationSec).toBe(12);
    expect(scene.cues).toHaveLength(3);
  });

  it("throws SCENE_EMPTY when no cues are present", () => {
    const withoutCues = VALID_SCENE.replace(
      /(\[cues\][\s\S]*?)\[overlays\]/m,
      "[cues]\n\n[overlays]"
    );
    try {
      parseSceneText(withoutCues);
      throw new Error("Expected parse to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(PresetParseError);
      const parseError = error as PresetParseError;
      expect(parseError.code).toBe("SCENE_EMPTY");
    }
  });

  it("throws TRANSITION_INVALID for unsupported transition", () => {
    const invalid = VALID_SCENE.replace(
      "default_transition: crossfade(cosine,12s)",
      "default_transition: crossfade(foo,90s)"
    );
    expect(() => parseSceneText(invalid)).toThrowError(PresetParseError);
  });
});
