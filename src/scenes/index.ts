import type { Scene } from '../types';
import { sundayMorningVibes } from './sunday-morning-vibes';
import { deepSpaceRadio } from './deep-space-radio';
import { fractalCathedral } from './fractal-cathedral';
import { discoSupernova } from './disco-supernova';
import { neonMeltdown } from './neon-meltdown';
import { theDarkForge } from './the-dark-forge';
import { psychWard } from './psych-ward';
import { oceanDreams } from './ocean-dreams';
import { lavaLounge } from './lava-lounge';
import { slowBurn } from './slow-burn';
import { silkDreams } from './silk-dreams';

export const scenes: Scene[] = [
  sundayMorningVibes,
  deepSpaceRadio,
  fractalCathedral,
  discoSupernova,
  neonMeltdown,
  theDarkForge,
  psychWard,
  oceanDreams,
  lavaLounge,
  slowBurn,
  silkDreams,
];

export function getScene(name: string): Scene | undefined {
  return scenes.find(s => s.name === name);
}
