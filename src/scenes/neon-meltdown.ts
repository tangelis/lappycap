import type { Scene } from '../types';

// High-energy psychedelic chaos — rapid mutations, neon explosions, sensory overload
// Best with: drum & bass, hardstyle, psytrance, breakcore 130-170 BPM
export const neonMeltdown: Scene = {
  name: 'Neon Meltdown',
  description: 'High-energy psychedelic chaos for fast electronic music',
  bpmRange: [130, 170],
  blendDuration: 4,
  cycleDuration: 18,
  order: 'shuffle',
  presetNames: [
    // Psychedelic chaos
    'Flexi - psychenapping',
    'Redi Jedi - i dont think those were portabello mushrooms',
    'PieturP - triptrap_(ultimate-trip-mix)',
    'Cope - The Neverending Explosion of Red Liquid Fire',
    'martin - extreme heat',
    'martin - ludicrous speed',

    // Neon / electric
    'flexi + fishbrain - neon mindblob grafitti',
    'EVET - RGB Singularity',
    'GreatWho - Lasershow',
    'flexi - bouncing balls [double mindblob gastrointestinal mix]',
    'Flexi - mindblob mix',
    'flexi - Mindblob',

    // Explosive / high-speed
    'Rovastar - Explosive Minds',
    'Geiss - Brain Zoom 4',
    'martin - chain breaker',
    'martin - bring up the big guns',
    'Flexi, Geiss and Rovastar - chaos layered tokamak',
    'Geiss, Flexi + Stahlregen - Thumbdrum Tokamak [crossfiring aftermath jelly mashup]',
    'Stahlregen & Boz + Eo.S + Geiss + Phat + Rovastar + Zylot - Machine Code [Jelly]',
    'Stahlregen + martin + others - Psychedelic Metal Flower',
  ],
};
