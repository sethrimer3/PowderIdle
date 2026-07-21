export type ModuleKey =
  | 'jar'
  | 'conveyor'
  | 'rocket'
  | 'asteroid'
  | 'planet'
  | 'forge'
  | 'galaxy'
  | 'universe'
  | 'singularity'
  | 'inventory';

export type MachineModuleKey = Exclude<ModuleKey, 'inventory'>;

export interface Point {
  x: number;
  y: number;
}

export interface Rect extends Point {
  width: number;
  height: number;
}

export interface CenterPoint extends Point {
  centerX: number;
  centerY: number;
}

export interface JarRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface JarFunnelMetrics {
  noseWidth: number;
  topWidth: number;
  startRow: number;
  throatRow: number;
}

export type FunnelSpan = [start: number, end: number];

export interface CollageLayout {
  left: number;
  top: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
}

export interface MenuContentArea {
  left: number;
  right: number;
  center: number;
  width: number;
  top: number;
  bottom: number;
  scrollOffset: number;
}

export interface PowderDefinition {
  key: string;
  name: string;
  color: string;
  size: number;
  dustValue: number;
}

export interface PowderData {
  types: PowderDefinition[];
  tierUnlockCosts: number[];
  compressionRecipes: CompressionRecipe[];
}

export interface CompressionRecipe {
  from: number;
  to: number;
  baseCost: number;
  output: number;
}

export interface MachineGridPlacement {
  col: number;
  row: number;
  width: number;
  height: number;
}

export interface MachineDefinition {
  key: MachineModuleKey;
  name: string;
  description: string;
  grid: MachineGridPlacement;
}

export interface MachineConnection {
  from: MachineModuleKey;
  to: MachineModuleKey;
}

export interface MenuTab {
  key: string;
  label: string;
  icon?: string;
}

export interface MachinesData {
  definitions: MachineDefinition[];
  connections: MachineConnection[];
  menuTabs: MenuTab[];
}

export interface UpgradeConfig {
  key: string;
  module?: Exclude<MachineModuleKey, 'jar'>;
  name: string;
  description: string;
  baseCost: number;
  costMult: number;
}

export interface ResearchProject {
  key: string;
  name: string;
  description: string;
  baseCost: number;
  costMult?: number;
  maxLevel?: number;
}

export interface UpgradesData {
  upgrades: UpgradeConfig[];
  research: ResearchProject[];
}

export interface StrataLayer {
  key: string;
  name: string;
  requirement: number;
  dustBonus: number;
  gravityBonus: number;
  color: string;
  description: string;
}

export type MilestoneResource = 'dust' | 'cores' | 'powder';
export type MilestoneEffectType =
  | 'unlockAutoDrop'
  | 'unlockAutoCompress'
  | 'gravityBonus'
  | 'dustBonus'
  | 'codexUnlock'
  | 'coreBonus';

export interface MilestoneConfig {
  key: string;
  name: string;
  resource: MilestoneResource;
  requirement: number;
  description: string;
  reward: string;
  type: MilestoneEffectType;
  magnitude?: number;
}

export interface ProgressionData {
  strataLayers: StrataLayer[];
  milestones: MilestoneConfig[];
}

export interface GameData {
  powders: PowderData;
  machines: MachinesData;
  upgrades: UpgradesData;
  progression: ProgressionData;
}

export interface AutomationSettings {
  autoDrop: boolean;
  autoCompress: boolean;
}

export type AutomationKey = keyof AutomationSettings;
export type AutomationUnlocks = AutomationSettings;

export interface MilestoneBonuses {
  gravity: number;
  dust: number;
  automation: number;
  core: number;
}

export interface MilestoneState {
  unlocked: boolean;
  achieved: boolean;
  applied: boolean;
}

export interface LayerState {
  unlocked: boolean;
  completed: boolean;
  progress: number;
}

export type EntityLocation =
  | { module: 'inventory'; state: 'stored'; x?: number; y?: number }
  | { module: ModuleKey; state: PowderParticleState; x: number; y: number };

export interface PowderEntityMetadata {
  jarCol?: number;
  jarRow?: number;
  size?: number;
  spawnRatio?: number;
  source?: string;
}

export interface PowderEntity {
  id: number;
  type: number;
  color: string;
  mass: number;
  lineage: number[];
  contents: PowderEntity[];
  origin: string;
  metadata: PowderEntityMetadata;
  location?: EntityLocation;
}

export interface PowderEntityProperties {
  color?: string;
  mass?: number;
  contents?: PowderEntity[];
  origin?: string;
  metadata?: PowderEntityMetadata;
}

export type Inventory = PowderEntity[];

export type PowderParticleState =
  | 'idle'
  | 'stored'
  | 'falling'
  | 'resting'
  | 'queued'
  | 'moving'
  | 'launching'
  | 'orbiting'
  | 'consumed'
  | 'approach'
  | 'collapse'
  | 'drain'
  | 'fall'
  | 'forming'
  | 'fueling'
  | 'ignited'
  | 'launch'
  | 'lost'
  | 'orbit'
  | 'queue'
  | 'spiral'
  | 'woven';

export interface PowderParticleData {
  origin?: string;
  source?: number | string;
  delivered?: boolean;
  lane?: number;
  podIndex?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PowderParticle {
  entity: PowderEntity;
  module: ModuleKey;
  state: PowderParticleState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  progress: number;
  segment: number;
  color: string;
  data: PowderParticleData;
}

export interface PowderParticleUpdate {
  state?: PowderParticleState;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  progress?: number;
  segment?: number;
  data?: PowderParticleData;
}

export interface PowderWorldModule {
  particles: PowderParticle[];
}

export type PowderWorld = Record<ModuleKey, PowderWorldModule>;

export interface ActivePowder {
  col: number;
  row: number;
  type: number;
  fallProgress: number;
  collected: boolean;
  settled: boolean;
  entity: PowderEntity;
  moveDirection?: number;
  blockedFrames?: number;
}

export interface ProductionEvent {
  time: number;
  amount: number;
}

export interface ProductionLogEntry {
  events: ProductionEvent[];
  rate: number;
}

export interface ModuleRevealState {
  alpha: number;
  target: number;
}

export interface ConveyorBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface ConveyorGeometry {
  holeTop: number;
  floorY: number;
  entryRange: [number, number];
  spawnRate: number;
  drainExit?: number;
  bounds: ConveyorBounds;
  pixel: {
    innerLeft: number;
    innerWidth: number;
    minYScreen: number;
    maxYScreen: number;
    innerTop: number;
    innerBottom: number;
  };
}

export interface ConveyorPackageHistory {
  colors: string[];
  pulse: number;
}

export interface ConveyorState {
  fallers: PowderParticle[];
  restingParticles: PowderParticle[];
  queue: PowderEntity[];
  packageBuffer: PowderEntity[];
  packageHistory: ConveyorPackageHistory[];
  spawnTimer: number;
  deliveryPulse: number;
  packageProgress: number;
  packagePulse: number;
  autoTimer: number;
  initialized?: boolean;
  geometry?: ConveyorGeometry;
  layout?: unknown;
}

export interface RocketPod {
  progress: number;
  fueling: boolean;
  launch: number;
  package: PowderEntity | null;
}

export interface QueuedPackage {
  package: PowderEntity;
  colors: string[];
  pulse: number;
  progress: number;
  lane: number;
}

export interface RocketState {
  pods: RocketPod[];
  autoTimer: number;
  explosions: Array<{ life: number; index: number }>;
  successPulse: number;
  incoming: QueuedPackage[];
  nextLane: number;
  packageQueue: PowderEntity[];
}

export interface AsteroidBody {
  entity?: PowderEntity;
  particle?: PowderParticle;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  mass: number;
  radius?: number;
  angle?: number;
  spin?: number;
}

export interface AsteroidState {
  progress: number;
  asteroids: AsteroidBody[];
  powderBits: AsteroidBody[];
  ring: number;
  ringPulse: number;
  autoTimer: number;
  initialized?: boolean;
  fragments?: Array<{ life: number; angle: number; speed: number }>;
}

export interface OrbitalBody {
  entity?: PowderEntity;
  particle?: PowderParticle;
  angle: number;
  radius: number;
  speed?: number;
  mass: number;
  x?: number;
  y?: number;
}

export interface PlanetState {
  progress: number;
  planetesimals: OrbitalBody[];
  moons: OrbitalBody[];
  planetCore: PowderEntity | null;
  spin: number;
  coreGlow: number;
  moonPulse: number;
  autoTimer: number;
  initialized?: boolean;
  orbiters?: Array<{ life: number; angle: number; radius: number }>;
  coreMass?: number;
}

export interface ForgeState {
  progress: number;
  pulses: Array<{ life: number; angle: number }>;
  corona: number;
  autoTimer: number;
}

export interface GalaxyVortex {
  entity?: PowderEntity;
  particle?: PowderParticle;
  angle: number;
  radius?: number;
  progress?: number;
}

export interface GalaxyState {
  progress: number;
  angle: number;
  particles: GalaxyVortex[];
  vortices: GalaxyVortex[];
  bursts: Array<{ life: number; angle: number }>;
  autoTimer: number;
  initialized?: boolean;
}

export interface UniverseNode extends GalaxyVortex {
  pulse?: number;
}

export interface UniverseState {
  progress: number;
  angle: number;
  nodes: UniverseNode[];
  autoTimer: number;
}

export interface SingularityState {
  progress: number;
  shards: Array<{ life: number; angle: number }>;
  orbit: number;
  halo: number;
  autoTimer: number;
}

export interface ModuleStates {
  conveyor: ConveyorState;
  rocket: RocketState;
  asteroid: AsteroidState;
  planet: PlanetState;
  forge: ForgeState;
  galaxy: GalaxyState;
  universe: UniverseState;
  singularity: SingularityState;
}

export interface GameLoadingState {
  initialized: boolean;
  error: Error | null;
  fallbackUsed: boolean;
  message: string;
}

export type ButtonAction =
  | { action: 'selectPowder'; index: number }
  | { action: 'unlockModule'; index: number; key: MachineModuleKey }
  | { action: 'buyDropper'; index: number }
  | { action: 'buyUpgrade'; key: string }
  | { action: 'buyResearch'; key: string }
  | { action: 'toggleAutomation'; key: AutomationKey }
  | { action: 'compress'; recipe: CompressionRecipe }
  | { action: 'prestige' }
  | { action: 'switchMenu'; key: string }
  | { action: 'focusModule'; key: MachineModuleKey }
  | { action: 'moduleInteract'; key: MachineModuleKey };

export type UiButton = ButtonAction & {
  x: number;
  y: number;
  w: number;
  h: number;
  disabled?: boolean;
  scrollAware?: boolean;
};

export interface ModuleRenderContext {
  center: Point;
  panelW: number;
  panelH: number;
  rect: Rect;
  innerLeft?: number;
  innerTop?: number;
}

export interface ConveyorPanelLayout extends ModuleRenderContext {
  innerW: number;
  innerH: number;
  innerLeft: number;
  innerTop: number;
  paddingX: number;
  paddingY: number;
}

export interface ProgressState {
  progress: number;
  autoTimer: number;
}
