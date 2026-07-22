import type { EntityId } from "../../matter/matterTypes";
import { MatterStore } from "../../matter/matterStore";

export interface SandfallPhysicsConfig {
  width: number;
  height: number;
  funnelMinX: number;
  funnelMaxX: number;
  gravity: number;
  maxStepsPerUpdate: number;
}
export class SandfallPhysics {
  private readonly occupancy: Uint32Array;
  constructor(
    private readonly matter: MatterStore,
    private readonly config: SandfallPhysicsConfig,
  ) {
    this.occupancy = new Uint32Array(config.width * config.height);
  }
  setGravity(gravity: number): void {
    this.config.gravity = gravity;
  }
  update(
    ids: readonly EntityId[],
    dt: number,
    onFunnel: (id: EntityId) => void,
  ): void {
    this.occupancy.fill(0);
    for (const id of ids) {
      const entity = this.matter.get(id);
      this.occupancy[this.index(Math.round(entity.x), Math.round(entity.y))] =
        id;
    }
    for (let index = ids.length - 1; index >= 0; index--) {
      const id = ids[index]!,
        entity = this.matter.get(id);
      let x = Math.round(entity.x),
        y = Math.round(entity.y),
        movement =
          entity.movement +
          entity.vy * dt +
          0.5 * this.config.gravity * dt * dt,
        velocity = entity.vy + this.config.gravity * dt,
        steps = Math.min(this.config.maxStepsPerUpdate, Math.floor(movement));
      this.occupancy[this.index(x, y)] = 0;
      movement -= steps;
      while (steps-- > 0) {
        if (
          y >= this.config.height - 3 &&
          x >= this.config.funnelMinX &&
          x <= this.config.funnelMaxX
        ) {
          onFunnel(id);
          break;
        }
        const preference = ((id + y) & 1) === 0 ? 1 : -1;
        if (this.empty(x, y + 1)) {
          y++;
          continue;
        }
        if (this.empty(x + preference, y + 1)) {
          x += preference;
          y++;
          continue;
        }
        if (this.empty(x - preference, y + 1)) {
          x -= preference;
          y++;
          continue;
        }
        const toward =
          x < this.config.funnelMinX ? 1 : x > this.config.funnelMaxX ? -1 : 0;
        if (
          y >= this.config.height - 6 &&
          toward !== 0 &&
          this.empty(x + toward, y)
        ) {
          x += toward;
          continue;
        }
        velocity = 0;
        movement = 0;
        break;
      }
      const owner = this.matter.get(id).owner;
      if (
        owner.kind === "stage" &&
        owner.stageId === "sandfall-atrium" &&
        owner.slot === "active"
      ) {
        this.matter.setPosition(id, x, y);
        this.matter.setMotion(id, velocity, movement);
        this.occupancy[this.index(x, y)] = id;
      }
    }
  }
  private empty(x: number, y: number): boolean {
    return (
      x > 1 &&
      x < this.config.width - 2 &&
      y >= 0 &&
      y < this.config.height - 2 &&
      this.occupancy[this.index(x, y)] === 0
    );
  }
  private index(x: number, y: number): number {
    return y * this.config.width + x;
  }
}
