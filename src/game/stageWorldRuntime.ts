import stageData from '../../data/stages.json';
import { validateStageConfig } from '../config/validateStageData';
import { StageCamera } from './camera/stageCamera';
import type { MatterEntity } from './matter/matterTypes';
import { CHAMBER_SIZE } from './stages/stageLayout';
import { StageController, type StageSave } from './stages/stageController';

const SAVE_KEY='powder-idle-stage-world-v1', FIXED_STEP=1/60, WORLD_SIZE=CHAMBER_SIZE*3;
let controller=new StageController(validateStageConfig(stageData)); let camera=new StageCamera(controller.cameraTarget()); let surface:ReturnType<typeof createGraphics>; let accumulator=0,lastTime=0,saveClock=0,castCooldown=0,knownUnlocked=1;
const effects:{kind:'cast'|'unlock';x:number;y:number;age:number}[]=[];

function ownerIs(e:MatterEntity,stage:'sandfall-atrium'|'compression-crucible',slot:string){return e.owner.kind==='stage'&&e.owner.stageId===stage&&e.owner.slot===slot}
function fixedUpdate(dt:number){
  castCooldown=Math.max(0,castCooldown-dt);
  const active=controller.matter.owned((_,e)=>ownerIs(e,'sandfall-atrium','active')).sort((a,b)=>b.y-a.y||a.id-b.id), occupied=new Set(active.map(e=>`${Math.round(e.x)},${Math.round(e.y)}`));
  for(const e of active){occupied.delete(`${Math.round(e.x)},${Math.round(e.y)}`);e.vy=Math.min(24,e.vy+32*dt);let steps=Math.max(1,Math.floor(e.vy*dt));while(steps--){const x=Math.round(e.x),y=Math.round(e.y);if(y>=45&&x>=21&&x<=26){controller.queueStage1Sand(e.id);break}const toward=x<23?1:x>24?-1:0;const choices=[[x,y+1],[x+((e.id+y)%2?1:-1),y+1],[x+((e.id+y)%2?-1:1),y+1],...(y>=42&&toward!==0?[[x+toward,y]]:[])];const next=choices.find(([nx,ny])=>nx!>1&&nx!<46&&ny!<46&&!occupied.has(`${nx},${ny}`));if(!next){e.vy=0;break}e.x=next[0]!;e.y=next[1]!}if(ownerIs(e,'sandfall-atrium','active'))occupied.add(`${Math.round(e.x)},${Math.round(e.y)}`)}
  const queued=controller.matter.owned((_,e)=>ownerIs(e,'sandfall-atrium','output'));for(const e of queued)controller.beginTransfer(e.id);
  controller.update(dt);
  const reservoir=controller.reservoir();for(let i=0;i<reservoir.length;i++){const e=reservoir[i]!;const col=i%38,row=Math.floor(i/38);e.x=5+col;e.y=43-Math.min(13,row)}
  if(controller.unlocked.size!==knownUnlocked){knownUnlocked=controller.unlocked.size;camera.setTarget(controller.cameraTarget());effects.push({kind:'unlock',x:72,y:120,age:0})}
  camera.update(dt);effects.forEach(e=>e.age+=dt);for(let i=effects.length-1;i>=0;i--)if(effects[i]!.age>=1)effects.splice(i,1);
  saveClock+=dt;if(saveClock>=2){saveClock=0;save()}
}
function conjure(count:number,x=24){if(castCooldown>0)return;controller.castSand(count);const newest=controller.matter.owned((_,e)=>ownerIs(e,'sandfall-atrium','active')).slice(-count);newest.forEach((e,i)=>{e.x=Math.max(3,Math.min(44,x+(i-(count-1)/2)));e.y=3;effects.push({kind:'cast',x:e.x+48,y:e.y+48,age:0})});castCooldown=.08}
function drawChamber(x:number,y:number,title:string){surface.noFill();surface.stroke(70,105,150);surface.rect(x+.5,y+.5,47,47);surface.stroke(77,221,210);surface.point(x+2,y+2);surface.point(x+45,y+2);surface.noStroke();surface.fill(108,151,190);surface.textSize(3);surface.textAlign(CENTER,TOP);surface.text(title,x+24,y+2)}
function renderWorld(){surface.noSmooth();surface.background(3,7,18);drawChamber(48,48,'SANDFALL ATRIUM');if(controller.unlocked.has('compression-crucible'))drawChamber(48,96,'COMPRESSION CRUCIBLE');
  surface.stroke(238,194,104);for(const e of controller.matter.owned((_,e)=>ownerIs(e,'sandfall-atrium','active')))surface.point(48+Math.round(e.x),48+Math.round(e.y));
  for(const t of controller.transfers){const e=controller.matter.get(t.entityId),p=t.progress;e.x=24;e.y=47+p*2;surface.stroke(244,202,116);surface.point(72,95+Math.round(p*3))}
  const reservoir=controller.reservoir();surface.stroke(202,154,82);for(const e of reservoir)surface.point(48+Math.round(e.x),96+Math.round(e.y));
  if(controller.ritualIds.length){const duration=controller.config.timings[controller.phase as keyof typeof controller.config.timings]??1,p=Math.min(1,controller.phaseTime/duration);for(let i=0;i<controller.ritualIds.length;i++){const e=controller.matter.get(controller.ritualIds[i]!),a=(i/controller.ritualIds.length)*TWO_PI+(e.visualSeed%31)/31,r=controller.phase==='compressing'?12*(1-p):controller.phase==='levitating'?12*p:12;e.x=24+Math.cos(a)*r;e.y=25+Math.sin(a)*r*.55;surface.stroke(244,188,91);surface.point(48+Math.round(e.x),96+Math.round(e.y))}surface.noFill();surface.stroke(124,91,218);surface.circle(72,121,Math.max(2,28-(controller.phase==='compressing'?24*p:0)))}
  for(const id of controller.outputStoneIds){const e=controller.matter.get(id);surface.fill(119,132,153);surface.noStroke();surface.rect(89+(id%3),136,2,2);surface.stroke(187,247,208);surface.point(90+(id%3),136)}
  for(const fx of effects){const alpha=255*(1-fx.age);surface.noFill();surface.stroke(fx.kind==='unlock'?126:94,fx.kind==='unlock'?93:234,220,alpha);surface.circle(fx.x,fx.y,2+fx.age*10);for(let i=0;i<4;i++)surface.point(fx.x+Math.cos(i*HALF_PI+fx.age*3)*4*(1-fx.age),fx.y+Math.sin(i*HALF_PI+fx.age*3)*4*(1-fx.age))}
}
function setup(){createCanvas(windowWidth,windowHeight);pixelDensity(1);noSmooth();surface=createGraphics(WORLD_SIZE,WORLD_SIZE);surface.pixelDensity(1);surface.noSmooth();surface.textFont('monospace');load()}
function draw(){const now=performance.now()/1000;if(!lastTime)lastTime=now;accumulator+=Math.min(.25,now-lastTime);lastTime=now;while(accumulator>=FIXED_STEP){fixedUpdate(FIXED_STEP);accumulator-=FIXED_STEP}background('#050914');renderWorld();const size=Math.floor(Math.min(width,height-82)),sourceSize=CHAMBER_SIZE*3/camera.current.zoom,scale=size/sourceSize,sx=camera.current.centerX-sourceSize/2,sy=camera.current.centerY-sourceSize/2;drawingContext.imageSmoothingEnabled=false;image(surface,Math.floor((width-size)/2),0,size,size,sx,sy,sourceSize,sourceSize);fill('#b9d6e8');textAlign(CENTER,TOP);textSize(13);text(`Sand conjured ${controller.lifetimeSand}   Crucible ${controller.reservoir().length} / ${controller.config.compressionInputCount}   Stones ${controller.outputStoneIds.length}`,width/2,size+14);fill('#7192aa');textSize(11);text(controller.unlocked.has('compression-crucible')?`Ritual: ${controller.phase}${controller.phase==='ready'?' — click the lower glyph or press C':''}`:`Conjure ${controller.config.stage2UnlockLifetimeSand-controller.lifetimeSand} more sand to reveal Stage 2`,width/2,size+36)}
function pointerWorld(){const size=Math.floor(Math.min(width,height-82)),sourceSize=CHAMBER_SIZE*3/camera.current.zoom,scale=size/sourceSize;return{x:camera.current.centerX-sourceSize/2+(mouseX-(width-size)/2)/scale,y:camera.current.centerY-sourceSize/2+mouseY/scale}}
function mousePressed(){const p=pointerWorld();if(p.x>=48&&p.x<96&&p.y>=48&&p.y<96)conjure(1,p.x-48);else if(p.x>=48&&p.x<96&&p.y>=96&&p.y<144)controller.invokeRitual()}
function keyPressed(){if(key===' '||keyCode===32)conjure(1);if(key==='e'||key==='E')conjure(8);if(key==='c'||key==='C')controller.invokeRitual();const local=location.hostname==='localhost'||location.hostname==='127.0.0.1';if(local&&new URLSearchParams(location.search).has('debugStages')&&(key==='u'||key==='U')){conjure(Math.max(0,controller.config.stage2UnlockLifetimeSand-controller.lifetimeSand))}}
function windowResized(){resizeCanvas(windowWidth,windowHeight)}function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(controller.serialize()))}catch{}}
function load(){try{const raw=localStorage.getItem(SAVE_KEY);if(raw)controller.hydrate(JSON.parse(raw)as StageSave);knownUnlocked=controller.unlocked.size;camera=new StageCamera(controller.cameraTarget())}catch{localStorage.removeItem(SAVE_KEY)}}
export function installStageWorld(){Object.assign(window,{setup,draw,mousePressed,keyPressed,windowResized});addEventListener('beforeunload',save)}
