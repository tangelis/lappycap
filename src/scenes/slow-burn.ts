import type { Scene } from '../types';

// Minimal, meditative, barely-there — like staring into a campfire
// Best with: ambient, drone, field recordings, meditation 50-90 BPM
export const slowBurn: Scene = {
  name: 'Slow Burn',
  description: 'Minimal meditative drifts and gentle color washes',
  bpmRange: [50, 90],
  blendDuration: 15,
  cycleDuration: 60,
  order: 'shuffle',
  presetNames: [
    // Slow color washes
    'Aderrasi - Airhandler (Last Breath - Calm)',
    'Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix',
    '_Aderrasi - Wanderer in Curved Space - mash0000 - faclempt kibitzing meshuggana schmaltz (Geiss color mix)',
    'cope - the drain to heaven',
    '_Geiss - Desert Rose 2',
    'Geiss - Desert Rose 4',

    // Gentle abstractions
    'Geiss - Planet 1',
    'martin - satellite view',
    'martin - angel flight',
    'martin - castle in the air',
    'martin - frosty caves 2',
    'martin - glass corridor',
    'martin - infinity (2010 update)',

    // Painterly / impressionist
    'Flexi, martin + geiss - painterly rogue wave strike',
    '_Flexi, martin + geiss - painterly rogue wave strike (color emboss mix)',
    'Geiss - Color Pox (Acid Impression Mix) (color saturation remix)',
    'shifter - feathers (angel wings)_phat_remix relief 2',
    'martin - reflections on black tiles',
  ],
};
