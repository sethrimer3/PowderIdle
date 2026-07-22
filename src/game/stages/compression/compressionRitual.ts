import type { EntityId } from "../../matter/matterTypes";
import type { CompressionPhase } from "../stageTypes";
export interface RitualMote {
  entityId: EntityId;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
}
export interface CompressionBatch {
  ritualId: string;
  phase: CompressionPhase;
  elapsed: number;
  motes: RitualMote[];
  conversionCompleted: boolean;
  outputStoneId: EntityId | null;
  outputEventId: string | null;
  stoneX: number;
  stoneY: number;
}
export function ritualTarget(
  id: EntityId,
  index: number,
  count: number,
): { x: number; y: number } {
  const ring = index % 3,
    radius = 6 + ring * 3,
    angle = (index / count) * Math.PI * 2 + ((id * 17) % 29) / 29;
  return {
    x: 24 + Math.cos(angle) * radius,
    y: 24 + Math.sin(angle) * radius * 0.62,
  };
}
export function phaseProgress(
  batch: CompressionBatch,
  duration: number,
): number {
  return Math.max(0, Math.min(1, batch.elapsed / duration));
}

const minimumDurations: Partial<Record<CompressionPhase, number>> = {
  levitating: 0.3,
  aligning: 0.25,
  compressing: 0.2,
  impact: 0.08,
  revealing: 0.3,
  releasing: 0.24,
  cooldown: 0.1,
};

export function readablePhaseSpeed(
  phase: CompressionPhase,
  configuredSpeed: number,
  configuredDuration: number,
): number {
  const requested = Math.max(0.05, configuredSpeed);
  const minimum = minimumDurations[phase] ?? 0.05;
  return Math.min(requested, configuredDuration / minimum);
}

export function compressionScale(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return (1 - p) ** 3;
}
