import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import { computeCameraTarget } from "../src/game/camera/stageCamera";
import { MatterStore } from "../src/game/matter/matterStore";
import {
  screenToWorld,
  computeViewportRect,
} from "../src/game/rendering/pixelSurface";
import { CompressionStage } from "../src/game/stages/compression/compressionStage";
import { stageDefinition } from "../src/game/stages/stageDefinitions";
import { StageController } from "../src/game/stages/stageController";

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
    expect(stage.acceptEntity(id)).toBe(true);
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
    ).toEqual(["sandfall-atrium", "compression-crucible"]);
    expect(
      config.stages
        .slice(2)
        .every(
          (stage) => !stage.implemented && stage.connectionTargets.length === 0,
        ),
    ).toBe(true);
  });
});

describe("deterministic sandfall", () => {
  it("does not move before accumulated distance reaches a cell", () => {
    const c = controller(),
      id = c.castSand()[0]!,
      before = c.matter.get(id).y;
    c.update(0.001);
    expect(c.matter.get(id).y).toBe(before);
  });
  it("is stable across equivalent fixed elapsed partitions", () => {
    const a = controller(),
      b = controller(),
      idA = a.castSand()[0]!,
      idB = b.castSand()[0]!;
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    for (let i = 0; i < 60; i++) {
      b.update(1 / 120);
      b.update(1 / 120);
    }
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
  it("preserves identity through the funnel and buffers against a locked destination", () => {
    const c = controller(),
      id = c.castSand()[0]!;
    advance(c, 8);
    expect(c.sandfall.state.outputIds).toContain(id);
    expect(c.matter.get(id).owner).toEqual({
      kind: "stage",
      stageId: "sandfall-atrium",
      slot: "output",
    });
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
    expect(c.compression.conversionEvents).toHaveLength(1);
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
    expect(c.compression.conversionEvents).toHaveLength(1);
  });
  it("normalizes pre-impact saves and retains post-impact stones", () => {
    const before = controller();
    seedReservoir(before.compression, before.matter, 100);
    before.update(0);
    before.invokeRitual();
    const normalized = controller();
    normalized.hydrate(before.serialize());
    expect(normalized.compression.state.phase).toBe("ready");
    expect(normalized.compression.state.reservoirIds).toHaveLength(100);
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
