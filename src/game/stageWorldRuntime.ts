import type P5 from "p5";
import stageData from "../../data/stages.json";
import { validateStageConfig } from "../config/validateStageData";
import { StageCamera } from "./camera/stageCamera";
import {
  computeViewportRect,
  screenToWorld,
  type ViewportRect,
} from "./rendering/pixelSurface";
import { CompressionStage } from "./stages/compression/compressionStage";
import { renderCompression } from "./stages/compression/compressionRenderer";
import { renderSandfall } from "./stages/sandfall/sandfallRenderer";
import { StageController, type StageSaveV2 } from "./stages/stageController";
import type { StageUpgradeId } from "./stages/stageTypes";
import type { MatterSnapshot, StageId } from "./matter/matterTypes";

const FIXED_STEP = 1 / 60,
  WORLD_SIZE = 144,
  STAGE_SAVE_KEY = "powder-idle-save",
  OLD_STAGE_SAVE_KEY = "powder-idle-stage-world-v1",
  BACKUP_KEY = "powder-idle-save-diagnostic-backup";
export interface LegacyProgress {
  dust: number;
  upgrades: Record<string, number>;
  research: Record<string, number>;
  milestones: unknown[];
  powderCounts: number[];
}
export interface SaveEnvelope {
  schemaVersion: 2;
  savedAt: string;
  stage: StageSaveV2;
  legacy: LegacyProgress;
}
export class IntegratedStageWorld {
  readonly controller = new StageController(validateStageConfig(stageData));
  readonly camera = new StageCamera(
    this.controller.cameraTarget(),
    this.controller.config.camera.transitionDuration,
  );
  private surface: P5.Graphics | null = null;
  private accumulator = 0;
  private lastUnlocked = 1;
  private view: ViewportRect | null = null;
  initialize(): void {
    this.surface = createGraphics(WORLD_SIZE, WORLD_SIZE);
    this.surface.pixelDensity(1);
    this.surface.noSmooth();
    this.surface.textFont("monospace");
  }
  update(elapsedSeconds: number): void {
    this.accumulator += Math.min(0.25, Math.max(0, elapsedSeconds));
    while (this.accumulator >= FIXED_STEP) {
      this.controller.update(FIXED_STEP);
      this.camera.update(FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }
    if (this.controller.unlocked.size !== this.lastUnlocked) {
      this.lastUnlocked = this.controller.unlocked.size;
      this.camera.setTarget(this.controller.cameraTarget());
    }
  }
  render(areaX: number, areaY: number, available: number): void {
    if (!this.surface) this.initialize();
    const surface = this.surface!;
    surface.background(3, 7, 18);
    surface.push();
    surface.translate(48, 48);
    renderSandfall(
      surface,
      this.controller.matter,
      this.controller.sandfall.state,
    );
    surface.pop();
    if (this.controller.unlocked.has("compression-crucible")) {
      surface.push();
      surface.translate(48, 96);
      renderCompression(
        surface,
        this.controller.matter,
        this.controller.compression.state,
        this.controller.compression.recipeCount,
      );
      surface.pop();
      this.renderTransfers(surface);
    }
    this.view = computeViewportRect(
      areaX,
      areaY,
      available,
      this.camera.current.centerX,
      this.camera.current.centerY,
      this.camera.current.zoom,
    );
    drawingContext.imageSmoothingEnabled = false;
    image(
      surface,
      this.view.x,
      this.view.y,
      this.view.size,
      this.view.size,
      this.view.sourceX,
      this.view.sourceY,
      this.view.sourceSize,
      this.view.sourceSize,
    );
  }
  cast(x = 24, count = 1): readonly number[] {
    return this.controller.castSand(count, x);
  }
  invokeRitual(): boolean {
    return this.controller.invokeRitual();
  }
  handlePointer(
    screenX: number,
    screenY: number,
    kind: "mouse" | "touch",
  ): boolean {
    if (!this.view) return false;
    const point = screenToWorld(this.view, screenX, screenY);
    if (!point) return false;
    if (point.x >= 48 && point.x < 96 && point.y >= 48 && point.y < 96) {
      return this.cast(point.x - 48).length > 0;
    }
    if (point.x >= 48 && point.x < 96 && point.y >= 96 && point.y < 144) {
      const localX = point.x - 48,
        localY = point.y - 96;
      if (this.controller.compression.glyphContains(localX, localY))
        return this.invokeRitual();
    }
    void kind;
    return false;
  }
  buyUpgrade(id: StageUpgradeId): boolean {
    return this.controller.buyUpgrade(id);
  }
  save(legacy: LegacyProgress): void {
    const envelope: SaveEnvelope = {
      schemaVersion: 2,
      savedAt: new Date().toISOString(),
      stage: this.controller.serialize(),
      legacy,
    };
    localStorage.setItem(STAGE_SAVE_KEY, JSON.stringify(envelope));
  }
  load(): LegacyProgress | null {
    const current = localStorage.getItem(STAGE_SAVE_KEY);
    const old = current ? null : localStorage.getItem(OLD_STAGE_SAVE_KEY);
    const raw = current ?? old;
    if (!raw) return null;
    try {
      if (old) {
        localStorage.setItem(`${BACKUP_KEY}-v1`, old);
        const legacy = this.migrateStageV1(
          JSON.parse(old) as LegacyStageSaveV1,
        );
        this.lastUnlocked = this.controller.unlocked.size;
        this.camera.setTarget(this.controller.cameraTarget());
        return legacy;
      }
      const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;
      if (parsed.schemaVersion !== 2 || !parsed.stage || !parsed.legacy)
        throw new Error("Unsupported save envelope");
      this.controller.hydrate(parsed.stage);
      this.lastUnlocked = this.controller.unlocked.size;
      this.camera.setTarget(this.controller.cameraTarget());
      return parsed.legacy;
    } catch (error) {
      localStorage.setItem(BACKUP_KEY, raw);
      console.error(
        "Powder Idle preserved an invalid save for diagnosis.",
        error,
      );
      return null;
    }
  }
  private migrateStageV1(save: LegacyStageSaveV1): LegacyProgress {
    if (!save.matter || !Array.isArray(save.unlocked))
      throw new Error("Malformed version 1 stage save");
    const activeIds = idsOwnedBy(save.matter, "sandfall-atrium", "active");
    const outputIds = idsOwnedBy(save.matter, "sandfall-atrium", "output");
    const reservoirIds = idsOwnedBy(
      save.matter,
      "compression-crucible",
      "reservoir",
    );
    const ritualIds = Array.isArray(save.ritualIds) ? save.ritualIds : [];
    const stage: StageSaveV2 = {
      version: 2,
      unlocked: save.unlocked,
      nextTransferId: Math.max(
        1,
        ...save.transfers.map(
          (transfer) => (Number(transfer.id.split("-").pop()) || 0) + 1,
        ),
      ),
      transfers: save.transfers,
      upgradeLevels: { ...this.controller.upgradeLevels },
      matter: save.matter,
      sandfall: {
        lifetimeCreated: save.lifetimeSand,
        activeIds,
        outputIds,
        castCooldown: 0,
        autoCastElapsed: 0,
      },
      compression: {
        state: {
          reservoirIds,
          outputIds: [...save.outputStoneIds],
          phase: ritualIds.length ? "levitating" : "gathering",
          batch: ritualIds.length
            ? {
                ritualId: "ritual-migrated",
                phase: "levitating",
                elapsed: 0,
                motes: ritualIds.map((entityId) => {
                  const entity = save.matter.entities.find(
                    (item) => item.id === entityId,
                  );
                  if (!entity)
                    throw new Error("Migrated ritual entity is missing");
                  return {
                    entityId,
                    startX: entity.x,
                    startY: entity.y,
                    targetX: 24,
                    targetY: 24,
                  };
                }),
                conversionCompleted: false,
                outputStoneId: null,
                outputEventId: null,
                stoneX: 24,
                stoneY: 24,
              }
            : null,
          nextRitualId: 2,
        },
      },
    };
    this.controller.hydrate(stage);
    return {
      dust: 0,
      upgrades: {},
      research: {},
      milestones: [],
      powderCounts: [save.lifetimeSand],
    };
  }
  private renderTransfers(surface: P5.Graphics): void {
    surface.stroke(238, 195, 105);
    for (const transfer of this.controller.transfers)
      surface.point(72, 95 + Math.round(transfer.progress * 3));
  }
}
export { CompressionStage };

interface LegacyStageSaveV1 {
  unlocked: StageId[];
  lifetimeSand: number;
  ritualIds: number[];
  outputStoneIds: number[];
  transfers: StageSaveV2["transfers"];
  matter: MatterSnapshot;
}
function idsOwnedBy(
  snapshot: MatterSnapshot,
  stageId: StageId,
  slot: "active" | "output" | "reservoir",
): number[] {
  return snapshot.entities
    .filter(
      (entity) =>
        entity.owner.kind === "stage" &&
        entity.owner.stageId === stageId &&
        entity.owner.slot === slot,
    )
    .map((entity) => entity.id);
}
