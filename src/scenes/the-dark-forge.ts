import type { Scene } from '../types';

// Industrial, brooding, metallic — dark tunnels, molten metal, mechanical textures
// Best with: industrial, darkwave, EBM, dark techno, metal 100-140 BPM
export const theDarkForge: Scene = {
  name: 'The Dark Forge',
  description: 'Industrial brooding visuals for dark and heavy music',
  bpmRange: [100, 140],
  blendDuration: 6,
  cycleDuration: 25,
  order: 'sequential',
  presetNames: [
    // Dark / industrial
    'martin - The Bridge of Khazad-Dum',
    'martin - gate to moria',
    'martin - ghost city',
    'martin - city of shadows',
    'shifter - dark tides bdrv mix 2',
    'shifter - dark tides bdrv mix',

    // Metallic / mechanical
    'Martin - acid wiring',
    'martin - resonant twister - steel spring',
    'martin - ice flames',
    'martin - tunnel race',
    'Geiss - 3 layers (Tunnel Mix)',
    '_Geiss - Artifact 01',
    '_Geiss - Artifact 03',

    // Molten / forge
    'ORB - Magma Pool',
    'Rovastar - Oozing Resistance',
    'martin - cherry brain wall mod',
    'martin - witchcraft reloaded',
  ],
};
