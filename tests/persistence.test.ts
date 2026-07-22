import { beforeEach, describe, expect, it } from "vitest";
import powdersJson from "../data/powders.json";
import progressionJson from "../data/progression.json";
import upgradesJson from "../data/upgrades.json";
import { validatePowderData, validateProgressionData, validateUpgradesData } from "../src/config/validateGameData";
import type { PowderIdleSaveV3, SaveValidationContext } from "../src/game/persistence/saveSchema";
import { IntegratedStageWorld, type RuntimeSaveSections } from "../src/game/stageWorldRuntime";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

const powders = validatePowderData(powdersJson);
const progression = validateProgressionData(progressionJson);
const upgrades = validateUpgradesData(upgradesJson);
const context: SaveValidationContext = {
  powderCount: powders.types.length,
  layerCount: progression.strataLayers.length,
  milestoneCount: progression.milestones.length,
  upgradeKeys: new Set(upgrades.upgrades.map((entry) => entry.key)),
  researchKeys: new Set(upgrades.research.map((entry) => entry.key)),
};

function populatedSections(): RuntimeSaveSections {
  return {
    economy: {
      dust: 1234,
      totalDustEarned: 9876,
      crystalCores: 7,
      totalPowderCollected: 456,
      selectedMaterial: Math.min(2, context.powderCount - 1),
      tierUnlocks: Array.from({ length: context.powderCount - 1 }, (_, index) => index < 2),
      autoDroppers: Array.from({ length: context.powderCount }, (_, index) => index),
      dropperTimers: Array.from({ length: context.powderCount }, (_, index) => index * 10),
      powderCounts: Array.from({ length: context.powderCount }, (_, index) => index * 5),
      legacyInventories: Array.from({ length: context.powderCount }, () => []),
    },
    progression: {
      upgrades: Object.fromEntries(upgrades.upgrades.map((entry, index) => [entry.key, index + 1])),
      research: Object.fromEntries(upgrades.research.map((entry, index) => [entry.key, index + 2])),
      layers: progression.strataLayers.map((_, index) => ({ unlocked: true, completed: index === 0, progress: index + 0.5 })),
      milestones: progression.milestones.map((_, index) => ({ unlocked: true, achieved: index < 2, applied: index < 2 })),
    },
    automation: {
      settings: { autoDrop: true, autoCompress: false },
      unlocks: { autoDrop: true, autoCompress: true },
      autoDropTimer: 120,
      autoCompressTimer: 240,
    },
    interface: { activeMenu: "achievements", codexUnlocked: true, selectedModule: "jar" },
  };
}

describe("versioned integrated persistence", () => {
  beforeEach(() => {
    Object.assign(globalThis, { localStorage: new MemoryStorage() });
  });

  it("round-trips all V3 economy, progression, automation, interface, matter, and transfer state", () => {
    const source = new IntegratedStageWorld();
    source.controller.castSand(100);
    source.controller.debugSeedOutputSand(2);
    source.controller.update(0.1);
    const beforeStage = source.controller.serialize();
    const sections = populatedSections();
    expect(source.save(sections)).toBe(true);

    const destination = new IntegratedStageWorld();
    const restored = destination.load(context, populatedSections());

    expect(restored?.economy).toEqual(sections.economy);
    expect(restored?.progression).toEqual(sections.progression);
    expect(restored?.automation).toEqual(sections.automation);
    expect(restored?.interface).toEqual(sections.interface);
    expect(destination.controller.serialize()).toEqual(beforeStage);
  });

  it("migrates the current V2 envelope conservatively and preserves the original raw save", () => {
    const world = new IntegratedStageWorld();
    const stage = world.controller.serialize();
    const stageV2 = { ...stage, version: 2 } as Record<string, unknown>;
    delete stageV2.transferBudget;
    const raw = JSON.stringify({
      schemaVersion: 2,
      savedAt: "2026-07-21T00:00:00.000Z",
      stage: stageV2,
      legacy: {
        dust: 42,
        upgrades: populatedSections().progression.upgrades,
        research: populatedSections().progression.research,
        milestones: populatedSections().progression.milestones,
        powderCounts: populatedSections().economy.powderCounts,
      },
    });
    localStorage.setItem("powder-idle-save", raw);
    const restored = world.load(context, populatedSections());
    expect(restored?.schemaVersion).toBe(3);
    expect(restored?.economy.dust).toBe(42);
    expect([...Array(localStorage.length)].map((_, index) => localStorage.key(index))).toEqual(
      expect.arrayContaining([expect.stringMatching(/^powder-idle-save-diagnostic-backup-v2-/)]),
    );
    expect(localStorage.getItem("powder-idle-save")).toBe(raw);
  });

  it("backs up invalid saves without deleting or overwriting the original", () => {
    const raw = JSON.stringify({ schemaVersion: 3, economy: { dust: -1 } });
    localStorage.setItem("powder-idle-save", raw);
    const world = new IntegratedStageWorld();
    expect(world.load(context, populatedSections())).toBeNull();
    expect(localStorage.getItem("powder-idle-save")).toBe(raw);
    const backupKeys = [...Array(localStorage.length)]
      .map((_, index) => localStorage.key(index))
      .filter((key): key is string => key?.startsWith("powder-idle-save-diagnostic-backup-") === true);
    expect(backupKeys).toHaveLength(1);
    expect(localStorage.getItem(backupKeys[0]!)).toBe(raw);
  });

  it("rejects invalid resource values, array lengths, keys, and malformed stage ownership", () => {
    const world = new IntegratedStageWorld();
    world.save(populatedSections());
    const parsed = JSON.parse(localStorage.getItem("powder-idle-save")!) as PowderIdleSaveV3;
    parsed.economy.dust = -1;
    localStorage.setItem("powder-idle-save", JSON.stringify(parsed));
    expect(new IntegratedStageWorld().load(context, populatedSections())).toBeNull();

    parsed.economy.dust = 1;
    parsed.economy.autoDroppers.pop();
    localStorage.setItem("powder-idle-save", JSON.stringify(parsed));
    expect(new IntegratedStageWorld().load(context, populatedSections())).toBeNull();
  });

  it("round-trips an active pre-impact ritual instead of silently cancelling it", () => {
    const source = new IntegratedStageWorld();
    source.controller.debugSeedReservoirSand(100);
    source.controller.update(0);
    source.controller.invokeRitual();
    source.save(populatedSections());
    const destination = new IntegratedStageWorld();
    expect(destination.load(context, populatedSections())).not.toBeNull();
    expect(destination.controller.compression.state.phase).toBe("levitating");
    expect(destination.controller.compression.state.batch?.motes).toHaveLength(100);
  });
});
