import type { MatterStore } from "../matter/matterStore";
import type { EntityId } from "../matter/matterTypes";
import type { StageConfig, StageTransfer } from "./stageTypes";
import { stageWorldOrigin } from "./stageConfig";

export interface VisualMote {
  entityId: EntityId;
  x: number;
  y: number;
  seed: number;
}

export function reservoirPosition(
  index: number,
  entityId: EntityId,
): { x: number; y: number } {
  const cellsPerLayer = 38 * 10;
  const layer = Math.floor(index / cellsPerLayer);
  const local = index % cellsPerLayer;
  const column = local % 38;
  const row = Math.floor(local / 38);
  const offset = layer % 2 === 0 ? 0 : 0.38;
  const jitter = (((entityId * 13) % 7) - 3) * 0.05;
  return {
    x: Math.max(4, Math.min(43, 5 + column + offset + jitter)),
    y: Math.max(33, Math.min(43, 43 - row - layer * 0.18)),
  };
}

export function reservoirVisualModel(
  ids: readonly EntityId[],
  matter: MatterStore,
  visibleLimit = 180,
): { motes: VisualMote[]; overflow: number } {
  const visible = ids.slice(0, visibleLimit).map((entityId) => {
    const entity = matter.get(entityId);
    return { entityId, x: entity.x, y: entity.y, seed: entity.visualSeed };
  });
  return { motes: visible, overflow: Math.max(0, ids.length - visible.length) };
}

export interface TransferVisual {
  transferId: string;
  entityId: EntityId;
  x: number;
  y: number;
  progress: number;
}

export function transferVisualModel(
  config: StageConfig,
  transfers: readonly StageTransfer[],
): TransferVisual[] {
  return transfers.map((transfer) => {
    const connection = config.connections.find((item) => item.id === transfer.connectionId);
    if (!connection) throw new Error(`Missing visual connection ${transfer.connectionId}`);
    const fromDefinition = config.stages.find((stage) => stage.id === connection.from);
    const toDefinition = config.stages.find((stage) => stage.id === connection.to);
    if (!fromDefinition || !toDefinition) throw new Error("Visual connection endpoint is missing");
    const from = stageWorldOrigin(fromDefinition);
    const to = stageWorldOrigin(toDefinition);
    const progress = Math.max(0, Math.min(1, transfer.progress));
    return {
      transferId: transfer.id,
      entityId: transfer.entityId,
      x: from.x + 24 + (to.x - from.x) * progress,
      y: from.y + 47 + (to.y - from.y - 46) * progress,
      progress,
    };
  });
}

export function sandPalette(seed: number, moving: boolean): [number, number, number] {
  const variation = seed % 4;
  const palettes: Array<[number, number, number]> = [
    [239, 195, 104],
    [226, 174, 82],
    [247, 211, 137],
    [205, 157, 83],
  ];
  const base = palettes[variation]!;
  return moving
    ? [Math.min(255, base[0] + 8), Math.min(255, base[1] + 8), base[2]]
    : base;
}

export const VISIBLE_OUTPUT_SLOTS = 32;
export function outputSlot(index: number): { x: number; y: number } {
  const slot = Math.max(0, Math.min(VISIBLE_OUTPUT_SLOTS - 1, index));
  return { x: 7 + (slot % 8) * 4, y: 42 - Math.floor(slot / 8) * 4 };
}
