import { describe, expect, it } from 'vitest';
import {
  calculateCompressionCost,
  calculateDropperCost,
  calculatePrestigeGain,
  calculateUpgradeCost,
  isPowderTierUnlocked
} from '../src/simulation/economy';

describe('economy formulas', () => {
  it('preserves upgrade cost progression', () => {
    const config = {
      key: 'gravity',
      name: 'Gravity Well',
      description: '',
      baseCost: 50,
      costMult: 2
    };
    expect(calculateUpgradeCost(config, 0)).toBe(50);
    expect(calculateUpgradeCost(config, 3)).toBe(400);
  });

  it('preserves dropper scaling by tier and level', () => {
    expect(calculateDropperCost(0, 0)).toBe(40);
    expect(calculateDropperCost(2, 2)).toBe(346);
  });

  it('clamps compression cost and applies efficiency', () => {
    const recipe = { from: 0, to: 1, baseCost: 18, output: 1 };
    expect(calculateCompressionCost(recipe, 1)).toBe(18);
    expect(calculateCompressionCost(recipe, 2)).toBe(9);
    expect(calculateCompressionCost(recipe, 100)).toBe(2);
  });

  it('calculates prestige gain from lifetime dust', () => {
    expect(calculatePrestigeGain(0)).toBe(0);
    expect(calculatePrestigeGain(800)).toBe(2);
    expect(calculatePrestigeGain(-1)).toBe(0);
  });

  it('unlocks base powder and gates later tiers', () => {
    expect(isPowderTierUnlocked(0, [])).toBe(true);
    expect(isPowderTierUnlocked(2, [true, false])).toBe(false);
    expect(isPowderTierUnlocked(2, [true, true])).toBe(true);
  });
});
