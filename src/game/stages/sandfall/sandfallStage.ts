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

export interface SandfallState {
  lifetimeCreated: number;
  activeIds: EntityId[];
  outputIds: EntityId[];
  castCooldown: number;
  autoCastElapsed: number;
}
export interface SandfallSave extends SandfallState {}
export class SandfallStage
  implements StageSimulation<SandfallState, SandfallSave>
{
  readonly state: SandfallState = {
    lifetimeCreated: 0,
    activeIds: [],
    outputIds: [],
    castCooldown: 0,
    autoCastElapsed: 0,
  };
  private readonly physics: SandfallPhysics;
  constructor(
    readonly definition: StageDefinition,
    private readonly matter: MatterStore,
    private readonly upgradeValue: (
      id: StageUpgradeId,
      upgrades: StageUpdateContext["upgrades"],
    ) => number,
  ) {
    const settings = definition.settings ?? {};
    this.physics = new SandfallPhysics(matter, {
      width: settings.width ?? 48,
      height: settings.height ?? 48,
      funnelMinX: settings.funnelMinX ?? 21,
      funnelMaxX: settings.funnelMaxX ?? 26,
      gravity: 1,
      maxStepsPerUpdate: 6,
    });
  }
  cast(count: number, x = 24, cooldown = 0): EntityId[] {
    if (this.state.castCooldown > 0) return [];
    const ids: EntityId[] = [];
    for (let i = 0; i < count; i++) {
      const id = this.matter.create(
        "sand",
        { kind: "stage", stageId: this.definition.id, slot: "active" },
        this.definition.id,
        { x: Math.max(3, Math.min(44, x + i - (count - 1) / 2)), y: 3 },
      );
      this.state.activeIds.push(id);
      this.state.lifetimeCreated++;
      ids.push(id);
    }
    this.state.castCooldown = Math.max(0, cooldown);
    return ids;
  }
  update(context: StageUpdateContext): void {
    const gravity = Math.max(0.01, this.upgradeValue("gravity", context.upgrades));
    this.state.castCooldown = Math.max(0, this.state.castCooldown - context.dt);
    this.physics.setGravity(gravity);
    this.physics.update(this.state.activeIds, context.dt, (id) =>
      this.queue(id),
    );
    if (context.upgrades["auto-cast"] > 0) {
      this.state.autoCastElapsed += context.dt;
      if (this.state.autoCastElapsed >= 1) {
        this.state.autoCastElapsed -= 1;
        this.cast(1);
      }
    }
  }
  reset(): void {
    this.state.lifetimeCreated = 0;
    this.state.activeIds = [];
    this.state.outputIds = [];
    this.state.castCooldown = 0;
    this.state.autoCastElapsed = 0;
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
    });
  }
  removeOutput(id: EntityId): void {
    const index = this.state.outputIds.indexOf(id);
    if (index >= 0) this.state.outputIds.splice(index, 1);
  }
  private queue(id: EntityId): void {
    const index = this.state.activeIds.indexOf(id);
    if (index < 0) return;
    this.matter.move(
      id,
      { kind: "stage", stageId: this.definition.id, slot: "active" },
      { kind: "stage", stageId: this.definition.id, slot: "output" },
    );
    this.state.activeIds.splice(index, 1);
    this.state.outputIds.push(id);
  }
}
