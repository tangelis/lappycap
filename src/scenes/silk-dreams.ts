import type { Scene } from '../types';

// Silky smooth flowing textures, soft pastels, dream-like
// Best with: trip-hop, new age, shoegaze, dream pop 70-110 BPM
export const silkDreams: Scene = {
  name: 'Silk Dreams',
  description: 'Flowing silk textures and dreamy soft visuals',
  bpmRange: [70, 110],
  blendDuration: 12,
  cycleDuration: 45,
  order: 'shuffle',
  presetNames: [
    // Soft flowing textures
    'fiShbRaiN - toffee cream and icing sugar',
    'ORB - Pastel Primer',
    'ORB - Waaa',
    'Martin - charisma',
    'Martin - liquid arrows',
    'Martin - bombyx mori mix2',
    'martin - bombyx mori',
    'martin - bombyx mori [flexi′s logarithmic edit]',

    // Dreamy / ethereal
    'Flexi + Martin - cascading decay swing',
    'martin - stormy sea (2010 update)',
    'Flexi + Martin - astral projection',
    'suksma - Rovastar - Sunflower Passion (Enlightment Mix)_Phat_edit + flexi und martin shaders - circumflex in character classes in regular expression',
    'Rovastar + Telek - Altars of Madness (Rolling Oceans Mix)',

    // Soft abstractions
    'Flexi - alien fish pond',
    'fishbrain + flexi - stitchcraft',
    'Flexi + stahlregen - jelly showoff parade',
    'Flexi - dimensions, projection and abstraction',
    'cope - strange attractor [flexis let it grow mix] (Jelly 5.56 [volume noise zoom-in])',
  ],
};
