import type {
  CompressionRecipe,
  MachineConnection,
  MachineDefinition,
  MachineModuleKey,
  MachinesData,
  MenuTab,
  MilestoneConfig,
  MilestoneEffectType,
  MilestoneResource,
  PowderData,
  PowderDefinition,
  ProgressionData,
  ResearchProject,
  StrataLayer,
  UpgradeConfig,
  UpgradesData
} from '../types/game';

export class GameDataValidationError extends Error {
  constructor(
    readonly file: string,
    readonly details: string
  ) {
    super(`Invalid ${file}: ${details}`);
    this.name = 'GameDataValidationError';
  }
}

type JsonObject = { [key: string]: unknown };

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function requireObject(value: unknown, file: string): JsonObject {
  if (!isObject(value)) throw new GameDataValidationError(file, 'expected an object');
  return value;
}

function requireArray(value: unknown, file: string, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new GameDataValidationError(file, `${field} must be an array`);
  }
  return value;
}

function requireString(object: JsonObject, field: string, file: string): string {
  const value = object[field];
  if (!isString(value) || value.length === 0) {
    throw new GameDataValidationError(file, `${field} must be a non-empty string`);
  }
  return value;
}

function requireNumber(object: JsonObject, field: string, file: string): number {
  const value = object[field];
  if (!isFiniteNumber(value)) {
    throw new GameDataValidationError(file, `${field} must be a finite number`);
  }
  return value;
}

function optionalNumber(object: JsonObject, field: string, file: string): number | undefined {
  const value = object[field];
  if (value === undefined) return undefined;
  if (!isFiniteNumber(value)) {
    throw new GameDataValidationError(file, `${field} must be a finite number when present`);
  }
  return value;
}

function parseMachineKey(value: string, file: string): MachineModuleKey {
  switch (value) {
    case 'jar':
    case 'conveyor':
    case 'rocket':
    case 'asteroid':
    case 'planet':
    case 'forge':
    case 'galaxy':
    case 'universe':
    case 'singularity':
      return value;
    default:
      throw new GameDataValidationError(file, `unsupported machine key: ${value}`);
  }
}

function parseUpgradeModule(
  value: string,
  file: string
): NonNullable<UpgradeConfig['module']> {
  const key = parseMachineKey(value, file);
  if (key === 'jar') {
    throw new GameDataValidationError(file, 'jar cannot own module upgrades');
  }
  return key;
}

function parseMilestoneResource(value: string, file: string): MilestoneResource {
  switch (value) {
    case 'dust':
    case 'cores':
    case 'powder':
      return value;
    default:
      throw new GameDataValidationError(file, `unsupported milestone resource: ${value}`);
  }
}

function parseMilestoneEffect(value: string, file: string): MilestoneEffectType {
  switch (value) {
    case 'unlockAutoDrop':
    case 'unlockAutoCompress':
    case 'gravityBonus':
    case 'dustBonus':
    case 'codexUnlock':
    case 'coreBonus':
      return value;
    default:
      throw new GameDataValidationError(file, `unsupported milestone effect: ${value}`);
  }
}

export function validatePowderData(value: unknown): PowderData {
  const file = 'data/powders.json';
  const object = requireObject(value, file);
  const types: PowderDefinition[] = requireArray(object.types, file, 'types').map((entry, index) => {
    const item = requireObject(entry, `${file} types[${index}]`);
    return {
      key: requireString(item, 'key', file),
      name: requireString(item, 'name', file),
      color: requireString(item, 'color', file),
      size: requireNumber(item, 'size', file),
      dustValue: optionalNumber(item, 'dustValue', file) ?? 10 ** index
    };
  });
  if (types.length === 0) throw new GameDataValidationError(file, 'types cannot be empty');

  const tierUnlockCosts = requireArray(object.tierUnlockCosts, file, 'tierUnlockCosts').map(
    (entry, index) => {
      if (!isFiniteNumber(entry)) {
        throw new GameDataValidationError(file, `tierUnlockCosts[${index}] must be a number`);
      }
      return entry;
    }
  );
  const compressionRecipes: CompressionRecipe[] = requireArray(
    object.compressionRecipes,
    file,
    'compressionRecipes'
  ).map((entry, index) => {
    const item = requireObject(entry, `${file} compressionRecipes[${index}]`);
    return {
      from: requireNumber(item, 'from', file),
      to: requireNumber(item, 'to', file),
      baseCost: requireNumber(item, 'baseCost', file),
      output: requireNumber(item, 'output', file)
    };
  });
  return { types, tierUnlockCosts, compressionRecipes };
}

export function validateMachinesData(value: unknown): MachinesData {
  const file = 'data/machines.json';
  const object = requireObject(value, file);
  const definitions: MachineDefinition[] = requireArray(object.definitions, file, 'definitions').map(
    (entry, index) => {
      const item = requireObject(entry, `${file} definitions[${index}]`);
      const grid = requireObject(item.grid, `${file} definitions[${index}].grid`);
      return {
        key: parseMachineKey(requireString(item, 'key', file), file),
        name: requireString(item, 'name', file),
        description: requireString(item, 'description', file),
        grid: {
          col: requireNumber(grid, 'col', file),
          row: requireNumber(grid, 'row', file),
          width: requireNumber(grid, 'width', file),
          height: requireNumber(grid, 'height', file)
        }
      };
    }
  );
  const knownKeys = new Set(definitions.map((definition) => definition.key));
  const connections: MachineConnection[] = requireArray(object.connections, file, 'connections').map(
    (entry, index) => {
      const item = requireObject(entry, `${file} connections[${index}]`);
      const from = parseMachineKey(requireString(item, 'from', file), file);
      const to = parseMachineKey(requireString(item, 'to', file), file);
      if (!knownKeys.has(from) || !knownKeys.has(to)) {
        throw new GameDataValidationError(file, `connections[${index}] references an unknown machine`);
      }
      return { from, to };
    }
  );
  const menuTabs: MenuTab[] = requireArray(object.menuTabs, file, 'menuTabs').map((entry, index) => {
    const item = requireObject(entry, `${file} menuTabs[${index}]`);
    const icon = item.icon;
    if (icon !== undefined && !isString(icon)) {
      throw new GameDataValidationError(file, `menuTabs[${index}].icon must be a string`);
    }
    return {
      key: requireString(item, 'key', file),
      label: requireString(item, 'label', file),
      ...(icon === undefined ? {} : { icon })
    };
  });
  return { definitions, connections, menuTabs };
}

function validateCostConfig(entry: unknown, file: string, label: string): UpgradeConfig {
  const item = requireObject(entry, label);
  const module = item.module;
  if (module !== undefined && !isString(module)) {
    throw new GameDataValidationError(file, `${label}.module must be a string`);
  }
  const config: UpgradeConfig = {
    key: requireString(item, 'key', file),
    name: requireString(item, 'name', file),
    description: requireString(item, 'description', file),
    baseCost: requireNumber(item, 'baseCost', file),
    costMult: requireNumber(item, 'costMult', file)
  };
  if (module !== undefined) {
    config.module = parseUpgradeModule(module, file);
  }
  return config;
}

export function validateUpgradesData(value: unknown): UpgradesData {
  const file = 'data/upgrades.json';
  const object = requireObject(value, file);
  const upgrades = requireArray(object.upgrades, file, 'upgrades').map((entry, index) =>
    validateCostConfig(entry, file, `upgrades[${index}]`)
  );
  const research: ResearchProject[] = requireArray(object.research, file, 'research').map(
    (entry, index) => {
      const item = requireObject(entry, `${file} research[${index}]`);
      const costMult = optionalNumber(item, 'costMult', file);
      const maxLevel = optionalNumber(item, 'maxLevel', file);
      if (costMult === undefined && maxLevel === undefined) {
        throw new GameDataValidationError(file, `research[${index}] needs costMult or maxLevel`);
      }
      return {
        key: requireString(item, 'key', file),
        name: requireString(item, 'name', file),
        description: requireString(item, 'description', file),
        baseCost: requireNumber(item, 'baseCost', file),
        ...(costMult === undefined ? {} : { costMult }),
        ...(maxLevel === undefined ? {} : { maxLevel })
      };
    }
  );
  return { upgrades, research };
}

export function validateProgressionData(value: unknown): ProgressionData {
  const file = 'data/progression.json';
  const object = requireObject(value, file);
  const strataLayers: StrataLayer[] = requireArray(object.strataLayers, file, 'strataLayers').map(
    (entry, index) => {
      const item = requireObject(entry, `${file} strataLayers[${index}]`);
      return {
        key: requireString(item, 'key', file),
        name: requireString(item, 'name', file),
        requirement: requireNumber(item, 'requirement', file),
        dustBonus: requireNumber(item, 'dustBonus', file),
        gravityBonus: requireNumber(item, 'gravityBonus', file),
        color: requireString(item, 'color', file),
        description: requireString(item, 'description', file)
      };
    }
  );
  const milestones: MilestoneConfig[] = requireArray(object.milestones, file, 'milestones').map(
    (entry, index) => {
      const item = requireObject(entry, `${file} milestones[${index}]`);
      const resource = parseMilestoneResource(requireString(item, 'resource', file), file);
      const type = parseMilestoneEffect(requireString(item, 'type', file), file);
      const magnitude = optionalNumber(item, 'magnitude', file);
      return {
        key: requireString(item, 'key', file),
        name: requireString(item, 'name', file),
        resource,
        requirement: requireNumber(item, 'requirement', file),
        description: requireString(item, 'description', file),
        reward: requireString(item, 'reward', file),
        type,
        ...(magnitude === undefined ? {} : { magnitude })
      };
    }
  );
  return { strataLayers, milestones };
}
