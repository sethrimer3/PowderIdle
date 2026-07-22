import type { MaterialType, StageId } from "../game/matter/matterTypes";
import type {
  CompressionPhase,
  StageConfig,
  StageDefinition,
  StageUpgradeDefinition,
} from "../game/stages/stageTypes";
import type { StageUpgradeId } from "../game/stages/stageTypes";

const materials = new Set<MaterialType>(["sand", "stone"]);
const stageIds = new Set<StageId>([
  "sandfall-atrium",
  "compression-crucible",
  "stage-3",
  "stage-4",
  "stage-5",
  "stage-6",
  "stage-7",
  "stage-8",
  "stage-9",
]);
const timingKeys: Exclude<CompressionPhase, "gathering" | "ready">[] = [
  "levitating",
  "aligning",
  "compressing",
  "impact",
  "revealing",
  "releasing",
  "cooldown",
];
const requiredUpgradeIds: StageUpgradeId[] = [
  "manual-cast-count",
  "cast-cooldown",
  "gravity",
  "output-throughput",
  "auto-cast",
  "ritual-speed",
  "reservoir-capacity",
  "release-speed",
  "auto-ritual",
];
const fail = (message: string): never => {
  throw new Error(`data/stages.json: ${message}`);
};
const object = (value: unknown, label: string): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail(`${label} must be an object`);
const finite = (value: unknown, label: string): number =>
  typeof value === "number" && Number.isFinite(value)
    ? value
    : fail(`${label} must be finite`);
const positive = (value: unknown, label: string): number => {
  const result = finite(value, label);
  return result > 0 ? result : fail(`${label} must be positive`);
};
const positiveInt = (value: unknown, label: string): number => {
  const result = positive(value, label);
  return Number.isInteger(result)
    ? result
    : fail(`${label} must be a positive integer`);
};
const string = (value: unknown, label: string): string =>
  typeof value === "string" && value.length > 0
    ? value
    : fail(`${label} must be a string`);
const material = (value: unknown, label: string): MaterialType =>
  materials.has(value as MaterialType)
    ? (value as MaterialType)
    : fail(`${label} has an invalid material`);

export function validateStageConfig(value: unknown): StageConfig {
  const root = object(value, "root");
  if (root.schemaVersion !== 2) fail("unsupported schemaVersion; expected 2");
  const camera = object(root.camera, "camera");
  const rawStages = Array.isArray(root.stages)
    ? root.stages
    : fail("stages must be an array");
  const ids = new Set<string>(),
    positions = new Set<string>(),
    orders = new Set<number>();
  const stages: StageDefinition[] = rawStages.map((raw, index) => {
    const item = object(raw, `stages[${index}]`),
      id = string(item.id, `stages[${index}].id`) as StageId;
    if (!stageIds.has(id) || ids.has(id))
      fail(`stages[${index}].id is invalid or duplicate`);
    ids.add(id);
    const order = positiveInt(item.order, `stages[${index}].order`);
    if (orders.has(order)) fail(`duplicate stage order ${order}`);
    orders.add(order);
    const grid = object(item.gridPosition, `stages[${index}].gridPosition`),
      col = finite(grid.col, "grid col"),
      row = finite(grid.row, "grid row");
    if (
      !Number.isInteger(col) ||
      !Number.isInteger(row) ||
      col < 0 ||
      col > 2 ||
      row < 0 ||
      row > 2
    )
      fail("grid positions must be integers from 0 to 2");
    const key = `${col},${row}`;
    if (positions.has(key)) fail(`duplicate grid position ${key}`);
    positions.add(key);
    const implemented = item.implemented === true,
      input =
        item.inputMaterial === null
          ? null
          : material(item.inputMaterial, "inputMaterial"),
      output = material(item.outputMaterial, "outputMaterial");
    const unlockRaw = object(item.unlockCondition, "unlockCondition");
    let unlockCondition: StageDefinition["unlockCondition"] = {
      kind: "disabled",
    };
    if (unlockRaw.kind === "initial" || unlockRaw.kind === "disabled")
      unlockCondition = { kind: unlockRaw.kind };
    else if (unlockRaw.kind === "lifetime-material")
      unlockCondition = {
        kind: "lifetime-material",
        stageId: string(unlockRaw.stageId, "unlock stage") as StageId,
        material: material(unlockRaw.material, "unlock material"),
        count: positiveInt(unlockRaw.count, "unlock count"),
      };
    else fail("invalid unlock condition");
    const connectionTargets = (
      Array.isArray(item.connectionTargets)
        ? item.connectionTargets
        : fail("connectionTargets must be an array")
    ).map((target, i) => string(target, `connectionTargets[${i}]`) as StageId);
    const settingsRaw =
      item.settings === undefined
        ? undefined
        : object(item.settings, "settings");
    const settings = settingsRaw
      ? Object.fromEntries(
          Object.entries(settingsRaw).map(([k, v]) => [
            k,
            positiveInt(v, `settings.${k}`),
          ]),
        )
      : undefined;
    return {
      id,
      name: string(item.name, "name"),
      order,
      gridPosition: { col, row },
      implemented,
      inputMaterial: input,
      outputMaterial: output,
      unlockCondition,
      connectionTargets,
      ...(settings ? { settings } : {}),
    };
  });
  for (const stage of stages) {
    for (const target of stage.connectionTargets)
      if (!ids.has(target)) fail(`${stage.id} targets missing stage ${target}`);
    if (!stage.implemented && stage.connectionTargets.length)
      fail(`unimplemented ${stage.id} cannot route resources`);
  }
  const rawConnections = Array.isArray(root.connections)
      ? root.connections
      : fail("connections must be an array"),
    connectionIds = new Set<string>(),
    pairs = new Set<string>();
  const connections = rawConnections.map((raw, index) => {
    const item = object(raw, `connections[${index}]`),
      id = string(item.id, "connection id"),
      from = string(item.from, "connection from") as StageId,
      to = string(item.to, "connection to") as StageId,
      pair = `${from}->${to}`;
    if (connectionIds.has(id) || pairs.has(pair))
      fail("duplicate stage connection");
    if (!ids.has(from) || !ids.has(to)) fail("connection endpoint missing");
    const destination = stages.find((stage) => stage.id === to);
    if (!destination?.implemented)
      fail("connections cannot target unimplemented stages");
    connectionIds.add(id);
    pairs.add(pair);
    return {
      id,
      from,
      to,
      duration: positive(item.duration, "connection duration"),
    };
  });
  const timingsRaw = object(root.ritualTimings, "ritualTimings"),
    ritualTimings = Object.fromEntries(
      timingKeys.map((key) => [
        key,
        positive(timingsRaw[key], `ritualTimings.${key}`),
      ]),
    ) as StageConfig["ritualTimings"];
  const rawUpgrades = Array.isArray(root.upgrades)
    ? root.upgrades
    : fail("upgrades must be an array");
  const upgradeIds = new Set<string>();
  const upgrades = rawUpgrades.map((raw, index) => {
    const item = object(raw, `upgrades[${index}]`);
    const id = string(item.id, "upgrade id") as StageUpgradeDefinition["id"];
    if (!requiredUpgradeIds.includes(id) || upgradeIds.has(id))
      fail(`upgrade ${id} is invalid or duplicate`);
    upgradeIds.add(id);
    const stageId = string(item.stageId, "upgrade stage") as StageId;
    if (!ids.has(stageId)) fail(`upgrade ${id} references missing stage ${stageId}`);
    return {
      id,
      stageId,
      baseValue: finite(item.baseValue, "baseValue"),
      perLevel: finite(item.perLevel, "perLevel"),
      maxLevel: positiveInt(item.maxLevel, "maxLevel"),
    };
  });
  for (const id of requiredUpgradeIds)
    if (!upgradeIds.has(id)) fail(`missing required upgrade ${id}`);
  return {
    schemaVersion: 2,
    camera: {
      transitionDuration: positive(
        camera.transitionDuration,
        "camera.transitionDuration",
      ),
      padding: finite(camera.padding, "camera.padding"),
    },
    stages,
    connections,
    ritualTimings,
    upgrades,
  };
}
