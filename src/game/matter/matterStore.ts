import type { EntityId, MatterEntity, MatterOwner, MatterSnapshot, MaterialType, StageId } from './matterTypes';

export interface CompositeRecipe { material:MaterialType; inputMaterial:MaterialType; inputIds:readonly EntityId[]; expectedOwner:MatterOwner; outputOwner:MatterOwner; origin:StageId }

function sameOwner(left:MatterOwner,right:MatterOwner):boolean { return JSON.stringify(left)===JSON.stringify(right) }

export class MatterStore {
  private entities=new Map<EntityId,MatterEntity>();
  private nextId=1;
  create(material:MaterialType,owner:MatterOwner,origin:StageId,props:Partial<Pick<MatterEntity,'mass'|'x'|'y'|'vx'|'vy'|'movement'|'contents'|'lineage'>>={}):EntityId {
    const id=this.nextId++;
    this.entities.set(id,{id,material,owner:{...owner},origin,mass:props.mass??1,x:props.x??0,y:props.y??0,vx:props.vx??0,vy:props.vy??0,movement:props.movement??0,contents:[...(props.contents??[])],lineage:[...(props.lineage??[])],visualSeed:(id*2654435761)>>>0});
    return id;
  }
  has(id:EntityId):boolean{return this.entities.has(id)}
  get(id:EntityId):Readonly<MatterEntity>{const entity=this.entities.get(id);if(!entity)throw new Error(`Unknown matter entity ${id}`);return entity}
  move(id:EntityId,expected:MatterOwner,next:MatterOwner):void{const entity=this.mutable(id);if(!sameOwner(entity.owner,expected))throw new Error(`Entity ${id} owner mismatch`);entity.owner={...next}}
  setPosition(id:EntityId,x:number,y:number):void{const entity=this.mutable(id);entity.x=x;entity.y=y}
  setMotion(id:EntityId,vy:number,movement:number):void{const entity=this.mutable(id);entity.vy=vy;entity.movement=movement}
  compose(recipe:CompositeRecipe):EntityId {
    if(recipe.inputIds.length===0||new Set(recipe.inputIds).size!==recipe.inputIds.length)throw new Error('Composite inputs must be unique');
    const inputs=recipe.inputIds.map(id=>this.mutable(id));
    for(const entity of inputs)if(entity.material!==recipe.inputMaterial||!sameOwner(entity.owner,recipe.expectedOwner))throw new Error(`Entity ${entity.id} is not a valid recipe input`);
    const output=this.create(recipe.material,recipe.outputOwner,recipe.origin,{mass:inputs.reduce((sum,e)=>sum+e.mass,0),contents:[...recipe.inputIds],lineage:inputs.flatMap(e=>[e.id,...e.lineage])});
    for(const entity of inputs)entity.owner={kind:'contained',entityId:output};
    return output;
  }
  query(owner:MatterOwner,material?:MaterialType):EntityId[]{const result:EntityId[]=[];for(const entity of this.entities.values())if(sameOwner(entity.owner,owner)&&(!material||entity.material===material))result.push(entity.id);return result}
  assertInvariants():void{for(const entity of this.entities.values()){if(entity.owner.kind==='contained'){const parent=this.mutable(entity.owner.entityId);if(!parent.contents.includes(entity.id))throw new Error(`Contained entity ${entity.id} is orphaned`)}for(const childId of entity.contents){const child=this.mutable(childId);if(child.owner.kind!=='contained'||child.owner.entityId!==entity.id)throw new Error(`Composite ${entity.id} does not own ${childId}`)}}}
  serialize():MatterSnapshot{return{nextId:this.nextId,entities:[...this.entities.values()].map(entity=>({...entity,owner:{...entity.owner},contents:[...entity.contents],lineage:[...entity.lineage]}))}}
  hydrate(snapshot:MatterSnapshot):void{this.entities.clear();for(const raw of snapshot.entities){if(this.entities.has(raw.id)||!Number.isInteger(raw.id)||raw.id<=0)throw new Error('Invalid or duplicate matter ID');this.entities.set(raw.id,{...raw,movement:Number.isFinite(raw.movement)?raw.movement:0,owner:{...raw.owner},contents:[...raw.contents],lineage:[...raw.lineage]})}this.nextId=Math.max(snapshot.nextId,1,...snapshot.entities.map(entity=>entity.id+1));this.assertInvariants()}
  private mutable(id:EntityId):MatterEntity{const entity=this.entities.get(id);if(!entity)throw new Error(`Unknown matter entity ${id}`);return entity}
}
