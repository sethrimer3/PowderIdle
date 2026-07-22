import { CHAMBER_SIZE } from "../stages/stageLayout";
import type { GridPosition } from "../stages/stageTypes";
export interface CameraTarget {
  centerX: number;
  centerY: number;
  zoom: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export function computeCameraTarget(
  positions: readonly GridPosition[],
  padding = 0,
): CameraTarget {
  if (!positions.length) throw new Error("Camera requires an unlocked stage");
  const minCol = Math.min(...positions.map((p) => p.col)),
    maxCol = Math.max(...positions.map((p) => p.col)),
    minRow = Math.min(...positions.map((p) => p.row)),
    maxRow = Math.max(...positions.map((p) => p.row));
  const minX = minCol * CHAMBER_SIZE - padding,
    minY = minRow * CHAMBER_SIZE - padding,
    maxX = (maxCol + 1) * CHAMBER_SIZE + padding,
    maxY = (maxRow + 1) * CHAMBER_SIZE + padding,
    span = Math.max(maxX - minX, maxY - minY);
  let zoom =
    positions.length === 1
      ? 3
      : Math.max(1, Math.min(3, (CHAMBER_SIZE * 3) / span));
  if (minCol === 0 && maxCol === 2 && minRow === 0 && maxRow === 2) zoom = 1;
  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    zoom,
    minX,
    minY,
    maxX,
    maxY,
  };
}
export class StageCamera {
  current: CameraTarget;
  target: CameraTarget;
  private from: CameraTarget;
  private elapsed: number;
  constructor(
    initial: CameraTarget,
    private readonly duration = 1,
  ) {
    this.current = { ...initial };
    this.target = { ...initial };
    this.from = { ...initial };
    this.elapsed = duration;
  }
  setTarget(target: CameraTarget): void {
    this.from = { ...this.current };
    this.target = { ...target };
    this.elapsed = 0;
  }
  update(dt: number): void {
    this.elapsed = Math.min(this.duration, this.elapsed + dt);
    const raw = this.duration === 0 ? 1 : this.elapsed / this.duration,
      t = raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2;
    for (const key of [
      "centerX",
      "centerY",
      "zoom",
      "minX",
      "minY",
      "maxX",
      "maxY",
    ] as const)
      this.current[key] =
        this.from[key] + (this.target[key] - this.from[key]) * t;
  }
}
