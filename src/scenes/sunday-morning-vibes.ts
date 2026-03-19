import type { Scene } from '../types';

// Curated mellow Milkdrop presets for ambient/funk/electronic 90-120 BPM
// All preset names verified against butterchurn-presets + extra packs
export const sundayMorningVibes: Scene = {
  name: 'Sunday Morning Vibes',
  description: 'Mellow visuals for ambient, funk and electronic music',
  bpmRange: [90, 120],
  blendDuration: 8,
  cycleDuration: 30,
  order: 'shuffle',
  presetNames: [
    // Smooth flowing / organic
    'Flexi - infused with the spiral',
    'flexi - infused with the spiral (jelly 4.x cn)',
    'flexi + amandio c - organic',
    'Flexi - alien fish pond',
    'flexi - jelly fish mandala',
    'Flexi - truly soft piece of software - this is generic texturing (Jelly) ',

    // Warm / glowing
    'Aderrasi - Airhandler (Last Breath - Calm)',
    'Aderrasi - Songflower (Moss Posy)',
    'Aderrasi - Potion of Spirits',
    'cope + martin - mother-of-pearl',
    'cope - the drain to heaven',
    'fiShbRaiN - toffee cream and icing sugar',

    // Spirals and fluid motion
    'Flexi - predator-prey-spirals',
    'flexi - swing out on the spiral',
    'Geiss - Spiral Artifact',
    'Martin - liquid arrows',
    'Geiss - Reaction Diffusion 2',
    'Geiss - Reaction Diffusion 3 (Lichen Mix)',

    // Atmospheric / dreamy
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Painterly Tendrils Colorfast',
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix',
    'Geiss - Cauldron - painterly 2 (saturation remix)',
    'Flexi + Martin - astral projection',
    'Flexi + Martin - cascading decay swing',
    'Rovastar - A Million Miles From Earth (Wormhole Mix)',
  ],
};
