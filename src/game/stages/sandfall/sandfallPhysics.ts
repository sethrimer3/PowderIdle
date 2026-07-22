import type { EntityId } from "../../matter/matterTypes";
import { MatterStore } from "../../matter/matterStore";

export interface SandfallPhysicsConfig {
  width: number;
  height: number;
  gravity: number;
}

const ATTRACTION_G = 3;
const ATTRACTION_EPS = 0.5;
const MAX_FORCE = 30;
const INTERACTION_RADIUS = 5;
const WALL_MARGIN = 2;

export class SandfallPhysics {
  constructor(
    private readonly matter: MatterStore,
    private readonly config: SandfallPhysicsConfig,
  ) {}
  setGravity(gravity: number): void {
    this.config.gravity = gravity;
  }
  update(ids: readonly EntityId[], dt: number): void {
    if (ids.length === 0) return;
    const cell = INTERACTION_RADIUS;
    const key = (x: number, y: number) =>
      `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
    const positions = new Map<EntityId, { x: number; y: number }>();
    const grid = new Map<string, EntityId[]>();
    for (const id of ids) {
      const entity = this.matter.get(id);
      positions.set(id, { x: entity.x, y: entity.y });
      const bucketKey = key(entity.x, entity.y);
      const bucket = grid.get(bucketKey);
      if (bucket) bucket.push(id);
      else grid.set(bucketKey, [id]);
    }
    const accel = new Map<EntityId, { ax: number; ay: number }>();
    for (const id of ids) accel.set(id, { ax: 0, ay: this.config.gravity });
    const radiusSq = INTERACTION_RADIUS * INTERACTION_RADIUS;
    for (const id of ids) {
      const p = positions.get(id)!;
      const cx = Math.floor(p.x / cell),
        cy = Math.floor(p.y / cell);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
          const bucket = grid.get(`${cx + dx},${cy + dy}`);
          if (!bucket) continue;
          for (const other of bucket) {
            if (other <= id) continue;
            const q = positions.get(other)!;
            const ddx = q.x - p.x,
              ddy = q.y - p.y,
              distSq = ddx * ddx + ddy * ddy;
            if (distSq > radiusSq) continue;
            const dist = Math.sqrt(distSq) || 1,
              force = Math.min(MAX_FORCE, ATTRACTION_G / (distSq + ATTRACTION_EPS)),
              fx = (ddx / dist) * force,
              fy = (ddy / dist) * force,
              a1 = accel.get(id)!,
              a2 = accel.get(other)!;
            a1.ax += fx;
            a1.ay += fy;
            a2.ax -= fx;
            a2.ay -= fy;
          }
        }
    }
    for (const id of ids) {
      const entity = this.matter.get(id),
        a = accel.get(id)!;
      let vx = entity.vx + a.ax * dt,
        vy = entity.vy + a.ay * dt,
        x = entity.x + vx * dt,
        y = entity.y + vy * dt;
      if (x < WALL_MARGIN) {
        x = WALL_MARGIN;
        vx = 0;
      } else if (x > this.config.width - WALL_MARGIN) {
        x = this.config.width - WALL_MARGIN;
        vx = 0;
      }
      if (y < 0) {
        y = 0;
        vy = 0;
      } else if (y > this.config.height - WALL_MARGIN) {
        y = this.config.height - WALL_MARGIN;
        vy = 0;
      }
      this.matter.setPosition(id, x, y);
      this.matter.setVelocity(id, vx, vy);
    }
  }
}
