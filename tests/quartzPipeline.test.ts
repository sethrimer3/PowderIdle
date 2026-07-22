import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import { StageController } from "../src/game/stages/stageController";

const config = validateStageConfig(stageJson);
const controller = () => new StageController(config);

function seedStoneReservoir(c: StageController, count: number): number[] {
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    const id = c.matter.create(
      "stone",
      { kind: "stage", stageId: "compression-crucible", slot: "reservoir" },
      "sandfall-atrium",
      { x: 5 + (i % 38), y: 43 - Math.floor(i / 38) },
    );
    expect(c.compression.acceptEntity(id, c.upgradeLevels)).toBe(true);
    ids.push(id);
  }
  return ids;
}

function advance(c: StageController, seconds: number): void {
  const duration = seconds + 0.25;
  for (let elapsed = 0; elapsed < duration; elapsed += 1 / 60) c.update(1 / 60);
}

describe("compression stone-to-quartz compaction", () => {
  it("accepts incoming stone motes into a distinct stone reservoir alongside sand", () => {
    const c = controller();
    seedStoneReservoir(c, 5);
    expect(c.compression.state.stoneReservoirIds).toHaveLength(5);
    expect(c.compression.state.reservoirIds).toHaveLength(0);
  });

  it("produces exactly one iridescent quartz mote from 100 stone motes, reusing the ritual machinery", () => {
    const c = controller();
    const ids = seedStoneReservoir(c, 100);
    c.update(0);
    expect(c.invokeRitual()).toBe(true);
    expect(c.compression.state.batch?.material).toBe("stone");
    advance(c, 2);
    const batch = c.compression.state.batch!;
    expect(batch.conversionCompleted).toBe(true);
    const quartzId = batch.outputStoneId!;
    expect(c.matter.get(quartzId).material).toBe("quartz");
    expect(c.matter.get(quartzId).contents).toHaveLength(100);
    for (const id of ids)
      expect(c.matter.get(id).owner).toEqual({ kind: "contained", entityId: quartzId });
    expect(c.compression.state.lifetimeQuartzCreated).toBe(1);
  });

  it("unlocks and transfers the quartz mote onward into stage-3", () => {
    const c = controller();
    seedStoneReservoir(c, 100);
    c.update(0);
    c.invokeRitual();
    advance(c, 3);
    expect(c.unlocked.has("stage-3")).toBe(true);
    for (let i = 0; i < 180; i++) c.update(1 / 60);
    expect(c.stage3.state.reservoirIds).toHaveLength(1);
    const quartzId = c.stage3.state.reservoirIds[0]!;
    expect(c.matter.get(quartzId).material).toBe("quartz");
    expect(c.matter.get(quartzId).owner).toEqual({
      kind: "stage",
      stageId: "stage-3",
      slot: "reservoir",
    });
  });
});
