import type { Scene } from '../types';

// Cosmic ambient drift — slow-evolving nebulae, wormholes, and deep-space textures
// Best with: ambient, downtempo, dub, space-themed electronic 70-110 BPM
export const deepSpaceRadio: Scene = {
  name: 'Deep Space Radio',
  description: 'Cosmic ambient drift for downtempo and space music',
  bpmRange: [70, 110],
  blendDuration: 10,
  cycleDuration: 40,
  order: 'shuffle',
  presetNames: [
    // Deep space / nebulae
    'Rovastar - A Million Miles From Earth (Wormhole Mix)',
    'Unchained & Rovastar - Wormhole Pillars (Hall of Shadows mix)',
    'Martin - journey into space',
    'TonyMilkdrop - Magellan\'s Nebula [Flexi - you enter first + multiverse]',
    'Rovastar + Geiss - Snapshot Of Space (LSB mix)',
    'Idiot - Star Of Annon',

    // Slow organic / fluid
    'Aderrasi - Airhandler (Last Breath - Calm)',
    'Aderrasi - Songflower (Moss Posy)',
    'cope - the drain to heaven',
    'Geiss - Reaction Diffusion 3 (Lichen Mix)',
    'Geiss - Reaction Diffusion 2',
    'Geiss - Planet 1',

    // Atmospheric drift
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Painterly Tendrils Colorfast',
    'Flexi + Martin - astral projection',
    'yin - 315 - Ocean of Light (yo im peakin yo Eo.S.-Phat)',
    'yin - 250 - Artificial poles of the continuum_Phat′s_Orbit_mix',
    '_Geiss - Desert Rose 2',
    'martin - satellite view',
  ],
};
