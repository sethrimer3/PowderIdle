export class StageInputModalityGate {
  private lastTouchAt = Number.NEGATIVE_INFINITY;

  accept(kind: "mouse" | "touch", now: number): boolean {
    if (kind === "touch") {
      this.lastTouchAt = now;
      return true;
    }
    return now - this.lastTouchAt >= 750;
  }

  reset(): void {
    this.lastTouchAt = Number.NEGATIVE_INFINITY;
  }
}

export function pointerIsInWorld(screenX: number, menuWidth: number): boolean {
  return Number.isFinite(screenX) && screenX > menuWidth;
}
