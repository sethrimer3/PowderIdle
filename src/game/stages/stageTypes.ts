import type { EntityId, MaterialType, StageId } from "../matter/matterTypes";

export type CompressionPhase =
  | "gathering"
  | "ready"
  | "levitating"
  | "aligning"
  | "compressing"
  | "impact"
  | "revealing"
  | "releasing"
  | "cooldown";
export interface GridPosition {
  col: number;
  row: number;
}
export type StageUnlockCondition =
  | { kind: "initial" }
  | { kind: "disabled" }
  | {
      kind: "lifetime-material";
      stageId: StageId;
      material: MaterialType;
      count: number;
    };
export interface StageDefinition {
  id: StageId;
  name: string;
  order: number;
  gridPosition: GridPosition;
  implemented: boolean;
  inputMaterial: MaterialType | null;
  outputMaterial: MaterialType;
  unlockCondition: StageUnlockCondition;
  connectionTargets: StageId[];
  settings?: Record<string, number>;
}
export interface StageConnection {
  id: string;
  from: StageId;
  to: StageId;
  duration: number;
}
export interface StageTransfer {
  id: string;
  entityId: EntityId;
  connectionId: string;
  progress: number;
}
export type StageUpgradeId =
  | "manual-cast-count"
  | "cast-cooldown"
  | "gravity"
  | "output-throughput"
  | "auto-cast"
  | "ritual-speed"
  | "reservoir-capacity"
  | "release-speed"
  | "auto-ritual";
export interface StageUpgradeDefinition {
  id: StageUpgradeId;
  stageId: StageId;
  baseValue: number;
  perLevel: number;
  maxLevel: number;
}
export interface StageConfig {
  schemaVersion: 2;
  camera: { transitionDuration: number; padding: number };
  stages: StageDefinition[];
  connections: StageConnection[];
  ritualTimings: Record<
    Exclude<CompressionPhase, "gathering" | "ready">,
    number
  >;
  upgrades: StageUpgradeDefinition[];
}
export interface StageUpdateContext {
  dt: number;
  upgrades: Readonly<Record<StageUpgradeId, number>>;
}
export interface StageRenderContext {
  readonly phaseAlpha: number;
}
export interface StagePointerInput {
  x: number;
  y: number;
  kind: "mouse" | "touch";
}
export interface StageSimulation<State, SaveData> {
  readonly definition: StageDefinition;
  readonly state: State;
  update(context: StageUpdateContext): void;
  render(context: StageRenderContext): void;
  acceptEntity(
    entityId: EntityId,
    upgrades: Readonly<Record<StageUpgradeId, number>>,
  ): boolean;
  drainOutputEntities(): readonly EntityId[];
  handlePointer?(input: StagePointerInput): boolean;
  serialize(): SaveData;
  hydrate(data: SaveData): void;
}
