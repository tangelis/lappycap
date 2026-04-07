export type ButterchurnPresetMode =
  | "sunday-morning"
  | "liquid-organic"
  | "cosmic-drift"
  | "milkdrop-smooth"
  | "full-library";

export type ButterchurnMotionPreset =
  | "slow-cinema"
  | "milkdrop-smooth"
  | "balanced-flow"
  | "alive"
  | "custom";

export type ButterchurnBlendPreset =
  | "silky"
  | "classic"
  | "varied"
  | "dreamy"
  | "custom";

export interface ButterchurnTuning {
  presetMode: ButterchurnPresetMode;
  motionPreset: ButterchurnMotionPreset;
  blendPreset: ButterchurnBlendPreset;
  cycleMinSec: number;
  cycleMaxSec: number;
  blendMinSec: number;
  blendMaxSec: number;
}

export const PRESET_MODE_LABELS: Record<ButterchurnPresetMode, string> = {
  "sunday-morning": "Sunday Morning",
  "liquid-organic": "Liquid Organic",
  "cosmic-drift": "Cosmic Drift",
  "milkdrop-smooth": "Milkdrop Smooth",
  "full-library": "Full Library",
};

export const MOTION_PRESET_LABELS: Record<ButterchurnMotionPreset, string> = {
  "slow-cinema": "Slow Cinema",
  "milkdrop-smooth": "Milkdrop Smooth",
  "balanced-flow": "Balanced Flow",
  alive: "Alive",
  custom: "Custom",
};

export const BLEND_PRESET_LABELS: Record<ButterchurnBlendPreset, string> = {
  silky: "Silky",
  classic: "Classic",
  varied: "Varied",
  dreamy: "Dreamy",
  custom: "Custom",
};

export const MOTION_PRESET_VALUES: Record<
  Exclude<ButterchurnMotionPreset, "custom">,
  Pick<ButterchurnTuning, "cycleMinSec" | "cycleMaxSec">
> = {
  "slow-cinema": { cycleMinSec: 45, cycleMaxSec: 90 },
  "milkdrop-smooth": { cycleMinSec: 32, cycleMaxSec: 60 },
  "balanced-flow": { cycleMinSec: 24, cycleMaxSec: 44 },
  alive: { cycleMinSec: 18, cycleMaxSec: 32 },
};

export const BLEND_PRESET_VALUES: Record<
  Exclude<ButterchurnBlendPreset, "custom">,
  Pick<ButterchurnTuning, "blendMinSec" | "blendMaxSec">
> = {
  silky: { blendMinSec: 8, blendMaxSec: 14 },
  classic: { blendMinSec: 6, blendMaxSec: 10 },
  varied: { blendMinSec: 4, blendMaxSec: 12 },
  dreamy: { blendMinSec: 10, blendMaxSec: 18 },
};

export const DEFAULT_BUTTERCHURN_TUNING: ButterchurnTuning = {
  presetMode: "sunday-morning",
  motionPreset: "slow-cinema",
  blendPreset: "silky",
  ...MOTION_PRESET_VALUES["slow-cinema"],
  ...BLEND_PRESET_VALUES.silky,
};

export const SUNDAY_MORNING_PRESET_NAMES = [
  "Flexi - infused with the spiral",
  "flexi - infused with the spiral (jelly 4.x cn)",
  "flexi + amandio c - organic",
  "Flexi - alien fish pond",
  "flexi - jelly fish mandala",
  "Flexi - truly soft piece of software - this is generic texturing (Jelly) ",
  "Aderrasi - Airhandler (Last Breath - Calm)",
  "Aderrasi - Songflower (Moss Posy)",
  "Aderrasi - Potion of Spirits",
  "cope + martin - mother-of-pearl",
  "cope - the drain to heaven",
  "fiShbRaiN - toffee cream and icing sugar",
  "Flexi - predator-prey-spirals",
  "flexi - swing out on the spiral",
  "Geiss - Spiral Artifact",
  "Martin - liquid arrows",
  "Geiss - Reaction Diffusion 2",
  "Geiss - Reaction Diffusion 3 (Lichen Mix)",
  "Aderrasi + Geiss - Airhandler (Kali Mix) - Painterly Tendrils Colorfast",
  "Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix",
  "Geiss - Cauldron - painterly 2 (saturation remix)",
  "Flexi + Martin - astral projection",
  "Flexi + Martin - cascading decay swing",
  "Rovastar - A Million Miles From Earth (Wormhole Mix)",
  "Rovastar - Fractopia (Galaxy Quest)",
  "Rovastar - Altars of Madness (Rolling Oceans)",
  "Rovastar + Loadus - Psychedelic Highway",
  "Unchained - Morat's Final Trainer",
  "Unchained - Jelly Brains",
  "shifter - tumbling cubes (ripple mix)",
  "Zylot - Star Ornament",
  "Phat + Eo.S. + Zylot - Eddies 1",
  "Geiss - Tokamak (Reactor Mix)",
  "Bmelgren + Flexi - what the tornado left behind",
  "Flexi - mindblob [shiny mix]",
];

export const LIQUID_ORGANIC_PRESET_NAMES = [
  "Flexi - infused with the spiral",
  "flexi + amandio c - organic",
  "Flexi - alien fish pond",
  "flexi - jelly fish mandala",
  "cope + martin - mother-of-pearl",
  "cope - the drain to heaven",
  "Martin - liquid arrows",
  "Flexi + Martin - astral projection",
  "Flexi + Martin - cascading decay swing",
  "Flexi - mindblob [shiny mix]",
  "Bmelgren + Flexi - what the tornado left behind",
  "Geiss - Reaction Diffusion 2",
  "Geiss - Reaction Diffusion 3 (Lichen Mix)",
];

export const COSMIC_DRIFT_PRESET_NAMES = [
  "Aderrasi - Airhandler (Last Breath - Calm)",
  "Aderrasi - Songflower (Moss Posy)",
  "Aderrasi - Potion of Spirits",
  "Aderrasi + Geiss - Airhandler (Kali Mix) - Painterly Tendrils Colorfast",
  "Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix",
  "Rovastar - A Million Miles From Earth (Wormhole Mix)",
  "Rovastar - Fractopia (Galaxy Quest)",
  "Rovastar - Altars of Madness (Rolling Oceans)",
  "Rovastar + Loadus - Psychedelic Highway",
  "Zylot - Star Ornament",
  "Phat + Eo.S. + Zylot - Eddies 1",
  "Geiss - Tokamak (Reactor Mix)",
];

export function presetNamesForMode(mode: ButterchurnPresetMode): string[] | null {
  switch (mode) {
    case "sunday-morning":
      return SUNDAY_MORNING_PRESET_NAMES;
    case "liquid-organic":
      return LIQUID_ORGANIC_PRESET_NAMES;
    case "cosmic-drift":
      return COSMIC_DRIFT_PRESET_NAMES;
    case "milkdrop-smooth":
      return SUNDAY_MORNING_PRESET_NAMES;
    case "full-library":
      return null;
  }
}

export function normalizeTuning(tuning: ButterchurnTuning): ButterchurnTuning {
  const cycleMinSec = Math.max(10, Math.min(120, tuning.cycleMinSec));
  const cycleMaxSec = Math.max(cycleMinSec, Math.min(180, tuning.cycleMaxSec));
  const blendMinSec = Math.max(1, Math.min(30, tuning.blendMinSec));
  const blendMaxSec = Math.max(blendMinSec, Math.min(40, tuning.blendMaxSec));

  return {
    ...tuning,
    cycleMinSec,
    cycleMaxSec,
    blendMinSec,
    blendMaxSec,
  };
}

