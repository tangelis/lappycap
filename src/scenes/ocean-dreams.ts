import type { Scene } from '../types';

// Fluid, deep, serene, slow-moving — like drifting through bioluminescent depths
// Best with: ambient, drone, sleep music, nature sounds 50-90 BPM
export const oceanDreams: Scene = {
  name: 'Ocean Dreams',
  description: 'Fluid serene visuals for ambient and sleep music',
  bpmRange: [50, 90],
  blendDuration: 12,
  cycleDuration: 45,
  order: 'sequential',
  presetNames: [
    // Deep fluid / ocean
    'Aderrasi - Airhandler (Last Breath - Calm)',
    'Aderrasi - Songflower (Moss Posy)',
    'Aderrasi - Potion of Spirits',
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Painterly Tendrils Colorfast',
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix',
    'yin - 315 - Ocean of Light (yo im peakin yo Eo.S.-Phat)',

    // Slow organic / serene
    'cope - the drain to heaven',
    'Geiss - Reaction Diffusion 2',
    'Geiss - Reaction Diffusion 3 (Lichen Mix)',
    'Geiss - Cauldron - painterly 2 (saturation remix)',
    'Geiss - Planet 1',
    '_Geiss - Desert Rose 2',

    // Atmospheric drift
    'Flexi + Martin - astral projection',
    'Flexi - infused with the spiral',
    'flexi - infused with the spiral (jelly 4.x cn)',
    'flexi + amandio c - organic',
    'Flexi - alien fish pond',
    'flexi - jelly fish mandala',
    'Flexi - truly soft piece of software - this is generic texturing (Jelly) ',
    'cope + martin - mother-of-pearl',
    'fiShbRaiN - toffee cream and icing sugar',
  ],
};
