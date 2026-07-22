import type { Inventory, LayerState, MilestoneState } from "../../types/game";
import type { StageSaveV3 } from "../stages/stageController";

export const SAVE_SCHEMA_VERSION = 3 as const;

export interface EconomySaveV3 {
  dust: number;
  totalDustEarned: number;
  crystalCores: number;
  totalPowderCollected: number;
  selectedMaterial: number;
  tierUnlocks: boolean[];
  autoDroppers: number[];
  dropperTimers: number[];
  powderCounts: number[];
  legacyInventories: Inventory[];
}
export interface ProgressionSaveV3 {
  upgrades: Record<string, number>;
  research: Record<string, number>;
  layers: LayerState[];
  milestones: MilestoneState[];
}
export interface AutomationSaveV3 {
  settings: { autoDrop: boolean; autoCompress: boolean };
  unlocks: { autoDrop: boolean; autoCompress: boolean };
  autoDropTimer: number;
  autoCompressTimer: number;
}
export interface InterfaceSaveV3 {
  activeMenu: string;
  codexUnlocked: boolean;
  selectedModule: string | null;
}
export interface PowderIdleSaveV3 {
  schemaVersion: typeof SAVE_SCHEMA_VERSION;
  savedAt: string;
  stageWorld: StageSaveV3;
  economy: EconomySaveV3;
  progression: ProgressionSaveV3;
  automation: AutomationSaveV3;
  interface: InterfaceSaveV3;
}
export interface SaveValidationContext {
  powderCount: number;
  layerCount: number;
  milestoneCount: number;
  upgradeKeys: ReadonlySet<string>;
  researchKeys: ReadonlySet<string>;
}

const record = (value: unknown, label: string): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
};
const finiteNonNegative = (value: unknown, label: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new Error(`${label} must be finite and non-negative`);
  return value;
};
const integer = (value: unknown, label: string): number => {
  const result = finiteNonNegative(value, label);
  if (!Number.isInteger(result)) throw new Error(`${label} must be an integer`);
  return result;
};
const boolean = (value: unknown, label: string): boolean => {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
};
const fixedArray = (
  value: unknown,
  length: number,
  label: string,
): unknown[] => {
  if (!Array.isArray(value) || value.length !== length)
    throw new Error(`${label} must contain exactly ${length} entries`);
  return value;
};
function levels(
  value: unknown,
  allowed: ReadonlySet<string>,
  label: string,
): Record<string, number> {
  const source = record(value, label), result: Record<string, number> = {};
  for (const [key, raw] of Object.entries(source)) {
    if (!allowed.has(key)) throw new Error(`${label}.${key} is not configured`);
    result[key] = integer(raw, `${label}.${key}`);
  }
  return result;
}
function validateStageSave(value: unknown): StageSaveV3 {
  const root = record(value, "stageWorld");
  if (root.version !== 3) throw new Error("stageWorld.version must be 3");
  integer(root.nextTransferId, "stageWorld.nextTransferId");
  finiteNonNegative(root.transferBudget, "stageWorld.transferBudget");
  if (!Array.isArray(root.unlocked) || !Array.isArray(root.transfers))
    throw new Error("stageWorld collections must be arrays");
  const stageUpgradeKeys = new Set([
    "manual-cast-count", "cast-cooldown", "gravity", "output-throughput",
    "auto-cast", "ritual-speed", "reservoir-capacity", "release-speed", "auto-ritual",
  ]);
  const stageLevels = record(root.upgradeLevels, "stageWorld.upgradeLevels");
  for (const key of stageUpgradeKeys) integer(stageLevels[key], `stageWorld.upgradeLevels.${key}`);
  for (const key of Object.keys(stageLevels))
    if (!stageUpgradeKeys.has(key)) throw new Error(`Unknown stage upgrade ${key}`);
  const matter = record(root.matter, "stageWorld.matter");
  integer(matter.nextId, "stageWorld.matter.nextId");
  if (!Array.isArray(matter.entities)) throw new Error("matter.entities must be an array");
  for (const [index, raw] of matter.entities.entries()) {
    const entity = record(raw, `matter.entities[${index}]`);
    integer(entity.id, `matter.entities[${index}].id`);
    finiteNonNegative(entity.mass, `matter.entities[${index}].mass`);
    for (const key of ["x", "y", "vx", "vy", "movement"])
      if (typeof entity[key] !== "number" || !Number.isFinite(entity[key]))
        throw new Error(`matter entity ${key} must be finite`);
    const owner = record(entity.owner, `matter.entities[${index}].owner`);
    if (!new Set(["stage", "transfer", "contained"]).has(String(owner.kind)))
      throw new Error("matter owner kind is invalid");
    if (!Array.isArray(entity.contents) || !Array.isArray(entity.lineage))
      throw new Error("matter contents and lineage must be arrays");
  }
  const compression = record(root.compression, "stageWorld.compression");
  const compressionState = record(compression.state, "stageWorld.compression.state");
  for (const key of ["reservoirIds", "outputIds"])
    if (!Array.isArray(compressionState[key])) throw new Error(`compression.${key} must be an array`);
  const batch = compressionState.batch;
  if (batch !== null) {
    const parsedBatch = record(batch, "compression.batch");
    if (!Array.isArray(parsedBatch.motes)) throw new Error("compression.batch.motes must be an array");
    for (const [index, raw] of parsedBatch.motes.entries()) {
      const mote = record(raw, `compression.batch.motes[${index}]`);
      integer(mote.entityId, `compression.batch.motes[${index}].entityId`);
    }
  }
  // The controller performs relationship validation after this structural and numeric pass.
  return structuredClone(root) as unknown as StageSaveV3;
}

export function validateSaveV3(
  value: unknown,
  context: SaveValidationContext,
): PowderIdleSaveV3 {
  const root = record(value, "save");
  if (root.schemaVersion !== SAVE_SCHEMA_VERSION)
    throw new Error(`Unsupported save schema ${String(root.schemaVersion)}`);
  if (typeof root.savedAt !== "string" || Number.isNaN(Date.parse(root.savedAt)))
    throw new Error("savedAt must be an ISO timestamp");
  const economy = record(root.economy, "economy");
  const progression = record(root.progression, "progression");
  const automation = record(root.automation, "automation");
  const settings = record(automation.settings, "automation.settings");
  const unlocks = record(automation.unlocks, "automation.unlocks");
  const interfaceState = record(root.interface, "interface");
  const tierUnlocks = fixedArray(economy.tierUnlocks, Math.max(0, context.powderCount - 1), "economy.tierUnlocks")
    .map((entry, i) => boolean(entry, `economy.tierUnlocks[${i}]`));
  const integerArray = (key: "autoDroppers" | "powderCounts") =>
    fixedArray(economy[key], context.powderCount, `economy.${key}`)
      .map((entry, i) => integer(entry, `economy.${key}[${i}]`));
  const timers = fixedArray(economy.dropperTimers, context.powderCount, "economy.dropperTimers")
    .map((entry, i) => finiteNonNegative(entry, `economy.dropperTimers[${i}]`));
  const layers = fixedArray(progression.layers, context.layerCount, "progression.layers").map((raw, i) => {
    const item = record(raw, `progression.layers[${i}]`);
    return { unlocked: boolean(item.unlocked, "layer.unlocked"), completed: boolean(item.completed, "layer.completed"), progress: finiteNonNegative(item.progress, "layer.progress") };
  });
  const milestones = fixedArray(progression.milestones, context.milestoneCount, "progression.milestones").map((raw, i) => {
    const item = record(raw, `progression.milestones[${i}]`);
    return { unlocked: boolean(item.unlocked, "milestone.unlocked"), achieved: boolean(item.achieved, "milestone.achieved"), applied: boolean(item.applied, "milestone.applied") };
  });
  const inventories = fixedArray(economy.legacyInventories, context.powderCount, "economy.legacyInventories")
    .map((entry, i) => {
      if (!Array.isArray(entry)) throw new Error(`legacyInventories[${i}] must be an array`);
      return structuredClone(entry) as Inventory;
    });
  const selectedMaterial = integer(economy.selectedMaterial, "economy.selectedMaterial");
  if (selectedMaterial >= context.powderCount) throw new Error("selected material is out of range");
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: root.savedAt,
    stageWorld: validateStageSave(root.stageWorld),
    economy: {
      dust: finiteNonNegative(economy.dust, "economy.dust"),
      totalDustEarned: finiteNonNegative(economy.totalDustEarned, "economy.totalDustEarned"),
      crystalCores: integer(economy.crystalCores, "economy.crystalCores"),
      totalPowderCollected: integer(economy.totalPowderCollected, "economy.totalPowderCollected"),
      selectedMaterial,
      tierUnlocks,
      autoDroppers: integerArray("autoDroppers"),
      dropperTimers: timers,
      powderCounts: integerArray("powderCounts"),
      legacyInventories: inventories,
    },
    progression: {
      upgrades: levels(progression.upgrades, context.upgradeKeys, "progression.upgrades"),
      research: levels(progression.research, context.researchKeys, "progression.research"),
      layers,
      milestones,
    },
    automation: {
      settings: { autoDrop: boolean(settings.autoDrop, "automation.settings.autoDrop"), autoCompress: boolean(settings.autoCompress, "automation.settings.autoCompress") },
      unlocks: { autoDrop: boolean(unlocks.autoDrop, "automation.unlocks.autoDrop"), autoCompress: boolean(unlocks.autoCompress, "automation.unlocks.autoCompress") },
      autoDropTimer: finiteNonNegative(automation.autoDropTimer, "automation.autoDropTimer"),
      autoCompressTimer: finiteNonNegative(automation.autoCompressTimer, "automation.autoCompressTimer"),
    },
    interface: {
      activeMenu: typeof interfaceState.activeMenu === "string" ? interfaceState.activeMenu : "sandfall",
      codexUnlocked: boolean(interfaceState.codexUnlocked, "interface.codexUnlocked"),
      selectedModule: interfaceState.selectedModule === null || typeof interfaceState.selectedModule === "string" ? interfaceState.selectedModule : null,
    },
  };
}
