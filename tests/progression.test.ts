import { describe, expect, it } from 'vitest';
import { addLayerProgress } from '../src/simulation/progression';
import type { LayerState, StrataLayer } from '../src/types/game';

const layers: StrataLayer[] = [
  {
    key: 'surface',
    name: 'Surface',
    requirement: 100,
    dustBonus: 0.1,
    gravityBonus: 0.1,
    color: '#000',
    description: ''
  },
  {
    key: 'deep',
    name: 'Deep',
    requirement: 200,
    dustBonus: 0.2,
    gravityBonus: 0.2,
    color: '#111',
    description: ''
  }
];

describe('layer progression', () => {
  it('applies lantern amplification and unlocks the next layer', () => {
    const states: LayerState[] = [
      { unlocked: true, completed: false, progress: 0 },
      { unlocked: false, completed: false, progress: 0 }
    ];
    addLayerProgress(states, layers, 80, 1);
    expect(states[0]).toEqual({ unlocked: true, completed: true, progress: 100 });
    expect(states[1]?.unlocked).toBe(true);
  });
});
