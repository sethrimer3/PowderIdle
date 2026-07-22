import { computeCameraTarget,type CameraTarget } from '../camera/stageCamera';
import { MatterStore } from '../matter/matterStore';
import type { EntityId,MatterSnapshot,StageId } from '../matter/matterTypes';
import { CompressionStage,type CompressionSave } from './compression/compressionStage';
import { SandfallStage,type SandfallSave } from './sandfall/sandfallStage';
import { stageConnection } from './stageConnections';
import { stageDefinition } from './stageDefinitions';
import type { StageConfig,StageTransfer,StageUpgradeId,StageUpdateContext } from './stageTypes';

export interface StageSaveV2 {version:2;unlocked:StageId[];nextTransferId:number;transfers:StageTransfer[];upgradeLevels:Record<StageUpgradeId,number>;matter:MatterSnapshot;sandfall:SandfallSave;compression:CompressionSave}
export interface StageEvent {id:string;kind:'stage-unlocked'|'conversion';stageId:StageId;entityId?:EntityId}
const defaultLevels=():Record<StageUpgradeId,number>=>({'manual-cast-count':0,'cast-cooldown':0,gravity:0,'output-throughput':0,'auto-cast':0,'ritual-speed':0,'reservoir-capacity':0,'release-speed':0,'auto-ritual':0});

export class StageController {
  readonly matter=new MatterStore();
  readonly sandfall:SandfallStage;
  readonly compression:CompressionStage;
  readonly unlocked=new Set<StageId>(['sandfall-atrium']);
  readonly transfers:StageTransfer[]=[];
  readonly events:StageEvent[]=[];
  readonly upgradeLevels=defaultLevels();
  private nextTransferId=1;
  private transferBudget=0;
  constructor(readonly config:StageConfig){this.sandfall=new SandfallStage(stageDefinition(config,'sandfall-atrium'),this.matter);this.compression=new CompressionStage(stageDefinition(config,'compression-crucible'),this.matter,{gathering:Number.POSITIVE_INFINITY,ready:Number.POSITIVE_INFINITY,...config.ritualTimings})}
  castSand(baseCount=1,x=24):readonly EntityId[]{const count=Math.max(1,baseCount+this.upgradeLevels['manual-cast-count']);return this.sandfall.cast(count,x)}
  invokeRitual():boolean{return this.compression.invoke()}
  update(dt:number):void{if(!Number.isFinite(dt)||dt<0)throw new Error('Stage delta time must be finite and non-negative');const context:StageUpdateContext={dt,upgrades:this.upgradeLevels};this.sandfall.update(context);this.checkUnlocks();this.startTransfers(dt);this.updateTransfers(dt);this.compression.update(context);this.flushConversionEvents();this.matter.assertInvariants()}
  cameraTarget():CameraTarget{return computeCameraTarget(this.config.stages.filter(stage=>this.unlocked.has(stage.id)).map(stage=>stage.gridPosition),this.config.camera.padding)}
  buyUpgrade(id:StageUpgradeId):boolean{const definition=this.config.upgrades.find(upgrade=>upgrade.id===id);if(!definition)return false;const current=this.upgradeLevels[id];if(current>=definition.maxLevel)return false;this.upgradeLevels[id]=current+1;return true}
  serialize():StageSaveV2{return{version:2,unlocked:[...this.unlocked],nextTransferId:this.nextTransferId,transfers:this.transfers.map(transfer=>({...transfer})),upgradeLevels:{...this.upgradeLevels},matter:this.matter.serialize(),sandfall:this.sandfall.serialize(),compression:this.compression.serialize()}}
  hydrate(save:StageSaveV2):void{if(save.version!==2)throw new Error('Unsupported stage save version');this.matter.hydrate(save.matter);this.unlocked.clear();for(const id of save.unlocked){const definition=this.config.stages.find(stage=>stage.id===id);if(definition?.implemented)this.unlocked.add(id)}this.unlocked.add('sandfall-atrium');Object.assign(this.upgradeLevels,defaultLevels(),save.upgradeLevels);this.sandfall.hydrate(save.sandfall);this.compression.hydrate(save.compression);this.transfers.splice(0);const ids=new Set<string>();for(const raw of save.transfers){if(ids.has(raw.id)||!Number.isFinite(raw.progress))throw new Error('Invalid or duplicate hydrated transfer');const connection=this.config.connections.find(item=>item.id===raw.connectionId);if(!connection||!this.unlocked.has(connection.to)||!this.matter.has(raw.entityId))throw new Error('Hydrated transfer references unavailable state');const owner=this.matter.get(raw.entityId).owner;if(owner.kind!=='transfer'||owner.transferId!==raw.id)throw new Error('Hydrated transfer owner mismatch');ids.add(raw.id);this.transfers.push({...raw,progress:Math.max(0,Math.min(1,raw.progress))})}const observed=Math.max(0,...[...ids].map(id=>Number(id.split('-').pop())||0));this.nextTransferId=Math.max(save.nextTransferId,observed+1);this.matter.assertInvariants()}
  private checkUnlocks():void{const definition=this.compression.definition,condition=definition.unlockCondition;if(condition.kind==='lifetime-material'&&this.sandfall.state.lifetimeCreated>=condition.count&&!this.unlocked.has(definition.id)){this.unlocked.add(definition.id);this.events.push({id:`unlock:${definition.id}`,kind:'stage-unlocked',stageId:definition.id})}}
  private startTransfers(dt:number):void{if(!this.unlocked.has('compression-crucible'))return;const throughput=12+this.upgradeLevels['output-throughput']*3;this.transferBudget=Math.min(throughput,this.transferBudget+throughput*dt);const capacity=this.compression.baseCapacity+this.upgradeLevels['reservoir-capacity']*50;while(this.transferBudget>=1&&this.sandfall.state.outputIds.length&&this.compression.state.reservoirIds.length+this.transfers.length<capacity){const entityId=this.sandfall.state.outputIds[0]!,id=`transfer-${this.nextTransferId++}`;this.sandfall.removeOutput(entityId);this.matter.move(entityId,{kind:'stage',stageId:'sandfall-atrium',slot:'output'},{kind:'transfer',transferId:id});this.transfers.push({id,entityId,connectionId:'stage-1-to-2',progress:0});this.transferBudget-=1}}
  private updateTransfers(dt:number):void{const connection=stageConnection(this.config,'stage-1-to-2');for(let index=this.transfers.length-1;index>=0;index--){const transfer=this.transfers[index]!;transfer.progress=Math.min(1,transfer.progress+dt/connection.duration);if(transfer.progress<1)continue;const owner=this.matter.get(transfer.entityId).owner;if(owner.kind!=='transfer'||owner.transferId!==transfer.id)throw new Error(`Transfer ${transfer.id} lost ownership`);this.matter.move(transfer.entityId,owner,{kind:'stage',stageId:'compression-crucible',slot:'reservoir'});if(!this.compression.acceptEntity(transfer.entityId))throw new Error('Transfer completed without reservoir capacity');this.transfers.splice(index,1)}}
  private flushConversionEvents():void{for(const event of this.compression.conversionEvents){if(this.events.some(existing=>existing.id===event.id))continue;this.events.push({id:event.id,kind:'conversion',stageId:'compression-crucible',entityId:event.stoneId})}}
}
