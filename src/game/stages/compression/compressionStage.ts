import { MatterStore } from "../../matter/matterStore";
import type { EntityId, MaterialType } from "../../matter/matterTypes";
import type {
  CompressionPhase,
  StageDefinition,
  StageRenderContext,
  StageSimulation,
  StageUpdateContext,
  StageUpgradeId,
} from "../stageTypes";
import {
  compressionScale,
  readablePhaseSpeed,
  ritualTarget,
  type CompressionBatch,
} from "./compressionRitual";
import { outputSlot, reservoirPosition } from "../stageVisualModels";

export interface CompressionState {
  reservoirIds: EntityId[];
  stoneReservoirIds: EntityId[];
  outputIds: EntityId[];
  phase: CompressionPhase;
  batch: CompressionBatch | null;
  nextRitualId: number;
  lifetimeQuartzCreated: number;
}
export interface CompressionSave {
  state: CompressionState;
}
function nextMaterial(input: MaterialType): MaterialType {
  return input === "stone" ? "quartz" : "stone";
}
const order: CompressionPhase[] = [
  "levitating",
  "aligning",
  "compressing",
  "impact",
  "revealing",
  "releasing",
  "cooldown",
  "gathering",
];
export class CompressionStage
  implements StageSimulation<CompressionState, CompressionSave>
{
  readonly state: CompressionState = {
    reservoirIds: [],
    stoneReservoirIds: [],
    outputIds: [],
    phase: "gathering",
    batch: null,
    nextRitualId: 1,
    lifetimeQuartzCreated: 0,
  };
  private readonly pendingEvents: {
    id: string;
    ritualId: string;
    stoneId: EntityId;
  }[] = [];
  private readonly pendingInvocations: Array<{
    ritualId: string;
    automatic: boolean;
  }> = [];
  constructor(
    readonly definition: StageDefinition,
    private readonly matter: MatterStore,
    private readonly timings: Record<CompressionPhase, number>,
    private readonly upgradeValue: (
      id: StageUpgradeId,
      upgrades: StageUpdateContext["upgrades"],
    ) => number,
  ) {}
  get recipeCount(): number {
    return this.definition.settings?.recipeInputCount ?? 100;
  }
  capacity(upgrades: StageUpdateContext["upgrades"]): number {
    return Math.max(0, Math.floor(this.upgradeValue("reservoir-capacity", upgrades)));
  }
  acceptEntity(
    entityId: EntityId,
    upgrades: StageUpdateContext["upgrades"],
  ): boolean {
    const entity = this.matter.get(entityId);
    if (
      entity.owner.kind !== "stage" ||
      entity.owner.stageId !== this.definition.id ||
      entity.owner.slot !== "reservoir"
    ) return false;
    if (entity.material === "sand") {
      if (
        this.state.reservoirIds.length >= this.capacity(upgrades) ||
        this.state.reservoirIds.includes(entityId)
      ) return false;
      this.state.reservoirIds.push(entityId);
    } else if (entity.material === "stone") {
      if (
        this.state.stoneReservoirIds.length >= this.capacity(upgrades) ||
        this.state.stoneReservoirIds.includes(entityId)
      ) return false;
      this.state.stoneReservoirIds.push(entityId);
    } else return false;
    this.settleReservoir();
    return true;
  }
  acceptTransferredEntity(
    entityId: EntityId,
    transferId: string,
    upgrades: StageUpdateContext["upgrades"],
  ): boolean {
    const entity = this.matter.get(entityId);
    if (
      entity.owner.kind !== "transfer" ||
      entity.owner.transferId !== transferId
    ) return false;
    if (entity.material === "sand") {
      if (
        this.state.reservoirIds.length >= this.capacity(upgrades) ||
        this.state.reservoirIds.includes(entityId)
      ) return false;
      this.matter.move(entityId, entity.owner, {
        kind: "stage",
        stageId: this.definition.id,
        slot: "reservoir",
      });
      this.state.reservoirIds.push(entityId);
    } else if (entity.material === "stone") {
      if (
        this.state.stoneReservoirIds.length >= this.capacity(upgrades) ||
        this.state.stoneReservoirIds.includes(entityId)
      ) return false;
      this.matter.move(entityId, entity.owner, {
        kind: "stage",
        stageId: this.definition.id,
        slot: "reservoir",
      });
      this.state.stoneReservoirIds.push(entityId);
    } else return false;
    this.settleReservoir();
    return true;
  }
  update(context: StageUpdateContext): void {
    this.settleReservoir();
    if (
      this.state.phase === "gathering" &&
      (this.state.reservoirIds.length >= this.recipeCount ||
        this.state.stoneReservoirIds.length >= this.recipeCount)
    )
      this.state.phase = "ready";
    if (
      this.state.phase === "ready" &&
      this.upgradeValue("auto-ritual", context.upgrades) > 0
    )
      this.invoke(true);
    const batch = this.state.batch;
    if (!batch || batch.phase === "gathering" || batch.phase === "ready")
      return;
    const speed =
      batch.phase === "releasing"
        ? this.upgradeValue("release-speed", context.upgrades)
        : this.upgradeValue("ritual-speed", context.upgrades);
    batch.elapsed += context.dt * readablePhaseSpeed(
      batch.phase,
      speed,
      this.timings[batch.phase],
    );
    this.updateRitualPositions(batch);
    const duration = this.timings[batch.phase];
    if (batch.elapsed >= duration) this.advance(batch);
  }
  invoke(automatic = false): boolean {
    if (this.state.phase !== "ready") return false;
    let material: MaterialType, source: EntityId[];
    if (this.state.reservoirIds.length >= this.recipeCount) {
      material = "sand";
      source = this.state.reservoirIds;
    } else if (this.state.stoneReservoirIds.length >= this.recipeCount) {
      material = "stone";
      source = this.state.stoneReservoirIds;
    } else return false;
    const ids = source.splice(0, this.recipeCount);
    const ritualId = `ritual-${this.state.nextRitualId++}`;
    const motes = ids.map((entityId, index) => {
      const entity = this.matter.get(entityId),
        target = ritualTarget(entityId, index, ids.length);
      this.matter.move(
        entityId,
        { kind: "stage", stageId: this.definition.id, slot: "reservoir" },
        { kind: "stage", stageId: this.definition.id, slot: "ritual" },
      );
      return {
        entityId,
        startX: entity.x,
        startY: entity.y,
        targetX: target.x,
        targetY: target.y,
      };
    });
    this.state.batch = {
      ritualId,
      phase: "levitating",
      elapsed: 0,
      motes,
      conversionCompleted: false,
      outputStoneId: null,
      outputEventId: null,
      stoneX: 24,
      stoneY: 24,
      material,
    };
    this.state.phase = "levitating";
    if (this.pendingInvocations.length >= 8) this.pendingInvocations.shift();
    this.pendingInvocations.push({ ritualId, automatic });
    return true;
  }
  render(_context: StageRenderContext): void {}
  drainOutputEntities(): readonly EntityId[] {
    return this.state.outputIds;
  }
  drainEvents(): Array<{ id: string; ritualId: string; stoneId: EntityId }> {
    return this.pendingEvents.splice(0);
  }
  drainInvocations(): Array<{ ritualId: string; automatic: boolean }> {
    return this.pendingInvocations.splice(0);
  }
  reset(): void {
    this.state.reservoirIds = [];
    this.state.stoneReservoirIds = [];
    this.state.outputIds = [];
    this.state.phase = "gathering";
    this.state.batch = null;
    this.state.nextRitualId = 1;
    this.state.lifetimeQuartzCreated = 0;
    this.pendingEvents.splice(0);
    this.pendingInvocations.splice(0);
  }
  serialize(): CompressionSave {
    return {
      state: {
        ...this.state,
        reservoirIds: [...this.state.reservoirIds],
        stoneReservoirIds: [...this.state.stoneReservoirIds],
        outputIds: [...this.state.outputIds],
        batch: this.state.batch
          ? {
              ...this.state.batch,
              motes: this.state.batch.motes.map((mote) => ({ ...mote })),
            }
          : null,
      },
    };
  }
  hydrate(data: CompressionSave): void {
    const saved = data.state;
    this.state.reservoirIds = [...saved.reservoirIds];
    this.state.stoneReservoirIds = [...(saved.stoneReservoirIds ?? [])];
    this.state.outputIds = [...saved.outputIds];
    this.state.nextRitualId = Math.max(1, saved.nextRitualId);
    this.state.lifetimeQuartzCreated = saved.lifetimeQuartzCreated ?? 0;
    this.state.batch = saved.batch
      ? {
          ...saved.batch,
          material: saved.batch.material ?? "sand",
          motes: saved.batch.motes.map((mote) => ({ ...mote })),
        }
      : null;
    this.state.phase = saved.phase;
    this.pendingEvents.splice(0);
    this.pendingInvocations.splice(0);
    this.settleReservoir();
  }
  outputPosition(index: number): { x: number; y: number } {
    return outputSlot(index);
  }
  glyphContains(x: number, y: number): boolean {
    const dx = x - 24,
      dy = y - 24;
    return dx * dx + dy * dy <= 36;
  }
  removeOutput(id: EntityId): void {
    const index = this.state.outputIds.indexOf(id);
    if (index >= 0) this.state.outputIds.splice(index, 1);
  }
  peekQuartzOutput(): EntityId | null {
    const pending = this.state.batch?.outputStoneId ?? null;
    for (const id of this.state.outputIds)
      if (id !== pending && this.matter.get(id).material === "quartz") return id;
    return null;
  }
  private settleReservoir(): void {
    for (let index = 0; index < this.state.reservoirIds.length; index++) {
      const id = this.state.reservoirIds[index]!;
      const position = reservoirPosition(index, id);
      this.matter.setPosition(id, position.x, position.y);
    }
    for (let index = 0; index < this.state.stoneReservoirIds.length; index++) {
      const id = this.state.stoneReservoirIds[index]!;
      const position = reservoirPosition(index, id);
      this.matter.setPosition(id, position.x, position.y);
    }
  }
  private updateRitualPositions(batch: CompressionBatch): void {
      const duration = this.timings[batch.phase],
      p = Math.max(0, Math.min(1, batch.elapsed / duration));
    for (let index = 0; index < batch.motes.length; index++) {
      const mote = batch.motes[index]!;
      if (batch.conversionCompleted) break;
      let x = mote.targetX,
        y = mote.targetY;
      if (batch.phase === "levitating") {
        const stagger = ((mote.entityId * 17 + index) % 11) / 70;
        const local = Math.max(0, Math.min(1, (p - stagger) / (1 - stagger)));
        const eased = 1 - (1 - local) ** 3;
        x = mote.startX + (mote.targetX - mote.startX) * eased;
        y = mote.startY + (mote.targetY - mote.startY) * eased;
      } else if (batch.phase === "aligning") {
        const angle = p * 0.35 * (index % 2 === 0 ? 1 : -1);
        const dx = mote.targetX - 24,
          dy = mote.targetY - 24;
        x = 24 + dx * Math.cos(angle) - dy * Math.sin(angle);
        y = 24 + dx * Math.sin(angle) + dy * Math.cos(angle);
      } else if (batch.phase === "compressing") {
        const scale = compressionScale(p);
        const angle = p * p * 1.2 * (index % 2 === 0 ? 1 : -1);
        const dx = mote.targetX - 24,
          dy = mote.targetY - 24;
        x = 24 + (dx * Math.cos(angle) - dy * Math.sin(angle)) * scale;
        y = 24 + (dx * Math.sin(angle) + dy * Math.cos(angle)) * scale;
      }
      this.matter.setPosition(mote.entityId, x, y);
    }
    if (batch.outputStoneId !== null && batch.phase === "releasing") {
      const release = 1 - (1 - p) ** 2,
        batchIndex = this.state.outputIds.indexOf(batch.outputStoneId),
        target = this.outputPosition(Math.max(0, batchIndex));
      batch.stoneX = 24 + (target.x - 24) * release;
      batch.stoneY = 24 + (target.y - 24) * release - Math.sin(release * Math.PI) * 3;
      this.matter.setPosition(batch.outputStoneId, batch.stoneX, batch.stoneY);
    }
  }
  private advance(batch: CompressionBatch): void {
    batch.elapsed = 0;
    if (batch.phase === "impact") this.convert(batch);
    const next = order[order.indexOf(batch.phase) + 1] ?? "gathering";
    batch.phase = next;
    this.state.phase = next;
    if (next === "cooldown" && batch.outputStoneId !== null) {
      const target = this.outputPosition(
        this.state.outputIds.indexOf(batch.outputStoneId),
      );
      this.matter.setPosition(batch.outputStoneId, target.x, target.y);
    }
    if (next === "gathering") {
      this.state.batch = null;
      this.state.phase =
        this.state.reservoirIds.length >= this.recipeCount ||
        this.state.stoneReservoirIds.length >= this.recipeCount
          ? "ready"
          : "gathering";
    }
  }
  private convert(batch: CompressionBatch): void {
    if (batch.conversionCompleted)
      throw new Error(`Ritual ${batch.ritualId} already converted`);
    const ids = batch.motes.map((mote) => mote.entityId);
    if (ids.length !== this.recipeCount || new Set(ids).size !== ids.length)
      throw new Error("Ritual batch is invalid");
    const expected = {
      kind: "stage",
      stageId: this.definition.id,
      slot: "ritual",
    } as const;
    const outputMaterial = nextMaterial(batch.material);
    const stoneId = this.matter.compose({
      material: outputMaterial,
      inputMaterial: batch.material,
      inputIds: ids,
      expectedOwner: expected,
      outputOwner: {
        kind: "stage",
        stageId: this.definition.id,
        slot: "output",
      },
      origin: this.definition.id,
    });
    this.matter.setPosition(stoneId, 24, 24);
    if (outputMaterial === "quartz") this.state.lifetimeQuartzCreated++;
    batch.conversionCompleted = true;
    batch.outputStoneId = stoneId;
    batch.outputEventId = `conversion:${batch.ritualId}`;
    this.state.outputIds.push(stoneId);
    this.pendingEvents.push({
      id: batch.outputEventId,
      ritualId: batch.ritualId,
      stoneId,
    });
  }
}
