import { describe, expect, it } from 'vitest';
import powders from '../data/powders.json';
import machines from '../data/machines.json';
import upgrades from '../data/upgrades.json';
import progression from '../data/progression.json';
import {
  GameDataValidationError,
  validateMachinesData,
  validatePowderData,
  validateProgressionData,
  validateUpgradesData
} from '../src/config/validateGameData';

describe('JSON data validation', () => {
  it('accepts every checked-in data file', () => {
    expect(validatePowderData(powders).types).toHaveLength(9);
    expect(validateMachinesData(machines).definitions[0]?.key).toBe('jar');
    expect(validateUpgradesData(upgrades).upgrades.length).toBeGreaterThan(0);
    expect(validateProgressionData(progression).milestones.length).toBeGreaterThan(0);
  });

  it('normalizes a missing dust value using the legacy tier fallback', () => {
    const data = structuredClone(powders) as unknown as {
      types: Array<{ dustValue?: number }>;
    };
    delete data.types[1]?.dustValue;
    expect(validatePowderData(data).types[1]?.dustValue).toBe(10);
  });

  it('identifies the affected file when required data is invalid', () => {
    expect(() => validatePowderData({ types: [] })).toThrowError(GameDataValidationError);
    expect(() => validatePowderData({ types: [] })).toThrow('data/powders.json');
  });
});
