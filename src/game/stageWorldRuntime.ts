import type P5 from "p5";
import stageData from "../../data/stages.json";
import { validateStageConfig } from "../config/validateStageData";
import { StageCamera } from "./camera/stageCamera";
import {
  StageEffectSystem,
  effectFromStageEvent,
  effectProgress,
} from "./effects/stageEffects";
import { StageInputModalityGate } from "./input/stageInput";
import type { MatterSnapshot, StageId } from "./matter/matterTypes";
import {
  SAVE_SCHEMA_VERSION,
  validateSaveV3,
  type PowderIdleSaveV3,
  type SaveValidationContext,
} from "./persistence/saveSchema";
import {
  computeViewportRect,
  screenToWorld,
  type ViewportRect,
} from "./rendering/pixelSurface";
import { MYSTICAL_COLORS, MYSTICAL_FONT_FAMILY } from "./rendering/mysticalTheme";
import { CompressionStage } from "./stages/compression/compressionStage";
import { renderCompression } from "./stages/compression/compressionRenderer";
import { renderSandfall } from "./stages/sandfall/sandfallRenderer";
import { stageUpgradeValue, stageWorldOrigin } from "./stages/stageConfig";
import { StageController, type StageSaveV3 } from "./stages/stageController";
import type { StageUpgradeId } from "./stages/stageTypes";
import { transferVisualModel } from "./stages/stageVisualModels";

const FIXED_STEP = 1 / 60;
const WORLD_SIZE = 144;
const SAVE_KEY = "powder-idle-save";
const OLD_STAGE_SAVE_KEY = "powder-idle-stage-world-v1";
const BACKUP_KEY = "powder-idle-save-diagnostic-backup";

export type RuntimeSaveSections = Omit<
  PowderIdleSaveV3,
  "schemaVersion" | "savedAt" | "stageWorld"
>;

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
  private readonly inputGate = new StageInputModalityGate();
  readonly effects = new StageEffectSystem();
  private visualTime = 0;

  initialize(font: P5.Font | string = MYSTICAL_FONT_FAMILY): void {
    this.surface = createGraphics(WORLD_SIZE, WORLD_SIZE);
    this.surface.pixelDensity(1);
    this.surface.noSmooth();
    this.surface.textFont(font);
  }

  update(elapsedSeconds: number): void {
    const elapsed = Math.min(0.25, Math.max(0, elapsedSeconds));
    this.visualTime += elapsed;
    this.effects.update(elapsed);
    this.accumulator += elapsed;
    while (this.accumulator >= FIXED_STEP) {
      this.controller.update(FIXED_STEP);
      this.consumeStageEvents();
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
    surface.background(...MYSTICAL_COLORS.void);
    const sandfallOrigin = stageWorldOrigin(this.controller.sandfall.definition);
    surface.push();
    surface.translate(sandfallOrigin.x, sandfallOrigin.y);
    renderSandfall(surface, this.controller.matter, this.controller.sandfall.state, {
      time: this.visualTime,
      effects: this.effects.forStage(this.controller.sandfall.definition.id),
      destinationUnlocked: this.controller.unlocked.has(this.controller.compression.definition.id),
      transferCount: this.controller.transfers.length,
      reservoirFull:
        this.controller.compression.state.reservoirIds.length + this.controller.transfers.length >=
        this.controller.compression.capacity(this.controller.upgradeLevels),
      gravity: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "gravity"),
      castCount: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "manual-cast-count"),
      cooldownProgress: 1 - Math.min(1, this.controller.sandfall.state.castCooldown /
        Math.max(0.02, stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "cast-cooldown"))),
      autoCast: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "auto-cast") > 0,
    });
    surface.pop();
    if (this.controller.unlocked.has(this.controller.compression.definition.id)) {
      const compressionOrigin = stageWorldOrigin(this.controller.compression.definition);
      surface.push();
      surface.translate(compressionOrigin.x, compressionOrigin.y);
      renderCompression(
        surface,
        this.controller.matter,
        this.controller.compression.state,
        this.controller.compression.recipeCount,
        {
          time: this.visualTime,
          effects: this.effects.forStage(this.controller.compression.definition.id),
          capacity: this.controller.compression.capacity(this.controller.upgradeLevels),
          ritualSpeed: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "ritual-speed"),
          releaseSpeed: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "release-speed"),
          autoRitual: stageUpgradeValue(this.controller.config, this.controller.upgradeLevels, "auto-ritual") > 0,
          unlockProgress: this.unlockProgress(),
        },
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
    const context = drawingContext as CanvasRenderingContext2D;
    context.imageSmoothingEnabled = false;
    const shake = this.effects.cameraOffset();
    context.drawImage(
      (surface as unknown as { canvas: HTMLCanvasElement }).canvas,
      this.view.sourceX + shake.x,
      this.view.sourceY + shake.y,
      this.view.sourceSize,
      this.view.sourceSize,
      this.view.x,
      this.view.y,
      this.view.size,
      this.view.size,
    );
  }

  cast(x = 24, count?: number): readonly number[] {
    return this.controller.castSand(count, x);
  }
  invokeRitual(): boolean {
    return this.controller.invokeRitual();
  }
  resetForPrestige(): void {
    this.controller.resetForPrestige({ preservePermanentBonuses: true });
    this.accumulator = 0;
    this.lastUnlocked = this.controller.unlocked.size;
    this.camera.reset(this.controller.cameraTarget());
    this.inputGate.reset();
    this.effects.reset();
    this.visualTime = 0;
  }

  handlePointer(screenX: number, screenY: number, kind: "mouse" | "touch"): boolean {
    const now = typeof performance === "undefined" ? Date.now() : performance.now();
    if (!this.inputGate.accept(kind, now)) return false;
    if (!this.view) return false;
    const point = screenToWorld(this.view, screenX, screenY);
    if (!point) return false;
    const sandfallOrigin = stageWorldOrigin(this.controller.sandfall.definition);
    if (
      point.x >= sandfallOrigin.x && point.x < sandfallOrigin.x + 48 &&
      point.y >= sandfallOrigin.y && point.y < sandfallOrigin.y + 48
    ) return this.cast(point.x - sandfallOrigin.x).length > 0;
    const compressionOrigin = stageWorldOrigin(this.controller.compression.definition);
    if (
      point.x >= compressionOrigin.x && point.x < compressionOrigin.x + 48 &&
      point.y >= compressionOrigin.y && point.y < compressionOrigin.y + 48
    ) return this.controller.compression.glyphContains(
      point.x - compressionOrigin.x,
      point.y - compressionOrigin.y,
    ) && this.invokeRitual();
    return false;
  }

  buyUpgrade(id: StageUpgradeId): boolean {
    return this.controller.buyUpgrade(id);
  }

  save(sections: RuntimeSaveSections): boolean {
    const envelope: PowderIdleSaveV3 = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      stageWorld: this.controller.serialize(),
      ...sections,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
      return true;
    } catch (error) {
      console.error("Powder Idle could not save progress.", error);
      return false;
    }
  }

  load(
    context: SaveValidationContext,
    defaults: RuntimeSaveSections,
  ): PowderIdleSaveV3 | null {
    const current = localStorage.getItem(SAVE_KEY);
    const old = current ? null : localStorage.getItem(OLD_STAGE_SAVE_KEY);
    const raw = current ?? old;
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      const sourceVersion = readSchemaVersion(parsed);
      if (sourceVersion < SAVE_SCHEMA_VERSION)
        this.preserveRaw(raw, `v${sourceVersion}`);
      const migrated = old
        ? this.migrateStageV1(parsed, defaults)
        : this.migrateCurrent(parsed, defaults);
      const validated = validateSaveV3(migrated, context);
      const candidate = new StageController(this.controller.config);
      candidate.hydrate(validated.stageWorld);
      this.controller.hydrate(candidate.serialize());
      this.lastUnlocked = this.controller.unlocked.size;
      this.camera.reset(this.controller.cameraTarget());
      this.effects.reset();
      return validated;
    } catch (error) {
      this.preserveRaw(raw, `invalid-v${readSchemaVersionSafe(raw)}`);
      console.error("Powder Idle preserved an invalid save for diagnosis.", error);
      return null;
    }
  }

  private migrateCurrent(value: unknown, defaults: RuntimeSaveSections): unknown {
    const root = object(value, "save");
    if (root.schemaVersion === 3) return value;
    if (root.schemaVersion !== 2) throw new Error(`Unsupported save schema ${String(root.schemaVersion)}`);
    const legacy = object(root.legacy, "legacy");
    return {
      schemaVersion: 3,
      savedAt: typeof root.savedAt === "string" ? root.savedAt : new Date().toISOString(),
      stageWorld: migrateStageV2(root.stage),
      economy: {
        ...defaults.economy,
        dust: nonNegativeOr(legacy.dust, defaults.economy.dust),
        powderCounts: numberArrayOr(legacy.powderCounts, defaults.economy.powderCounts),
      },
      progression: {
        ...defaults.progression,
        upgrades: numericRecordOr(legacy.upgrades, defaults.progression.upgrades),
        research: numericRecordOr(legacy.research, defaults.progression.research),
        milestones: stateArrayOr(legacy.milestones, defaults.progression.milestones),
      },
      automation: defaults.automation,
      interface: defaults.interface,
    };
  }

  private migrateStageV1(value: unknown, defaults: RuntimeSaveSections): unknown {
    const save = object(value, "stage v1");
    const matter = save.matter as MatterSnapshot;
    if (!matter || !Array.isArray(matter.entities) || !Array.isArray(save.unlocked) || !Array.isArray(save.transfers))
      throw new Error("Malformed version 1 stage save");
    const ritualIds = Array.isArray(save.ritualIds) ? save.ritualIds.filter(Number.isInteger) as number[] : [];
    const stageWorld: StageSaveV3 = {
      version: 3,
      unlocked: save.unlocked as StageId[],
      nextTransferId: 1,
      transferBudget: 0,
      transfers: save.transfers as StageSaveV3["transfers"],
      upgradeLevels: { ...this.controller.upgradeLevels },
      matter,
      sandfall: {
        lifetimeCreated: nonNegativeOr(save.lifetimeSand, 0),
        activeIds: idsOwnedBy(matter, "sandfall-atrium", "active"),
        outputIds: idsOwnedBy(matter, "sandfall-atrium", "output"),
        castCooldown: 0,
        autoCastElapsed: 0,
      },
      compression: {
        state: {
          reservoirIds: idsOwnedBy(matter, "compression-crucible", "reservoir"),
          outputIds: Array.isArray(save.outputStoneIds) ? save.outputStoneIds.filter(Number.isInteger) as number[] : [],
          phase: ritualIds.length ? "levitating" : "gathering",
          batch: ritualIds.length ? {
            ritualId: "ritual-migrated",
            phase: "levitating",
            elapsed: 0,
            motes: ritualIds.map((entityId) => {
              const entity = matter.entities.find((item) => item.id === entityId);
              if (!entity) throw new Error("Migrated ritual entity is missing");
              return { entityId, startX: entity.x, startY: entity.y, targetX: 24, targetY: 24 };
            }),
            conversionCompleted: false,
            outputStoneId: null,
            outputEventId: null,
            stoneX: 24,
            stoneY: 24,
          } : null,
          nextRitualId: 2,
        },
      },
    };
    return {
      schemaVersion: 3,
      savedAt: new Date().toISOString(),
      stageWorld,
      economy: { ...defaults.economy, powderCounts: [nonNegativeOr(save.lifetimeSand, 0), ...defaults.economy.powderCounts.slice(1)] },
      progression: defaults.progression,
      automation: defaults.automation,
      interface: defaults.interface,
    };
  }

  private preserveRaw(raw: string, reason: string): void {
    try {
      const suffix = `${reason}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      let key = `${BACKUP_KEY}-${suffix}`;
      let collision = 1;
      while (localStorage.getItem(key) !== null) key = `${BACKUP_KEY}-${suffix}-${collision++}`;
      localStorage.setItem(key, raw);
    } catch (error) {
      console.error("Powder Idle could not preserve its diagnostic save backup.", error);
    }
  }

  private renderTransfers(surface: P5.Graphics): void {
    const models = transferVisualModel(this.controller.config, this.controller.transfers);
    const connection = this.controller.config.connections.find(
      (item) => item.from === this.controller.sandfall.definition.id,
    );
    if (!connection) return;
    const fromDefinition = this.controller.config.stages.find((stage) => stage.id === connection.from)!;
    const toDefinition = this.controller.config.stages.find((stage) => stage.id === connection.to)!;
    const from = stageWorldOrigin(fromDefinition), to = stageWorldOrigin(toDefinition);
    const full = this.controller.compression.state.reservoirIds.length + models.length >=
      this.controller.compression.capacity(this.controller.upgradeLevels);
    const routeColor = full ? MYSTICAL_COLORS.emberDim : MYSTICAL_COLORS.violetDim;
    surface.stroke(routeColor[0], routeColor[1], routeColor[2]);
    surface.line(from.x + 22, from.y + 47, to.x + 22, to.y + 1);
    surface.line(from.x + 26, from.y + 47, to.x + 26, to.y + 1);
    for (let y = from.y + 49; y < to.y; y += 5) {
      surface.point(from.x + 21, y);
      surface.point(from.x + 27, y);
    }
    for (const model of models) {
      const seed = this.controller.matter.get(model.entityId).visualSeed;
      surface.stroke(
        MYSTICAL_COLORS.emberLight[0] + seed % 18,
        MYSTICAL_COLORS.emberLight[1] + seed % 14,
        MYSTICAL_COLORS.emberLight[2],
      );
      surface.point(Math.round(model.x), Math.round(model.y));
      if (model.progress > 0.15) {
        surface.stroke(...MYSTICAL_COLORS.violet);
        surface.point(Math.round(model.x), Math.round(model.y - 1));
      }
    }
    if (full) {
      surface.stroke(...MYSTICAL_COLORS.ember);
      surface.line(to.x + 21, to.y + 1, to.x + 27, to.y + 1);
    }
  }

  private consumeStageEvents(): void {
    for (const event of this.controller.drainEvents()) {
      const effect = effectFromStageEvent(event);
      if (effect) this.effects.emit(effect);
    }
  }

  private unlockProgress(): number {
    const effect = this.effects.forStage(this.controller.compression.definition.id)
      .find((entry) => entry.kind === "unlock-trace");
    return effect ? effectProgress(effect) : 1;
  }
}

export { CompressionStage };

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}
function readSchemaVersion(value: unknown): number {
  const root = object(value, "save");
  return typeof root.schemaVersion === "number" ? root.schemaVersion : 1;
}
function readSchemaVersionSafe(raw: string): number {
  try { return readSchemaVersion(JSON.parse(raw) as unknown); } catch { return 0; }
}
function nonNegativeOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}
function numberArrayOr(value: unknown, fallback: number[]): number[] {
  return fallback.map((entry, index) =>
    Array.isArray(value) ? nonNegativeOr(value[index], entry) : entry,
  );
}
function stateArrayOr<T extends object>(value: unknown, fallback: T[]): T[] {
  return fallback.map((defaultEntry, index) => {
    const raw = Array.isArray(value) ? value[index] : null;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...defaultEntry };
    const source = raw as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaultEntry).map(([key, defaultValue]) => [key, typeof source[key] === "boolean" ? source[key] : defaultValue]),
    ) as T;
  });
}
function numericRecordOr(value: unknown, fallback: Record<string, number>): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const source = value as Record<string, unknown>, result = { ...fallback };
  for (const key of Object.keys(result)) result[key] = nonNegativeOr(source[key], result[key]!);
  return result;
}
function migrateStageV2(value: unknown): StageSaveV3 {
  const root = object(value, "stage v2");
  if (root.version !== 2) throw new Error("Expected stage save version 2");
  return { ...(structuredClone(root) as unknown as Omit<StageSaveV3, "version" | "transferBudget">), version: 3, transferBudget: 0 };
}
function idsOwnedBy(snapshot: MatterSnapshot, stageId: StageId, slot: "active" | "output" | "reservoir"): number[] {
  return snapshot.entities.filter((entity) => entity.owner.kind === "stage" && entity.owner.stageId === stageId && entity.owner.slot === slot).map((entity) => entity.id);
}
