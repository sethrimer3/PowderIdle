import { describe, expect, it } from "vitest";
import { computeViewportRect } from "../src/game/rendering/pixelSurface";

describe("pixel surface baseline scaling", () => {
  it("bakes a x2 baseline into the effective screen-pixels-per-sim-pixel at zoom=1", () => {
    const view = computeViewportRect(0, 0, 144, 72, 72, 1);
    expect(view.scale).toBe(2);
  });

  it("multiplies the x2 baseline by camera zoom (zoom=3 sim-one initial zoom => 6)", () => {
    const view = computeViewportRect(0, 0, 144, 72, 72, 3);
    expect(view.scale).toBe(6);
  });

  it("keeps the baseline scale independent of any devicePixelRatio-like input", () => {
    const a = computeViewportRect(0, 0, 288, 72, 72, 2);
    const b = computeViewportRect(0, 0, 288, 72, 72, 2);
    expect(a.scale).toBe(b.scale);
    expect(a.scale).toBe(8);
  });

  it("keeps fractional in-transition scale continuous and still baseline-scaled", () => {
    const view = computeViewportRect(0, 0, 144, 72, 72, 1.5);
    expect(view.scale).toBeCloseTo((144 / (144 / 1.5)) * 2, 5);
  });
});
