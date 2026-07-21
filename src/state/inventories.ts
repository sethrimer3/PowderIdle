import type { Inventory, PowderEntity } from '../types/game';

export function addToInventory(inventory: Inventory, entity: PowderEntity): PowderEntity {
  inventory.push(entity);
  return entity;
}

export function consumeFromInventory(
  inventory: Inventory,
  entityId: number
): PowderEntity | null {
  const index = inventory.findIndex((entity) => entity.id === entityId);
  if (index < 0) return null;
  return inventory.splice(index, 1)[0] ?? null;
}

export function takeFromInventory(inventory: Inventory, count: number): PowderEntity[] {
  if (count <= 0) return [];
  return inventory.splice(0, Math.min(count, inventory.length));
}

export function calculateCompositeMass(components: readonly PowderEntity[]): number {
  const mass = components.reduce((total, component) => total + component.mass, 0);
  return Number.isFinite(mass) && mass > 0 ? mass : Math.max(1, components.length);
}
