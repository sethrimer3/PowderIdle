import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import { computeCameraTarget } from "../src/game/camera/stageCamera";
import { MatterStore, matterOwnersEqual } from "../src/game/matter/matterStore";
import {
  screenToWorld,
  computeViewportRect,
} from "../src/game/rendering/pixelSurface";
import { CompressionStage } from "../src/game/stages/compression/compressionStage";
import { stageDefinition } from "../src/game/stages/stageDefinitions";
import { StageController } from "../src/game/stages/stageController";
import { stageUpgradeValue, stageWorldOrigin } from "../src/game/stages/stageConfig";
import { StageInputModalityGate, pointerIsInWorld } from "../src/game/input/stageInput";

const config = validateStageConfig(stageJson);
const controller = () => new StageController(config);
const upgrades = () => ({ ...controller().upgradeLevels });
function seedReservoir(
  stage: CompressionStage,
  matter: MatterStore,
  count: number,
): number[] {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const id = matter.create(
      "sand",
      { kind: "stage", stageId: "compression-crucible", slot: "reservoir" },
      "sandfall-atrium",
      { x: 5 + (i % 38), y: 43 - Math.floor(i / 38) },
    );
    expect(stage.acceptEntity(id, upgrades())).toBe(true);
    ids.push(id);
  }
  return ids;
}
function advance(c: StageController, seconds: number): void {
  const duration = seconds + 0.25;
  for (let elapsed = 0; elapsed < duration; elapsed += 1 / 60) c.update(1 / 60);
}

describe("stage configuration", () => {
  it("rejects invalid schema, fractional counts, non-finite timings, and duplicate connections", () => {
    const schema = structuredClone(stageJson);
    schema.schemaVersion = 1;
    expect(() => validateStageConfig(schema)).toThrow(/schemaVersion/);
    const fractional = structuredClone(stageJson);
    fractional.stages[1]!.settings!.recipeInputCount = 99.5;
    expect(() => validateStageConfig(fractional)).toThrow(/positive integer/);
    const timing = structuredClone(stageJson);
    timing.ritualTimings.impact = Infinity;
    expect(() => validateStageConfig(timing)).toThrow(/finite/);
    const duplicate = structuredClone(stageJson);
    duplicate.connections.push({ ...duplicate.connections[0]! });
    expect(() => validateStageConfig(duplicate)).toThrow(
      /duplicate stage connection/,
    );
  });
  it("reserves future stages without routes or production", () => {
    expect(
      config.stages
        .filter((stage) => stage.implemented)
        .map((stage) => stage.id),
    ).toEqual(["sandfall-atrium", "compression-crucible", "stage-3"]);
    expect(
      config.stages
        .slice(3)
        .every(
          (stage) => !stage.implemented && stage.connectionTargets.length === 0,
        ),
    ).toBe(true);
  });
});

describe("deterministic sandfall", () => {
  it("does not move when no time elapses", () => {
    const c = controller(),
      id = c.castSand()[0]!,
      before = c.matter.get(id).y;
    c.update(0);
    expect(c.matter.get(id).y).toBe(before);
  });
  it("is stable and reproducible across identical fixed-step sequences", () => {
    const a = controller(),
      b = controller(),
      idA = a.castSand()[0]!,
      idB = b.castSand()[0]!;
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    for (let i = 0; i < 60; i++) b.update(1 / 60);
    expect(canonical(a.matter.get(idA))).toEqual(canonical(b.matter.get(idB)));
  });
  it("gravity upgrades increase fall cadence", () => {
    const normal = controller(),
      fast = controller(),
      a = normal.castSand()[0]!,
      b = fast.castSand()[0]!;
    fast.upgradeLevels.gravity = 5;
    for (let i = 0; i < 30; i++) {
      normal.update(1 / 60);
      fast.update(1 / 60);
    }
    expect(fast.matter.get(b).y).toBeGreaterThan(normal.matter.get(a).y);
  });
  it("settles a lone mote to the chamber floor without a clump forming", () => {
    const c = controller(),
      id = c.castSand()[0]!;
    advance(c, 8);
    expect(c.sandfall.state.activeIds).toContain(id);
    expect(c.matter.get(id).owner).toEqual({
      kind: "stage",
      stageId: "sandfall-atrium",
      slot: "active",
    });
    expect(c.matter.get(id).y).toBeGreaterThan(40);
    expect(c.transfers).toHaveLength(0);
  });
});

describe("transfer persistence", () => {
  it("hydrates active transfers and continues with unique monotonic IDs", () => {
    const c = controller();
    c.castSand(100);
    const first = c.matter.create(
      "sand",
      { kind: "stage", stageId: "sandfall-atrium", slot: "output" },
      "sandfall-atrium",
    );
    c.sandfall.state.outputIds.push(first);
    c.update(0.1);
    expect(c.transfers).toHaveLength(1);
    const saved = c.serialize(),
      d = controller();
    d.hydrate(saved);
    const second = d.matter.create(
      "sand",
      { kind: "stage", stageId: "sandfall-atrium", slot: "output" },
      "sandfall-atrium",
    );
    d.sandfall.state.outputIds.push(second);
    d.update(0.1);
    expect(new Set(d.transfers.map((t) => t.id)).size).toBe(d.transfers.length);
    for (const transfer of d.transfers)
      expect(d.matter.get(transfer.entityId).owner).toEqual({
        kind: "transfer",
        transferId: transfer.id,
      });
  });
});

describe("compression ritual", () => {
  it("captures exactly 100 unique entities and their real starting positions", () => {
    const c = controller(),
      ids = seedReservoir(c.compression, c.matter, 100);
    c.update(0);
    expect(c.invokeRitual()).toBe(true);
    const batch = c.compression.state.batch!;
    expect(new Set(batch.motes.map((m) => m.entityId)).size).toBe(100);
    expect(batch.motes.map((m) => m.entityId)).toEqual(ids);
    expect(batch.motes[0]!.startX).toBe(c.matter.get(ids[0]!).x);
  });
  it("converts once at impact, contains sand, and releases the stone later", () => {
    const c = controller(),
      ids = seedReservoir(c.compression, c.matter, 117);
    c.update(0);
    c.invokeRitual();
    advance(c, 2);
    const batch = c.compression.state.batch!;
    expect(batch.conversionCompleted).toBe(true);
    const stoneId = batch.outputStoneId!;
    expect(c.drainEvents().filter((event) => event.kind === "conversion")).toHaveLength(1);
    expect(c.matter.get(stoneId).contents).toHaveLength(100);
    for (const id of ids.slice(0, 100))
      expect(c.matter.get(id).owner).toEqual({
        kind: "contained",
        entityId: stoneId,
      });
    expect(c.compression.state.reservoirIds).toHaveLength(17);
    expect(c.matter.get(stoneId).x).toBe(24);
    advance(c, 1);
    expect(c.matter.get(stoneId).x).not.toBe(24);
    expect(c.drainEvents()).toHaveLength(0);
  });
  it("normalizes pre-impact saves and retains post-impact stones", () => {
    const before = controller();
    seedReservoir(before.compression, before.matter, 100);
    before.update(0);
    before.invokeRitual();
    const normalized = controller();
    normalized.hydrate(before.serialize());
    expect(normalized.compression.state.phase).toBe("levitating");
    expect(normalized.compression.state.batch?.motes).toHaveLength(100);
    const after = controller();
    seedReservoir(after.compression, after.matter, 100);
    after.update(0);
    after.invokeRitual();
    advance(after, 2);
    const restored = controller();
    restored.hydrate(after.serialize());
    expect(restored.compression.state.outputIds).toHaveLength(1);
    expect(restored.compression.state.reservoirIds).toHaveLength(0);
  });
  it("assigns distinct readable positions to multiple outputs", () => {
    const c = controller();
    expect(c.compression.outputPosition(0)).not.toEqual(
      c.compression.outputPosition(1),
    );
    expect(c.compression.outputPosition(0)).not.toEqual(
      c.compression.outputPosition(10),
    );
  });
});

describe("camera and pointer geometry", () => {
  it("includes padding for one, two, and full world targets", () => {
    const one = computeCameraTarget([{ col: 1, row: 1 }], 3),
      two = computeCameraTarget(
        [
          { col: 1, row: 1 },
          { col: 1, row: 2 },
        ],
        3,
      ),
      full = computeCameraTarget(
        [
          { col: 0, row: 0 },
          { col: 2, row: 2 },
        ],
        3,
      );
    expect(one.zoom).toBe(3);
    expect(one.minX).toBe(45);
    expect(two.minY).toBe(45);
    expect(two.maxY).toBe(147);
    expect(full.zoom).toBe(1);
  });
  it("maps pointers through the exact letterboxed viewport", () => {
    const view = computeViewportRect(400, 0, 600, 72, 72, 3),
      center = screenToWorld(
        view,
        view.x + view.size / 2,
        view.y + view.size / 2,
      );
    expect(center).toEqual({ x: 72, y: 72 });
    expect(screenToWorld(view, view.x - 1, view.y)).toBeNull();
  });
});

describe("prestige reset", () => {
  it("returns every stage-owned and transient system to a fresh Stage 1 state", () => {
    const c = controller();
    c.castSand(100);
    c.debugSeedReservoirSand(100);
    c.update(0);
    expect(c.invokeRitual()).toBe(true);
    c.debugSeedOutputSand(1);
    c.update(0.1);
    expect(c.transfers.length).toBeGreaterThan(0);

    c.resetForPrestige({ preservePermanentBonuses: true });

    expect(c.matter.serialize().entities).toHaveLength(0);
    expect(c.sandfall.state.lifetimeCreated).toBe(0);
    expect(c.sandfall.state.activeIds).toHaveLength(0);
    expect(c.compression.state.batch).toBeNull();
    expect(c.compression.state.outputIds).toHaveLength(0);
    expect(c.transfers).toHaveLength(0);
    expect([...c.unlocked]).toEqual(["sandfall-atrium"]);
    expect(c.cameraTarget().centerY).toBe(72);
    c.update(1 / 60);
    expect(c.economyView().displayedByMaterial).toEqual({ sand: 0, stone: 0 });
    expect(c.drainEvents()).toHaveLength(0);
  });
});

describe("atomic capacity admission", () => {
  it("uses configured base and upgraded capacity at the transfer boundary", () => {
    const base = controller();
    expect(base.compression.capacity(base.upgradeLevels)).toBe(300);
    base.upgradeLevels["reservoir-capacity"] = 1;
    expect(base.compression.capacity(base.upgradeLevels)).toBe(350);
    base.castSand(100);
    base.debugSeedReservoirSand(349);
    const [boundary] = base.debugSeedOutputSand(1);
    base.update(1);
    expect(base.compression.state.reservoirIds).toContain(boundary);
    expect(base.matter.get(boundary!).owner).toEqual({
      kind: "stage",
      stageId: "compression-crucible",
      slot: "reservoir",
    });
  });

  it("keeps ownership unchanged when a full reservoir rejects admission", () => {
    const c = controller();
    c.debugSeedReservoirSand(300);
    const id = c.matter.create(
      "sand",
      { kind: "transfer", transferId: "blocked" },
      "sandfall-atrium",
    );
    expect(c.compression.acceptTransferredEntity(id, "blocked", c.upgradeLevels)).toBe(false);
    expect(c.matter.get(id).owner).toEqual({ kind: "transfer", transferId: "blocked" });
    expect(c.compression.state.reservoirIds).not.toContain(id);
  });

  it("leaves queued output in its source collection under reservoir backpressure", () => {
    const c = controller();
    c.castSand(100);
    c.debugSeedReservoirSand(300);
    const [queued] = c.debugSeedOutputSand(1);
    c.update(1);
    expect(c.transfers).toHaveLength(0);
    expect(c.sandfall.state.outputIds).toContain(queued);
    expect(c.matter.get(queued!).owner).toEqual({
      kind: "stage",
      stageId: "sandfall-atrium",
      slot: "output",
    });
  });
});

describe("authoritative material economy", () => {
  it("separates active, queued, spendable, processing, output, and contained matter", () => {
    const c = controller();
    c.debugSeedReservoirSand(100);
    expect(c.economyView().spendableByMaterial.sand).toBe(100);
    c.update(0);
    expect(c.invokeRitual()).toBe(true);
    expect(c.economyView().spendableByMaterial.sand).toBe(0);
    expect(c.economyView().processingByMaterial.sand).toBe(100);
    advance(c, 2);
    const view = c.economyView();
    expect(view.processingByMaterial.sand).toBe(0);
    expect(view.spendableByMaterial.stone).toBe(1);
    expect(view.containedByMaterial.sand).toBe(100);
    expect(view.displayedByMaterial).toEqual({ sand: 0, stone: 1 });
  });
});

describe("configuration authority", () => {
  it("evaluates clamped upgrade values and stage origins from configuration", () => {
    const c = controller();
    c.upgradeLevels.gravity = 999;
    expect(stageUpgradeValue(config, c.upgradeLevels, "gravity")).toBe(78);
    const moved = structuredClone(stageJson);
    moved.stages[0]!.gridPosition = { col: 2, row: 0 };
    moved.stages[6]!.gridPosition = { col: 1, row: 1 };
    const movedConfig = validateStageConfig(moved);
    expect(stageWorldOrigin(movedConfig.stages[0]!)).toEqual({ x: 96, y: 0 });
  });

  it("resolves transfers through the configured connection and rejects missing upgrades", () => {
    const changed = structuredClone(stageJson);
    changed.connections[0]!.id = "configured-route";
    const c = new StageController(validateStageConfig(changed));
    c.castSand(100);
    c.debugSeedOutputSand(1);
    c.update(0.1);
    expect(c.transfers[0]?.connectionId).toBe("configured-route");
    const missing = structuredClone(stageJson);
    missing.upgrades = missing.upgrades.filter((upgrade) => upgrade.id !== "gravity");
    expect(() => validateStageConfig(missing)).toThrow(/missing required upgrade gravity/);
  });
});

describe("events and ownership invariants", () => {
  it("compares every owner variant without serialization", () => {
    expect(matterOwnersEqual(
      { kind: "stage", stageId: "sandfall-atrium", slot: "active" },
      { kind: "stage", stageId: "sandfall-atrium", slot: "active" },
    )).toBe(true);
    expect(matterOwnersEqual({ kind: "transfer", transferId: "a" }, { kind: "transfer", transferId: "b" })).toBe(false);
    expect(matterOwnersEqual({ kind: "contained", entityId: 4 }, { kind: "contained", entityId: 4 })).toBe(true);
  });

  it("emits conversions once and removes drained events", () => {
    const c = controller();
    c.debugSeedReservoirSand(100);
    c.update(0);
    c.invokeRitual();
    advance(c, 2);
    expect(c.drainEvents().filter((event) => event.kind === "conversion")).toHaveLength(1);
    expect(c.drainEvents()).toHaveLength(0);
    for (let index = 0; index < 10; index++) c.update(1 / 60);
    expect(c.drainEvents()).toHaveLength(0);
  });

  it("rejects duplicate ritual entries and contained entities in stage collections", () => {
    const c = controller();
    c.debugSeedReservoirSand(100);
    c.update(0);
    c.invokeRitual();
    const duplicate = c.serialize();
    duplicate.compression.state.batch!.motes.push({ ...duplicate.compression.state.batch!.motes[0]! });
    expect(() => controller().hydrate(duplicate)).toThrow(/duplicate/i);

    const converted = controller();
    converted.debugSeedReservoirSand(100);
    converted.update(0);
    converted.invokeRitual();
    advance(converted, 2);
    const corrupted = converted.serialize();
    const contained = corrupted.compression.state.batch!.motes[0]!.entityId;
    corrupted.compression.state.reservoirIds.push(contained);
    expect(() => controller().hydrate(corrupted)).toThrow(/collection|contained|owner/i);
  });
});

describe("automation and canonical input", () => {
  it("uses the configured manual cast amount and enforces one shared cooldown", () => {
    const c = controller();
    c.upgradeLevels["manual-cast-count"] = 2;
    expect(c.castSand()).toHaveLength(3);
    expect(c.castSand(8)).toHaveLength(0);
    c.update(0.2);
    expect(c.castSand(8)).toHaveLength(8);
  });

  it("has exactly one stage automatic casting result per configured interval", () => {
    const c = controller();
    c.upgradeLevels["auto-cast"] = 1;
    c.update(0.99);
    expect(c.sandfall.state.lifetimeCreated).toBe(0);
    c.update(0.02);
    expect(c.sandfall.state.lifetimeCreated).toBe(1);
  });

  it("suppresses the synthetic mouse event after touch and rejects menu coordinates", () => {
    const gate = new StageInputModalityGate();
    expect(gate.accept("touch", 1000)).toBe(true);
    expect(gate.accept("mouse", 1100)).toBe(false);
    expect(gate.accept("mouse", 1800)).toBe(true);
    expect(pointerIsInWorld(100, 100)).toBe(false);
    expect(pointerIsInWorld(101, 100)).toBe(true);
  });
});

describe("bounded event queues", () => {
  it("does not retain historical conversions after consumers drain them", () => {
    const tiny = structuredClone(stageJson);
    tiny.stages[1]!.settings!.recipeInputCount = 1;
    for (const key of Object.keys(tiny.ritualTimings) as Array<keyof typeof tiny.ritualTimings>)
      tiny.ritualTimings[key] = 0.001;
    const c = new StageController(validateStageConfig(tiny));
    for (let index = 0; index < 30; index++) {
      c.debugSeedReservoirSand(1);
      c.update(0);
      expect(c.invokeRitual()).toBe(true);
      advance(c, 1.6);
      expect(c.drainEvents().filter((event) => event.kind === "conversion")).toHaveLength(1);
    }
    expect(c.drainEvents()).toHaveLength(0);
  });
});

function canonical(
  entity: Readonly<{ x: number; y: number; vy: number; movement: number }>,
) {
  return {
    x: entity.x,
    y: entity.y,
    vy: Number(entity.vy.toFixed(8)),
    movement: Number(entity.movement.toFixed(8)),
  };
}
