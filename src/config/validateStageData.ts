import type { StageConfig } from '../game/stages/stageController';

export function validateStageConfig(value: unknown): StageConfig {
  if (!value || typeof value !== 'object') throw new Error('data/stages.json must be an object');
  const source = value as Record<string, unknown>;
  const positive = (key: string): number => {
    const result = source[key];
    if (typeof result !== 'number' || !Number.isFinite(result) || result <= 0) throw new Error(`${key} must be positive`);
    return result;
  };
  const rawTimings = source.timings;
  if (!rawTimings || typeof rawTimings !== 'object') throw new Error('timings must be an object');
  const timings = rawTimings as Record<string, unknown>;
  const timing = (key: string): number => {
    const result = timings[key];
    if (typeof result !== 'number' || result <= 0) throw new Error(`timings.${key} must be positive`);
    return result;
  };
  return { schemaVersion: 1, stage2UnlockLifetimeSand: positive('stage2UnlockLifetimeSand'), compressionInputCount: positive('compressionInputCount'), reservoirCapacity: positive('reservoirCapacity'), transferDuration: positive('transferDuration'), timings: { levitating: timing('levitating'), aligning: timing('aligning'), compressing: timing('compressing'), impact: timing('impact'), revealing: timing('revealing'), releasing: timing('releasing'), cooldown: timing('cooldown') } };
}
