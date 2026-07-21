import type { LayerState, StrataLayer } from '../types/game';

export function addLayerProgress(
  states: LayerState[],
  layers: readonly StrataLayer[],
  amount: number,
  lanternLevel: number
): void {
  if (amount <= 0) return;
  const amplified = amount * (1 + Math.max(0, lanternLevel) * 0.25);
  let target = states.findIndex((state) => state.unlocked && !state.completed);
  if (target < 0) {
    target = states.findIndex((state) => !state.unlocked);
    if (target >= 0) states[target]!.unlocked = true;
  }
  const state = states[target];
  const layer = layers[target];
  if (!state || !layer) return;
  state.progress = Math.min(layer.requirement, state.progress + amplified);
  if (state.progress >= layer.requirement) {
    state.completed = true;
    const next = states[target + 1];
    if (next) next.unlocked = true;
  }
}
