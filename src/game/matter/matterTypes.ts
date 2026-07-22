export type EntityId = number;
export type MaterialType = "sand" | "stone";
export type StageId =
  | "sandfall-atrium"
  | "compression-crucible"
  | `stage-${3 | 4 | 5 | 6 | 7 | 8 | 9}`;
export type MatterOwner =
  | {
      kind: "stage";
      stageId: StageId;
      slot: "active" | "output" | "reservoir" | "ritual";
    }
  | { kind: "transfer"; transferId: string }
  | { kind: "contained"; entityId: EntityId };
export interface MatterEntity {
  id: EntityId;
  material: MaterialType;
  mass: number;
  origin: StageId;
  lineage: EntityId[];
  contents: EntityId[];
  owner: MatterOwner;
  x: number;
  y: number;
  vx: number;
  vy: number;
  movement: number;
  visualSeed: number;
}
export interface MatterSnapshot {
  nextId: number;
  entities: MatterEntity[];
}
