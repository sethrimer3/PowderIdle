import type { CompressionRecipe, UpgradeConfig } from '../types/game';

export function calculateUpgradeCost(config: UpgradeConfig, level: number): number {
  return Math.floor(config.baseCost * config.costMult ** Math.max(0, level));
}

export function calculateDropperCost(index: number, level: number): number {
  return Math.floor(40 * (index + 1) * 1.7 ** Math.max(0, level));
}

export function calculateCompressionCost(
  recipe: CompressionRecipe,
  efficiency: number
): number {
  if (efficiency <= 0) return Math.max(1, Math.round(recipe.baseCost));
  return Math.max(2, Math.round(recipe.baseCost / efficiency));
}

export function calculatePrestigeGain(totalDustEarned: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalDustEarned) / 200));
}

export function isPowderTierUnlocked(index: number, tierUpgrades: readonly boolean[]): boolean {
  return index === 0 || tierUpgrades[index - 1] === true;
}
