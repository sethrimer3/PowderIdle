import { MatterStore } from "../../matter/matterStore";
import type { EntityId } from "../../matter/matterTypes";
import type {
  StageDefinition,
  StageRenderContext,
  StageSimulation,
  StageUpdateContext,
} from "../stageTypes";

export interface Stage3State {
  reservoirIds: EntityId[];
}
export interface Stage3Save {
  state: Stage3State;
}

export class Stage3Stage implements StageSimulation<Stage3State, Stage3Save> {
  readonly state: Stage3State = { reservoirIds: [] };
  constructor(
    readonly definition: StageDefinition,
    private readonly matter: MatterStore,
  ) {}
  update(_context: StageUpdateContext): void {}
  render(_context: StageRenderContext): void {}
  acceptEntity(_entityId: EntityId): boolean {
    return false;
  }
  acceptTransferredEntity(entityId: EntityId, transferId: string): boolean {
    const entity = this.matter.get(entityId);
    if (
      entity.material !== "quartz" ||
      entity.owner.kind !== "transfer" ||
      entity.owner.transferId !== transferId ||
      this.state.reservoirIds.includes(entityId)
    )
      return false;
    this.matter.move(entityId, entity.owner, {
      kind: "stage",
      stageId: this.definition.id,
      slot: "reservoir",
    });
    this.state.reservoirIds.push(entityId);
    return true;
  }
  drainOutputEntities(): readonly EntityId[] {
    return [];
  }
  reset(): void {
    this.state.reservoirIds = [];
  }
  serialize(): Stage3Save {
    return { state: { reservoirIds: [...this.state.reservoirIds] } };
  }
  hydrate(data: Stage3Save): void {
    this.state.reservoirIds = [...(data?.state?.reservoirIds ?? [])];
  }
}
