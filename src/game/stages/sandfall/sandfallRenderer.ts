import type P5 from "p5";
import { effectProgress, type StageEffect } from "../../effects/stageEffects";
import { MatterStore } from "../../matter/matterStore";
import { sandPalette } from "../stageVisualModels";
import type { SandfallState } from "./sandfallStage";

export interface SandfallRenderContext {
  time: number;
  effects: readonly StageEffect[];
  destinationUnlocked: boolean;
  transferCount: number;
  reservoirFull: boolean;
  gravity: number;
  castCount: number;
  cooldownProgress: number;
  autoCast: boolean;
}

export function renderSandfall(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<SandfallState>,
  context: SandfallRenderContext,
): void {
  const breath = Math.sin(context.time * 1.7) * 0.5 + 0.5;
  surface.noStroke();
  surface.fill(4, 11, 24);
  surface.rect(0, 0, 48, 48);
  surface.stroke(22, 52, 81);
  const stars: Array<[number, number]> = [[8, 8], [37, 6], [13, 19], [41, 25], [7, 33]];
  for (const [x, y] of stars)
    surface.point(x, y);

  surface.noFill();
  surface.stroke(54 + breath * 16, 91 + breath * 18, 137 + breath * 20);
  surface.rect(0.5, 0.5, 47, 47);
  drawCornerRunes(surface, 2, 2);
  drawCornerRunes(surface, 46, 2, -1);

  surface.stroke(46, 84, 106);
  surface.line(2, 36, 17, 42);
  surface.line(46, 36, 30, 42);
  surface.line(17, 42, 21, 46);
  surface.line(30, 42, 26, 46);
  surface.stroke(83, 134, 145);
  surface.line(21, 46, 26, 46);

  for (const id of state.activeIds) {
    const entity = matter.get(id);
    const moving = Math.abs(entity.vy) > 0.05 || entity.movement > 0.35;
    const [r, g, b] = sandPalette(entity.visualSeed, moving);
    surface.stroke(r, g, b);
    const x = Math.round(entity.x), y = Math.round(entity.y);
    surface.point(x, y);
    if (moving && context.gravity > 24 && entity.visualSeed % 7 === 0) {
      surface.stroke(r, g, Math.max(0, b - 28));
      surface.point(x, y - 1);
    }
  }

  for (let index = 0; index < state.outputIds.length; index++) {
    const id = state.outputIds[index]!;
    const x = 22 + (index % 5), y = 45 - Math.floor((index % 15) / 5);
    const [r, g, b] = sandPalette(matter.get(id).visualSeed, false);
    surface.stroke(r, g, b);
    surface.point(x, y);
  }

  const aperturePulse = context.transferCount > 0 ? 1 : breath * 0.45;
  surface.noFill();
  surface.stroke(
    context.reservoirFull ? 185 : context.destinationUnlocked ? 79 : 72,
    context.reservoirFull ? 92 : context.destinationUnlocked ? 211 : 103,
    context.reservoirFull ? 108 : context.destinationUnlocked ? 207 : 126,
  );
  surface.circle(24, 46, 3 + aperturePulse * 2);
  if (!context.destinationUnlocked || context.reservoirFull) {
    surface.line(22, 46, 26, 46);
    surface.line(24, 44, 24, 47);
  } else {
    surface.point(24, 47);
    if (state.outputIds.length) {
      surface.stroke(133, 238, 216);
      surface.point(23, 44);
      surface.point(25, 43);
    }
  }

  drawConjurationEffects(surface, context.effects);
  if (context.autoCast) drawAutoSigil(surface, state.autoCastElapsed);
  drawCooldown(surface, context.cooldownProgress, context.castCount);

  surface.noStroke();
  surface.fill(116, 154, 184);
  surface.textSize(3);
  surface.textAlign("center", "top");
  surface.text("SANDFALL ATRIUM", 24, 2);
}

function drawCornerRunes(surface: P5.Graphics, x: number, y: number, direction = 1): void {
  surface.line(x, y, x + 3 * direction, y);
  surface.line(x, y, x, y + 3);
  surface.point(x + direction, y + 1);
}

function drawConjurationEffects(surface: P5.Graphics, effects: readonly StageEffect[]): void {
  for (const effect of effects) {
    if (effect.kind !== "conjuration") continue;
    const p = effectProgress(effect), contraction = 1 - p;
    const centerX = Math.round(effect.x);
    surface.noFill();
    surface.stroke(effect.automatic ? 91 : 119, effect.automatic ? 212 : 232, 220);
    const radius = Math.max(2, Math.round((3 + Math.min(5, effect.entityIds.length / 2)) * contraction));
    surface.circle(centerX, 3, radius * 2);
    for (let index = 0; index < Math.min(6, effect.entityIds.length + 2); index++) {
      const angle = ((effect.seed + index * 37) % 360) * Math.PI / 180;
      surface.point(
        Math.round(centerX + Math.cos(angle) * radius),
        Math.round(3 + Math.sin(angle) * radius * 0.55),
      );
    }
    if (p > 0.35 && p < 0.7) {
      surface.stroke(244, 224, 167);
      surface.point(centerX, 3);
    }
  }
}

function drawAutoSigil(surface: P5.Graphics, charge: number): void {
  const lit = Math.max(0, Math.min(1, charge));
  surface.noFill();
  surface.stroke(72, 128 + lit * 100, 157 + lit * 70);
  surface.rect(39.5, 4.5, 4, 4);
  surface.point(41, 6);
}

function drawCooldown(surface: P5.Graphics, progress: number, castCount: number): void {
  const width = Math.max(1, Math.round(5 * Math.max(0, Math.min(1, progress))));
  surface.stroke(51, 74, 97);
  surface.line(4, 6, 9, 6);
  surface.stroke(98, 201, 190);
  surface.line(4, 6, 4 + width, 6);
  if (castCount > 1) {
    surface.noStroke();
    surface.fill(132, 173, 187);
    surface.textSize(3);
    surface.textAlign("left", "top");
    surface.text(`x${castCount}`, 4, 8);
  }
}
