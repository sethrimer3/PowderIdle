import type { EntityId } from "../../matter/matterTypes";
import { MatterStore } from "../../matter/matterStore";
import type {
  StageDefinition,
  StageRenderContext,
  StageSimulation,
  StageUpdateContext,
  StageUpgradeId,
} from "../stageTypes";
import { SandfallPhysics } from "./sandfallPhysics";
import { detectClumps } from "./clumpDetection";

export const CLUMP_TARGET = 100;
export const CLUMP_THRESHOLD = 2.5;
const EXPLOSION_RADIUS = 14;
const EXPLOSION_STRENGTH = 26;
const EXPLOSION_MAX_IMPULSE = 9;

export interface SandfallState {
  lifetimeCreated: number;
  activeIds: EntityId[];
  outputIds: EntityId[];
  castCooldown: number;
  autoCastElapsed: number;
  stoneMotesCollected: number;
}
export interface SandfallSave extends SandfallState {}
export interface SandCastEvent {
  entityIds: readonly EntityId[];
  x: number;
  automatic: boolean;
}
export class SandfallStage
  implements StageSimulation<SandfallState, SandfallSave>
{
  readonly state: SandfallState = {
    lifetimeCreated: 0,
    activeIds: [],
    outputIds: [],
    castCooldown: 0,
    autoCastElapsed: 0,
    stoneMotesCollected: 0,
  };
  private readonly physics: SandfallPhysics;
  private readonly pendingCastEvents: SandCastEvent[] = [];
  private readonly width: number;
  private readonly height: number;
  constructor(
    readonly definition: StageDefinition,
    private readonly matter: MatterStore,
    private readonly upgradeValue: (
      id: StageUpgradeId,
      upgrades: StageUpdateContext["upgrades"],
    ) => number,
  ) {
    const settings = definition.settings ?? {};
    this.width = settings.width ?? 48;
    this.height = settings.height ?? 48;
    this.physics = new SandfallPhysics(matter, {
      width: this.width,
      height: this.height,
      gravity: 1,
    });
  }
  cast(count: number, x = 24, y = 4, cooldown = 0, automatic = false): EntityId[] {
    if (this.state.castCooldown > 0) return [];
    const ids: EntityId[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.matter.create(
        "sand",
        { kind: "stage", stageId: this.definition.id, slot: "active" },
        this.definition.id,
        {
          x: Math.max(3, Math.min(this.width - 4, x + i * 0.6 - (count - 1) * 0.3)),
          y: Math.max(2, Math.min(this.height - 4, y)),
        },
      );
      this.state.activeIds.push(id);
      this.state.lifetimeCreated++;
      ids.push(id);
    }
    this.state.castCooldown = Math.max(0, cooldown);
    if (ids.length) {
      if (this.pendingCastEvents.length >= 24) this.pendingCastEvents.shift();
      this.pendingCastEvents.push({ entityIds: ids, x, automatic });
    }
    return ids;
  }
  update(context: StageUpdateContext): void {
    const gravity = Math.max(0.01, this.upgradeValue("gravity", context.upgrades));
    this.state.castCooldown = Math.max(0, this.state.castCooldown - context.dt);
    this.physics.setGravity(gravity);
    this.physics.update(this.state.activeIds, context.dt);
    this.processClumps();
    const autoCast = this.upgradeValue("auto-cast", context.upgrades);
    if (autoCast > 0) {
      this.state.autoCastElapsed += context.dt;
      if (this.state.autoCastElapsed >= 1) {
        this.state.autoCastElapsed -= 1;
        this.cast(
          Math.max(1, Math.floor(autoCast)),
          24,
          4,
          Math.max(0.02, this.upgradeValue("cast-cooldown", context.upgrades)),
          true,
        );
      }
    }
  }
  reset(): void {
    this.state.lifetimeCreated = 0;
    this.state.activeIds = [];
    this.state.outputIds = [];
    this.state.castCooldown = 0;
    this.state.autoCastElapsed = 0;
    this.state.stoneMotesCollected = 0;
    this.pendingCastEvents.splice(0);
  }
  drainCastEvents(): SandCastEvent[] {
    return this.pendingCastEvents.splice(0);
  }
  render(_context: StageRenderContext): void {}
  acceptEntity(_entityId: EntityId): boolean {
    return false;
  }
  drainOutputEntities(): readonly EntityId[] {
    return this.state.outputIds;
  }
  serialize(): SandfallSave {
    return {
      ...this.state,
      activeIds: [...this.state.activeIds],
      outputIds: [...this.state.outputIds],
    };
  }
  hydrate(data: SandfallSave): void {
    Object.assign(this.state, data, {
      activeIds: [...data.activeIds],
      outputIds: [...data.outputIds],
      stoneMotesCollected: data.stoneMotesCollected ?? 0,
    });
    this.pendingCastEvents.splice(0);
  }
  removeOutput(id: EntityId): void {
    const index = this.state.outputIds.indexOf(id);
    if (index >= 0) this.state.outputIds.splice(index, 1);
  }
  private processClumps(): void {
    if (this.state.activeIds.length < CLUMP_TARGET) return;
    const motes = this.state.activeIds.map((id) => {
      const entity = this.matter.get(id);
      return { id, x: entity.x, y: entity.y };
    });
    const clumps = detectClumps(motes, CLUMP_THRESHOLD);
    for (const clump of clumps) {
      if (clump.length >= CLUMP_TARGET)
        this.convertClump([...clump].sort((a, b) => a - b).slice(0, CLUMP_TARGET));
    }
  }
  private convertClump(ids: EntityId[]): void {
    let cx = 0,
      cy = 0;
    for (const id of ids) {
      const entity = this.matter.get(id);
      cx += entity.x;
      cy += entity.y;
    }
    cx /= ids.length;
    cy /= ids.length;
    const stoneId = this.matter.compose({
      material: "stone",
      inputMaterial: "sand",
      inputIds: ids,
      expectedOwner: { kind: "stage", stageId: this.definition.id, slot: "active" },
      outputOwner: { kind: "stage", stageId: this.definition.id, slot: "output" },
      origin: this.definition.id,
    });
    this.matter.setPosition(stoneId, cx, cy);
    const removed = new Set(ids);
    this.state.activeIds = this.state.activeIds.filter((id) => !removed.has(id));
    this.state.outputIds.push(stoneId);
    this.state.stoneMotesCollected++;
    this.applyExplosionImpulse(cx, cy, removed);
  }
  private applyExplosionImpulse(cx: number, cy: number, excluded: Set<EntityId>): void {
    for (const id of this.state.activeIds) {
      if (excluded.has(id)) continue;
      const entity = this.matter.get(id),
        dx = entity.x - cx,
        dy = entity.y - cy,
        dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > EXPLOSION_RADIUS || dist < 0.0001) continue;
      const impulse = Math.min(EXPLOSION_MAX_IMPULSE, EXPLOSION_STRENGTH / dist);
      this.matter.setVelocity(
        id,
        entity.vx + (dx / dist) * impulse,
        entity.vy + (dy / dist) * impulse,
      );
    }
  }
}
