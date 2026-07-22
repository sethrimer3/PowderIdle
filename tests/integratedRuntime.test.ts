import { readFileSync } from "node:fs";
import type P5 from "p5";
import { describe, expect, it } from "vitest";
import stageJson from "../data/stages.json";
import { validateStageConfig } from "../src/config/validateStageData";
import { renderCompression } from "../src/game/stages/compression/compressionRenderer";
import { renderSandfall } from "../src/game/stages/sandfall/sandfallRenderer";
import { StageController } from "../src/game/stages/stageController";

describe("integrated runtime", () => {
  it("boots the legacy game shell as the single composition root", () => {
    const main = readFileSync(
        new URL("../src/main.ts", import.meta.url),
        "utf8",
      ),
      runtime = readFileSync(
        new URL("../src/game/runtime.ts", import.meta.url),
        "utf8",
      );
    expect(main).toContain("installPowderIdle");
    expect(main).not.toContain("installStageWorld");
    expect(runtime).toContain("drawMenu()");
    expect(runtime).toContain("IntegratedStageWorld");
    expect(runtime).toContain("touchStarted");
  });
  it("stage renderers are pure over serialized controller state", () => {
    const controller = new StageController(validateStageConfig(stageJson));
    controller.castSand();
    const before = controller.serialize(),
      surface = new Proxy(
        {},
        { get: () => () => undefined },
      ) as unknown as P5.Graphics;
    renderSandfall(surface, controller.matter, controller.sandfall.state, {
      time: 0,
      effects: [],
      destinationUnlocked: false,
      transferCount: 0,
      reservoirFull: false,
      gravity: 18,
      castCount: 1,
      cooldownProgress: 1,
      autoCast: false,
    });
    renderCompression(
      surface,
      controller.matter,
      controller.compression.state,
      controller.compression.recipeCount,
      {
        time: 0,
        effects: [],
        capacity: 300,
        ritualSpeed: 1,
        releaseSpeed: 1,
        autoRitual: false,
        unlockProgress: 1,
      },
    );
    expect(controller.serialize()).toEqual(before);
  });
});
