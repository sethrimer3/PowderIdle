import type {
  CompressionRecipe,
  MachineConnection,
  MachineDefinition,
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
        key: requireString(item, 'key', file) as MachineDefinition['key'],
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
      const from = requireString(item, 'from', file) as MachineConnection['from'];
      const to = requireString(item, 'to', file) as MachineConnection['to'];
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
    config.module = module as NonNullable<UpgradeConfig['module']>;
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

const milestoneResources = new Set<MilestoneResource>(['dust', 'cores', 'powder']);
const milestoneEffects = new Set<MilestoneEffectType>([
  'unlockAutoDrop',
  'unlockAutoCompress',
  'gravityBonus',
  'dustBonus',
  'codexUnlock',
  'coreBonus'
]);

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
      const resource = requireString(item, 'resource', file) as MilestoneResource;
      const type = requireString(item, 'type', file) as MilestoneEffectType;
      if (!milestoneResources.has(resource)) {
        throw new GameDataValidationError(file, `milestones[${index}].resource is unsupported`);
      }
      if (!milestoneEffects.has(type)) {
        throw new GameDataValidationError(file, `milestones[${index}].type is unsupported`);
      }
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
