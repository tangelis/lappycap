import type { Scene } from '../types';
import { sundayMorningVibes } from './sunday-morning-vibes';
import { deepSpaceRadio } from './deep-space-radio';
import { fractalCathedral } from './fractal-cathedral';
import { discoSupernova } from './disco-supernova';
import { neonMeltdown } from './neon-meltdown';
import { theDarkForge } from './the-dark-forge';

export const scenes: Scene[] = [
  sundayMorningVibes,
  deepSpaceRadio,
  fractalCathedral,
  discoSupernova,
  neonMeltdown,
  theDarkForge,
];

export function getScene(name: string): Scene | undefined {
  return scenes.find(s => s.name === name);
}
