import { computeCameraTarget, type CameraTarget } from "../camera/stageCamera";
import { MatterStore } from "../matter/matterStore";
import type { EntityId, MatterSnapshot, StageId } from "../matter/matterTypes";
import {
  CompressionStage,
  type CompressionSave,
} from "./compression/compressionStage";
import { SandfallStage, type SandfallSave } from "./sandfall/sandfallStage";
import { stageConnection } from "./stageConnections";
import { stageDefinition } from "./stageDefinitions";
import { connectionForSource, stageUpgradeValue } from "./stageConfig";
import type {
  StageConfig,
  StageTransfer,
  StageUpgradeId,
  StageUpdateContext,
} from "./stageTypes";

export interface StageSaveV3 {
  version: 3;
  unlocked: StageId[];
  nextTransferId: number;
  transferBudget: number;
  transfers: StageTransfer[];
  upgradeLevels: Record<StageUpgradeId, number>;
  matter: MatterSnapshot;
  sandfall: SandfallSave;
  compression: CompressionSave;
}
export interface StageResetOptions {
  preservePermanentBonuses: boolean;
}
export interface MaterialEconomyView {
  totalByMaterial: { sand: number; stone: number };
  displayedByMaterial: { sand: number; stone: number };
  spendableByMaterial: { sand: number; stone: number };
  activeByMaterial: { sand: number; stone: number };
  queuedByMaterial: { sand: number; stone: number };
  processingByMaterial: { sand: number; stone: number };
  containedByMaterial: { sand: number; stone: number };
}
export interface StageEvent {
  id: string;
  kind: "stage-unlocked" | "conversion";
  stageId: StageId;
  entityId?: EntityId;
}
const defaultLevels = (): Record<StageUpgradeId, number> => ({
  "manual-cast-count": 0,
  "cast-cooldown": 0,
  gravity: 0,
  "output-throughput": 0,
  "auto-cast": 0,
  "ritual-speed": 0,
  "reservoir-capacity": 0,
  "release-speed": 0,
  "auto-ritual": 0,
});

export class StageController {
  readonly matter = new MatterStore();
  readonly sandfall: SandfallStage;
  readonly compression: CompressionStage;
  readonly unlocked = new Set<StageId>(["sandfall-atrium"]);
  readonly transfers: StageTransfer[] = [];
  private readonly pendingEvents: StageEvent[] = [];
  readonly upgradeLevels = defaultLevels();
  private nextTransferId = 1;
  private transferBudget = 0;
  constructor(readonly config: StageConfig) {
    this.sandfall = new SandfallStage(
      stageDefinition(config, "sandfall-atrium"),
      this.matter,
      (id, levels) => stageUpgradeValue(config, levels, id),
    );
    this.compression = new CompressionStage(
      stageDefinition(config, "compression-crucible"),
      this.matter,
      {
        gathering: Number.POSITIVE_INFINITY,
        ready: Number.POSITIVE_INFINITY,
        ...config.ritualTimings,
      },
      (id, levels) => stageUpgradeValue(config, levels, id),
    );
    for (const id of Object.keys(this.upgradeLevels) as StageUpgradeId[])
      stageUpgradeValue(config, this.upgradeLevels, id);
  }
  castSand(requestedCount?: number, x = 24): readonly EntityId[] {
    const count = Math.max(1, Math.floor(requestedCount ?? stageUpgradeValue(
      this.config,
      this.upgradeLevels,
      "manual-cast-count",
    )));
    const cooldown = Math.max(0.02, stageUpgradeValue(
      this.config,
      this.upgradeLevels,
      "cast-cooldown",
    ));
    return this.sandfall.cast(count, x, cooldown);
  }
  invokeRitual(): boolean {
    return this.compression.invoke();
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0)
      throw new Error("Stage delta time must be finite and non-negative");
    const context: StageUpdateContext = { dt, upgrades: this.upgradeLevels };
    this.sandfall.update(context);
    this.compression.update({ dt: 0, upgrades: this.upgradeLevels });
    this.checkUnlocks();
    this.startTransfers(dt);
    this.updateTransfers(dt);
    this.compression.update(context);
    this.flushConversionEvents();
    this.validateStageCollections();
    this.matter.assertInvariants();
  }
  cameraTarget(): CameraTarget {
    return computeCameraTarget(
      this.config.stages
        .filter((stage) => this.unlocked.has(stage.id))
        .map((stage) => stage.gridPosition),
      this.config.camera.padding,
    );
  }
  buyUpgrade(id: StageUpgradeId): boolean {
    const definition = this.config.upgrades.find(
      (upgrade) => upgrade.id === id,
    );
    if (!definition) return false;
    const current = this.upgradeLevels[id];
    if (current >= definition.maxLevel) return false;
    this.upgradeLevels[id] = current + 1;
    return true;
  }
  drainEvents(): StageEvent[] {
    return this.pendingEvents.splice(0);
  }
  economyView(): MaterialEconomyView {
    const batch = this.compression.state.batch;
    const ritualSand = batch && !batch.conversionCompleted ? batch.motes.length : 0;
    const activeSand = this.sandfall.state.activeIds.length + this.sandfall.state.outputIds.length;
    const queuedSand = this.transfers.length;
    const reservoirSand = this.compression.state.reservoirIds.length;
    const stone = this.compression.state.outputIds.length;
    const containedSand = this.matter.serialize().entities.filter(
      (entity) => entity.material === "sand" && entity.owner.kind === "contained",
    ).length;
    const displayedSand = activeSand + queuedSand + reservoirSand + ritualSand;
    return {
      totalByMaterial: { sand: displayedSand + containedSand, stone },
      displayedByMaterial: { sand: displayedSand, stone },
      spendableByMaterial: { sand: reservoirSand, stone },
      activeByMaterial: { sand: activeSand, stone: 0 },
      queuedByMaterial: { sand: queuedSand, stone: 0 },
      processingByMaterial: { sand: ritualSand, stone: 0 },
      containedByMaterial: { sand: containedSand, stone: 0 },
    };
  }
  resetForPrestige(_options: StageResetOptions): void {
    this.matter.reset();
    this.sandfall.reset();
    this.compression.reset();
    this.transfers.splice(0);
    this.unlocked.clear();
    this.unlocked.add("sandfall-atrium");
    Object.assign(this.upgradeLevels, defaultLevels());
    this.pendingEvents.splice(0);
    this.nextTransferId = 1;
    this.transferBudget = 0;
  }
  debugSeedOutputSand(count: number): EntityId[] {
    const ids: EntityId[] = [];
    for (let index = 0; index < count; index++) {
      const id = this.matter.create(
        "sand",
        { kind: "stage", stageId: this.sandfall.definition.id, slot: "output" },
        this.sandfall.definition.id,
      );
      this.sandfall.state.outputIds.push(id);
      ids.push(id);
    }
    return ids;
  }
  debugSeedReservoirSand(count: number): EntityId[] {
    const ids: EntityId[] = [];
    for (let index = 0; index < count; index++) {
      const id = this.matter.create(
        "sand",
        { kind: "stage", stageId: this.compression.definition.id, slot: "reservoir" },
        this.sandfall.definition.id,
      );
      if (!this.compression.acceptEntity(id, this.upgradeLevels))
        throw new Error("Debug reservoir seed exceeded configured capacity");
      ids.push(id);
    }
    return ids;
  }
  serialize(): StageSaveV3 {
    return {
      version: 3,
      unlocked: [...this.unlocked],
      nextTransferId: this.nextTransferId,
      transferBudget: this.transferBudget,
      transfers: this.transfers.map((transfer) => ({ ...transfer })),
      upgradeLevels: { ...this.upgradeLevels },
      matter: this.matter.serialize(),
      sandfall: this.sandfall.serialize(),
      compression: this.compression.serialize(),
    };
  }
  hydrate(save: StageSaveV3): void {
    if (save.version !== 3) throw new Error("Unsupported stage save version");
    this.matter.hydrate(save.matter);
    this.unlocked.clear();
    for (const id of save.unlocked) {
      const definition = this.config.stages.find((stage) => stage.id === id);
      if (definition?.implemented) this.unlocked.add(id);
    }
    this.unlocked.add("sandfall-atrium");
    Object.assign(this.upgradeLevels, defaultLevels(), save.upgradeLevels);
    this.sandfall.hydrate(save.sandfall);
    this.compression.hydrate(save.compression);
    this.transfers.splice(0);
    const ids = new Set<string>();
    for (const raw of save.transfers) {
      if (ids.has(raw.id) || !Number.isFinite(raw.progress))
        throw new Error("Invalid or duplicate hydrated transfer");
      const connection = this.config.connections.find(
        (item) => item.id === raw.connectionId,
      );
      if (
        !connection ||
        !this.unlocked.has(connection.to) ||
        !this.matter.has(raw.entityId)
      )
        throw new Error("Hydrated transfer references unavailable state");
      const owner = this.matter.get(raw.entityId).owner;
      if (owner.kind !== "transfer" || owner.transferId !== raw.id)
        throw new Error("Hydrated transfer owner mismatch");
      ids.add(raw.id);
      this.transfers.push({
        ...raw,
        progress: Math.max(0, Math.min(1, raw.progress)),
      });
    }
    const observed = Math.max(
      0,
      ...[...ids].map((id) => Number(id.split("-").pop()) || 0),
    );
    this.nextTransferId = Math.max(save.nextTransferId, observed + 1);
    this.transferBudget = Number.isFinite(save.transferBudget)
      ? Math.max(0, save.transferBudget)
      : 0;
    this.validateStageCollections();
    this.matter.assertInvariants();
  }
  private checkUnlocks(): void {
    const definition = this.compression.definition,
      condition = definition.unlockCondition;
    if (
      condition.kind === "lifetime-material" &&
      this.sandfall.state.lifetimeCreated >= condition.count &&
      !this.unlocked.has(definition.id)
    ) {
      this.unlocked.add(definition.id);
      this.pendingEvents.push({
        id: `unlock:${definition.id}`,
        kind: "stage-unlocked",
        stageId: definition.id,
      });
    }
  }
  private startTransfers(dt: number): void {
    const connection = connectionForSource(this.config, this.sandfall.definition.id);
    if (!connection || !this.unlocked.has(connection.to)) return;
    const throughput = Math.max(0, stageUpgradeValue(
      this.config,
      this.upgradeLevels,
      "output-throughput",
    ));
    this.transferBudget = Math.min(
      throughput,
      this.transferBudget + throughput * dt,
    );
    const capacity = this.compression.capacity(this.upgradeLevels);
    while (
      this.transferBudget >= 1 &&
      this.sandfall.state.outputIds.length &&
      this.compression.state.reservoirIds.length + this.transfers.length <
        capacity
    ) {
      const entityId = this.sandfall.state.outputIds[0]!,
        id = `transfer-${this.nextTransferId++}`;
      this.sandfall.removeOutput(entityId);
      this.matter.move(
        entityId,
        { kind: "stage", stageId: "sandfall-atrium", slot: "output" },
        { kind: "transfer", transferId: id },
      );
      this.transfers.push({
        id,
        entityId,
        connectionId: connection.id,
        progress: 0,
      });
      this.transferBudget -= 1;
    }
  }
  private updateTransfers(dt: number): void {
    for (let index = this.transfers.length - 1; index >= 0; index--) {
      const transfer = this.transfers[index]!;
      const connection = stageConnection(this.config, transfer.connectionId);
      transfer.progress = Math.min(
        1,
        transfer.progress + dt / connection.duration,
      );
      if (transfer.progress < 1) continue;
      if (
        this.compression.acceptTransferredEntity(
          transfer.entityId,
          transfer.id,
          this.upgradeLevels,
        )
      ) this.transfers.splice(index, 1);
      else transfer.progress = 1;
    }
  }
  private flushConversionEvents(): void {
    for (const event of this.compression.drainEvents()) {
      this.pendingEvents.push({
        id: event.id,
        kind: "conversion",
        stageId: "compression-crucible",
        entityId: event.stoneId,
      });
    }
  }
  private validateStageCollections(): void {
    const claims = new Set<EntityId>();
    const requireOwner = (
      id: EntityId,
      stageId: StageId,
      slot: "active" | "output" | "reservoir" | "ritual",
    ) => {
      if (claims.has(id))
        throw new Error(
          `Entity ${id} is claimed by multiple stage collections`,
        );
      const owner = this.matter.get(id).owner;
      if (
        owner.kind !== "stage" ||
        owner.stageId !== stageId ||
        owner.slot !== slot
      )
        throw new Error(`Entity ${id} disagrees with its stage collection`);
      claims.add(id);
    };
    for (const id of this.sandfall.state.activeIds) requireOwner(id, "sandfall-atrium", "active");
    for (const id of this.sandfall.state.outputIds) requireOwner(id, "sandfall-atrium", "output");
    for (const id of this.compression.state.reservoirIds)
      requireOwner(id, "compression-crucible", "reservoir");
    const batch = this.compression.state.batch;
    if (batch) {
      const moteIds = batch.motes.map((mote) => mote.entityId);
      if (new Set(moteIds).size !== moteIds.length)
        throw new Error("Ritual contains duplicate entities");
      for (const id of moteIds) {
        const entity = this.matter.get(id);
        if (batch.conversionCompleted) {
          if (entity.owner.kind !== "contained" || entity.owner.entityId !== batch.outputStoneId)
            throw new Error(`Converted ritual entity ${id} is not contained by its stone`);
        } else requireOwner(id, "compression-crucible", "ritual");
      }
      if (batch.outputStoneId !== null && !this.compression.state.outputIds.includes(batch.outputStoneId))
        throw new Error("Ritual output stone is missing from output collection");
      if (batch.outputEventId !== null && batch.outputStoneId === null)
        throw new Error("Ritual output event is missing its stone");
    }
    for (const transfer of this.transfers) {
      if (claims.has(transfer.entityId))
        throw new Error(`Entity ${transfer.entityId} is claimed twice`);
      claims.add(transfer.entityId);
    }
    for (const id of this.compression.state.outputIds) {
      if (claims.has(id)) throw new Error(`Entity ${id} is claimed twice`);
      const owner = this.matter.get(id).owner;
      if (
        owner.kind !== "stage" ||
        owner.stageId !== "compression-crucible" ||
        owner.slot !== "output"
      )
        throw new Error(
          `Stone ${id} is not owned by the Compression Crucible output`,
        );
      claims.add(id);
    }
  }
}
