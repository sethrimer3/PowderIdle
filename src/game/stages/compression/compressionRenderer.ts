import type P5 from "p5";
import { MatterStore } from "../../matter/matterStore";
import type { CompressionState } from "./compressionStage";
export function renderCompression(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<CompressionState>,
  required: number,
): void {
  surface.noFill();
  surface.stroke(65, 102, 151);
  surface.rect(0.5, 0.5, 47, 47);
  surface.stroke(65, 190, 184);
  surface.point(2, 2);
  surface.point(45, 2);
  surface.stroke(205, 157, 83);
  for (const id of state.reservoirIds) {
    const entity = matter.get(id);
    surface.point(Math.round(entity.x), Math.round(entity.y));
  }
  const batch = state.batch;
  if (batch && !batch.conversionCompleted) {
    surface.stroke(242, 187, 91);
    for (const mote of batch.motes) {
      const entity = matter.get(mote.entityId);
      surface.point(Math.round(entity.x), Math.round(entity.y));
    }
  }
  if (state.phase === "ready") {
    surface.noFill();
    surface.stroke(110, 231, 215);
    surface.circle(24, 24, 12);
    surface.circle(24, 24, 7);
  }
  if (batch?.outputStoneId !== null && batch?.outputStoneId !== undefined) {
    const stone = matter.get(batch.outputStoneId);
    surface.noStroke();
    surface.fill(117, 132, 153);
    surface.rect(Math.round(stone.x) - 1, Math.round(stone.y) - 1, 2, 2);
    surface.stroke(194, 241, 214);
    surface.point(Math.round(stone.x), Math.round(stone.y));
  }
  for (const id of state.outputIds) {
    if (batch?.outputStoneId === id) continue;
    const stone = matter.get(id);
    surface.noStroke();
    surface.fill(117, 132, 153);
    surface.rect(Math.round(stone.x) - 1, Math.round(stone.y) - 1, 2, 2);
  }
  surface.noStroke();
  surface.fill(145, 178, 197);
  surface.textSize(3);
  surface.textAlign('center', 'top');
  surface.text(`${state.reservoirIds.length} / ${required}`, 24, 3);
}
