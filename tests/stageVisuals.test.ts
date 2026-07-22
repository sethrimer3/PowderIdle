import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import {
  MAX_STAGE_EFFECTS,
  StageEffectSystem,
  effectFromStageEvent,
} from "../src/game/effects/stageEffects";
import { computeResponsiveGameLayout } from "../src/game/layout/responsiveLayout";
import { computeViewportRect, screenToWorld } from "../src/game/rendering/pixelSurface";
import {
  compressionScale,
  readablePhaseSpeed,
  ritualTarget,
} from "../src/game/stages/compression/compressionRitual";
import { StageController, type StageEvent } from "../src/game/stages/stageController";
import {
  VISIBLE_OUTPUT_SLOTS,
  outputSlot,
  reservoirPosition,
  reservoirVisualModel,
  transferVisualModel,
} from "../src/game/stages/stageVisualModels";

const config = validateStageConfig(stageJson);
const controller = () => new StageController(config);

function advance(c: StageController, seconds: number): void {
  for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 60) c.update(1 / 60);
}

describe("bounded stage effects", () => {
  it("builds one grouped conjuration effect from the real cast entity IDs", () => {
    const c = controller();
    const ids = c.castSand(8, 17);
    c.update(0);
    const event = c.drainEvents().find((entry) => entry.kind === "cast");
    expect(event?.kind).toBe("cast");
    const effect = effectFromStageEvent(event!);
    expect(effect).toMatchObject({
      kind: "conjuration",
      entityIds: ids,
      x: 17,
      automatic: false,
    });
  });

  it("expires effects and remains bounded after many casts", () => {
    const effects = new StageEffectSystem();
    for (let index = 0; index < 200; index++)
      effects.emit({
        kind: "conjuration",
        stageId: "sandfall-atrium",
        entityIds: [index + 1],
        x: 24,
        elapsed: 0,
        duration: 0.4,
        automatic: false,
        seed: index,
      });
    expect(effects.effects).toHaveLength(MAX_STAGE_EFFECTS);
    effects.update(0.5);
    expect(effects.effects).toHaveLength(0);
  });

  it("produces one grouped automatic cast and one automatic invocation event", () => {
    const c = controller();
    c.upgradeLevels["auto-cast"] = 1;
    c.update(1.01);
    const castEvents = c.drainEvents().filter((event) => event.kind === "cast");
    expect(castEvents).toHaveLength(1);
    expect(castEvents[0]).toMatchObject({ automatic: true });

    c.debugSeedReservoirSand(100);
    c.upgradeLevels["auto-ritual"] = 1;
    c.update(0);
    const invocations = c.drainEvents().filter((event) => event.kind === "ritual-started");
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({ automatic: true });
  });
});

describe("connection and unlock visual models", () => {
  it("models exactly one visible mote per active transfer", () => {
    const c = controller();
    c.castSand(100);
    c.debugSeedOutputSand(4);
    c.update(0.1);
    const model = transferVisualModel(config, c.transfers);
    expect(model).toHaveLength(c.transfers.length);
    expect(new Set(model.map((item) => item.entityId)).size).toBe(model.length);
  });

  it("emits the Stage 2 unlock reveal once and does not replay after hydration", () => {
    const c = controller();
    c.castSand(100);
    c.update(0);
    expect(c.drainEvents().filter((event) => event.kind === "stage-unlocked")).toHaveLength(1);
    const restored = controller();
    restored.hydrate(c.serialize());
    restored.update(0);
    expect(restored.drainEvents().filter((event) => event.kind === "stage-unlocked")).toHaveLength(0);
  });
});

describe("reservoir and output geometry", () => {
  it("keeps base and expanded-capacity reservoir positions inside the basin", () => {
    for (let index = 0; index < 800; index++) {
      const position = reservoirPosition(index, index + 1);
      expect(position.x).toBeGreaterThanOrEqual(4);
      expect(position.x).toBeLessThanOrEqual(43);
      expect(position.y).toBeGreaterThanOrEqual(33);
      expect(position.y).toBeLessThanOrEqual(43);
    }
  });

  it("bounds the visible reservoir model and reports compact overflow", () => {
    const c = controller();
    c.upgradeLevels["reservoir-capacity"] = 10;
    c.debugSeedReservoirSand(500);
    const model = reservoirVisualModel(c.compression.state.reservoirIds, c.matter, 180);
    expect(model.motes).toHaveLength(180);
    expect(model.overflow).toBe(320);
  });

  it("activates ready state at the configured recipe count", () => {
    const c = controller();
    c.debugSeedReservoirSand(c.compression.recipeCount);
    c.update(0);
    expect(c.compression.state.phase).toBe("ready");
  });

  it("provides unique visible output alcove positions", () => {
    const positions = Array.from({ length: VISIBLE_OUTPUT_SLOTS }, (_, index) => outputSlot(index));
    expect(new Set(positions.map((point) => `${point.x},${point.y}`)).size).toBe(VISIBLE_OUTPUT_SLOTS);
  });
});

describe("ritual geometry and timing", () => {
  it("uses deterministic targets and begins levitation at saved reservoir positions", () => {
    expect(ritualTarget(17, 4, 100)).toEqual(ritualTarget(17, 4, 100));
    const c = controller();
    const ids = c.debugSeedReservoirSand(100);
    const starts = new Map(ids.map((id) => [id, { x: c.matter.get(id).x, y: c.matter.get(id).y }]));
    c.update(0);
    c.invokeRitual();
    for (const mote of c.compression.state.batch!.motes)
      expect({ x: mote.startX, y: mote.startY }).toEqual(starts.get(mote.entityId));
  });

  it("contracts monotonically and preserves minimum readable phase durations", () => {
    const scales = [0, 0.2, 0.4, 0.6, 0.8, 1].map(compressionScale);
    for (let index = 1; index < scales.length; index++)
      expect(scales[index]!).toBeLessThanOrEqual(scales[index - 1]!);
    expect(0.8 / readablePhaseSpeed("levitating", 100, 0.8)).toBeGreaterThanOrEqual(0.3);
    expect(0.12 / readablePhaseSpeed("impact", 100, 0.12)).toBeGreaterThanOrEqual(0.08);
  });

  it("converts once, hides contained sand, and reveals the actual output entity", () => {
    const c = controller();
    const ids = c.debugSeedReservoirSand(100);
    c.update(0);
    c.invokeRitual();
    advance(c, 2.5);
    const batch = c.compression.state.batch!;
    expect(batch.conversionCompleted).toBe(true);
    expect(c.compression.state.outputIds).toContain(batch.outputStoneId);
    for (const id of ids)
      expect(c.matter.get(id).owner).toEqual({ kind: "contained", entityId: batch.outputStoneId });
    expect(c.drainEvents().filter((event) => event.kind === "conversion")).toHaveLength(1);
  });

  it("starts release at center and high release speed still moves through the release phase", () => {
    const c = controller();
    c.upgradeLevels["release-speed"] = 10;
    c.debugSeedReservoirSand(100);
    c.update(0);
    c.invokeRitual();
    while (c.compression.state.phase !== "releasing") c.update(1 / 120);
    const stoneId = c.compression.state.batch!.outputStoneId!;
    expect(c.matter.get(stoneId)).toMatchObject({ x: 24, y: 24 });
    c.update(1 / 120);
    const moving = c.matter.get(stoneId);
    const target = c.compression.outputPosition(0);
    expect(moving.x).not.toBe(target.x);
    while (c.compression.state.phase === "releasing") c.update(1 / 120);
    advance(c, 0.11);
    expect(c.matter.get(stoneId)).toMatchObject(target);
  });
});

describe("camera and responsive visual safety", () => {
  it("emits one bounded impact shake without changing pointer mapping or camera state", () => {
    const effects = new StageEffectSystem();
    const event: StageEvent = {
      id: "conversion:ritual-1",
      kind: "conversion",
      stageId: "compression-crucible",
      entityId: 101,
    };
    effects.emit(effectFromStageEvent(event)!);
    const view = computeViewportRect(360, 0, 360, 72, 96, 1.4);
    const before = screenToWorld(view, view.x + view.size / 2, view.y + view.size / 2);
    const offset = effects.cameraOffset();
    expect(Math.abs(offset.x)).toBeLessThanOrEqual(1.35);
    expect(screenToWorld(view, view.x + view.size / 2, view.y + view.size / 2)).toEqual(before);
    effects.update(0.31);
    expect(effects.cameraOffset()).toEqual({ x: 0, y: 0 });
  });

  it("keeps the stage viewport square and gives narrow status content bounded width", () => {
    const layout = computeResponsiveGameLayout(720, 900);
    expect(layout.stageViewportSize).toBe(Math.min(layout.playWidth, layout.screenHeight));
    expect(layout.menuWidth + layout.playWidth).toBe(layout.screenWidth);
    expect(layout.menuScale).toBeLessThanOrEqual(1);
    const narrower = computeResponsiveGameLayout(480, 760);
    expect(narrower.stageViewportSize).toBe(narrower.playWidth);
    expect(narrower.menuScale).toBeGreaterThanOrEqual(0.72);
  });
});
