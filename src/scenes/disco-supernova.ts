import type { Scene } from '../types';

// Fun, colorful, danceable — disco balls, glowing particles, and liquid light shows
// Best with: disco, house, funk, pop, synthwave 115-135 BPM
export const discoSupernova: Scene = {
  name: 'Disco Supernova',
  description: 'Fun party visuals for disco, house, and funk',
  bpmRange: [115, 135],
  blendDuration: 5,
  cycleDuration: 22,
  order: 'shuffle',
  presetNames: [
    // Disco / dance energy
    'martin - disco mix 4',
    'Martin - disco mix 3 -fast',
    'Martin - disco mix 6',
    'martin - fruit machine',
    'martin - move this body',
    'martin - glassball dance',

    // Colorful / glowing
    'Eo.S. - glowsticks v2 03 music',
    'Eo.S. - glowsticks v2 05 and proton lights (+Krash′s beat code) _Phat_remix02b',
    'EVET + Flexi - Rainbox Splash Poolz',
    'Zylot - Paint Spill (Music Reactive Paint Mix)',
    'flexi - bouncing balls [double mindblob neon mix]',
    'ORB - Pastel Primer',

    // Party sparkle / stars
    'Fumbling_Foo & Flexi, Martin, Orb, Unchained - Star Nova v7b',
    'Zylot - True Visionary (Final Mix)',
    'martin - into the fireworks',
    'Flexi - mindblob [shiny mix]',
    'cope + martin - mother-of-pearl',
    'fiShbRaiN - toffee cream and icing sugar',
    'martin - crystal palace',
  ],
};
