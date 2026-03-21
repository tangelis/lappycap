import type { Scene } from '../types';

// Lysergic, warping, melting, weird geometry — full sensory meltdown
// Best with: psytrance, acid techno, experimental electronic 120-150 BPM
export const psychWard: Scene = {
  name: 'Psych Ward',
  description: 'Lysergic warping and melting geometry for the truly unhinged',
  bpmRange: [120, 150],
  blendDuration: 6,
  cycleDuration: 25,
  order: 'shuffle',
  presetNames: [
    // Warping / melting
    'Flexi - psychenapping',
    'PieturP - triptrap_(ultimate-trip-mix)',
    'Redi Jedi - i dont think those were portabello mushrooms',
    'Cope - The Neverending Explosion of Red Liquid Fire',
    'flexi - Mindblob',
    'Flexi - mindblob mix',
    'Flexi - mindblob [shiny mix]',

    // Acid / weird geometry
    'Flexi - smashing fractals [acid etching mix]',
    'Flexi - smashing fractals 2.0',
    'martin - mandelbox explorer - high speed demo version',
    'Stahlregen + martin + others - Psychedelic Metal Flower',
    'Geiss - Brain Zoom 4',

    // Lysergic flow
    'Zylot - True Visionary (Final Mix)',
    'flexi + fishbrain - neon mindblob grafitti',
    'flexi - bouncing balls [double mindblob gastrointestinal mix]',
    'Flexi, Geiss and Rovastar - chaos layered tokamak',
    'Geiss, Flexi + Stahlregen - Thumbdrum Tokamak [crossfiring aftermath jelly mashup]',
    'Rovastar - Explosive Minds',
    'EVET - RGB Singularity',
    'martin - witchcraft reloaded',
  ],
};
