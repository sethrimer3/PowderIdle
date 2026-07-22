import { CHAMBER_SIZE } from "./stageLayout";
import type {
  GridPosition,
  StageConfig,
  StageConnection,
  StageDefinition,
  StageUpgradeId,
} from "./stageTypes";

export interface WorldPoint {
  x: number;
  y: number;
}

export function stageUpgradeValue(
  config: StageConfig,
  levels: Readonly<Record<StageUpgradeId, number>>,
  id: StageUpgradeId,
): number {
  const definition = config.upgrades.find((upgrade) => upgrade.id === id);
  if (!definition) throw new Error(`Missing required stage upgrade ${id}`);
  const rawLevel = levels[id];
  const level = Math.max(
    0,
    Math.min(definition.maxLevel, Number.isFinite(rawLevel) ? Math.floor(rawLevel) : 0),
  );
  return definition.baseValue + definition.perLevel * level;
}

export function stageWorldOrigin(
  definition: Pick<StageDefinition, "gridPosition">,
): WorldPoint {
  return {
    x: definition.gridPosition.col * CHAMBER_SIZE,
    y: definition.gridPosition.row * CHAMBER_SIZE,
  };
}

export function connectionForSource(
  config: StageConfig,
  source: StageDefinition["id"],
): StageConnection | null {
  return config.connections.find((connection) => connection.from === source) ?? null;
}

export function gridCenter(position: GridPosition): WorldPoint {
  return {
    x: position.col * CHAMBER_SIZE + CHAMBER_SIZE / 2,
    y: position.row * CHAMBER_SIZE + CHAMBER_SIZE / 2,
  };
}
