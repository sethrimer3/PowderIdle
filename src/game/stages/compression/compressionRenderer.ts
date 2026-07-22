import type P5 from "p5";
import { effectProgress, type StageEffect } from "../../effects/stageEffects";
import { MatterStore } from "../../matter/matterStore";
import { MYSTICAL_COLORS } from "../../rendering/mysticalTheme";
import { reservoirVisualModel, VISIBLE_OUTPUT_SLOTS } from "../stageVisualModels";
import type { CompressionPhase } from "../stageTypes";
import type { CompressionState } from "./compressionStage";

export interface CompressionRenderContext {
  time: number;
  effects: readonly StageEffect[];
  capacity: number;
  ritualSpeed: number;
  releaseSpeed: number;
  autoRitual: boolean;
  unlockProgress: number;
}

export function renderCompression(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<CompressionState>,
  required: number,
  context: CompressionRenderContext,
): void {
  const ready = state.phase === "ready";
  const awakening = Math.min(1, state.reservoirIds.length / required);
  const pulse = Math.sin(context.time * (ready ? 3.2 : 1.35)) * 0.5 + 0.5;
  surface.noStroke();
  surface.fill(...MYSTICAL_COLORS.chamber);
  surface.rect(0, 0, 48, 48);
  surface.stroke(...MYSTICAL_COLORS.graphite);
  surface.point(7, 9); surface.point(40, 13); surface.point(9, 28); surface.point(37, 31);
  surface.noFill();
  surface.stroke(66 + awakening * 26, 58 + awakening * 20, 74 + awakening * 35);
  surface.rect(0.5, 0.5, 47, 47);

  drawRitualGlyph(surface, state.phase, awakening, pulse, context.time);
  drawReservoir(surface, matter, state, required, context.capacity);
  drawBatch(surface, matter, state);
  drawStones(surface, matter, state, context.time);
  drawEffects(surface, context.effects);

  if (context.autoRitual) {
    surface.stroke(...MYSTICAL_COLORS.emberLight);
    surface.rect(40, 4, 3, 3);
    surface.point(41, 5);
  }

  surface.noStroke();
  surface.fill(...MYSTICAL_COLORS.violet);
  surface.textSize(3);
  surface.textAlign("center", "top");
  surface.text("COMPRESSION CRUCIBLE", 24, 2);
  const status = phaseLabel(state.phase, state.reservoirIds.length, required);
  const statusColor = ready ? MYSTICAL_COLORS.emberLight : MYSTICAL_COLORS.ash;
  surface.fill(statusColor[0], statusColor[1], statusColor[2]);
  surface.text(status, 24, 6);
  if (context.unlockProgress < 1) {
    surface.noStroke();
    surface.fill(...MYSTICAL_COLORS.void, Math.round((1 - context.unlockProgress) * 235));
    surface.rect(1, 1, 46, 46);
    surface.noFill();
    surface.stroke(...MYSTICAL_COLORS.violet);
    const traced = Math.max(2, Math.round(44 * context.unlockProgress));
    surface.line(2, 46, 2, 46 - traced);
    surface.line(2, 46, Math.min(46, 2 + traced), 46);
  }
}

function drawRitualGlyph(
  surface: P5.Graphics,
  phase: CompressionPhase,
  awakening: number,
  pulse: number,
  time: number,
): void {
  const active = !["gathering", "cooldown"].includes(phase);
  surface.noFill();
  surface.stroke(72 + awakening * 55, 61 + awakening * 45, 82 + awakening * 82);
  surface.circle(24, 23, 8 + awakening * 4 + (active ? pulse : 0));
  surface.stroke(94 + awakening * 74, 67 + awakening * 48, 111 + awakening * 84);
  surface.circle(24, 23, 17 + (phase === "compressing" ? -pulse * 2 : 0));
  for (let index = 0; index < 8; index++) {
    const angle = time * (active ? 0.4 : 0.08) + index * Math.PI / 4;
    const radius = 9;
    const x = Math.round(24 + Math.cos(angle) * radius);
    const y = Math.round(23 + Math.sin(angle) * radius * 0.66);
    if (index / 8 <= awakening) surface.point(x, y);
  }
  if (phase === "ready") {
    surface.stroke(...MYSTICAL_COLORS.emberLight);
    surface.line(20, 23, 28, 23);
    surface.line(24, 19, 24, 27);
    surface.point(21, 20); surface.point(27, 20); surface.point(21, 26); surface.point(27, 26);
  }
}

function drawReservoir(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<CompressionState>,
  required: number,
  capacity: number,
): void {
  surface.noFill();
  surface.stroke(...MYSTICAL_COLORS.graphiteLight);
  surface.line(4, 33, 44, 33);
  surface.line(4, 33, 4, 44);
  surface.line(44, 33, 44, 44);
  const model = reservoirVisualModel(state.reservoirIds, matter);
  for (const mote of model.motes) {
    const shade = mote.seed % 3;
    surface.stroke(183 + shade * 18, 86 + shade * 18, 43 + shade * 12);
    surface.point(Math.round(mote.x), Math.round(mote.y));
  }
  if (model.overflow > 0) {
    surface.noStroke(); surface.fill(...MYSTICAL_COLORS.emberLight); surface.textSize(3); surface.textAlign("right", "top");
    surface.text(`+${model.overflow}`, 43, 34);
  }
  if (state.reservoirIds.length >= capacity) {
    surface.stroke(...MYSTICAL_COLORS.ember);
    surface.line(5, 44, 43, 44);
  } else if (state.reservoirIds.length >= required) {
    surface.stroke(...MYSTICAL_COLORS.violet);
    surface.line(5, 44, 43, 44);
  }
}

function drawBatch(surface: P5.Graphics, matter: MatterStore, state: Readonly<CompressionState>): void {
  const batch = state.batch;
  if (!batch || batch.conversionCompleted) return;
  const batchColor = state.phase === "impact" ? MYSTICAL_COLORS.emberLight : MYSTICAL_COLORS.violet;
  surface.stroke(batchColor[0], batchColor[1], batchColor[2]);
  for (const mote of batch.motes) {
    const entity = matter.get(mote.entityId);
    surface.point(Math.round(entity.x), Math.round(entity.y));
  }
  if (["aligning", "compressing", "impact"].includes(state.phase)) {
    surface.noFill();
    surface.stroke(...MYSTICAL_COLORS.violetStrong);
    surface.circle(24, 23, state.phase === "compressing" ? 7 : 14);
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s,
    hp = (((h % 360) + 360) % 360) / 60,
    x = c * (1 - Math.abs((hp % 2) - 1)),
    m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; }
  else if (hp < 3) { g = c; b = x; } else if (hp < 4) { g = x; b = c; }
  else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function iridescentColor(seed: number, time: number): [number, number, number] {
  const hue = (time * 40 + (seed % 360)) % 360;
  return hslToRgb(hue, 0.6, 0.7);
}

function drawStones(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<CompressionState>,
  time: number,
): void {
  const batchId = state.batch?.outputStoneId;
  const visible = state.outputIds.slice(0, VISIBLE_OUTPUT_SLOTS);
  for (const id of visible) {
    const stone = matter.get(id);
    const x = Math.round(stone.x), y = Math.round(stone.y);
    surface.noStroke();
    if (stone.material === "quartz") {
      const [r, g, b] = iridescentColor(stone.visualSeed, time);
      surface.fill(r, g, b);
    } else {
      surface.fill(91 + stone.visualSeed % 18, 83 + stone.visualSeed % 14, 96 + stone.visualSeed % 16);
    }
    surface.rect(x - 1, y - 1, 2, 2);
    surface.stroke(...MYSTICAL_COLORS.violet);
    surface.point(x, y - 1);
    if (id === batchId && state.phase === "revealing") {
      surface.noFill();
      surface.stroke(...MYSTICAL_COLORS.emberLight);
      surface.circle(x, y, 6);
      surface.point(x, y);
    }
  }
  const overflow = state.outputIds.length - visible.length;
  if (overflow > 0) {
    surface.noStroke(); surface.fill(...MYSTICAL_COLORS.ash); surface.textSize(3); surface.textAlign("right", "top");
    surface.text(`+${overflow}`, 43, 38);
  }
}

function drawEffects(surface: P5.Graphics, effects: readonly StageEffect[]): void {
  for (const effect of effects) {
    const p = effectProgress(effect);
    if (effect.kind === "invocation") {
      const invocationColor = effect.automatic ? MYSTICAL_COLORS.emberLight : MYSTICAL_COLORS.violet;
      surface.noFill(); surface.stroke(invocationColor[0], invocationColor[1], invocationColor[2]);
      surface.circle(24, 23, 5 + p * 18);
    }
    if (effect.kind === "impact") {
      const intensity = 1 - p;
      surface.noFill(); surface.stroke(...MYSTICAL_COLORS.emberLight);
      surface.circle(24, 23, Math.max(2, 10 * intensity));
      if (p < 0.18) {
        surface.noStroke(); surface.fill(...MYSTICAL_COLORS.violet, Math.round((0.18 - p) / 0.18 * 135));
        surface.rect(1, 1, 46, 46);
      }
    }
  }
}

function phaseLabel(phase: CompressionPhase, count: number, required: number): string {
  if (phase === "gathering") return `GATHER ${count}/${required}`;
  if (phase === "ready") return `READY ${count}/${required} - C`;
  if (phase === "levitating") return "LIFTING 100";
  if (phase === "aligning") return "ALIGNING 100";
  if (phase === "compressing") return "COMPRESSING";
  if (phase === "impact") return "IMPACT";
  if (phase === "revealing") return "STONE REVEALED";
  if (phase === "releasing") return "RELEASING STONE";
  return "RECOVERING";
}
