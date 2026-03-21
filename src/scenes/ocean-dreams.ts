import type { Scene } from '../types';

// Fluid, deep, serene — slow-moving waves and breathing light
// Best with: deep ambient, drone, sleep sounds, 60-80 BPM
export const oceanDreams: Scene = {
  name: 'Ocean Dreams',
  description: 'Fluid deep blue waves and serene breathing light for sleep and ambient',
  bpmRange: [60, 80],
  blendDuration: 12,
  cycleDuration: 45,
  order: 'sequential',
  presetNames: [
    // Deep fluid / watery
    'Eo.S. - flüssig 01',
    'Eo.S. - flüssig 02',
    'Eo.S. - flüssig 03',
    'Eo.S. - waterfall',
    'Flexi - bubbles',

    // Slow breathing light
    'martin - mellow',
    'Martin - Mellow Vibe',
    'cope + flexi - in the zone',
    'Cope - Warp Drive',
    'Flexi - HD DNA',

    // Serene / dreamlike
    'Flexi - A New Machine Part 1',
    'Flexi - A New Machine Part 2',
    'martin - lazure',
    'martin - blue sky',
    'martin - trance experience',

    // Ambient glow
    'Geiss - Distant Shores',
    'Rovastar - Reverie',
    'ORB - Pastel Primer',
    'fiShbRaiN + Rovastar - Peacefull [Fly away]',
    'Stahlregen - Deep Horizon',
  ],
};
