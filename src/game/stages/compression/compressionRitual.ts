import type { EntityId } from '../../matter/matterTypes';
import type { CompressionPhase } from '../stageTypes';
export interface RitualMote { entityId:EntityId;startX:number;startY:number;targetX:number;targetY:number }
export interface CompressionBatch { ritualId:string;phase:CompressionPhase;elapsed:number;motes:RitualMote[];conversionCompleted:boolean;outputStoneId:EntityId|null;outputEventId:string|null;stoneX:number;stoneY:number }
export function ritualTarget(id:EntityId,index:number,count:number):{x:number;y:number}{const ring=index%3,radius=6+ring*3,angle=(index/count)*Math.PI*2+((id*17)%29)/29;return{x:24+Math.cos(angle)*radius,y:24+Math.sin(angle)*radius*.62}}
export function phaseProgress(batch:CompressionBatch,duration:number):number{return Math.max(0,Math.min(1,batch.elapsed/duration))}
