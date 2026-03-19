import type { Scene } from '../types';
import { sundayMorningVibes } from './sunday-morning-vibes';

export const scenes: Scene[] = [
  sundayMorningVibes,
];

export function getScene(name: string): Scene | undefined {
  return scenes.find(s => s.name === name);
}
