import type { Scene } from '../types';

// Hypnotic spirals, mandalas, and kaleidoscopic geometry — meditative and mesmerizing
// Best with: techno, minimal, trance, progressive house 110-130 BPM
export const fractalCathedral: Scene = {
  name: 'Fractal Cathedral',
  description: 'Hypnotic spirals and meditative geometry for techno and trance',
  bpmRange: [110, 130],
  blendDuration: 8,
  cycleDuration: 35,
  order: 'shuffle',
  presetNames: [
    // Spirals and mandalas
    'Flexi - predator-prey-spirals',
    'Flexi - predator-prey-spirals [stahlregens gelatine finish]',
    'flexi - swing out on the spiral',
    'Geiss - Spiral Artifact',
    'Krash + Illusion - Spiral Movement',
    'Phat+fiShbRaiN+Eo.S_Mandala_Chasers_remix',
    'flexi - jelly fish mandala',

    // Kaleidoscopic / stained glass
    'Eo.S. + Zylot - skylight (Stained Glass Majesty mix)',
    'Rovastar + Geiss - Hyperkaleidoscope Glow 2 motion blur (Jelly)',
    'Cope - Passage (mandala mix)',
    'Geiss - Myriad Mosaics',

    // Fractal structures
    'Rovastar + Loadus + Geiss - FractalDrop (Triple Mix)',
    'Rovastar + Loadus + Geiss - Tone-mapped FractalDrop 7c',
    'Flexi - smashing fractals 2.0',
    'Flexi - smashing fractals [acid etching mix]',
    'martin - mandelbox explorer - high speed demo version',
    'Geiss - Reaction Diffusion 3',
    'Zylot - Star Ornament',
  ],
};
