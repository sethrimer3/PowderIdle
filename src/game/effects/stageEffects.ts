import type { EntityId, StageId } from "../matter/matterTypes";

export type StageEffect =
  | {
      kind: "conjuration";
      stageId: StageId;
      entityIds: readonly EntityId[];
      x: number;
      elapsed: number;
      duration: number;
      automatic: boolean;
      seed: number;
    }
  | {
      kind: "unlock-trace";
      stageId: StageId;
      elapsed: number;
      duration: number;
      seed: number;
    }
  | {
      kind: "invocation";
      stageId: StageId;
      elapsed: number;
      duration: number;
      automatic: boolean;
      seed: number;
    }
  | {
      kind: "impact";
      stageId: StageId;
      entityIds: readonly EntityId[];
      elapsed: number;
      duration: number;
      seed: number;
    };

export const MAX_STAGE_EFFECTS = 48;

export class StageEffectSystem {
  private readonly active: StageEffect[] = [];

  get effects(): readonly StageEffect[] {
    return this.active;
  }

  emit(effect: StageEffect): void {
    if (this.active.length >= MAX_STAGE_EFFECTS) this.active.shift();
    this.active.push(effect);
  }

  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) return;
    for (const effect of this.active) effect.elapsed += dt;
    for (let index = this.active.length - 1; index >= 0; index--)
      if (this.active[index]!.elapsed >= this.active[index]!.duration)
        this.active.splice(index, 1);
  }

  forStage(stageId: StageId): readonly StageEffect[] {
    return this.active.filter((effect) => effect.stageId === stageId);
  }

  cameraOffset(): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const effect of this.active) {
      if (effect.kind !== "impact") continue;
      const progress = Math.min(1, effect.elapsed / effect.duration);
      const strength = (1 - progress) ** 2 * 1.35;
      x += Math.sin(effect.seed * 0.31 + progress * 41) * strength;
      y += Math.cos(effect.seed * 0.47 + progress * 37) * strength;
    }
    return { x, y };
  }

  reset(): void {
    this.active.splice(0);
  }
}

export function effectProgress(effect: StageEffect): number {
  return Math.max(0, Math.min(1, effect.elapsed / effect.duration));
}
