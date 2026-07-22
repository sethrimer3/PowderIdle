import type P5 from "p5";
import { MatterStore } from "../../matter/matterStore";
import type { SandfallState } from "./sandfallStage";
export function renderSandfall(
  surface: P5.Graphics,
  matter: MatterStore,
  state: Readonly<SandfallState>,
): void {
  surface.noFill();
  surface.stroke(65, 102, 151);
  surface.rect(0.5, 0.5, 47, 47);
  surface.stroke(65, 190, 184);
  surface.point(2, 2);
  surface.point(45, 2);
  surface.stroke(239, 195, 104);
  for (const id of state.activeIds) {
    const entity = matter.get(id);
    surface.point(Math.round(entity.x), Math.round(entity.y));
  }
  if (state.outputIds.length) {
    surface.stroke(91, 235, 220);
    surface.circle(24, 45, 4 + (state.outputIds.length % 4));
  }
}
