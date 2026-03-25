import type { Scene } from '../types';

// Slow morphing blobs, organic fluid shapes, lava lamp vibes
// Best with: lo-fi, chillhop, ambient dub, downtempo 60-100 BPM
export const lavaLounge: Scene = {
  name: 'Lava Lounge',
  description: 'Lava lamp blobs and slow organic morphing',
  bpmRange: [60, 100],
  blendDuration: 12,
  cycleDuration: 50,
  order: 'shuffle',
  presetNames: [
    // Organic blobs / fluid morphing
    'flexi + amandio c - organic',
    'flexi + amandio c - organic [random mashup]',
    'flexi + amandio c - organic12-3d-2.milk',
    'Geiss - Reaction Diffusion 2',
    'Geiss - Reaction Diffusion 3 (Lichen Mix)',
    'Rovastar - Oozing Resistance',
    'orb - toxic goo',
    'Geiss - Cauldron - painterly (saturation remix)',
    'Geiss - Cauldron - painterly 2 (saturation remix)',

    // Slow fluid / painterly
    'cope + martin - mother-of-pearl',
    'cope, martin + flexi - the slickery of alternative varnish',
    'Flexi - truly soft piece of software - this is generic texturing (Jelly) ',
    'Geiss - Skin Dots Multi-layer 3',
    'Aderrasi - Potion of Spirits',
    'Aderrasi - Songflower (Moss Posy)',

    // Gentle morphing / flowing
    'Geiss - Game of Life 3',
    'DemonLD_-_Toxic_water_diffusion threx angela vs debi brown (nice)',
    'Rovastar - Trippy Sperm (Jelly)',
    'ORB - Magma Pool',
    'martin - mucus cervix',
  ],
};
