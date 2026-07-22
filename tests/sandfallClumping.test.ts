import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import { detectClumps } from "../src/game/stages/sandfall/clumpDetection";
import { StageController } from "../src/game/stages/stageController";
import { CLUMP_TARGET } from "../src/game/stages/sandfall/sandfallStage";

const config = validateStageConfig(stageJson);
const controller = () => new StageController(config);

function packMotes(c: StageController, count: number, originX = 24, originY = 20): number[] {
  const ids: number[] = [];
  const perRow = 12;
  for (let i = 0; i < count; i++) {
    const id = c.matter.create(
      "sand",
      { kind: "stage", stageId: "sandfall-atrium", slot: "active" },
      "sandfall-atrium",
      {
        x: originX + (i % perRow) * 0.15,
        y: originY + Math.floor(i / perRow) * 0.15,
      },
    );
    c.sandfall.state.activeIds.push(id);
    ids.push(id);
  }
  return ids;
}

describe("clump detection (union-find)", () => {
  it("groups tightly packed motes into a single clump", () => {
    const motes = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      x: (i % 4) * 0.3,
      y: Math.floor(i / 4) * 0.3,
    }));
    const clumps = detectClumps(motes, 2.5);
    expect(clumps).toHaveLength(1);
    expect(clumps[0]).toHaveLength(12);
  });

  it("keeps motes separated by more than the threshold in distinct clumps", () => {
    const motes = [
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0.5, y: 0 },
      { id: 3, x: 50, y: 50 },
      { id: 4, x: 50.4, y: 50 },
    ];
    const clumps = detectClumps(motes, 2.5).map((clump) => clump.sort((a, b) => a - b));
    expect(clumps).toHaveLength(2);
    expect(clumps).toEqual(
      expect.arrayContaining([
        [1, 2],
        [3, 4],
      ]),
    );
  });

  it("handles a single isolated mote as its own clump", () => {
    const clumps = detectClumps([{ id: 7, x: 5, y: 5 }], 2.5);
    expect(clumps).toEqual([[7]]);
  });
});

describe("clump conversion trigger", () => {
  it("does not convert a clump of 99 motes", () => {
    const c = controller();
    packMotes(c, 99);
    c.update(0);
    expect(c.sandfall.state.outputIds).toHaveLength(0);
    expect(c.sandfall.state.activeIds).toHaveLength(99);
  });

  it("converts exactly a clump of 100 motes into one stone", () => {
    const c = controller();
    packMotes(c, CLUMP_TARGET);
    c.update(0);
    expect(c.sandfall.state.outputIds).toHaveLength(1);
    expect(c.sandfall.state.activeIds).toHaveLength(0);
    const stoneId = c.sandfall.state.outputIds[0]!;
    expect(c.matter.get(stoneId).material).toBe("stone");
    expect(c.matter.get(stoneId).contents).toHaveLength(CLUMP_TARGET);
  });

  it("awards exactly one stone-mote-collected counter increment on conversion", () => {
    const c = controller();
    packMotes(c, CLUMP_TARGET);
    expect(c.sandfall.state.stoneMotesCollected).toBe(0);
    c.update(0);
    expect(c.sandfall.state.stoneMotesCollected).toBe(1);
  });
});

describe("explosion impulse", () => {
  it("pushes nearby remaining motes outward from the clump centroid", () => {
    const c = controller();
    packMotes(c, CLUMP_TARGET, 24, 20);
    const bystander = c.matter.create(
      "sand",
      { kind: "stage", stageId: "sandfall-atrium", slot: "active" },
      "sandfall-atrium",
      { x: 30, y: 20 },
    );
    c.sandfall.state.activeIds.push(bystander);
    expect(c.matter.get(bystander).vx).toBe(0);
    c.update(0);
    const after = c.matter.get(bystander);
    expect(after.vx).toBeGreaterThan(0);
  });
});

describe("sandfall to compression stone transfer", () => {
  it("moves a clump-produced stone mote from sandfall's output into compression's stone reservoir", () => {
    const c = controller();
    c.castSand(100);
    for (let i = 0; i < 400; i++) c.update(1 / 60);
    expect(c.unlocked.has("compression-crucible")).toBe(true);
    const before = c.compression.state.stoneReservoirIds.length;
    packMotes(c, CLUMP_TARGET);
    for (let i = 0; i < 120; i++) c.update(1 / 60);
    expect(c.compression.state.stoneReservoirIds.length).toBeGreaterThan(before);
    const stoneId = c.compression.state.stoneReservoirIds.at(-1)!;
    expect(c.matter.get(stoneId).material).toBe("stone");
    expect(c.matter.get(stoneId).owner).toEqual({
      kind: "stage",
      stageId: "compression-crucible",
      slot: "reservoir",
    });
  });
});
