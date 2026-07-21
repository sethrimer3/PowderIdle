import { describe, expect, it } from 'vitest';
import {
  addToInventory,
  calculateCompositeMass,
  consumeFromInventory,
  takeFromInventory
} from '../src/state/inventories';
import type { PowderEntity } from '../src/types/game';

const entity = (id: number, mass = 1): PowderEntity => ({
  id,
  type: 0,
  color: '#fff',
  mass,
  lineage: [id],
  contents: [],
  origin: 'test',
  metadata: {}
});

describe('entity inventories', () => {
  it('preserves object identity through add and consume', () => {
    const inventory: PowderEntity[] = [];
    const grain = entity(1);
    addToInventory(inventory, grain);
    expect(consumeFromInventory(inventory, 1)).toBe(grain);
    expect(inventory).toHaveLength(0);
  });

  it('does not mutate inventory for a missing identity', () => {
    const inventory = [entity(1)];
    expect(consumeFromInventory(inventory, 2)).toBeNull();
    expect(inventory).toHaveLength(1);
  });

  it('takes a bounded FIFO batch', () => {
    const inventory = [entity(1), entity(2), entity(3)];
    expect(takeFromInventory(inventory, 2).map(({ id }) => id)).toEqual([1, 2]);
    expect(inventory.map(({ id }) => id)).toEqual([3]);
  });

  it('calculates composite mass with the legacy empty fallback', () => {
    expect(calculateCompositeMass([entity(1, 2), entity(2, 3)])).toBe(5);
    expect(calculateCompositeMass([])).toBe(1);
  });
});
