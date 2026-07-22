import type P5 from 'p5';
import type {
  ActivePowder,
  AutomationSettings,
  AutomationUnlocks,
  AsteroidBody,
  AsteroidState,
  CollageLayout,
  CompressionRecipe,
  ConveyorPanelLayout,
  ConveyorState,
  FunnelSpan,
  ForgeState,
  GalaxyState,
  GameData,
  Inventory,
  JarFunnelMetrics,
  JarRect,
  LayerState,
  MachineConnection,
  MachineDefinition,
  MachineModuleKey,
  MenuContentArea,
  MenuTab,
  MenuTabsArea,
  MilestoneBonuses,
  MilestoneConfig,
  MilestoneState,
  ModuleKey,
  ModuleRenderContext,
  NeonButtonOptions,
  ModuleRevealState,
  ModuleStates,
  PowderData,
  PowderDefinition,
  PowderEntity,
  PowderEntityProperties,
  PackageArrival,
  Planetesimal,
  PowderParticle,
  PowderParticleUpdate,
  PowderWorld,
  Point,
  PlanetState,
  ProgressState,
  ProductionLogEntry,
  ProgressionData,
  Rect,
  ResearchProject,
  RocketState,
  StrataLayer,
  SingularityState,
  UiButton,
  UpgradeConfig,
  UpgradesData,
  MachinesData,
  UniverseState
} from '../types/game';
import {
  validateMachinesData,
  validatePowderData,
  validateProgressionData,
  validateUpgradesData
} from '../config/validateGameData';
import {
  calculateCompressionCost,
  calculateDropperCost,
  calculatePrestigeGain,
  calculateUpgradeCost,
  isPowderTierUnlocked
} from '../simulation/economy';
import {
  clampColumnToFunnel as clampColumnToFunnelPure,
  getFunnelSpanForRows as getFunnelSpanForRowsPure
} from '../simulation/funnel';
import { addLayerProgress as applyLayerProgress } from '../simulation/progression';
import {
  addToInventory,
  calculateCompositeMass,
  consumeFromInventory,
  takeFromInventory
} from '../state/inventories';
import { IntegratedStageWorld, type RuntimeSaveSections } from './stageWorldRuntime';
import type { PowderIdleSaveV3, SaveValidationContext } from './persistence/saveSchema';
import { pointerIsInWorld } from './input/stageInput';
import { computeResponsiveGameLayout } from './layout/responsiveLayout';
import { MYSTICAL_FONT_FAMILY, MYSTICAL_UI } from './rendering/mysticalTheme';
import { stageUpgradeValue } from './stages/stageConfig';

const MYSTICAL_FONT_URL = new URL(
  '../../Assets/Font/Cinzel/Cinzel-VariableFont_wght.ttf',
  import.meta.url
).href;

// Game constants
      const BASE_SCREEN_W = 360;
      const BASE_SCREEN_H = 640;
      let SCREEN_W = BASE_SCREEN_W;
      let SCREEN_H = BASE_SCREEN_H;
      let MENU_W = Math.round(SCREEN_W * 0.34);
      let PLAY_AREA_W = SCREEN_W - MENU_W;
      const BASE_CELL_PIXEL_SIZE = 1;
      let cellPixelSize = BASE_CELL_PIXEL_SIZE;
      let layoutScaleX = 1;
      let layoutScaleY = 1;
      let canvas: P5.Renderer;
      let mysticalFont: P5.Font | string = MYSTICAL_FONT_FAMILY;
      const BASE_FALL_SPEED = 2;
      const CHAIN_REQUIREMENT = 100;
      const stageWorld = new IntegratedStageWorld();
      let stageSaveLoaded = false;
      let integratedSaveTimer = 0;
      let prestigeInProgress = false;
      const MODULE_UNLOCK_ORDER: MachineModuleKey[] = [];
      const DEFAULT_MENU_TABS = [
        { key: 'sandfall', label: 'Sandfall', icon: '🜃' },
        { key: 'universal', label: 'Universal', icon: '🌌' },
        { key: 'achievements', label: 'Achievements', icon: '📜' }
      ];

      interface MenuTheme {
        panelTop: string;
        panelBottom: string;
        panelBorder: string;
        panelShadow: string;
        innerBorder: string;
        cardTop: string;
        cardBottom: string;
        cardBorder: string;
        cardShadow: string;
        accent: string;
        accentHover: string;
        accentSoft: string;
        success: string;
        text: string;
        mutedText: string;
        invertedText: string;
        divider: string;
        buttonBase: string;
        buttonBorder: string;
        buttonDisabled: string;
        progressBg: string;
        headerText: string;
        tabInactive: string;
        tabActive: string;
        tabBorder: string;
      }

      const MENU_THEME: MenuTheme = {
        panelTop: MYSTICAL_UI.background,
        panelBottom: MYSTICAL_UI.panel,
        panelBorder: MYSTICAL_UI.graphiteLight,
        panelShadow: 'rgba(8, 7, 9, 0.82)',
        innerBorder: 'rgba(202, 181, 229, 0.28)',
        cardTop: MYSTICAL_UI.panel,
        cardBottom: MYSTICAL_UI.panelRaised,
        cardBorder: MYSTICAL_UI.graphite,
        cardShadow: 'rgba(8, 7, 9, 0.78)',
        accent: MYSTICAL_UI.violetStrong,
        accentHover: MYSTICAL_UI.emberLight,
        accentSoft: MYSTICAL_UI.violet,
        success: MYSTICAL_UI.violet,
        text: MYSTICAL_UI.text,
        mutedText: MYSTICAL_UI.violetMuted,
        invertedText: MYSTICAL_UI.background,
        divider: MYSTICAL_UI.graphite,
        buttonBase: MYSTICAL_UI.panelRaised,
        buttonBorder: MYSTICAL_UI.graphiteLight,
        buttonDisabled: '#2a272d',
        progressBg: '#242128',
        headerText: MYSTICAL_UI.violet,
        tabInactive: MYSTICAL_UI.panelRaised,
        tabActive: MYSTICAL_UI.ember,
        tabBorder: MYSTICAL_UI.graphiteLight
      };

      let powderTypes: PowderDefinition[] = [];
      let machineDefinitions: MachineDefinition[] = [];
      let machineConnections: MachineConnection[] = [];
      let menuTabs: MenuTab[] = [];
      let tierUnlockCosts: number[] = [];
      let compressionRecipes: CompressionRecipe[] = [];
      let upgradeConfigs: UpgradeConfig[] = [];
      let researchProjects: ResearchProject[] = [];
      let strataLayers: StrataLayer[] = [];
      let milestoneConfigs: MilestoneConfig[] = [];
      let MAX_POWDER_SIZE = 1;

      let powders: ActivePowder[] = [];
      let powderCounts: number[] = [];
      let tierInventories: Inventory[] = [];
      let nextEntityId = 1;
      let selectedPowder = 0;
      let tierUpgrades: boolean[] = [];
      let autoDroppers: number[] = [];
      let dropperTimers: number[] = [];
      let dust = 0;
      let totalDustEarned = 0;
      let crystalCores = 0;
      let totalPowderCollected = 0;
      let upgradesState: Record<string, number> = {};
      let activeMenu = 'sandfall';
      let layerStates: LayerState[] = [];
      let researchState: Record<string, number> = {};
      let automationSettings: AutomationSettings = {
        autoDrop: false,
        autoCompress: false
      };
      let automationUnlocks: AutomationUnlocks = {
        autoDrop: false,
        autoCompress: false
      };
      let autoDropTimer = 0;
      let autoCompressTimer = 0;
      let milestoneStates: MilestoneState[] = [];
      let milestoneBonuses: MilestoneBonuses = {
        gravity: 0,
        dust: 0,
        automation: 0,
        core: 0
      };
      let milestoneMessage: string | null = null;
      let milestoneMessageTimer = 0;
      let codexUnlocked = false;
      let buttons: UiButton[] = [];
      let menuScroll = 0;
      let menuScrollMax = 0;
      let menuDragState = {
        active: false,
        startY: 0,
        startScroll: 0,
        dragging: false
      };
      let activeButton: UiButton | null = null;
      let fullscreenModule: ModuleKey | null = null;
      let jarVisible = true;
      let selectedModule: ModuleKey | null = null;
      let duneHeightUnits = 0;
      let duneDustMultiplier = 1;
      let jarReleaseState = { open: false, openTimer: 0, cooldown: 0 };
      let jarChuteExit: {
        x: number;
        y: number;
        width: number;
        left: number;
        right: number;
      } | null = null;
      let moduleRevealStates: Partial<Record<ModuleKey, ModuleRevealState>> = {};
      const TRACKED_MODULE_KEYS = new Set([
        'conveyor',
        'rocket',
        'asteroid',
        'planet',
        'forge',
        'galaxy',
        'universe',
        'singularity'
      ]);
      const MODULE_PRODUCTION_WINDOW = 12;
      const JAR_TUBE_PIXEL_WIDTH = 5;
      const MODULE_PATH_PIXEL_WIDTH = 5;
      let moduleProductionLog: Partial<Record<ModuleKey, ProductionLogEntry>> = {};
      const moduleInteractionHints = {
        conveyor: 'Click to rush extra cargo.',
        rocket: 'Tap to fuel launches faster.',
        asteroid: 'Crack launches into stardust.',
        planet: 'Steady the rings for perfect worlds.',
        forge: 'Ignite the forge to birth stars.',
        galaxy: 'Stir the loom to weave galaxies.',
        universe: 'Nudge worlds to sync their orbit.',
        singularity: 'Channel collapsing light into cores.'
      };

      function isTrackedModuleKey(
        value: string
      ): value is Exclude<MachineModuleKey, 'jar'> {
        switch (value) {
          case 'conveyor':
          case 'rocket':
          case 'asteroid':
          case 'planet':
          case 'forge':
          case 'galaxy':
          case 'universe':
          case 'singularity':
            return true;
          default:
            return false;
        }
      }
      const FALLBACK_DATA = {
        powders: {
          types: [
            {
              key: 'sand',
              name: 'Sand',
              color: '#d7c59a',
              size: 1,
              dustValue: 1
            },
            {
              key: 'stone',
              name: 'Stone',
              color: '#7f8a91',
              size: 2,
              dustValue: 10
            },
            {
              key: 'copper',
              name: 'Copper',
              color: '#b87333',
              size: 3,
              dustValue: 100
            },
            {
              key: 'silver',
              name: 'Silver',
              color: '#c0c5cf',
              size: 4,
              dustValue: 1000
            },
            {
              key: 'gold',
              name: 'Gold',
              color: '#ffd700',
              size: 5,
              dustValue: 10000
            },
            {
              key: 'diamond',
              name: 'Diamond',
              color: '#b9f2ff',
              size: 6,
              dustValue: 100000
            },
            {
              key: 'galaxy',
              name: 'Galaxies',
              color: '#c084fc',
              size: 7,
              dustValue: 1000000
            },
            {
              key: 'universe',
              name: 'Universes',
              color: '#22d3ee',
              size: 8,
              dustValue: 10000000
            },
            {
              key: 'singularity',
              name: 'Singularities',
              color: '#f8fafc',
              size: 9,
              dustValue: 100000000
            }
          ],
          tierUnlockCosts: [
            100,
            10000,
            1000000,
            100000000,
            10000000000,
            1000000000000,
            100000000000000,
            10000000000000000
          ],
          compressionRecipes: [
            { from: 0, to: 1, baseCost: 18, output: 1 },
            { from: 1, to: 2, baseCost: 14, output: 1 },
            { from: 2, to: 3, baseCost: 12, output: 1 },
            { from: 3, to: 4, baseCost: 10, output: 1 },
            { from: 4, to: 5, baseCost: 8, output: 1 },
            { from: 5, to: 6, baseCost: 6, output: 1 },
            { from: 6, to: 7, baseCost: 4, output: 1 },
            { from: 7, to: 8, baseCost: 3, output: 1 }
          ]
        },
        machines: {
          definitions: [
            {
              key: 'jar',
              name: 'Sandfall Jar',
              description: 'The heart of your atelier.',
              grid: { col: 1, row: 1, width: 1, height: 1 }
            },
            {
              key: 'conveyor',
              name: 'Grain Conveyor',
              description: 'Collects grains for packaging.',
              grid: { col: 1, row: 2, width: 1, height: 1 }
            },
            {
              key: 'rocket',
              name: 'Launch Bay',
              description: 'Bundles packages into launch fuel.',
              grid: { col: 0, row: 2, width: 1, height: 1 }
            },
            {
              key: 'asteroid',
              name: 'Asteroid Crucible',
              description: 'Pressurizes launches into asteroids.',
              grid: { col: 0, row: 1, width: 1, height: 1 }
            },
            {
              key: 'planet',
              name: 'Planetarium',
              description: 'Accretes asteroids into planets.',
              grid: { col: 0, row: 0, width: 1, height: 1 }
            },
            {
              key: 'forge',
              name: 'Star Forge',
              description: 'Ignites planets into radiant stars.',
              grid: { col: 1, row: 0, width: 1, height: 1 }
            },
            {
              key: 'galaxy',
              name: 'Celestial Loom',
              description: 'Weaves stars into galaxies.',
              grid: { col: 2, row: 0, width: 1, height: 1 }
            },
            {
              key: 'universe',
              name: 'Universe Foundry',
              description: 'Binds galaxies into universes.',
              grid: { col: 2, row: 1, width: 1, height: 1 }
            },
            {
              key: 'singularity',
              name: 'Singularity Crucible',
              description: 'Collapses universes into singularities.',
              grid: { col: 2, row: 2, width: 1, height: 1 }
            }
          ],
          connections: [
            { from: 'jar', to: 'conveyor' },
            { from: 'conveyor', to: 'rocket' },
            { from: 'rocket', to: 'asteroid' },
            { from: 'asteroid', to: 'planet' },
            { from: 'planet', to: 'forge' },
            { from: 'forge', to: 'galaxy' },
            { from: 'galaxy', to: 'universe' },
            { from: 'universe', to: 'singularity' }
          ],
          menuTabs: [
            { key: 'sandfall', label: 'Sandfall' },
            { key: 'module', label: 'Module' },
            { key: 'universal', label: 'Universal' },
            { key: 'achievements', label: 'Achievements' }
          ]
        },
        upgrades: {
          upgrades: [
            {
              key: 'gravity',
              name: 'Gravity Well',
              description: 'Powders fall 20% faster per level.',
              baseCost: 50,
              costMult: 2
            },
            {
              key: 'refinery',
              name: 'Refinery Vats',
              description: 'Dust yield +35% per level.',
              baseCost: 80,
              costMult: 2.2
            },
            {
              key: 'compressor',
              name: 'Powder Compressor',
              description: 'Unlocks compression recipes and improves efficiency.',
              baseCost: 120,
              costMult: 2.6
            },
            {
              key: 'lanterns',
              name: 'Aether Lanterns',
              description: 'Layer stabilization +25% per level.',
              baseCost: 140,
              costMult: 2.4
            },
            {
              key: 'harmonics',
              name: 'Harmonic Resonator',
              description: 'Automation cadence +20% per level.',
              baseCost: 200,
              costMult: 2.8
            },
            {
              key: 'conveyorAutomation',
              module: 'conveyor',
              name: 'Self-Jolting Belt',
              description: 'Automatically jolts the conveyor every few seconds.',
              baseCost: 90,
              costMult: 2.4
            },
            {
              key: 'conveyorAutomationSpeed',
              module: 'conveyor',
              name: 'Flux Gearbox',
              description: 'Speeds up automated conveyor jolts.',
              baseCost: 120,
              costMult: 2.6
            },
            {
              key: 'conveyorOverfill',
              module: 'conveyor',
              name: 'Overflow Catchers',
              description: 'Overflowing hoppers sometimes double packaged output and dust.',
              baseCost: 150,
              costMult: 2.7
            },
            {
              key: 'rocketAutomation',
              module: 'rocket',
              name: 'Launch Scripts',
              description: 'Automates launch bay boosts at a steady cadence.',
              baseCost: 160,
              costMult: 2.5
            },
            {
              key: 'rocketAutomationSpeed',
              module: 'rocket',
              name: 'Cryo Pumps',
              description: 'Cuts the delay between automated launch bay boosts.',
              baseCost: 190,
              costMult: 2.6
            },
            {
              key: 'rocketSuccessRate',
              module: 'rocket',
              name: 'Telemetry Drones',
              description: 'Raises launch success chance by +18% per level.',
              baseCost: 140,
              costMult: 2.4
            },
            {
              key: 'asteroidAutomation',
              module: 'asteroid',
              name: 'Crucible Sequencer',
              description: 'Automates cracking the crucible for asteroid gains.',
              baseCost: 230,
              costMult: 2.6
            },
            {
              key: 'asteroidAutomationSpeed',
              module: 'asteroid',
              name: 'Geode Shifters',
              description: 'Accelerates automated crucible strikes.',
              baseCost: 270,
              costMult: 2.7
            },
            {
              key: 'asteroidFissionBoost',
              module: 'asteroid',
              name: 'Fission Catalyst',
              description: 'Asteroid crafts sometimes fracture into extra rubble and dust.',
              baseCost: 300,
              costMult: 2.8
            },
            {
              key: 'planetAutomation',
              module: 'planet',
              name: 'Orbital Metronome',
              description: 'Automates tuning of the planetarium.',
              baseCost: 320,
              costMult: 2.6
            },
            {
              key: 'planetAutomationSpeed',
              module: 'planet',
              name: 'Gravimetric Drives',
              description: 'Spins automated tuning cycles faster.',
              baseCost: 360,
              costMult: 2.7
            },
            {
              key: 'planetMoonNursery',
              module: 'planet',
              name: 'Moon Nurseries',
              description: 'Every new moon grants bonus planets and dust.',
              baseCost: 380,
              costMult: 2.9
            },
            {
              key: 'forgeAutomation',
              module: 'forge',
              name: 'Hammer Servitors',
              description: 'Automates striking the forge.',
              baseCost: 430,
              costMult: 2.7
            },
            {
              key: 'forgeAutomationSpeed',
              module: 'forge',
              name: 'Solar Flywheels',
              description: 'Reduces the wait between automated forge strikes.',
              baseCost: 470,
              costMult: 2.8
            },
            {
              key: 'forgeSupernova',
              module: 'forge',
              name: 'Supernova Crucibles',
              description: 'Forged stars erupt for bonus dust and occasional extra stars.',
              baseCost: 520,
              costMult: 2.9
            },
            {
              key: 'galaxyAutomation',
              module: 'galaxy',
              name: 'Autonomous Loom',
              description: 'Spins the celestial loom on its own.',
              baseCost: 560,
              costMult: 2.8
            },
            {
              key: 'galaxyAutomationSpeed',
              module: 'galaxy',
              name: 'Stellar Relays',
              description: 'Quickens the cadence of automated galaxy weaving.',
              baseCost: 600,
              costMult: 3
            },
            {
              key: 'galaxyCluster',
              module: 'galaxy',
              name: 'Cluster Architects',
              description: 'Galaxy weaves may cluster into extra galaxies and light bursts.',
              baseCost: 640,
              costMult: 3.1
            },
            {
              key: 'universeAutomation',
              module: 'universe',
              name: 'Continuum Orchestrator',
              description: 'Synchronizes universes automatically.',
              baseCost: 700,
              costMult: 3
            },
            {
              key: 'universeAutomationSpeed',
              module: 'universe',
              name: 'Quantum Gyres',
              description: 'Accelerates automated universe syncing.',
              baseCost: 760,
              costMult: 3.1
            },
            {
              key: 'universeContinuum',
              module: 'universe',
              name: 'Continuum Harmonizers',
              description: 'Linked universes can resonate into extra output.',
              baseCost: 820,
              costMult: 3.2
            },
            {
              key: 'singularityAutomation',
              module: 'singularity',
              name: 'Singularity Shepherds',
              description: 'Automates harvesting the crucible.',
              baseCost: 880,
              costMult: 3.2
            },
            {
              key: 'singularityAutomationSpeed',
              module: 'singularity',
              name: 'Event Horizon Lattices',
              description: 'Accelerates automated crucible harvests.',
              baseCost: 930,
              costMult: 3.3
            },
            {
              key: 'singularityCatalyst',
              module: 'singularity',
              name: 'Catalytic Mirrors',
              description: 'Cores may refract into bonus cores and dust.',
              baseCost: 990,
              costMult: 3.4
            }
          ],
          research: [
            {
              key: 'lens',
              name: 'Graviton Lens',
              description: 'Magnifies gravity and dust yield slightly.',
              baseCost: 700,
              maxLevel: 4
            },
            {
              key: 'overclock',
              name: 'Overclock Arrays',
              description: 'Boosts machine craft speed and output.',
              baseCost: 900,
              maxLevel: 4
            },
            {
              key: 'quantum',
              name: 'Quantum Weave',
              description: 'Compression cycles occasionally skip a tier.',
              baseCost: 1100,
              maxLevel: 3
            },
            {
              key: 'archives',
              name: 'Archivist Accord',
              description: 'Milestones grant stronger bonuses.',
              baseCost: 1200,
              maxLevel: 3
            }
          ]
        },
        progression: {
          strataLayers: [
            {
              key: 'surface',
              name: 'Surface Crust',
              requirement: 160,
              dustBonus: 0.06,
              gravityBonus: 0.05,
              color: '#1f2937',
              description: 'Stabilize the loose crust to focus the fall.'
            },
            {
              key: 'basalt',
              name: 'Basalt Vein',
              requirement: 420,
              dustBonus: 0.08,
              gravityBonus: 0.08,
              color: '#111c2d',
              description: 'Dense basalt channels powders into tighter streams.'
            },
            {
              key: 'shimmer',
              name: 'Shimmer Cavern',
              requirement: 900,
              dustBonus: 0.14,
              gravityBonus: 0.12,
              color: '#2c1b47',
              description: 'Glittering caverns hum with resonant dust currents.'
            },
            {
              key: 'mantle',
              name: 'Aether Mantle',
              requirement: 1600,
              dustBonus: 0.22,
              gravityBonus: 0.18,
              color: '#3b185f',
              description: 'Liquid aether bends gravity toward your funnels.'
            },
            {
              key: 'spire',
              name: 'Stellar Spire',
              requirement: 2400,
              dustBonus: 0.28,
              gravityBonus: 0.22,
              color: '#36155a',
              description: 'A needle of stardust concentrates every grain that falls.'
            },
            {
              key: 'abyss',
              name: 'Chrono Abyss',
              requirement: 3600,
              dustBonus: 0.34,
              gravityBonus: 0.26,
              color: '#250f43',
              description: 'Time coils inward, dragging matter toward the crucible.'
            }
          ],
          milestones: [
            {
              key: 'artisan',
              name: "Artisan's Rhythm",
              resource: 'dust',
              requirement: 250,
              description: 'Unlock auto dropper toggles to keep the jar raining.',
              reward: 'Auto drop enabled',
              type: 'unlockAutoDrop'
            },
            {
              key: 'engine',
              name: 'Clockwork Engine',
              resource: 'dust',
              requirement: 1200,
              description: 'Unlock automated compression routines.',
              reward: 'Auto compression enabled',
              type: 'unlockAutoCompress'
            },
            {
              key: 'gravityPulse',
              name: 'Gravity Pulse',
              resource: 'dust',
              requirement: 2800,
              description: 'Amplify the pull within the jar for faster settling.',
              reward: '+15% global gravity',
              type: 'gravityBonus',
              magnitude: 0.15
            },
            {
              key: 'dustBloom',
              name: 'Dust Bloom',
              resource: 'dust',
              requirement: 5200,
              description: 'Crystallize stray grains into useful dust.',
              reward: '+18% dust yield',
              type: 'dustBonus',
              magnitude: 0.18
            },
            {
              key: 'chronicle',
              name: 'Chronicle of Echoes',
              resource: 'dust',
              requirement: 9000,
              description: 'Record your discoveries to unlock the codex.',
              reward: 'Codex tab + automation boost',
              type: 'codexUnlock',
              magnitude: 0.25
            },
            {
              key: 'coreForge',
              name: 'Core Forge',
              resource: 'cores',
              requirement: 24,
              description: 'Channel singularity cores to enrich future cores.',
              reward: '+20% crystal yield',
              type: 'coreBonus',
              magnitude: 0.2
            }
          ]
        }
      } satisfies GameData;
      let moduleStates: ModuleStates = createDefaultModuleStates();
      const POWDER_WORLD_KEYS: ModuleKey[] = [
        'jar',
        'conveyor',
        'rocket',
        'asteroid',
        'planet',
        'forge',
        'galaxy',
        'universe',
        'singularity',
        'inventory'
      ];
      const POWDER_TYPE_DEFAULT_MODULE: Readonly<
        Record<number, Exclude<MachineModuleKey, 'jar'>>
      > = {
        0: 'conveyor',
        1: 'rocket',
        2: 'asteroid',
        3: 'planet',
        4: 'planet',
        5: 'forge',
        6: 'galaxy',
        7: 'universe',
        8: 'singularity'
      };
      let powderWorld: PowderWorld = createPowderWorld();
      let powderParticleLookup = new Map<number, PowderParticle>();

      function createPowderWorld(): PowderWorld {
        return {
          jar: { particles: [] },
          conveyor: { particles: [] },
          rocket: { particles: [] },
          asteroid: { particles: [] },
          planet: { particles: [] },
          forge: { particles: [] },
          galaxy: { particles: [] },
          universe: { particles: [] },
          singularity: { particles: [] },
          inventory: { particles: [] }
        };
      }

      function ensurePowderWorldModule(key: ModuleKey | null | undefined) {
        if (!key) return null;
        if (!powderWorld[key]) {
          powderWorld[key] = { particles: [] };
        }
        return powderWorld[key];
      }

      function resetPowderWorld() {
        powderWorld = createPowderWorld();
        powderParticleLookup = new Map();
      }

      function getPowderParticleForEntity(entity: PowderEntity | null | undefined) {
        if (!entity || entity.id == null) return null;
        return powderParticleLookup.get(entity.id) || null;
      }

      function removePowderParticleForEntity(entity: PowderEntity | null | undefined): void {
        if (!entity) return;
        let particle =
          typeof entity.id === 'number' ? powderParticleLookup.get(entity.id) : null;
        if (!particle) return;
        removePowderParticle(particle);
      }

      function removePowderParticle(particle: PowderParticle | null | undefined): void {
        if (!particle) return;
        let moduleGroup = powderWorld[particle.module];
        if (moduleGroup && Array.isArray(moduleGroup.particles)) {
          let index = moduleGroup.particles.indexOf(particle);
          if (index !== -1) {
            moduleGroup.particles.splice(index, 1);
          }
        }
        if (particle.entity && particle.entity.id != null) {
          powderParticleLookup.delete(particle.entity.id);
          if (particle.entity.location) {
            particle.entity.location = { module: 'inventory', state: 'stored' };
          }
        }
      }

      function placeParticleInModule(
        particle: PowderParticle | null | undefined,
        moduleKey: ModuleKey
      ): void {
        let group = ensurePowderWorldModule(moduleKey);
        if (!group || !particle) return;
        if (!Array.isArray(group.particles)) {
          group.particles = [];
        }
        if (!group.particles.includes(particle)) {
          group.particles.push(particle);
        }
      }

      function movePowderParticleToModule(
        particle: PowderParticle | null | undefined,
        moduleKey: ModuleKey,
        props: PowderParticleUpdate = {}
      ) {
        if (!particle) return null;
        if (particle.module !== moduleKey) {
          let previous = powderWorld[particle.module];
          if (previous && Array.isArray(previous.particles)) {
            let index = previous.particles.indexOf(particle);
            if (index !== -1) {
              previous.particles.splice(index, 1);
            }
          }
          particle.module = moduleKey;
        }
        updatePowderParticle(particle, props, false);
        placeParticleInModule(particle, moduleKey);
        return particle;
      }

      function updatePowderParticle(
        particle: PowderParticle | null | undefined,
        props: PowderParticleUpdate = {},
        updateModule = true
      ) {
        if (!particle) return particle;
        if (props.state != null) particle.state = props.state;
        if (props.x != null) particle.x = props.x;
        if (props.y != null) particle.y = props.y;
        if (props.vx != null) particle.vx = props.vx;
        if (props.vy != null) particle.vy = props.vy;
        if (props.progress != null) particle.progress = props.progress;
        if (props.segment != null) particle.segment = props.segment;
        if (props.data) {
          particle.data = { ...(particle.data || {}), ...props.data };
        }
        if (!particle.data) {
          particle.data = {};
        }
        if (particle.entity) {
          particle.entity.location = {
            module: particle.module,
            state: particle.state,
            x: particle.x,
            y: particle.y
          };
        }
        if (updateModule) {
          placeParticleInModule(particle, particle.module);
        }
        return particle;
      }

      function createPowderParticleForEntity(
        entity: PowderEntity | null | undefined,
        moduleKey: ModuleKey | null,
        props: PowderParticleUpdate = {}
      ) {
        if (!entity || entity.id == null) return null;
        let existing = getPowderParticleForEntity(entity);
        if (existing) {
          if (moduleKey) {
            movePowderParticleToModule(existing, moduleKey, props);
          } else {
            updatePowderParticle(existing, props);
          }
          return existing;
        }
        let particle = {
          entity,
          module: moduleKey || 'inventory',
          state: props.state || 'idle',
          x: props.x != null ? props.x : 0,
          y: props.y != null ? props.y : 0,
          vx: props.vx != null ? props.vx : 0,
          vy: props.vy != null ? props.vy : 0,
          progress: props.progress != null ? props.progress : 0,
          segment: props.segment != null ? props.segment : 0,
          color: entity.color,
          data: props.data ? { ...props.data } : {}
        };
        powderParticleLookup.set(entity.id, particle);
        if (moduleKey) {
          placeParticleInModule(particle, moduleKey);
        }
        updatePowderParticle(particle, props, false);
        return particle;
      }

      function despawnParticlesForEntities(entities: PowderEntity[] | null | undefined): void {
        if (!Array.isArray(entities)) return;
        for (let entity of entities) {
          removePowderParticleForEntity(entity);
        }
      }

      function createDefaultModuleStates(): ModuleStates {
        return {
          conveyor: {
            fallers: [],
            restingParticles: [],
            queue: [],
            packageBuffer: [],
            packageHistory: [],
            spawnTimer: 0,
            deliveryPulse: 0,
            packageProgress: 0,
            packagePulse: 0,
            autoTimer: 0
          },
          rocket: {
            pods: [],
            autoTimer: 0,
            explosions: [],
            successPulse: 0,
            incoming: [],
            nextLane: 0,
            packageQueue: []
          },
          asteroid: {
            progress: 0,
            asteroids: [],
            powderBits: [],
            ring: 0,
            ringPulse: 0,
            autoTimer: 0
          },
          planet: {
            progress: 0,
            planetesimals: [],
            moons: [],
            planetCore: null,
            spin: 0,
            coreGlow: 0,
            moonPulse: 0,
            autoTimer: 0
          },
          forge: { progress: 0, pulses: [], corona: 0, autoTimer: 0 },
          galaxy: {
            progress: 0,
            angle: 0,
            particles: [],
            vortices: [],
            bursts: [],
            autoTimer: 0
          },
          universe: { progress: 0, angle: 0, nodes: [], autoTimer: 0 },
          singularity: { progress: 0, shards: [], orbit: 0, halo: 0, autoTimer: 0 }
        };
      }

      function resetModuleRevealStates() {
        moduleRevealStates = {};
        for (let machine of machineDefinitions || []) {
          if (!machine || !machine.key) continue;
          let unlocked = isMachineUnlocked(machine.key);
          moduleRevealStates[machine.key] = {
            alpha: unlocked ? 0 : 1,
            target: unlocked ? 0 : 1
          };
        }
      }

      function ensureModuleRevealState(key: ModuleKey | null | undefined) {
        if (!key) return null;
        if (!moduleRevealStates[key]) {
          moduleRevealStates[key] = { alpha: 1, target: 1 };
        }
        return moduleRevealStates[key];
      }

      function beginModuleReveal(key: ModuleKey): void {
        let state = ensureModuleRevealState(key);
        if (!state) return;
        state.alpha = 1;
        state.target = 0;
      }

      function updateModuleCoverAlpha(key: ModuleKey, unlocked: boolean): number {
        let state = ensureModuleRevealState(key);
        if (!state) {
          return 0;
        }
        if (!unlocked) {
          state.alpha = 1;
          state.target = 1;
          return state.alpha;
        }
        state.target = 0;
        let dt = typeof deltaTime === 'number' && deltaTime > 0 ? deltaTime / 1000 : 0.016;
        let fadeRate = 1.8;
        if (state.alpha > state.target) {
          state.alpha = Math.max(state.target, state.alpha - dt * fadeRate);
        } else if (state.alpha < state.target) {
          state.alpha = Math.min(state.target, state.alpha + dt * fadeRate);
        }
        if (state.alpha < 0.001) {
          state.alpha = 0;
        }
        return state.alpha;
      }

      function resetInventories() {
        tierInventories = new Array(powderTypes.length).fill(null).map(() => []);
        nextEntityId = 1;
      }

      function ensureInventory(type: number): Inventory {
        if (!tierInventories[type]) {
          tierInventories[type] = [];
        }
        return tierInventories[type];
      }

      function mergeLineage(
        components: PowderEntity[] | null | undefined,
        includeId?: number
      ): number[] {
        let lineageSet = new Set<number>();
        if (includeId && typeof includeId === 'number') {
          lineageSet.add(includeId);
        }
        for (let component of components || []) {
          if (!component) continue;
          if (Array.isArray(component.lineage)) {
            for (let id of component.lineage) {
              lineageSet.add(id);
            }
          } else if (component.id != null) {
            lineageSet.add(component.id);
          }
        }
        return Array.from(lineageSet);
      }

      function createBaseEntity(type: number, props: PowderEntityProperties = {}): PowderEntity {
        let id = nextEntityId++;
        return {
          id,
          type,
          color:
            props.color || (powderTypes[type] && powderTypes[type].color) || '#ffffff',
          mass: props.mass != null ? props.mass : 1,
          lineage: mergeLineage(props.contents, id),
          contents: props.contents ? props.contents.slice() : [],
          origin: props.origin || 'jar',
          metadata: props.metadata ? { ...props.metadata } : {}
        };
      }

      function createCompositeEntity(
        type: number,
        components: PowderEntity[],
        props: PowderEntityProperties = {}
      ): PowderEntity {
        let id = nextEntityId++;
        let contents = (components || []).slice();
        let mass = calculateCompositeMass(contents);
        return {
          id,
          type,
          color:
            props.color || (powderTypes[type] && powderTypes[type].color) || '#ffffff',
          mass,
          contents,
          lineage: mergeLineage(contents, id),
          origin: props.origin || 'composite',
          metadata: props.metadata ? { ...props.metadata } : {}
        };
      }

      function recalcCompositeMass(entity: PowderEntity | null | undefined): number {
        if (!entity) return 0;
        let contents = Array.isArray(entity.contents) ? entity.contents : [];
        let mass = calculateCompositeMass(contents);
        entity.mass = mass;
        entity.lineage = mergeLineage(contents, entity.id);
        return mass;
      }

      function gainEntity(type: number, entity: PowderEntity): PowderEntity {
        let inventory = ensureInventory(type);
        addToInventory(inventory, entity);
        powderCounts[type] = (powderCounts[type] || 0) + 1;
        routeEntityPostCreation(entity);
        if (entity && entity.origin) {
          recordModuleProduction(entity.origin, entity.mass != null ? entity.mass : 0);
        }
        return entity;
      }

      function gainEntities(type: number, entities: PowderEntity[] | null | undefined): void {
        for (let entity of entities || []) {
          gainEntity(type, entity);
        }
      }

      function recordModuleProduction(origin: string, amount: number): void {
        if (!origin || amount <= 0) {
          return;
        }
        let key = String(origin).toLowerCase();
        if (!isTrackedModuleKey(key) || !TRACKED_MODULE_KEYS.has(key)) {
          return;
        }
        let now = getNowSeconds();
        if (!moduleProductionLog[key]) {
          moduleProductionLog[key] = { events: [], rate: 0 };
        }
        let entry = moduleProductionLog[key];
        entry.events.push({ time: now, amount });
        pruneModuleProduction(entry, now);
      }

      function getModuleProductionRate(key: ModuleKey): number {
        let entry = moduleProductionLog[key];
        if (!entry) {
          return 0;
        }
        pruneModuleProduction(entry, getNowSeconds());
        return entry.rate || 0;
      }

      function getModuleProductionSummaries() {
        let summaries = [];
        for (let moduleKey of MODULE_UNLOCK_ORDER) {
          if (!TRACKED_MODULE_KEYS.has(moduleKey)) {
            continue;
          }
          if (!isMachineUnlocked(moduleKey)) {
            continue;
          }
          let machine = machineDefinitions.find((m) => m.key === moduleKey);
          summaries.push({
            key: moduleKey,
            name: machine ? machine.name : moduleKey,
            rate: getModuleProductionRate(moduleKey)
          });
        }
        return summaries;
      }

      function pruneModuleProduction(entry: ProductionLogEntry, now: number): void {
        if (!entry) return;
        let windowSize = MODULE_PRODUCTION_WINDOW;
        let cutoff = now - windowSize;
        entry.events = (entry.events || []).filter((evt) => evt.time >= cutoff);
        let total = 0;
        for (let evt of entry.events) {
          total += evt.amount || 0;
        }
        entry.rate = windowSize > 0 ? total / windowSize : 0;
      }

      function getNowSeconds() {
        if (typeof performance !== 'undefined' && performance.now) {
          return performance.now() / 1000;
        }
        return Date.now() / 1000;
      }

      function routeEntityPostCreation(entity: PowderEntity | null | undefined): void {
        if (!entity || entity.type == null) return;
        let defaultModule = POWDER_TYPE_DEFAULT_MODULE[entity.type];
        if (defaultModule) {
          createPowderParticleForEntity(entity, defaultModule, {
            state: 'stored',
            data: { origin: entity.origin }
          });
        }
        switch (entity.type) {
          case 0:
            // Reintroduce base grains into the conveyor flow when they originate outside the jar.
            if (entity.origin && entity.origin !== 'jar' && entity.origin !== 'quantum') {
              requeueSalvagedGrains([entity]);
            }
            break;
          case 1:
            if (entity.origin !== 'conveyor') {
              queuePackageDirect(entity);
            }
            break;
          default:
            break;
        }
      }

      function queuePackageDirect(packageEntity: PowderEntity | null | undefined): void {
        if (!packageEntity) return;
        let rocketState = moduleStates && moduleStates.rocket;
        if (!rocketState) return;
        rocketState.packageQueue = rocketState.packageQueue || [];
        if (rocketState.packageQueue.some((pkg) => pkg && pkg.id === packageEntity.id)) {
          return;
        }
        rocketState.packageQueue.push(packageEntity);
        while (rocketState.packageQueue.length > 60) {
          rocketState.packageQueue.shift();
        }
        rocketState.incoming = rocketState.incoming || [];
        let laneCount = rocketState.pods && rocketState.pods.length ? rocketState.pods.length : 3;
        let lane = rocketState.nextLane || 0;
        rocketState.nextLane = (lane + 1) % laneCount;
        let colors = (packageEntity.contents || []).map((grain) => grain.color || '#f2b066');
        rocketState.incoming.push({
          package: packageEntity,
          colors,
          pulse: 0.6,
          progress: 0.9,
          lane
        });
        while (rocketState.incoming.length > 8) {
          rocketState.incoming.shift();
        }
      }

      function consumeEntity(type: number, entity: PowderEntity): PowderEntity | null {
        let inventory = ensureInventory(type);
        let removed = consumeFromInventory(inventory, entity.id);
        if (removed) {
          powderCounts[type] = Math.max(0, (powderCounts[type] || 0) - 1);
          return removed;
        }
        return null;
      }

      function consumeEntities(type: number, entities: PowderEntity[] | null | undefined) {
        let removed: PowderEntity[] = [];
        for (let entity of entities || []) {
          let result = consumeEntity(type, entity);
          if (result) {
            removed.push(result);
          }
        }
        return removed;
      }

      function takeEntities(type: number, count: number): PowderEntity[] {
        let inventory = ensureInventory(type);
        if (count <= 0 || inventory.length === 0) {
          return [];
        }
        let batch = takeFromInventory(inventory, count);
        let actual = batch.length;
        powderCounts[type] = Math.max(0, (powderCounts[type] || 0) - actual);
        return batch;
      }
      let grid: Array<Array<ActivePowder | null>> = [];
      let gridCols = 0;
      let gridRows = 0;
      let jarWalls: boolean[][] = [];
      let jarFunnelProfile: FunnelSpan[] = [];
      let jarNeckSpan: { start: number; end: number } = { start: 0, end: 0 };
      let jarFunnelMetrics: JarFunnelMetrics = {
        noseWidth: 0,
        topWidth: 0,
        startRow: 0,
        throatRow: 0
      };
      let collageLayout: CollageLayout = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        cellWidth: 0,
        cellHeight: 0
      };
      let jarRect: JarRect = { left: 0, top: 0, width: 0, height: 0 };
      let menuContentArea: MenuContentArea = {
        left: 0,
        right: 0,
        center: 0,
        width: 0,
        top: 0,
        bottom: 0,
        height: 0,
        scrollOffset: 0
      };
      let powdersDataRaw: PowderData | null = null;
      let machinesDataRaw: MachinesData | null = null;
      let upgradesDataRaw: UpgradesData | null = null;
      let progressionDataRaw: ProgressionData | null = null;
      let milestoneLookup: Record<string, number> = {};
      let gameInitialized = false;
      let dataLoadError: Error | null = null;
      let fallbackUsed = false;
      let loadingMessage = 'Preparing the atelier...';

      function cloneData<T>(data: T): T {
        // JSON.parse is the only untyped interop here; fallback constants are validated
        // through the same validators as fetched JSON before entering game state.
        return JSON.parse(JSON.stringify(data)) as T;
      }

      function loadJSONWithFallback<T>(
        path: string,
        fallback: T,
        validate: (value: unknown) => T,
        forceFallback = false
      ): Promise<T> {
        if (forceFallback) {
          fallbackUsed = true;
          return Promise.resolve(validate(cloneData(fallback)));
        }
        return fetch(path)
          .then(async (response): Promise<unknown> => {
            if (!response.ok) {
              throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            const parsed: unknown = await response.json();
            return parsed;
          })
          .then(validate)
          .catch((err) => {
            console.warn(`Falling back to embedded data for ${path}`, err);
            fallbackUsed = true;
            const error = err instanceof Error ? err : new Error(String(err));
            if (!dataLoadError) {
              dataLoadError = error;
            }
            return validate(cloneData(fallback));
          });
      }

      function loadGameData() {
        let forceFallback = window.location && window.location.protocol === 'file:';
        loadingMessage = 'Channeling powder schematics...';
        return Promise.all([
          loadJSONWithFallback<PowderData>(
            'data/powders.json',
            FALLBACK_DATA.powders,
            validatePowderData,
            forceFallback
          ),
          loadJSONWithFallback<MachinesData>(
            'data/machines.json',
            FALLBACK_DATA.machines,
            validateMachinesData,
            forceFallback
          ),
          loadJSONWithFallback<UpgradesData>(
            'data/upgrades.json',
            FALLBACK_DATA.upgrades,
            validateUpgradesData,
            forceFallback
          ),
          loadJSONWithFallback<ProgressionData>(
            'data/progression.json',
            FALLBACK_DATA.progression,
            validateProgressionData,
            forceFallback
          )
        ]).then(([powderData, machineData, upgradeData, progressionData]) => {
          powdersDataRaw = powderData;
          machinesDataRaw = machineData;
          upgradesDataRaw = upgradeData;
          progressionDataRaw = progressionData;
        });
      }

      function beginGameInitialization() {
        gameInitialized = false;
        loadingMessage = 'Stoking the atelier...';
        loadGameData()
          .then(() => {
            initializeGameData();
            initializeGameState();
            updateLayoutDimensions(true);
            refreshPowderGrid(true);
            gameInitialized = true;
            if (fallbackUsed) {
              milestoneMessage =
                'Browser blocked local data files; loaded bundled schematics instead.';
              milestoneMessageTimer = 6400;
            }
          })
          .catch((err: unknown) => {
            console.error('Failed to initialize Powder Idle data.', err);
            dataLoadError = err instanceof Error ? err : new Error(String(err));
            powdersDataRaw = validatePowderData(cloneData(FALLBACK_DATA.powders));
            machinesDataRaw = validateMachinesData(cloneData(FALLBACK_DATA.machines));
            upgradesDataRaw = validateUpgradesData(cloneData(FALLBACK_DATA.upgrades));
            progressionDataRaw = validateProgressionData(cloneData(FALLBACK_DATA.progression));
            initializeGameData();
            initializeGameState();
            updateLayoutDimensions(true);
            refreshPowderGrid(true);
            fallbackUsed = true;
            gameInitialized = true;
            milestoneMessage = 'Using bundled data after load failure.';
            milestoneMessageTimer = 6400;
          });
      }

      function initializeGameData() {
        if (!powdersDataRaw || !machinesDataRaw || !upgradesDataRaw || !progressionDataRaw) {
          throw new Error('Game data must be loaded before initialization.');
        }
        let powderData = powdersDataRaw;
        powderTypes = (powderData.types || []).map((type, index) => {
          let dustValue;
          if (typeof type.dustValue === 'number' && !Number.isNaN(type.dustValue)) {
            dustValue = type.dustValue;
          } else {
            dustValue = Math.pow(10, index);
          }
          return {
            ...type,
            dustValue
          };
        });
        tierUnlockCosts = powderData.tierUnlockCosts || [];
        compressionRecipes = powderData.compressionRecipes || [];
        MAX_POWDER_SIZE = powderTypes.reduce(
          (max, type) => Math.max(max, type.size || 1),
          1
        );

        let machineData = machinesDataRaw;
        machineDefinitions = machineData.definitions || [];
        machineConnections = machineData.connections || [];
        let tabsFromData = Array.isArray(machineData.menuTabs)
          ? machineData.menuTabs.filter((tab) => tab && tab.key)
          : [];
        menuTabs = (tabsFromData.length > 0 ? tabsFromData : DEFAULT_MENU_TABS.slice()).map(
          (tab) => ({
            ...tab,
            label: tab.label || tab.key
          })
        );

        let upgradeData = upgradesDataRaw;
        upgradeConfigs = upgradeData.upgrades || [];
        researchProjects = upgradeData.research || [];
        upgradesState = createUpgradeState(upgradesState);

        let progressionData = progressionDataRaw;
        strataLayers = progressionData.strataLayers || [];
        milestoneConfigs = progressionData.milestones || [];
        milestoneLookup = milestoneConfigs.reduce<Record<string, number>>((acc, milestone, index) => {
          acc[milestone.key] = index;
          return acc;
        }, {});
      }

      function createUpgradeState(source?: Readonly<Record<string, number>>) {
        let state: Record<string, number> = {};
        for (let config of upgradeConfigs) {
          const storedValue = source?.[config.key];
          let value = typeof storedValue === 'number' ? storedValue : 0;
          state[config.key] = value;
        }
        return state;
      }

      function initializeGameState() {
        powders = [];
        powderCounts = new Array(powderTypes.length).fill(0);
        resetInventories();
        selectedPowder = 0;
        tierUpgrades = new Array(Math.max(0, powderTypes.length - 1)).fill(false);
        autoDroppers = new Array(powderTypes.length).fill(0);
        dropperTimers = new Array(powderTypes.length).fill(0);
        dust = 0;
        totalDustEarned = 0;
        totalPowderCollected = 0;
        upgradesState = createUpgradeState();
        layerStates = strataLayers.map((layer, index) => ({
          unlocked: index === 0,
          completed: false,
          progress: 0
        }));
        researchState = researchProjects.reduce<Record<string, number>>((acc, project) => {
          acc[project.key] = 0;
          return acc;
        }, {});
        automationSettings.autoDrop = false;
        automationSettings.autoCompress = false;
        automationUnlocks.autoDrop = false;
        automationUnlocks.autoCompress = false;
        autoDropTimer = 0;
        autoCompressTimer = 0;
        milestoneStates = milestoneConfigs.map(() => ({
          unlocked: false,
          achieved: false,
          applied: false
        }));
        milestoneBonuses.gravity = 0;
        milestoneBonuses.dust = 0;
        milestoneBonuses.automation = 0;
        milestoneBonuses.core = 0;
        milestoneMessage = null;
        milestoneMessageTimer = 0;
        activeMenu = menuTabs.length > 0 ? menuTabs[0]!.key : 'sandfall';
        codexUnlocked = false;
        selectedModule = 'jar';
        moduleStates = createDefaultModuleStates();
        resetModuleRevealStates();
        resetPowderWorld();
        menuScroll = 0;
        menuScrollMax = 0;
        if (!stageSaveLoaded) {
          const restored = stageWorld.load(saveValidationContext(), runtimeSaveSections());
          if (restored) {
            restoreIntegratedGame(restored);
          }
          stageSaveLoaded = true;
        }
      }

      function getMilestoneState(key: string): MilestoneState | null {
        if (!(key in milestoneLookup)) {
          return null;
        }
        return milestoneStates[milestoneLookup[key]!] ?? null;
      }

      function getMilestoneConfig(key: string): MilestoneConfig | null {
        if (!(key in milestoneLookup)) return null;
        return milestoneConfigs[milestoneLookup[key]!] ?? null;
      }

      function getMilestoneForType(type: MilestoneConfig['type']) {
        return milestoneConfigs.find((milestone) => milestone.type === type);
      }

      function getMilestoneResourceValue(resource: MilestoneConfig['resource']): number {
        switch (resource) {
          case 'cores':
            return crystalCores;
          case 'powder':
            return totalPowderCollected;
          case 'dust':
          default:
            return totalDustEarned;
        }
      }

      function getMilestoneBonusScale() {
        return 1 + (researchState.archives || 0) * 0.1;
      }

      function applyMilestoneReward(config: MilestoneConfig): void {
        switch (config.type) {
          case 'unlockAutoDrop':
            automationUnlocks.autoDrop = true;
            break;
          case 'unlockAutoCompress':
            automationUnlocks.autoCompress = true;
            break;
          case 'gravityBonus':
            milestoneBonuses.gravity += config.magnitude || 0;
            break;
          case 'dustBonus':
            milestoneBonuses.dust += config.magnitude || 0;
            break;
          case 'codexUnlock':
            codexUnlocked = true;
            milestoneBonuses.automation += config.magnitude || 0;
            break;
          case 'coreBonus':
            milestoneBonuses.core += config.magnitude || 0;
            break;
        }
        milestoneMessage = `${config.name} achieved! ${config.reward}`;
        milestoneMessageTimer = 4200;
      }

      function updateMilestones() {
        for (let i = 0; i < milestoneConfigs.length; i++) {
          let config = milestoneConfigs[i];
          let state = milestoneStates[i];
          if (!config || !state) continue;
          let resourceValue = getMilestoneResourceValue(config.resource);
          if (!state.unlocked && resourceValue >= config.requirement * 0.25) {
            state.unlocked = true;
          }
          if (!state.achieved && resourceValue >= config.requirement) {
            state.achieved = true;
          }
          if (state.achieved && !state.applied) {
            state.applied = true;
            applyMilestoneReward(config);
          }
        }
        if (milestoneMessageTimer > 0) {
          milestoneMessageTimer = Math.max(0, milestoneMessageTimer - deltaTime);
          if (milestoneMessageTimer <= 0) {
            milestoneMessage = null;
          }
        }
      }

      function getPowderSizeByType(type: number): number {
        if (!powderTypes[type]) return 1;
        return powderTypes[type]!.size;
      }

      function getPowderSize(powder: ActivePowder): number {
        return getPowderSizeByType(powder.type);
      }

      function createEmptyGrid() {
        grid = Array.from({ length: gridRows }, () =>
          new Array(gridCols).fill(null)
        );
        jarWalls = Array.from({ length: gridRows }, () =>
          new Array(gridCols).fill(false)
        );
        buildJarFunnelGeometry();
      }

      function lerpValue(a: number, b: number, t: number): number {
        return a + (b - a) * t;
      }

      function buildJarFunnelGeometry() {
        jarFunnelProfile = [];
        jarNeckSpan = { start: 0, end: gridCols };
        jarFunnelMetrics = {
          noseWidth: 0,
          topWidth: 0,
          startRow: 0,
          throatRow: 0
        };
        if (gridRows <= 0 || gridCols <= 0) {
          return;
        }
        let center = gridCols / 2;
        let topMargin = Math.max(1, Math.round(gridCols * 0.1));
        let funnelStartRow = Math.max(0, Math.floor(gridRows * 0.18));
        let throatRow = Math.max(
          funnelStartRow + 1,
          Math.min(gridRows - 1, Math.floor(gridRows * 0.88))
        );
        let noseWidth = Math.min(gridCols, Math.max(1, 6));
        let desiredTopWidth = Math.round(gridCols * 0.74);
        let maxTopWidth = Math.max(noseWidth, gridCols - topMargin * 2);
        let topWidth = Math.max(noseWidth, Math.min(desiredTopWidth, maxTopWidth));
        jarFunnelMetrics = {
          noseWidth,
          topWidth,
          startRow: funnelStartRow,
          throatRow
        };
        let transitionSpan = Math.max(1, throatRow - funnelStartRow);
        for (let r = 0; r < gridRows; r++) {
          let spanWidth;
          if (r <= funnelStartRow) {
            spanWidth = topWidth;
          } else if (r >= throatRow) {
            spanWidth = noseWidth;
          } else {
            let t = (r - funnelStartRow) / transitionSpan;
            t = Math.min(1, Math.max(0, t));
            let eased = t * t * (3 - 2 * t);
            spanWidth = Math.round(lerpValue(topWidth, noseWidth, eased));
          }
          spanWidth = Math.max(noseWidth, Math.min(gridCols, spanWidth));
          let spanStart = Math.floor(center - spanWidth / 2);
          let spanEnd = spanStart + spanWidth;
          if (spanStart < 0) {
            spanEnd += -spanStart;
            spanStart = 0;
          }
          if (spanEnd > gridCols) {
            spanStart -= spanEnd - gridCols;
            spanEnd = gridCols;
          }
          spanStart = Math.max(0, spanStart);
          spanEnd = Math.max(spanStart, Math.min(gridCols, spanEnd));
          jarFunnelProfile[r] = [spanStart, spanEnd];
          for (let c = 0; c < gridCols; c++) {
            const wallRow = jarWalls[r];
            if (wallRow) wallRow[c] = c < spanStart || c >= spanEnd;
          }
        }
        let baseRow = Math.max(0, gridRows - 1);
        let baseSpan = jarFunnelProfile[baseRow] || [0, gridCols];
        jarNeckSpan = { start: baseSpan[0], end: baseSpan[1] };
        jarFunnelMetrics.noseWidth = jarNeckSpan.end - jarNeckSpan.start;
      }

      function getFunnelSpanAtRow(row: number): FunnelSpan {
        if (!Array.isArray(jarFunnelProfile) || !jarFunnelProfile[row]) {
          return [0, gridCols];
        }
        return jarFunnelProfile[row];
      }

      function getFunnelSpanForRows(row: number, size: number): { start: number; end: number } {
        return getFunnelSpanForRowsPure(
          { gridRows, gridCols, profile: jarFunnelProfile },
          row,
          size
        );
      }

      function clampColumnToFunnel(col: number, row: number, size: number): number {
        return clampColumnToFunnelPure(
          { gridRows, gridCols, profile: jarFunnelProfile },
          col,
          row,
          size
        );
      }

      function occupyPowderCells(powder: ActivePowder): void {
        let size = getPowderSize(powder);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let row = powder.row + r;
            let col = powder.col + c;
            if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
              const gridRow = grid[row];
              if (gridRow) gridRow[col] = powder;
            }
          }
        }
      }

      function clearPowderCells(powder: ActivePowder): void {
        let size = getPowderSize(powder);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let row = powder.row + r;
            let col = powder.col + c;
            if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
              const gridRow = grid[row];
              if (gridRow && gridRow[col] === powder) {
                gridRow[col] = null;
              }
            }
          }
        }
      }

      function canOccupy(
        row: number,
        col: number,
        size: number,
        ignorePowder: ActivePowder | null = null
      ): boolean {
        if (row < 0 || col < 0) return false;
        if (row + size > gridRows || col + size > gridCols) return false;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            const wallRow = jarWalls[row + r];
            if (wallRow?.[col + c]) {
              return false;
            }
            let occupant = grid[row + r]?.[col + c];
            if (occupant && occupant !== ignorePowder) {
              return false;
            }
          }
        }
        return true;
      }

      function clampPowderToBounds(powder: ActivePowder): void {
        let size = getPowderSize(powder);
        if (gridCols <= 0 || gridRows <= 0) return;
        let maxRow = Math.max(0, gridRows - size);
        powder.row = Math.max(0, Math.min(maxRow, powder.row));
        powder.col = clampColumnToFunnel(powder.col, powder.row, size);
      }

      function measureOpenDepth(powder: ActivePowder, dir: number): number {
        let size = getPowderSize(powder);
        let targetCol = powder.col + dir;
        if (targetCol < 0 || targetCol + size > gridCols) {
          return -Infinity;
        }
        let depth = 0;
        let stepRow = powder.row;
        while (stepRow + 1 + size <= gridRows) {
          if (canOccupy(stepRow + 1, targetCol, size, powder)) {
            depth++;
            stepRow++;
          } else {
            break;
          }
        }
        let gridCenter = gridCols / 2;
        let currentCenter = powder.col + size / 2;
        let newCenter = currentCenter + dir;
        let centerBias = 0;
        if (gridCenter > 0) {
          centerBias = 1 - Math.min(1, Math.abs(newCenter - gridCenter) / gridCenter);
        }
        return depth + centerBias * 0.25;
      }

      function getDirectionalPreference(powder: ActivePowder): number[] {
        let dirs = [-1, 1];
        dirs.sort((a, b) => measureOpenDepth(powder, b) - measureOpenDepth(powder, a));
        return dirs;
      }

      function sampleGaussian(mean: number, stdDev: number): number {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let mag = Math.sqrt(-2.0 * Math.log(u));
        let z = mag * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
      }

      async function preload() {
        mysticalFont = await loadFont(MYSTICAL_FONT_URL);
      }

      function setup() {
        updateLayoutDimensions();
        canvas = createCanvas(SCREEN_W, SCREEN_H);
        pixelDensity(1);
        rectMode(CENTER);
        textAlign(CENTER, CENTER);
        textFont(mysticalFont);
        noStroke();
        frameRate(60);
        stageWorld.initialize(mysticalFont);
        updateLayoutDimensions(true);
        beginGameInitialization();
        addEventListener('beforeunload', saveIntegratedGame);
      }

      function windowResized() {
        updateLayoutDimensions(true);
        if (gameInitialized) {
          refreshPowderGrid(true);
        }
      }

      function draw() {
        background(MYSTICAL_UI.background);

        buttons = [];
        jarVisible = false;

        if (!gameInitialized) {
          drawLoadingState();
          return;
        }

        syncStageUpgradeHooks();
        stageWorld.update(deltaTime / 1000);
        stageWorld.render(MENU_W, 0, Math.min(PLAY_AREA_W, SCREEN_H));
        integratedSaveTimer += deltaTime;
        if (!prestigeInProgress && integratedSaveTimer >= 2000) {
          integratedSaveTimer = 0;
          saveIntegratedGame();
        }

        autoUnlockAvailableModules();
        updateMilestones();
        syncMaterialEconomyView();
        totalPowderCollected = Math.max(
          totalPowderCollected,
          stageWorld.controller.sandfall.state.lifetimeCreated
        );
        drawMenu();
      }

      function drawLoadingState() {
        fill(MYSTICAL_UI.violet);
        textSize(scaledFont(14));
        text(loadingMessage, SCREEN_W / 2, SCREEN_H / 2);
        let messageY = SCREEN_H / 2 + scaledY(24);
        if (fallbackUsed) {
          fill(MYSTICAL_UI.violetMuted);
          textSize(scaledFont(10));
          text('Using bundled data assets.', SCREEN_W / 2, messageY);
          messageY += scaledY(18);
        }
        if (dataLoadError) {
          fill(MYSTICAL_UI.emberLight);
          textSize(scaledFont(10));
          text('Unable to load external data files.', SCREEN_W / 2, messageY);
        }
        textSize(scaledFont(14));
      }

      function drawPowderField() {
        drawCollageBackdrop();
        if (fullscreenModule) {
          let machine = machineDefinitions.find(
            (m) => m.key === fullscreenModule
          );
          if (!machine) {
            fullscreenModule = null;
          } else if (machine.key === 'jar') {
            jarVisible = true;
            drawJarFrame(machine);
            drawJarInterior();
            return;
          } else {
            jarVisible = false;
            drawMachinePanel(machine);
            return;
          }
        }
        jarVisible = true;
        drawMachineConnections();
        for (let machine of machineDefinitions) {
          if (machine.key === 'jar') {
            drawJarFrame(machine);
          } else {
            drawMachinePanel(machine);
          }
        }
        drawJarInterior();
      }

      function drawDuneMultiplierIndicator() {
        push();
        let x = MENU_W + PLAY_AREA_W - scaledX(18);
        let y = scaledY(18);
        textAlign(RIGHT, TOP);
        textSize(scaledFont(9));
        fill('#94a3b8');
        text(`x${duneDustMultiplier.toFixed(2)}`, x, y);
        pop();
      }

      function drawCollageBackdrop() {
        push();
        noStroke();
        let panelPaddingX = scaledX(32);
        let panelPaddingY = scaledY(36);
        let panelCenterY = collageLayout.top + collageLayout.height / 2;
        let panelCenterX = collageLayout.left + collageLayout.width / 2;
        fill('#071021');
        rect(
          panelCenterX,
          panelCenterY,
          collageLayout.width + panelPaddingX,
          collageLayout.height + panelPaddingY,
          26
        );
        pop();
      }

      function drawMachineConnections() {
        push();
        strokeCap(ROUND);
        for (let connection of machineConnections) {
          let fromMachine = machineDefinitions.find((m) => m.key === connection.from);
          let toMachine = machineDefinitions.find((m) => m.key === connection.to);
          if (!fromMachine || !toMachine) continue;
          let fromRect = getMachineRect(fromMachine);
          let toRect = getMachineRect(toMachine);
          let fromCenter = getMachineCenter(fromRect);
          let toCenter = getMachineCenter(toRect);
          let active = isMachineUnlocked(connection.from) && isMachineUnlocked(connection.to);
          let weight = active ? Math.max(2, scaledX(2)) : Math.max(1, scaledX(1));
          stroke(active ? '#38bdf8' : '#13213a');
          strokeWeight(weight);
          let midY = (fromCenter.y + toCenter.y) / 2;
          line(fromCenter.x, fromCenter.y, fromCenter.x, midY);
          line(fromCenter.x, midY, toCenter.x, midY);
          line(toCenter.x, midY, toCenter.x, toCenter.y);
          if (active) {
            noStroke();
            fill('#38bdf8');
            circle(toCenter.x, toCenter.y, Math.max(6, scaledX(6)));
            stroke('#38bdf8');
          }
        }
        pop();
      }

      function drawSelectionGlow(
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number | null
      ): void {
        push();
        rectMode(CENTER);
        const context = drawingContext as CanvasRenderingContext2D;
        context.save();
        context.shadowBlur = Math.max(scaledX(16), scaledY(16));
        context.shadowColor = 'rgba(250, 204, 21, 0.6)';
        noStroke();
        fill(withAlpha('#facc15', 70));
        let resolvedRadius = radius != null ? radius : Math.max(12, Math.min(width, height) * 0.18);
        rect(x, y, width, height, resolvedRadius);
        context.restore();
        pop();
      }

      function drawMachinePanel(machine: MachineDefinition): void {
        let rectInfo = getMachineRect(machine);
        let center = getMachineCenter(rectInfo);
        let unlocked = isMachineUnlocked(machine.key);
        if (machine.key === 'conveyor') {
          drawConveyorPanel(machine, rectInfo, center, unlocked);
          return;
        }
        let panelW = rectInfo.width;
        let panelH = rectInfo.height;
        let wallThicknessX = Math.max(scaledX(22), panelW * 0.26);
        let wallThicknessY = Math.max(scaledY(22), panelH * 0.26);
        let innerW = Math.max(0, panelW - wallThicknessX);
        let innerH = Math.max(0, panelH - wallThicknessY);
        let innerRadius = innerW > 0 && innerH > 0 ? Math.max(12, Math.min(innerW, innerH) * 0.18) : 0;
        let interactButton: UiButton | null = null;
        push();
        rectMode(CENTER);
        noStroke();
        fill('#000000');
        rect(center.x, center.y, panelW, panelH);
        if (selectedModule === machine.key && innerW > 0 && innerH > 0) {
          drawSelectionGlow(center.x, center.y, innerW, innerH, innerRadius);
        }
        if (innerW > 0 && innerH > 0) {
          stroke(unlocked ? '#1e3a8a' : '#1e293b');
          strokeWeight(Math.max(2.4, scaledX(2.6)));
          fill(unlocked ? '#0b1220' : '#040810');
          rect(center.x, center.y, innerW, innerH, innerRadius);
        }
        noStroke();
        if (!unlocked) {
          if (innerW > scaledX(10) && innerH > scaledY(10)) {
            fill('#000000');
            rect(
              center.x,
              center.y,
              innerW - scaledX(10),
              innerH - scaledY(10),
              Math.max(8, innerRadius * 0.7)
            );
          }
        } else {
          drawPanelPixelBackdrop(center, innerW, innerH);
          updateModuleState(machine.key, {
            center,
            panelW: innerW,
            panelH: innerH,
            rect: rectInfo
          });
          drawModuleScene(machine.key, {
            center,
            panelW: innerW,
            panelH: innerH,
            rect: rectInfo
          });
          let interactW = Math.max(0, innerW - scaledX(18));
          let interactH = Math.max(0, innerH - scaledY(22));
          if (interactW > 0 && interactH > 0) {
            interactButton = {
              action: 'moduleInteract',
              key: machine.key,
              x: center.x,
              y: center.y + scaledY(6),
              w: interactW,
              h: interactH
            };
          }
        }
        let coverAlpha = updateModuleCoverAlpha(machine.key, unlocked);
        if (coverAlpha > 0) {
          fill(withAlpha('#000000', Math.round(coverAlpha * 255)));
          rect(center.x, center.y, panelW, panelH);
        }
        pop();
        if (interactButton) {
          addButton(interactButton);
        }
        addButton({
          action: 'focusModule',
          key: machine.key,
          x: center.x,
          y: center.y,
          w: panelW,
          h: panelH
        });
      }

      function getConveyorPanelLayout(
        machine: MachineDefinition,
        rectInfo?: Rect,
        center?: Point
      ): ConveyorPanelLayout | null {
        if (!machine) return null;
        let resolvedRect = rectInfo || getMachineRect(machine);
        let resolvedCenter = center || getMachineCenter(resolvedRect);
        let panelW = resolvedRect.width * 0.92;
        let panelH = resolvedRect.height * 0.86;
        let paddingX = Math.max(panelW * 0.06, scaledX(12));
        let paddingY = Math.max(panelH * 0.08, scaledY(14));
        let innerW = Math.max(0, panelW - paddingX * 2);
        let innerH = Math.max(0, panelH - paddingY * 2);
        let innerLeft = resolvedCenter.x - innerW / 2;
        let innerTop = resolvedCenter.y - innerH / 2;
        return {
          rect: resolvedRect,
          center: resolvedCenter,
          panelW,
          panelH,
          innerW,
          innerH,
          innerLeft,
          innerTop,
          paddingX,
          paddingY
        };
      }

      function drawConveyorPanel(
        machine: MachineDefinition,
        rectInfo: Rect,
        center: Point,
        unlocked: boolean
      ): void {
        let layout = getConveyorPanelLayout(machine, rectInfo, center);
        if (!layout) return;
        let { panelW, panelH, innerW, innerH, innerLeft, innerTop } = layout;
        let interactButton: UiButton | null = null;
        push();
        rectMode(CENTER);
        noStroke();
        fill('#030b18');
        rect(center.x, center.y, panelW, panelH);
        stroke('#38bdf8');
        strokeWeight(Math.max(2, scaledX(2)));
        noFill();
        rect(center.x, center.y, panelW, panelH);
        if (selectedModule === machine.key) {
          drawSelectionGlow(center.x, center.y, panelW, panelH, 0);
        }
        pop();
        push();
        rectMode(CORNER);
        noStroke();
        fill('#020912');
        rect(innerLeft, innerTop, innerW, innerH);
        pop();
        if (!unlocked) {
          if (innerW > scaledX(12) && innerH > scaledY(12)) {
            push();
            rectMode(CENTER);
            fill(withAlpha('#000000', 200));
            rect(center.x, center.y, innerW - scaledX(8), innerH - scaledY(8));
            pop();
          }
        } else {
          drawPanelPixelBackdrop(center, innerW, innerH);
          syncConveyorGeometryWithLayout(moduleStates.conveyor, layout);
          let sceneContext = {
            center,
            panelW: innerW,
            panelH: innerH,
            rect: layout.rect,
            innerLeft,
            innerTop
          };
          updateModuleState(machine.key, sceneContext);
          drawConveyorModule(sceneContext);
          let interactW = Math.max(0, innerW - scaledX(18));
          let interactH = Math.max(0, innerH - scaledY(22));
          if (interactW > 0 && interactH > 0) {
            interactButton = {
              action: 'moduleInteract',
              key: machine.key,
              x: center.x,
              y: center.y + scaledY(6),
              w: interactW,
              h: interactH
            };
          }
        }
        let coverAlpha = updateModuleCoverAlpha(machine.key, unlocked);
        if (coverAlpha > 0) {
          push();
          rectMode(CENTER);
          fill(withAlpha('#000000', Math.round(coverAlpha * 255)));
          rect(center.x, center.y, panelW, panelH);
          pop();
        }
        if (interactButton) {
          addButton(interactButton);
        }
        addButton({
          action: 'focusModule',
          key: machine.key,
          x: center.x,
          y: center.y,
          w: panelW,
          h: panelH
        });
      }

      function drawModuleScene(key: MachineModuleKey, context: ModuleRenderContext): void {
        switch (key) {
          case 'conveyor':
            drawConveyorModule(context);
            break;
          case 'rocket':
            drawRocketModule(context);
            break;
          case 'asteroid':
            drawAsteroidModule(context);
            break;
          case 'planet':
            drawPlanetModule(context);
            break;
          case 'forge':
            drawForgeModule(context);
            break;
          case 'galaxy':
            drawGalaxyModule(context);
            break;
          case 'universe':
            drawUniverseModule(context);
            break;
          case 'singularity':
            drawSingularityModule(context);
            break;
        }
      }

      function drawPanelPixelBackdrop(center: Point, panelW: number, panelH: number): void {
        let insetX = Math.min(scaledX(14), panelW * 0.18);
        let insetY = Math.min(scaledY(30), panelH * 0.32);
        let left = center.x - panelW / 2 + insetX;
        let right = center.x + panelW / 2 - insetX;
        let top = center.y - panelH / 2 + insetY;
        let bottom = center.y + panelH / 2 - insetY;
        let usableW = Math.max(0, right - left);
        let usableH = Math.max(0, bottom - top);
        if (usableW <= 0 || usableH <= 0) {
          return;
        }
        let blockSize = Math.max(6, Math.min(usableW, usableH) / 14);
        let cols = Math.max(4, Math.min(18, Math.floor(usableW / blockSize)));
        let rows = Math.max(3, Math.min(12, Math.floor(usableH / blockSize)));
        blockSize = Math.min(usableW / cols, usableH / rows);
        push();
        rectMode(CENTER);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            let x = left + blockSize * c + blockSize / 2;
            let y = top + blockSize * r + blockSize / 2;
            let shade = (r + c) % 2 === 0 ? '#111c2d' : '#0f172a';
            fill(withAlpha(shade, 210));
            rect(x, y, blockSize, blockSize, 3);
          }
        }
        pop();
      }

      function updateModuleState(key: MachineModuleKey, _context: ModuleRenderContext): void {
        let dt = deltaTime / 1000;
        switch (key) {
          case 'conveyor':
            updateConveyorState(dt);
            break;
          case 'rocket':
            updateRocketState(dt);
            break;
          case 'asteroid':
            updateAsteroidState(dt);
            break;
          case 'planet':
            updatePlanetState(dt);
            break;
          case 'forge':
            updateForgeState(dt);
            break;
          case 'galaxy':
            updateGalaxyState(dt);
            break;
          case 'universe':
            updateUniverseState(dt);
            break;
          case 'singularity':
            updateSingularityState(dt);
            break;
        }
      }

      function craftNextTier(
        state: ProgressState,
        inputIndex: number,
        outputIndex: number,
        speed: number,
        dt: number,
        dustBase: number,
        onCraft?: (entity: PowderEntity, consumed: PowderEntity[]) => void
      ): void {
        if (!state) return;
        state.progress = state.progress || 0;
        let inventory = ensureInventory(inputIndex);
        if (inventory.length >= CHAIN_REQUIREMENT) {
          state.progress += dt * speed;
          while (state.progress >= 1 && inventory.length >= CHAIN_REQUIREMENT) {
            state.progress -= 1;
            let consumed = takeEntities(inputIndex, CHAIN_REQUIREMENT);
            if (consumed.length < CHAIN_REQUIREMENT) {
              // return consumed entities to inventory if we couldn't gather enough
              gainEntities(inputIndex, consumed);
              state.progress = 0;
              break;
            }
            despawnParticlesForEntities(consumed);
            let originMap = [
              'jar',
              'conveyor',
              'rocket',
              'asteroid',
              'planet',
              'forge',
              'galaxy',
              'universe',
              'singularity'
            ];
            let composite = createCompositeEntity(outputIndex, consumed, {
              origin: originMap[outputIndex] || 'composite'
            });
            gainEntity(outputIndex, composite);
            if (dustBase && dustBase > 0) {
              let gain = Math.max(1, Math.round(dustBase * getDustMultiplier()));
              dust += gain;
            }
            if (onCraft) {
              onCraft(composite, consumed);
            }
            inventory = ensureInventory(inputIndex);
          }
        } else {
          state.progress = Math.max(0, state.progress - dt * 0.35);
        }
      }

      function runModuleAutomation(
        state: { autoTimer: number },
        moduleKey: Exclude<MachineModuleKey, 'jar'>,
        dt: number,
        baseInterval: number,
        action: () => void
      ): void {
        if (!state) return;
        let autoLevel = getUpgradeLevel(`${moduleKey}Automation`);
        if (autoLevel <= 0) return;
        let speedLevel = getUpgradeLevel(`${moduleKey}AutomationSpeed`);
        state.autoTimer = (state.autoTimer || 0) + dt;
        let interval = baseInterval / (1 + (autoLevel - 1) * 0.35 + speedLevel * 0.65);
        interval = Math.max(0.45, interval);
        while (state.autoTimer >= interval) {
          state.autoTimer -= interval;
          action();
        }
      }

      function getRocketSuccessRate() {
        let base = 0.1;
        let bonus = getUpgradeLevel('rocketSuccessRate') * 0.18;
        return Math.min(0.95, base + bonus);
      }

      function updateConveyorState(dt: number): void {
        let state = moduleStates.conveyor;
        if (!state) return;
        setupConveyorGeometry(state);
        let unlocked = isMachineUnlocked('conveyor');
        let speedBoost =
          1 + getUpgradeLevel('gravity') * 0.12 + getLayerGravityBonus() * 0.6;
        if (!unlocked) {
          for (let faller of state.fallers) {
            updatePowderParticle(faller, { state: 'stored' });
          }
          state.fallers.length = 0;
          if (state.restingParticles) {
            for (let particle of state.restingParticles) {
              updatePowderParticle(particle, { state: 'stored' });
            }
            state.restingParticles.length = 0;
          }
          state.queue = [];
          state.packageBuffer = [];
          state.packageHistory = [];
          state.packageProgress = 0;
          state.packagePulse = Math.max(0, (state.packagePulse || 0) - dt * 1.4);
          state.deliveryPulse = Math.max(0, (state.deliveryPulse || 0) - dt * 1.4);
          return;
        }
        updateConveyorFallers(state, dt, speedBoost);
        processConveyorBuffer(state, dt, speedBoost);
        runModuleAutomation(state, 'conveyor', dt, 5.5, rushConveyor);
        state.packagePulse = Math.max(0, (state.packagePulse || 0) - dt * 1.4);
        state.deliveryPulse = Math.max(0, (state.deliveryPulse || 0) - dt * 1.4);
        if (state.packageHistory) {
          for (let pkg of state.packageHistory) {
            pkg.pulse = Math.max(0, (pkg.pulse || 0) - dt * 1.2);
          }
        }
      }

      function processConveyorBuffer(
        state: ConveyorState,
        dt: number,
        speedBoost: number
      ): void {
        let packagingSpeed = 0.45 + speedBoost * 0.08;
        if ((state.packageBuffer || []).length >= CHAIN_REQUIREMENT) {
          state.packageProgress = (state.packageProgress || 0) + dt * packagingSpeed;
        } else {
          state.packageProgress = Math.max(
            0,
            (state.packageProgress || 0) - dt * 0.4
          );
        }
        while (
          (state.packageProgress || 0) >= 1 &&
          (state.packageBuffer || []).length >= CHAIN_REQUIREMENT &&
          ensureInventory(0).length >= CHAIN_REQUIREMENT
        ) {
          state.packageProgress -= 1;
          let packageGrains = state.packageBuffer.splice(0, CHAIN_REQUIREMENT);
          let removed = consumeEntities(0, packageGrains);
          if (removed.length < CHAIN_REQUIREMENT) {
            state.packageBuffer.unshift(
              ...packageGrains.filter((g) => !removed.includes(g))
            );
            state.packageProgress = 0;
            break;
          }
          despawnParticlesForEntities(removed);
          if (state.restingParticles && state.restingParticles.length > 0) {
            state.restingParticles = state.restingParticles.filter(
              (particle) => particle && !removed.includes(particle.entity)
            );
          }
          let packageEntity = createCompositeEntity(1, removed, { origin: 'conveyor' });
          gainEntity(1, packageEntity);
          state.packagePulse = 1;
          state.deliveryPulse = 1;
          let colors = removed.map((grain) => grain.color);
          state.packageHistory = state.packageHistory || [];
          state.packageHistory.push({ colors, pulse: 1 });
          while (state.packageHistory.length > 4) {
            state.packageHistory.shift();
          }
          let packageWorth = removed.reduce((total, grain) => {
            let type = grain.type != null ? grain.type : 0;
            let dustValue =
              powderTypes[type] && powderTypes[type].dustValue != null
                ? powderTypes[type].dustValue
                : 1;
            return total + dustValue;
          }, 0);
          let payout = Math.round(packageWorth * 100 * getDustMultiplier());
          if (payout > 0) {
            dust += payout;
            totalDustEarned += payout;
          }
          if (isMachineUnlocked('rocket')) {
            registerRocketArrival({
              package: packageEntity,
              colors,
              pulse: 1,
              progress: 1,
              worth: packageWorth,
              rocket: true
            });
          }
          let overfillLevel = getUpgradeLevel('conveyorOverfill');
          if (overfillLevel > 0) {
            let extraChance = Math.min(0.6, 0.18 * overfillLevel);
            if (
              Math.random() < extraChance &&
              state.packageBuffer.length >= CHAIN_REQUIREMENT &&
              ensureInventory(0).length >= CHAIN_REQUIREMENT
            ) {
              let bonusGrains = state.packageBuffer.splice(0, CHAIN_REQUIREMENT);
              let bonusRemoved = consumeEntities(0, bonusGrains);
              if (bonusRemoved.length === CHAIN_REQUIREMENT) {
                despawnParticlesForEntities(bonusRemoved);
                if (state.restingParticles && state.restingParticles.length > 0) {
                  state.restingParticles = state.restingParticles.filter(
                    (particle) => particle && !bonusRemoved.includes(particle.entity)
                  );
                }
                let bonusPackage = createCompositeEntity(1, bonusRemoved, {
                  origin: 'conveyor'
                });
                gainEntity(1, bonusPackage);
                let bonusColors = bonusRemoved.map((grain) => grain.color);
                state.packageHistory.push({ colors: bonusColors, pulse: 1 });
                while (state.packageHistory.length > 4) {
                  state.packageHistory.shift();
                }
                let bonusWorth = bonusRemoved.reduce((total, grain) => {
                  let type = grain.type != null ? grain.type : 0;
                  let dustValue =
                    powderTypes[type] && powderTypes[type].dustValue != null
                      ? powderTypes[type].dustValue
                      : 1;
                  return total + dustValue;
                }, 0);
                let bonusPayout = Math.round(
                  bonusWorth * 100 * getDustMultiplier()
                );
                if (bonusPayout > 0) {
                  dust += bonusPayout;
                  totalDustEarned += bonusPayout;
                }
                if (isMachineUnlocked('rocket')) {
                  registerRocketArrival({
                    package: bonusPackage,
                    colors: bonusColors,
                    pulse: 1,
                    progress: 1,
                    worth: bonusWorth,
                    rocket: true
                  });
                }
                state.deliveryPulse = 1;
              } else {
                state.packageBuffer.unshift(...bonusGrains);
                gainEntities(0, bonusRemoved);
              }
              dust += Math.max(
                1,
                Math.round((2 + overfillLevel) * getDustMultiplier())
              );
            }
          }
        }
      }

      function setupConveyorGeometry(state: ConveyorState): void {
        if (state.initialized) return;
        state.initialized = true;
        state.fallers = state.fallers || [];
        state.restingParticles = state.restingParticles || [];
        state.queue = state.queue || [];
        state.packageBuffer = state.packageBuffer || [];
        state.packageHistory = state.packageHistory || [];
        state.geometry = {
          holeTop: 0.16,
          floorY: 0.62,
          entryRange: [-0.3, 0.3],
          spawnRate: 0.24,
          bounds: { minX: -0.5, maxX: 0.5, minY: 0, maxY: 1.2 },
          pixel: {
            innerLeft: 0,
            innerWidth: 1,
            minYScreen: 0,
            maxYScreen: 1,
            innerTop: 0,
            innerBottom: 1
          }
        };
      }

      function syncConveyorGeometryWithLayout(
        state: ConveyorState,
        layout: ConveyorPanelLayout | null
      ): void {
        if (!state) return;
        setupConveyorGeometry(state);
        if (!layout) return;
        let geometry = state.geometry;
        if (!geometry) return;
        let { center, innerW, innerH, innerLeft, innerTop } = layout;
        if (!(innerW > 0) || !(innerH > 0)) {
          return;
        }
        let innerBottom = innerTop + innerH;
        let jarMetrics = getJarChuteMetrics();
        let chuteCenter = jarMetrics ? jarMetrics.centerX : center.x;
        let chuteWidth = jarMetrics ? jarMetrics.tubeWidth : Math.max(innerW * 0.22, scaledX(16));
        let walkwayBottomScreen = innerTop;
        let walkwayTopScreen = jarMetrics
          ? jarMetrics.tubeBottomY
          : innerTop - Math.max(innerH * 0.18, scaledY(24));
        walkwayTopScreen = Math.min(walkwayTopScreen, walkwayBottomScreen - scaledY(6));
        let floorScreen = innerBottom - Math.max(innerH * 0.22, scaledY(26));
        let drainScreen = innerBottom + Math.max(innerH * 0.2, scaledY(34));
        let screenRange = Math.max(8, drainScreen - walkwayTopScreen);
        let walkwayNorm = constrain(
          (walkwayBottomScreen - walkwayTopScreen) / screenRange,
          0.06,
          0.22
        );
        let floorNorm = constrain(
          (floorScreen - walkwayTopScreen) / screenRange,
          walkwayNorm + 0.28,
          0.86
        );
        let drainNorm = 1;
        geometry.bounds = {
          minX: -0.5,
          maxX: 0.5,
          minY: 0,
          maxY: drainNorm
        };
        geometry.holeTop = walkwayNorm;
        geometry.floorY = floorNorm;
        geometry.drainExit = drainNorm;
        geometry.pixel = {
          innerLeft,
          innerWidth: innerW,
          minYScreen: walkwayTopScreen,
          maxYScreen: drainScreen,
          innerTop,
          innerBottom
        };
        let widthRange = geometry.bounds.maxX - geometry.bounds.minX;
        if (widthRange <= 0) {
          widthRange = 1;
        }
        let entryLeftRatio = (chuteCenter - chuteWidth / 2 - innerLeft) / innerW;
        let entryRightRatio = (chuteCenter + chuteWidth / 2 - innerLeft) / innerW;
        entryLeftRatio = constrain(entryLeftRatio, 0.08, 0.92);
        entryRightRatio = constrain(entryRightRatio, 0.08, 0.92);
        if (entryRightRatio <= entryLeftRatio) {
          let mid = (entryLeftRatio + entryRightRatio) / 2;
          let span = Math.max(0.18, widthRange * 0.28);
          entryLeftRatio = mid - span / 2;
          entryRightRatio = mid + span / 2;
        }
        geometry.entryRange = [
          geometry.bounds.minX + entryLeftRatio * widthRange,
          geometry.bounds.minX + entryRightRatio * widthRange
        ];
        geometry.spawnRate = geometry.spawnRate || 0.24;
        state.geometry = geometry;
        state.layout = layout;
      }

      function startConveyorDrop(
        state: ConveyorState,
        grain: PowderEntity,
        source: number,
        options: { startY?: number } = {}
      ) {
        if (!state || !grain) return null;
        setupConveyorGeometry(state);
        let geometry = state.geometry;
        if (!geometry) return null;
        let entryRange = geometry.entryRange || [-0.28, 0.28];
        let spawnX = lerp(entryRange[0], entryRange[1], constrain(source ?? 0.5, 0, 1));
        let walkwayTop =
          geometry.bounds && geometry.bounds.minY != null
            ? geometry.bounds.minY
            : 0;
        let dropLip = geometry.holeTop != null ? geometry.holeTop : walkwayTop + 0.18;
        let spawnY = Math.min(walkwayTop, walkwayTop - Math.max(0.08, dropLip * 0.18));
        if (typeof options.startY === 'number') {
          spawnY = options.startY;
        }
        let particle = createPowderParticleForEntity(grain, 'conveyor', {
          state: 'fall',
          x: spawnX + random(-0.01, 0.01),
          y: spawnY,
          vx: 0,
          vy: 0,
          data: {
            source: constrain(source ?? 0.5, 0, 1)
          }
        });
        if (!particle) return null;
        state.fallers = state.fallers || [];
        state.fallers.push(particle);
        return particle;
      }

      function updateConveyorFallers(
        state: ConveyorState,
        dt: number,
        speedBoost: number
      ): void {
        if (!state.geometry) return;
        let gravity = 1.6 * speedBoost;
        let floorY =
          state.geometry.floorY != null ? state.geometry.floorY : 0.34;
        let bounds = state.geometry.bounds || {
          minX: -0.5,
          maxX: 0.5,
          minY: 0,
          maxY: 1
        };
        for (let i = state.fallers.length - 1; i >= 0; i--) {
          let faller = state.fallers[i];
          if (!faller) continue;
          faller.vy = (faller.vy || 0) + gravity * dt;
          faller.y += faller.vy * dt;
          faller.vx = (faller.vx || 0) * 0.9;
          faller.x += faller.vx * dt;
          faller.x = constrain(faller.x, bounds.minX, bounds.maxX);
          const particleState = faller.data?.delivered ? 'drain' : 'fall';
          updatePowderParticle(faller, {
            state: particleState,
            x: faller.x,
            y: faller.y,
            vx: faller.vx,
            vy: faller.vy
          });
          if (faller.y >= floorY) {
            if (!faller.data) {
              faller.data = {};
            }
            if (!faller.data.delivered && faller.entity) {
              state.packageBuffer.push(faller.entity);
              if (state.packageBuffer.length > 280) {
                state.packageBuffer.splice(
                  0,
                  state.packageBuffer.length - 280
                );
              }
              faller.data.delivered = true;
            }
            faller.state = 'drain';
            faller.x += random(-0.01, 0.01);
            faller.x = constrain(faller.x, bounds.minX, bounds.maxX);
            faller.vx *= 0.85;
          }
          if (faller.y >= bounds.maxY + 0.2) {
            updatePowderParticle(faller, {
              state: 'stored',
              x: faller.x,
              y: faller.y,
              vx: 0,
              vy: 0
            });
            state.fallers.splice(i, 1);
            continue;
          }
          if (
            faller.y > bounds.maxY + 0.4 ||
            Math.abs(faller.x) > bounds.maxX + 0.4
          ) {
            updatePowderParticle(faller, { state: 'lost' });
            state.fallers.splice(i, 1);
          }
        }
        while (state.restingParticles.length > 0) {
          let particle = state.restingParticles.shift();
          if (particle) {
            updatePowderParticle(particle, { state: 'stored' });
          }
        }
      }


      function registerRocketArrival(pkg: PackageArrival): void {
        let rocketState = moduleStates && moduleStates.rocket;
        if (!rocketState) return;
        rocketState.incoming = rocketState.incoming || [];
        rocketState.packageQueue = rocketState.packageQueue || [];
        if (pkg.package) {
          rocketState.packageQueue.push(pkg.package);
          while (rocketState.packageQueue.length > 40) {
            rocketState.packageQueue.shift();
          }
          let particle = getPowderParticleForEntity(pkg.package);
          if (particle) {
            movePowderParticleToModule(particle, 'rocket', {
              state: 'queued',
              progress: 0,
              data: { lane: rocketState.nextLane || 0 }
            });
          }
        }
        let laneCount =
          rocketState.pods && rocketState.pods.length > 0
            ? rocketState.pods.length
            : 3;
        let lane = rocketState.nextLane || 0;
        rocketState.nextLane = (lane + 1) % laneCount;
        rocketState.incoming.push({
          package: pkg.package,
          colors: pkg.colors,
          pulse: 1,
          progress: 0,
          lane
        });
        while (rocketState.incoming.length > 8) {
          rocketState.incoming.shift();
        }
      }

      function smoothStep(t: number): number {
        let clamped = constrain(t, 0, 1);
        return clamped * clamped * (3 - 2 * clamped);
      }

      function updateRocketState(dt: number): void {
        let state = moduleStates.rocket;
        if (!state) return;
        if (!state.pods || state.pods.length === 0) {
          state.pods = new Array(3)
            .fill(0)
            .map(() => ({ progress: 0, launch: 0, fueling: false, package: null }));
        }
        state.explosions = state.explosions || [];
        state.successPulse = Math.max(0, (state.successPulse || 0) - dt * 1.1);
        state.incoming = state.incoming || [];
        state.packageQueue = state.packageQueue || [];
        for (let i = state.incoming.length - 1; i >= 0; i--) {
          let incoming = state.incoming[i];
          if (!incoming) continue;
          incoming.progress = (incoming.progress || 0) + dt * 0.9;
          incoming.pulse = Math.max(0, (incoming.pulse || 0) - dt * 1.6);
          let particle = getPowderParticleForEntity(incoming.package);
          if (particle) {
            updatePowderParticle(particle, {
              state: 'approach',
              progress: incoming.progress,
              data: { lane: incoming.lane }
            });
          }
          if (incoming.progress >= 1.1) {
            if (particle) {
              movePowderParticleToModule(particle, 'rocket', {
                state: 'queue',
                progress: 0,
                data: { lane: incoming.lane }
              });
            }
            state.incoming.splice(i, 1);
          }
        }
        let fuelSpeed = 0.32 + getUpgradeLevel('refinery') * 0.08 + getGravityMultiplier() * 0.03;
        let successRate = getRocketSuccessRate();
        for (let i = 0; i < state.pods.length; i++) {
          let pod = state.pods[i];
          if (!pod) continue;
          if (pod.launch > 0) {
            pod.launch += dt;
            if (pod.launch >= 0.6) {
              pod.launch = 0;
              pod.progress = 0;
            }
            continue;
          }
          if (!pod.fueling && state.packageQueue.length > 0) {
            let nextPackage = state.packageQueue.shift();
            let consumed = nextPackage ? consumeEntity(1, nextPackage) : null;
            if (consumed) {
              pod.fueling = true;
              pod.progress = 0;
              pod.package = consumed;
              let particle = getPowderParticleForEntity(consumed);
              if (particle) {
                movePowderParticleToModule(particle, 'rocket', {
                  state: 'fueling',
                  progress: 0,
                  data: { podIndex: i }
                });
              }
            }
          }
          if (pod.fueling) {
            pod.progress += dt * fuelSpeed;
            let particle = getPowderParticleForEntity(pod.package);
            if (particle) {
              updatePowderParticle(particle, {
                state: 'fueling',
                progress: pod.progress,
                data: { podIndex: i }
              });
            }
            if (pod.progress >= 1) {
              pod.progress = 1;
              pod.launch = 0.01;
              pod.fueling = false;
              if (Math.random() < successRate) {
                let launch = createCompositeEntity(2, pod.package ? [pod.package] : [], {
                  origin: 'rocket'
                });
                if (pod.package) {
                  removePowderParticleForEntity(pod.package);
                }
                gainEntity(2, launch);
                createPowderParticleForEntity(launch, 'rocket', {
                  state: 'launch',
                  progress: 0,
                  data: { podIndex: i }
                });
                dust += Math.max(2, Math.round(6 * getDustMultiplier()));
                state.successPulse = 1;
              } else {
                let salvage = Math.floor(
                  CHAIN_REQUIREMENT * (0.05 + getUpgradeLevel('rocketSuccessRate') * 0.05)
                );
                if (salvage > 0 && pod.package && pod.package.contents) {
                  let grains = pod.package.contents.slice();
                  let shuffled = grains.slice().sort(() => Math.random() - 0.5);
                  let survivors = shuffled.slice(0, Math.min(salvage, shuffled.length));
                  if (survivors.length > 0) {
                    gainEntities(0, survivors);
                    requeueSalvagedGrains(survivors);
                  }
                }
                if (pod.package) {
                  removePowderParticleForEntity(pod.package);
                }
                state.explosions.push({ life: 1, index: i });
              }
              pod.package = null;
            }
          } else {
            pod.progress = Math.max(0, pod.progress - dt * 0.3);
          }
        }
        for (let i = state.explosions.length - 1; i >= 0; i--) {
          const explosion = state.explosions[i];
          if (!explosion) continue;
          explosion.life -= dt * 1.5;
          if (explosion.life <= 0) {
            state.explosions.splice(i, 1);
          }
        }
        runModuleAutomation(state, 'rocket', dt, 7, boostRockets);
      }

      function updateAsteroidState(dt: number): void {
        let state = moduleStates.asteroid;
        if (!state) return;
        initializeAsteroidField(state);
        state.ring = (state.ring || 0) + dt * 0.6;
        craftNextTier(
          state,
          2,
          3,
          0.26 + (researchState.lens || 0) * 0.03,
          dt,
          8,
          (asteroidEntity, consumed) => {
            spawnAsteroidPowder(state, asteroidEntity);
            applyAsteroidFissionBonus(state, asteroidEntity, consumed);
          }
        );
        updateAsteroidPowder(state, dt);
        updateAsteroidBodies(state, dt);
        state.ringPulse = Math.max(0, (state.ringPulse || 0) - dt * 1.4);
        runModuleAutomation(state, 'asteroid', dt, 6.5, crackAsteroidCrucible);
      }

      function initializeAsteroidField(state: AsteroidState): void {
        if (state.initialized) return;
        state.initialized = true;
        state.asteroids = state.asteroids || [];
        state.powderBits = state.powderBits || [];
        if (state.asteroids.length === 0) {
          for (let i = 0; i < 3; i++) {
            let angle = (i / 3) * TAU;
            state.asteroids.push({
              x: Math.cos(angle) * 0.4,
              y: Math.sin(angle) * 0.32,
              vx: -Math.sin(angle) * 0.18,
              vy: Math.cos(angle) * 0.14,
              mass: 2.8,
              radius: asteroidRadius(2.8),
              hue: random(0.15, 0.32),
              mergeGlow: 0
            });
          }
        }
      }

      function spawnAsteroidPowder(
        state: AsteroidState,
        asteroidEntity: PowderEntity
      ): void {
        if (!state.powderBits) {
          state.powderBits = [];
        }
        let bitCount = 4;
        if (asteroidEntity && asteroidEntity.mass) {
          bitCount = Math.max(4, Math.min(12, Math.round(asteroidEntity.mass / 4)));
        }
        for (let i = 0; i < bitCount; i++) {
          let angle = random(TAU);
          let radius = random(0.48, 0.7);
          let tangential = 0.25 + Math.random() * 0.18;
          state.powderBits.push({
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            vx: -Math.sin(angle) * tangential,
            vy: Math.cos(angle) * tangential,
            mass: 0.4 + Math.random() * 0.25,
            size: 0.04 + Math.random() * 0.02,
            life: 1
          });
        }
        while (state.powderBits.length > 80) {
          state.powderBits.shift();
        }
        state.ringPulse = 1;
        if (asteroidEntity) {
          state.asteroids = state.asteroids || [];
          let mass = recalcCompositeMass(asteroidEntity);
          state.asteroids.push({
            x: random(-0.2, 0.2),
            y: random(-0.2, 0.2),
            vx: random(-0.12, 0.12),
            vy: random(-0.12, 0.12),
            mass,
            radius: asteroidRadius(mass),
            hue: random(0.15, 0.32),
            mergeGlow: 0.8,
            entity: asteroidEntity
          });
          while (state.asteroids.length > 12) {
            state.asteroids.shift();
          }
        }
      }

      function applyAsteroidFissionBonus(
        state: AsteroidState,
        asteroidEntity: PowderEntity,
        _consumed?: PowderEntity[]
      ): void {
        let level = getUpgradeLevel('asteroidFissionBoost');
        if (level <= 0) return;
        let bonusChance = Math.min(0.65, 0.2 + level * 0.12);
        if (
          Math.random() < bonusChance &&
          asteroidEntity &&
          Array.isArray(asteroidEntity.contents) &&
          asteroidEntity.contents.length > 1
        ) {
          let splitCount = Math.max(1, Math.floor(asteroidEntity.contents.length / 2));
          let fragments = asteroidEntity.contents.splice(0, splitCount);
          recalcCompositeMass(asteroidEntity);
          asteroidEntity.lineage = mergeLineage(asteroidEntity.contents, asteroidEntity.id);
          if (fragments.length > 0) {
            let newAsteroid = createCompositeEntity(3, fragments, { origin: 'asteroid' });
            gainEntity(3, newAsteroid);
            state.asteroids = state.asteroids || [];
            let mass = recalcCompositeMass(newAsteroid);
            let spawnX = random(-0.25, 0.25);
            let spawnY = random(-0.25, 0.25);
            let spawnVx = random(-0.18, 0.18);
            let spawnVy = random(-0.18, 0.18);
            state.asteroids.push({
              x: spawnX,
              y: spawnY,
              vx: spawnVx,
              vy: spawnVy,
              mass,
              radius: asteroidRadius(mass),
              hue: random(0.18, 0.4),
              mergeGlow: 1,
              entity: newAsteroid,
              particle: createPowderParticleForEntity(newAsteroid, 'asteroid', {
                state: 'orbit',
                x: spawnX,
                y: spawnY,
                data: { mass }
              })
            });
            while (state.asteroids.length > 12) {
              let removedAsteroid = state.asteroids.shift();
              if (removedAsteroid && removedAsteroid.entity) {
                removePowderParticleForEntity(removedAsteroid.entity);
              }
            }
            state.ringPulse = 1;
          }
        }
        dust += Math.max(1, Math.round((3 + level * 2) * getDustMultiplier()));
      }

      function updateAsteroidPowder(state: AsteroidState, dt: number): void {
        if (!state.powderBits) return;
        let asteroids = state.asteroids || [];
        for (let i = state.powderBits.length - 1; i >= 0; i--) {
          let bit = state.powderBits[i]!;
          bit.life -= dt * 0.18;
          let nearest = null;
          let nearestDist = Infinity;
          for (let asteroid of asteroids) {
            let dx = asteroid.x - bit.x;
            let dy = asteroid.y - bit.y;
            let distSq = dx * dx + dy * dy;
            if (distSq < nearestDist) {
              nearestDist = distSq;
              nearest = asteroid;
            }
          }
          let targetX = nearest ? nearest.x : 0;
          let targetY = nearest ? nearest.y : 0;
          let dx = targetX - bit.x;
          let dy = targetY - bit.y;
          let distSq = dx * dx + dy * dy + 0.01;
          let dist = Math.sqrt(distSq);
          let pull = nearest ? 1.6 : 1;
          let accel = (pull * (nearest ? nearest.mass : 4)) / (1 + distSq * 4);
          bit.vx += (dx / dist) * accel * dt;
          bit.vy += (dy / dist) * accel * dt;
          bit.x += bit.vx * dt;
          bit.y += bit.vy * dt;
          bit.vx *= 0.985;
          bit.vy *= 0.985;
          if (nearest && dist < nearest.radius + bit.size * 0.5) {
            nearest.mass += bit.mass;
            nearest.radius = asteroidRadius(nearest.mass);
            nearest.mergeGlow = 1;
            state.powderBits.splice(i, 1);
            state.ringPulse = 1;
            continue;
          }
          if (!nearest && dist < 0.08) {
            state.asteroids.push({
              x: bit.x,
              y: bit.y,
              vx: bit.vx * 0.4,
              vy: bit.vy * 0.4,
              mass: 1.2,
              radius: asteroidRadius(1.2),
              hue: random(0.12, 0.4),
              mergeGlow: 0
            });
            state.powderBits.splice(i, 1);
            continue;
          }
          if (bit.life <= 0 || Math.abs(bit.x) > 1.4 || Math.abs(bit.y) > 1.4) {
            state.powderBits.splice(i, 1);
          }
        }
      }

      function updateAsteroidBodies(state: AsteroidState, dt: number): void {
        if (!state.asteroids) return;
        let asteroids = state.asteroids;
        let gravityConstant = 0.22;
        for (let i = 0; i < asteroids.length; i++) {
          let asteroid = asteroids[i]!;
          asteroid.vx += -asteroid.x * 0.12 * dt;
          asteroid.vy += -asteroid.y * 0.12 * dt;
          asteroid.mergeGlow = Math.max(0, asteroid.mergeGlow - dt * 1.6);
          if (asteroid.entity) {
            asteroid.particle = createPowderParticleForEntity(asteroid.entity, 'asteroid', {
              state: 'orbit',
              x: asteroid.x,
              y: asteroid.y,
              data: { mass: asteroid.mass }
            });
          }
        }
        for (let i = 0; i < asteroids.length; i++) {
          let a = asteroids[i]!;
          for (let j = i + 1; j < asteroids.length; j++) {
            let b = asteroids[j]!;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distSq = dx * dx + dy * dy + 0.02;
            let dist = Math.sqrt(distSq);
            let force = (gravityConstant * a.mass * b.mass) / distSq;
            let ax = (force / a.mass) * (dx / dist);
            let ay = (force / a.mass) * (dy / dist);
            a.vx += ax * dt;
            a.vy += ay * dt;
            b.vx -= (force / b.mass) * (dx / dist) * dt;
            b.vy -= (force / b.mass) * (dy / dist) * dt;
          }
        }
        for (let asteroid of asteroids) {
          asteroid.x += asteroid.vx * dt;
          asteroid.y += asteroid.vy * dt;
          asteroid.vx *= 0.996;
          asteroid.vy *= 0.996;
          if (asteroid.entity) {
            asteroid.particle = createPowderParticleForEntity(asteroid.entity, 'asteroid', {
              state: 'orbit',
              x: asteroid.x,
              y: asteroid.y,
              data: { mass: asteroid.mass }
            });
          }
        }
        for (let i = 0; i < asteroids.length; i++) {
          let a = asteroids[i]!;
          for (let j = i + 1; j < asteroids.length; j++) {
            let b = asteroids[j]!;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (a.radius + b.radius) * 0.7) {
              let totalMass = a.mass + b.mass;
              let newX = (a.x * a.mass + b.x * b.mass) / totalMass;
              let newY = (a.y * a.mass + b.y * b.mass) / totalMass;
              let newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
              let newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
              let newHue = (a.hue * a.mass + b.hue * b.mass) / totalMass;
              a.x = newX;
              a.y = newY;
              a.vx = newVx;
              a.vy = newVy;
              a.mass = totalMass;
              a.radius = asteroidRadius(totalMass);
              a.hue = newHue;
              a.mergeGlow = 1;
              if (a.entity || b.entity) {
                let host = a.entity || b.entity;
                if (!host) continue;
                let components: PowderEntity[] = [];
                if (a.entity && Array.isArray(a.entity.contents)) {
                  components.push(...a.entity.contents);
                }
                if (b.entity && Array.isArray(b.entity.contents)) {
                  components.push(...b.entity.contents);
                }
                if (components.length === 0) {
                  components = [host];
                }
                host.contents = components;
                recalcCompositeMass(host);
                a.entity = host;
                if (b.entity) {
                  removePowderParticleForEntity(b.entity);
                }
              }
              asteroids.splice(j, 1);
              j--;
              state.ringPulse = 1;
            }
          }
        }
        state.coreMass = asteroids.reduce((max, asteroid) => Math.max(max, asteroid.mass), 0);
        while (asteroids.length > 10) {
          let trimmed = asteroids.shift();
          if (trimmed && trimmed.entity) {
            removePowderParticleForEntity(trimmed.entity);
          }
        }
      }

      function asteroidRadius(mass: number): number {
        return 0.08 + Math.sqrt(Math.max(0, mass)) * 0.028;
      }

      function updatePlanetState(dt: number): void {
        let state = moduleStates.planet;
        if (!state) return;
        initializePlanetField(state);
        state.spin = (state.spin || 0) + dt * 0.5;
        craftNextTier(
          state,
          3,
          4,
          0.24 + (researchState.overclock || 0) * 0.02,
          dt,
          10,
          (planetEntity) => spawnPlanetesimals(state, planetEntity)
        );
        updatePlanetesimals(state, dt);
        updatePlanetMoons(state, dt);
        state.coreGlow = Math.max(0, (state.coreGlow || 0) - dt * 1.2);
        state.moonPulse = Math.max(0, (state.moonPulse || 0) - dt * 1.1);
        runModuleAutomation(state, 'planet', dt, 7.5, tunePlanetarium);
      }

      function initializePlanetField(state: PlanetState): void {
        if (state.initialized) return;
        state.initialized = true;
        state.planetesimals = state.planetesimals || [];
        state.moons = state.moons || [];
        state.planetCore = state.planetCore || {
          mass: 6,
          radius: planetRadius(6),
          angle: 0
        };
        for (let i = 0; i < 4; i++) {
          let angle = random(TAU);
          let radius = random(0.28, 0.48);
          state.planetesimals.push(createPlanetesimal(angle, radius));
        }
      }

      function spawnPlanetesimals(state: PlanetState, planetEntity: PowderEntity): void {
        if (!state.planetesimals) {
          state.planetesimals = [];
        }
        let planetMass = planetEntity ? recalcCompositeMass(planetEntity) : 8;
        if (planetEntity) {
          createPowderParticleForEntity(planetEntity, 'planet', {
            state: 'forming',
            x: 0,
            y: 0,
            data: { mass: planetMass }
          });
        }
        let count = Math.max(3, Math.min(8, Math.round(planetMass / 5)));
        for (let i = 0; i < count; i++) {
          let angle = random(TAU);
          let radius = random(0.26, 0.58);
          state.planetesimals.push(createPlanetesimal(angle, radius, planetEntity));
        }
        while (state.planetesimals.length > 40) {
          state.planetesimals.shift();
        }
        state.coreGlow = 1;
      }

      function createPlanetesimal(
        angle: number,
        radius: number,
        planetEntity?: PowderEntity
      ): Planetesimal {
        let tangential = 0.32 + Math.random() * 0.18;
        let baseMass = planetEntity ? Math.max(0.6, recalcCompositeMass(planetEntity) / 18) : 1;
        let mass = baseMass + Math.random() * baseMass * 0.6;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.72,
          vx: -Math.sin(angle) * tangential,
          vy: Math.cos(angle) * tangential * 0.72,
          mass,
          radius: planetesimalRadius(mass),
          colorPhase: Math.random(),
          spin: random(0.8, 1.6),
          phase: random(TAU),
          ...(planetEntity ? { entity: planetEntity } : {})
        };
      }

      function updatePlanetesimals(state: PlanetState, dt: number): void {
        let bodies = state.planetesimals || [];
        let core = state.planetCore;
        if (!core) {
          core = { mass: 6, radius: planetRadius(6), angle: 0 };
          state.planetCore = core;
        }
        core.angle = (core.angle || 0) + dt * 0.3;
        let centralGravity = 0.32 + core.mass * 0.01;
        for (let body of bodies) {
          let dx = -body.x;
          let dy = -body.y;
          let distSq = dx * dx + dy * dy + 0.04;
          let dist = Math.sqrt(distSq);
          let accel = (centralGravity * core.mass) / distSq;
          body.vx += (dx / dist) * accel * dt;
          body.vy += (dy / dist) * accel * dt;
          body.vx += -body.x * 0.05 * dt;
          body.vy += -body.y * 0.05 * dt;
          body.phase += dt * body.spin;
        }
        let gravityConstant = 0.16;
        for (let i = 0; i < bodies.length; i++) {
          let a = bodies[i]!;
          for (let j = i + 1; j < bodies.length; j++) {
            let b = bodies[j]!;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let distSq = dx * dx + dy * dy + 0.01;
            let dist = Math.sqrt(distSq);
            let force = (gravityConstant * a.mass * b.mass) / distSq;
            let ax = (force / a.mass) * (dx / dist);
            let ay = (force / a.mass) * (dy / dist);
            a.vx += ax * dt;
            a.vy += ay * dt;
            b.vx -= (force / b.mass) * (dx / dist) * dt;
            b.vy -= (force / b.mass) * (dy / dist) * dt;
          }
        }
        for (let body of bodies) {
          body.x += body.vx * dt;
          body.y += body.vy * dt;
          body.vx *= 0.996;
          body.vy *= 0.996;
        }
        for (let i = 0; i < bodies.length; i++) {
          let a = bodies[i]!;
          for (let j = i + 1; j < bodies.length; j++) {
            let b = bodies[j]!;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < (a.radius + b.radius) * 0.65) {
              let totalMass = a.mass + b.mass;
              let newX = (a.x * a.mass + b.x * b.mass) / totalMass;
              let newY = (a.y * a.mass + b.y * b.mass) / totalMass;
              let newVx = (a.vx * a.mass + b.vx * b.mass) / totalMass;
              let newVy = (a.vy * a.mass + b.vy * b.mass) / totalMass;
              a.x = newX;
              a.y = newY;
              a.vx = newVx;
              a.vy = newVy;
              a.mass = totalMass;
              a.radius = planetesimalRadius(totalMass);
              a.colorPhase = (a.colorPhase * a.mass + b.colorPhase * b.mass) / totalMass;
              bodies.splice(j, 1);
              j--;
              state.coreGlow = 1;
            }
          }
        }
        for (let i = bodies.length - 1; i >= 0; i--) {
          let body = bodies[i]!;
          let dist = Math.sqrt(body.x * body.x + body.y * body.y);
          if (dist < core.radius * 0.6) {
            core.mass += body.mass;
            core.radius = planetRadius(core.mass);
            state.moons = state.moons || [];
            state.moons.push(createPlanetMoon(core.radius, body.mass));
            state.coreGlow = 1;
            applyPlanetMoonNurseryBonus(state);
            bodies.splice(i, 1);
          }
        }
        while (state.moons && state.moons.length > 7) {
          state.moons.shift();
        }
        if (state.planetesimals && state.planetesimals.length > 0) {
          let reference = state.planetesimals.find((body) => body.entity);
          if (reference && reference.entity) {
            createPowderParticleForEntity(reference.entity, 'planet', {
              state: 'orbit',
              x: 0,
              y: 0,
              data: { moons: state.moons ? state.moons.length : 0 }
            });
          }
        }
      }

      function createPlanetMoon(radius: number, mass: number) {
        return {
          angle: random(TAU),
          radius: radius * 0.9 + random(0.24, 0.42),
          speed: random(0.4, 0.9),
          wobble: random(TAU),
          size: 0.05 + mass * 0.02
        };
      }

      function applyPlanetMoonNurseryBonus(state: PlanetState): void {
        let level = getUpgradeLevel('planetMoonNursery');
        if (level <= 0) return;
        let bonusPlanets = Math.max(1, level);
        for (let i = 0; i < bonusPlanets; i++) {
          let phantom = createCompositeEntity(4, [], { origin: 'planet' });
          gainEntity(4, phantom);
        }
        dust += Math.max(1, Math.round((6 + level * 2) * getDustMultiplier()));
        state.moonPulse = 1;
      }

      function updatePlanetMoons(state: PlanetState, dt: number): void {
        if (!state.moons) return;
        for (let moon of state.moons) {
          moon.angle += dt * moon.speed;
          moon.wobble += dt * 2;
        }
      }

      function planetRadius(mass: number): number {
        return 0.18 + Math.sqrt(Math.max(0, mass)) * 0.025;
      }

      function planetesimalRadius(mass: number): number {
        return 0.05 + Math.pow(Math.max(0.2, mass), 0.58) * 0.04;
      }

      function updateForgeState(dt: number): void {
        let state = moduleStates.forge;
        if (!state) return;
        state.corona = (state.corona || 0) + dt * 1.4;
        if (!state.pulses) {
          state.pulses = [];
        }
        craftNextTier(
          state,
          4,
          5,
          0.22 + getUpgradeLevel('compressor') * 0.05,
          dt,
          12,
          (starEntity) => {
            if (starEntity) {
              createPowderParticleForEntity(starEntity, 'forge', {
                state: 'ignited',
                x: 0,
                y: 0,
                data: { pulses: state.pulses ? state.pulses.length : 0 }
              });
            }
            state.pulses.push({ life: 1, angle: Math.random() * TAU });
            applyForgeSupernovaBonus(state, starEntity);
          }
        );
        for (let i = state.pulses.length - 1; i >= 0; i--) {
          const pulse = state.pulses[i]!;
          pulse.life -= dt * 1.6;
          if (pulse.life <= 0) {
            state.pulses.splice(i, 1);
          }
        }
        runModuleAutomation(state, 'forge', dt, 9, hammerForge);
      }

      function applyForgeSupernovaBonus(state: ForgeState, starEntity: PowderEntity): void {
        let level = getUpgradeLevel('forgeSupernova');
        if (level <= 0) return;
        if (Math.random() < Math.min(0.55, 0.2 * level)) {
          let fragments: PowderEntity[] = [];
          if (
            starEntity &&
            Array.isArray(starEntity.contents) &&
            starEntity.contents.length > 1
          ) {
            let split = Math.max(1, Math.floor(starEntity.contents.length / 2));
            fragments = starEntity.contents.splice(0, split);
            recalcCompositeMass(starEntity);
          }
          let bonusStar = createCompositeEntity(5, fragments, { origin: 'forge' });
          gainEntity(5, bonusStar);
          createPowderParticleForEntity(bonusStar, 'forge', {
            state: 'ignited',
            x: 0,
            y: 0,
            data: { bonus: true }
          });
        }
        dust += Math.max(1, Math.round((8 + level * 5) * getDustMultiplier()));
        if (state && state.pulses) {
          state.pulses.push({ life: 0.6 + level * 0.08, angle: Math.random() * TAU });
          while (state.pulses.length > 12) {
            state.pulses.shift();
          }
        }
      }

      function updateGalaxyState(dt: number): void {
        let state = moduleStates.galaxy;
        if (!state) return;
        initializeGalaxyField(state);
        state.angle = (state.angle || 0) + dt * 0.4;
        for (let vortex of state.vortices) {
          vortex.angle += dt * vortex.speed;
        }
        for (let particle of state.particles) {
          let vortex = state.vortices[particle.band % state.vortices.length];
          if (!vortex) continue;
          let targetAngle = vortex.angle + particle.armOffset;
          let angleDiff = angleWrap(targetAngle - particle.angle);
          particle.angularVel += angleDiff * dt * 0.45;
          particle.angularVel += (0.35 + particle.band * 0.12) / (particle.radius + 0.18) * dt;
          particle.angularVel *= 0.99;
          let targetRadius = vortex.radius + particle.band * 0.05;
          particle.radialVel += (targetRadius - particle.radius) * dt * 0.6;
          particle.radialVel -= particle.radius * 0.08 * dt;
          particle.radialVel *= 0.992;
          particle.radius += particle.radialVel * dt;
          particle.radius = constrain(particle.radius, 0.05, 0.7);
          particle.angle += (particle.angularVel + state.angle * 0.22) * dt;
          particle.twinkle += dt * (0.8 + particle.band * 0.2);
        }
        for (let i = state.bursts.length - 1; i >= 0; i--) {
          let burst = state.bursts[i]!;
          burst.life -= dt * 0.9;
          burst.radius += dt * 0.05;
          if (burst.life <= 0) {
            state.bursts.splice(i, 1);
          }
        }
        craftNextTier(
          state,
          5,
          6,
          0.18 + (researchState.lens || 0) * 0.03 + getUpgradeLevel('lanterns') * 0.02,
          dt,
          15,
          (galaxyEntity) => {
            spawnGalaxyBurst(state, galaxyEntity);
            applyGalaxyClusterBonus(state, galaxyEntity);
            if (galaxyEntity) {
              createPowderParticleForEntity(galaxyEntity, 'galaxy', {
                state: 'spiral',
                x: 0,
                y: 0,
                data: { bursts: state.bursts ? state.bursts.length : 0 }
              });
            }
          }
        );
        runModuleAutomation(state, 'galaxy', dt, 10.5, swirlGalaxy);
      }

      function initializeGalaxyField(state: GalaxyState): void {
        if (state.initialized) return;
        state.initialized = true;
        state.particles = [];
        state.vortices = [
          { radius: 0.22, angle: 0, speed: 0.26 },
          { radius: 0.36, angle: TAU / 3, speed: 0.2 },
          { radius: 0.5, angle: (2 * TAU) / 3, speed: 0.16 }
        ];
        state.bursts = [];
        for (let band = 0; band < 3; band++) {
          for (let i = 0; i < 30; i++) {
            state.particles.push({
              radius: random(0.12 + band * 0.12, 0.52 + band * 0.08),
              angle: random(TAU),
              radialVel: 0,
              angularVel: random(0.3, 0.7),
              band,
              armOffset: random(-0.4, 0.4),
              twinkle: random(TAU)
            });
          }
        }
      }

      function spawnGalaxyBurst(state: GalaxyState, galaxyEntity: PowderEntity): void {
        if (!state.bursts) {
          state.bursts = [];
        }
        let count = galaxyEntity ? Math.max(1, Math.min(4, Math.round(recalcCompositeMass(galaxyEntity) / 10))) : 1;
        for (let i = 0; i < count; i++) {
          state.bursts.push({
            radius: random(0.1, 0.4),
            angle: random(TAU),
            life: 1,
            entity: galaxyEntity
          });
        }
        while (state.bursts.length > 6) {
          state.bursts.shift();
        }
      }

      function applyGalaxyClusterBonus(state: GalaxyState, galaxyEntity: PowderEntity): void {
        let level = getUpgradeLevel('galaxyCluster');
        if (level <= 0) return;
        let extra = 0;
        for (let i = 0; i < level; i++) {
          if (Math.random() < 0.35) {
            extra++;
          }
        }
        if (extra > 0) {
          for (let i = 0; i < extra; i++) {
            let fragments: PowderEntity[] = [];
            if (
              galaxyEntity &&
              Array.isArray(galaxyEntity.contents) &&
              galaxyEntity.contents.length > 1
            ) {
              let split = Math.max(1, Math.floor(galaxyEntity.contents.length / 3));
              fragments = galaxyEntity.contents.splice(0, split);
              recalcCompositeMass(galaxyEntity);
            }
            let bonusGalaxy = createCompositeEntity(6, fragments, { origin: 'galaxy' });
            gainEntity(6, bonusGalaxy);
            createPowderParticleForEntity(bonusGalaxy, 'galaxy', {
              state: 'spiral',
              x: 0,
              y: 0,
              data: { bonus: true }
            });
          }
        }
        dust += Math.max(1, Math.round((10 + level * 6) * getDustMultiplier()));
        if (state && state.bursts) {
          state.bursts.push({ radius: random(0.18, 0.42), angle: random(TAU), life: 0.9 });
          while (state.bursts.length > 8) {
            state.bursts.shift();
          }
        }
      }

      function angleWrap(value: number): number {
        while (value > Math.PI) value -= TAU;
        while (value < -Math.PI) value += TAU;
        return value;
      }

      function updateUniverseState(dt: number): void {
        let state = moduleStates.universe;
        if (!state) return;
        state.angle += dt * 0.4;
        if (!state.nodes || state.nodes.length === 0) {
          state.nodes = [];
          for (let i = 0; i < 8; i++) {
            state.nodes.push({
              radius: random(0.2, 0.46),
              size: random(0.03, 0.07),
              offset: random(TAU)
            });
          }
        }
        craftNextTier(
          state,
          6,
          7,
          0.16 + (researchState.overclock || 0) * 0.02 + getUpgradeLevel('harmonics') * 0.02,
          dt,
          18,
          (universeEntity) => {
            if (universeEntity) {
              createPowderParticleForEntity(universeEntity, 'universe', {
                state: 'woven',
                x: 0,
                y: 0,
                data: { angle: state.angle }
              });
            }
            applyUniverseContinuumBonus(state, universeEntity);
          }
        );
        runModuleAutomation(state, 'universe', dt, 12, syncUniverse);
      }

      function applyUniverseContinuumBonus(
        state: UniverseState,
        universeEntity: PowderEntity
      ): void {
        let level = getUpgradeLevel('universeContinuum');
        if (level <= 0) return;
        if (Math.random() < Math.min(0.5, 0.18 * level)) {
          let fragments: PowderEntity[] = [];
          if (
            universeEntity &&
            Array.isArray(universeEntity.contents) &&
            universeEntity.contents.length > 1
          ) {
            let split = Math.max(1, Math.floor(universeEntity.contents.length / 4));
            fragments = universeEntity.contents.splice(0, split);
            recalcCompositeMass(universeEntity);
          }
          let bonusUniverse = createCompositeEntity(7, fragments, { origin: 'universe' });
          gainEntity(7, bonusUniverse);
          createPowderParticleForEntity(bonusUniverse, 'universe', {
            state: 'woven',
            x: 0,
            y: 0,
            data: { bonus: true }
          });
        }
        dust += Math.max(1, Math.round((12 + level * 6) * getDustMultiplier()));
        let singularity = moduleStates.singularity;
        if (singularity) {
          singularity.progress = (singularity.progress || 0) + level * 0.12;
        }
      }

      function updateSingularityState(dt: number): void {
        let state = moduleStates.singularity;
        if (!state) return;
        state.orbit += dt * 0.5;
        state.halo = (state.halo || 0) + dt * 1.1;
        let speed = 0.12 + crystalCores * 0.008;
        let universes = ensureInventory(7);
        if (universes.length >= CHAIN_REQUIREMENT) {
          state.progress += dt * speed;
          while (state.progress >= 1 && universes.length >= CHAIN_REQUIREMENT) {
            state.progress -= 1;
            let consumed = takeEntities(7, CHAIN_REQUIREMENT);
            if (consumed.length < CHAIN_REQUIREMENT) {
              gainEntities(7, consumed);
              state.progress = 0;
              break;
            }
            despawnParticlesForEntities(consumed);
            let singularityEntity = createCompositeEntity(8, consumed, {
              origin: 'singularity'
            });
            gainEntity(8, singularityEntity);
            createPowderParticleForEntity(singularityEntity, 'singularity', {
              state: 'collapse',
              x: 0,
              y: 0,
              data: { orbit: state.orbit }
            });
            let coreGain = 1 + milestoneBonuses.core * getMilestoneBonusScale();
            let wholeCores = Math.floor(coreGain);
            let remainder = coreGain - wholeCores;
            crystalCores += wholeCores;
            if (Math.random() < remainder) {
              crystalCores += 1;
            }
            dust += Math.max(5, Math.round(22 * getDustMultiplier()));
            state.shards.push({ life: 1, angle: Math.random() * TAU });
            applySingularityEchoBonus();
            universes = ensureInventory(7);
          }
        } else {
          state.progress = Math.max(0, state.progress - dt * 0.25);
        }
        for (let i = state.shards.length - 1; i >= 0; i--) {
          const shard = state.shards[i]!;
          shard.life -= dt * 1.2;
          if (shard.life <= 0) {
            state.shards.splice(i, 1);
          }
        }
        runModuleAutomation(state, 'singularity', dt, 14, focusSingularity);
      }

      function applySingularityEchoBonus() {
        let level = getUpgradeLevel('singularityEcho');
        if (level <= 0) return;
        if (Math.random() < Math.min(0.7, 0.2 * level)) {
          crystalCores += 1;
        }
        dust += Math.max(1, Math.round((14 + level * 7) * getDustMultiplier()));
      }

      function drawModuleShell(
        context: ModuleRenderContext,
        accentColor = '#1d4ed8'
      ): void {
        let { center, panelW, panelH } = context;
        let outerW = panelW * 0.92;
        let outerH = panelH * 0.92;
        push();
        translate(center.x, center.y);
        rectMode(CENTER);
        fill('#051225');
        rect(0, 0, outerW, outerH, 12);
        fill('#020912');
        rect(0, 0, outerW * 0.92, outerH * 0.82, 8);
        stroke(withAlpha(accentColor, 180));
        strokeWeight(2);
        noFill();
        rect(0, 0, outerW, outerH, 12);
        stroke(withAlpha(accentColor, 90));
        rect(0, 0, outerW * 0.92, outerH * 0.82, 8);
        noStroke();
        pop();
      }

      function drawConveyorModule(context: ModuleRenderContext): void {
        let state = moduleStates.conveyor;
        if (!state) return;
        setupConveyorGeometry(state);
        if (context && state.layout) {
          state.layout.center = context.center || state.layout.center;
          state.layout.innerLeft =
            context.innerLeft != null
              ? context.innerLeft
              : context.center.x - context.panelW / 2;
          state.layout.innerTop =
            context.innerTop != null
              ? context.innerTop
              : context.center.y - context.panelH / 2;
          state.layout.innerW = context.panelW;
          state.layout.innerH = context.panelH;
          syncConveyorGeometryWithLayout(state, state.layout);
        } else if (context) {
          syncConveyorGeometryWithLayout(state, {
            rect: context.rect,
            center: context.center,
            panelW: context.panelW,
            panelH: context.panelH,
            innerW: context.panelW,
            innerH: context.panelH,
            innerLeft: context.innerLeft != null ? context.innerLeft : context.center.x - context.panelW / 2,
            innerTop: context.innerTop != null ? context.innerTop : context.center.y - context.panelH / 2
          });
        }
        drawConveyorInterior(context, state);
        let progress = typeof state.packageProgress === 'number' ? state.packageProgress : 0;
        push();
        translate(context.center.x, context.center.y + context.panelH / 2 - scaledY(18));
        drawModuleProgressBar(0, 0, context.panelW * 0.6, progress, '#38bdf8');
        pop();
      }

      function drawConveyorInterior(
        context: ModuleRenderContext,
        state: ConveyorState
      ): void {
        if (!state || !state.geometry) return;
        let { center, panelW, panelH } = context;
        let geometry = state.geometry;
        let bounds = geometry.bounds || {
          minX: -0.5,
          maxX: 0.5,
          minY: 0,
          maxY: 1
        };
        let pixelMap = geometry.pixel || {};
        let innerLeft =
          context.innerLeft != null ? context.innerLeft : center.x - panelW / 2;
        let innerTop =
          context.innerTop != null ? context.innerTop : center.y - panelH / 2;
        let innerW = panelW;
        let innerH = panelH;
        let innerBottom = innerTop + innerH;
        let widthRange = Math.max(1e-6, bounds.maxX - bounds.minX);
        let heightRange = Math.max(1e-6, bounds.maxY - bounds.minY);
        let projectPoint = (x: number, y: number): Point | null => {
          if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
          let ratioX = (x - bounds.minX) / widthRange;
          ratioX = constrain(ratioX, 0, 1);
          let ratioY = (y - bounds.minY) / heightRange;
          let left = pixelMap.innerLeft != null ? pixelMap.innerLeft : innerLeft;
          let width = pixelMap.innerWidth != null ? pixelMap.innerWidth : innerW;
          let minYScreen =
            pixelMap.minYScreen != null ? pixelMap.minYScreen : innerTop;
          let maxYScreen =
            pixelMap.maxYScreen != null ? pixelMap.maxYScreen : innerBottom;
          let screenX = left + width * ratioX;
          let screenY = minYScreen + (maxYScreen - minYScreen) * ratioY;
          return { x: screenX, y: screenY };
        };
        push();
        rectMode(CORNER);
        noStroke();
        fill(withAlpha('#050d1a', 235));
        rect(innerLeft, innerTop, innerW, innerH);
        let walkwayTopPoint = projectPoint(0, bounds.minY);
        let holeTop = geometry.holeTop != null ? geometry.holeTop : bounds.minY;
        let walkwayBottomPoint = projectPoint(0, holeTop);
        if (walkwayTopPoint && walkwayBottomPoint) {
          let walkwayHeight = walkwayBottomPoint.y - walkwayTopPoint.y;
          if (walkwayHeight > 0) {
            fill(withAlpha('#0a1a33', 230));
            rect(innerLeft, walkwayTopPoint.y, innerW, walkwayHeight);
            fill(withAlpha('#38bdf8', 40));
            rect(innerLeft, walkwayBottomPoint.y - scaledY(2), innerW, scaledY(2));
          }
        }
        let floorY = geometry.floorY != null ? geometry.floorY : bounds.maxY;
        let floorLeft = projectPoint(bounds.minX, floorY);
        let floorRight = projectPoint(bounds.maxX, floorY);
        if (floorLeft && floorRight) {
          let pulse = 1 + Math.max(0, state.packagePulse || 0) * 0.35;
          stroke(withAlpha('#38bdf8', 120));
          strokeWeight(Math.max(2, scaledX(2.4)));
          line(floorLeft.x, floorLeft.y, floorRight.x, floorRight.y);
          noStroke();
          let basinHeight = Math.max(0, innerBottom - floorLeft.y);
          if (basinHeight > 0) {
            fill(withAlpha('#0b1d36', 220));
            rect(innerLeft, floorLeft.y, innerW, basinHeight);
            fill(withAlpha('#38bdf8', 48 * pulse));
            rect(innerLeft, floorLeft.y, innerW, Math.min(basinHeight, scaledY(18)));
          }
        }
        let entryRange = geometry.entryRange || [-0.3, 0.3];
        if (Array.isArray(entryRange)) {
          let entryLeft = projectPoint(entryRange[0], holeTop);
          let entryRight = projectPoint(entryRange[1], holeTop);
          if (entryLeft && entryRight) {
            let queueStrength = Math.min(
              1,
              ((state.fallers ? state.fallers.length : 0) || 0) / 24
            );
            stroke(withAlpha('#38bdf8', 180 + queueStrength * 60));
            strokeWeight(Math.max(2, scaledX(2.6)));
            strokeCap(SQUARE);
            line(entryLeft.x, entryLeft.y, entryRight.x, entryRight.y);
          }
        }
        let drawParticle = (particle: PowderParticle): void => {
          if (!particle) return;
          let point = projectPoint(particle.x, particle.y);
          if (!point) return;
          let colorHex = particle.color || '#e7c97a';
          let entitySize = 1;
          if (particle.entity) {
            if (
              particle.entity.metadata &&
              typeof particle.entity.metadata.size === 'number'
            ) {
              entitySize = particle.entity.metadata.size;
            } else if (
              typeof particle.entity.type === 'number' &&
              getPowderSizeByType
            ) {
              entitySize = Math.max(1, getPowderSizeByType(particle.entity.type));
            }
          }
          let pixelSize = Math.max(1, Math.round(cellPixelSize * entitySize));
          push();
          rectMode(CENTER);
          noStroke();
          fill(colorHex);
          rect(point.x, point.y, pixelSize, pixelSize);
          pop();
        };
        if (Array.isArray(state.restingParticles)) {
          for (let particle of state.restingParticles) {
            drawParticle(particle);
          }
        }
        if (Array.isArray(state.fallers)) {
          for (let particle of state.fallers) {
            drawParticle(particle);
          }
        }
        pop();
      }
      function drawRocketModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#f97316');
        let state = moduleStates.rocket;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#f97316');
        pop();
      }


      function drawAsteroidModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#94a3b8');
        let state = moduleStates.asteroid;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#94a3b8');
        pop();
      }


      function drawPlanetModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#38bdf8');
        let state = moduleStates.planet;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#38bdf8');
        pop();
      }


      function drawForgeModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#f59e0b');
        let state = moduleStates.forge;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#f59e0b');
        pop();
      }


      function drawGalaxyModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#c084fc');
        let state = moduleStates.galaxy;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#c084fc');
        pop();
      }


      function drawUniverseModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#22d3ee');
        let state = moduleStates.universe;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#22d3ee');
        pop();
      }


      function drawSingularityModule(context: ModuleRenderContext): void {
        drawModuleShell(context, '#fb7185');
        let state = moduleStates.singularity;
        if (!state) return;
        let progress = typeof state.progress === 'number' ? state.progress : 0;
        push();
        translate(context.center.x, context.center.y);
        drawModuleProgressBar(0, context.panelH * 0.3, context.panelW * 0.6, progress, '#fb7185');
        pop();
      }


      function drawModuleProgressBar(
        offsetX: number,
        offsetY: number,
        width: number,
        progress: number,
        colorHex: string
      ): void {
        push();
        translate(offsetX, offsetY);
        let h = scaledY(10);
        fill(withAlpha('#020617', 200));
        rect(0, 0, width, h);
        if (progress > 0) {
          let clamped = constrain(progress, 0, 1);
          let barWidth = Math.max(4, width * clamped);
          fill(withAlpha(colorHex, 230));
          rect(-width / 2 + barWidth / 2, 0, barWidth, h);
        }
        pop();
      }

      function drawJarFrame(machine: MachineDefinition): void {
        let rectInfo = getMachineRect(machine);
        let center = getMachineCenter(rectInfo);
        let panelW = rectInfo.width * 0.92;
        let panelH = rectInfo.height * 0.86;
        push();
        rectMode(CENTER);
        if (selectedModule === machine.key) {
          let glowRadius = Math.max(scaledX(12), Math.min(panelW, panelH) * 0.18);
          drawSelectionGlow(center.x, center.y, panelW, panelH, glowRadius);
        }
        stroke('#1d4ed8');
        strokeWeight(2);
        fill(withAlpha('#030b18', 210));
        rect(center.x, center.y, panelW, panelH);
        noStroke();
        fill('#0f1e36');
        rect(center.x, center.y - panelH * 0.32, panelW * 0.92, panelH * 0.16);
        fill('#122b4b');
        rect(center.x, center.y + panelH * 0.12, panelW * 0.96, panelH * 0.2);
        pop();
        drawJarConveyorLink({ rectInfo, center, panelW, panelH });
      }

      function getJarChuteMetrics() {
        if (jarRect.width <= 0 || jarRect.height <= 0) return null;
        let centerX = jarRect.left + jarRect.width / 2;
        let centerY = jarRect.top + jarRect.height / 2;
        let innerW = jarRect.width * 0.88;
        let innerH = jarRect.height * 0.82;
        let innerTop = centerY - innerH / 2;
        let innerBottom = centerY + innerH / 2;
        let tubeWidth = Math.max(JAR_TUBE_PIXEL_WIDTH, scaledX(JAR_TUBE_PIXEL_WIDTH));
        let floorHeight = Math.max(innerH * 0.08, scaledY(12));
        let floorTopY = innerBottom - floorHeight;
        let shaftHeight = Math.max(innerH * 0.32, scaledY(56));
        let tubeTopY = Math.max(innerTop + innerH * 0.08, innerBottom - shaftHeight);
        let tubeBottomY = innerBottom + Math.max(innerH * 0.08, scaledY(24));
        let chuteHeight = tubeBottomY - tubeTopY;
        let chuteWidth = tubeWidth;
        let chuteCenterY = tubeTopY + chuteHeight / 2;
        let tubeRadius = Math.max(3, tubeWidth / 2);
        let noseRatio = innerW > 0 ? tubeWidth / innerW : 0.18;
        return {
          centerX,
          centerY,
          innerW,
          innerH,
          innerTop,
          innerBottom,
          tubeWidth,
          tubeTopY,
          tubeBottomY,
          tubeRadius,
          floorTopY,
          floorHeight,
          chuteHeight,
          chuteWidth,
          chuteCenterY,
          noseRatio
        };
      }

      function drawJarInterior() {
        let metrics = getJarChuteMetrics();
        if (!metrics) return;
        let {
          centerX,
          centerY,
          innerW,
          innerH,
          innerTop,
          innerBottom,
          tubeWidth,
          tubeTopY,
          tubeBottomY,
          tubeRadius,
          floorTopY,
          floorHeight
        } = metrics;
        let conveyorUnlocked = isMachineUnlocked('conveyor');
        push();
        rectMode(CENTER);
        noStroke();
        fill('#061225');
        rect(centerX, centerY, jarRect.width, jarRect.height);
        fill('#020912');
        rect(centerX, centerY, innerW, innerH);
        let totalLayers = strataLayers.length;
        if (totalLayers > 0) {
          let segmentHeight = innerH / totalLayers;
          for (let i = 0; i < totalLayers; i++) {
            let state = layerStates[i];
            let layer = strataLayers[i];
            if (!state || !layer) continue;
            let ratio = 0;
            if (state.completed) {
              ratio = 1;
            } else if (state.unlocked) {
              ratio = constrain(state.progress / layer.requirement, 0, 1);
            }
            let alpha = 60 + ratio * 160;
            fill(withAlpha(layer.color, alpha));
            let y = centerY - innerH / 2 + segmentHeight * (i + 0.5);
            rect(centerX, y, innerW * 0.82, segmentHeight + 2);
          }
        }
        stroke(withAlpha('#1d4ed8', 90));
        noFill();
        rect(centerX, centerY, innerW, innerH, 12);
        noStroke();
        if (floorHeight > 0) {
          fill('#071427');
          rect(
            centerX,
            floorTopY + floorHeight / 2,
            innerW * 0.88,
            floorHeight,
            12,
            12,
            6,
            6
          );
        }
        let tubeColor = conveyorUnlocked
          ? withAlpha('#38bdf8', jarReleaseState.open ? 220 : 160)
          : withAlpha('#000000', 240);
        let tubeHeight = tubeBottomY - tubeTopY;
        fill(tubeColor);
        rect(centerX, tubeTopY + tubeHeight / 2, tubeWidth, tubeHeight, tubeRadius);
        if (conveyorUnlocked) {
          let innerTubeWidth = Math.max(tubeWidth * 0.55, Math.min(tubeWidth - scaledX(1), tubeWidth));
          let innerTubeHeight = tubeHeight * 0.65;
          fill(withAlpha('#e0f2fe', jarReleaseState.open ? 140 : 80));
          rect(
            centerX,
            tubeTopY + tubeHeight / 2,
            innerTubeWidth,
            innerTubeHeight,
            Math.max(2, tubeRadius * 0.6)
          );
        }
        jarChuteExit = {
          x: centerX,
          y: tubeBottomY,
          width: tubeWidth,
          left: centerX - tubeWidth / 2,
          right: centerX + tubeWidth / 2
        };
        stroke(withAlpha('#38bdf8', 140));
        strokeWeight(Math.max(1.5, scaledX(1.6)));
        noFill();
        rect(
          centerX,
          tubeTopY + (tubeBottomY - tubeTopY) / 2,
          tubeWidth + scaledX(4),
          tubeBottomY - tubeTopY,
          tubeRadius + 2
        );
        stroke(withAlpha('#0f1e36', 180));
        strokeWeight(Math.max(1, scaledY(1.4)));
        line(centerX - innerW * 0.32, floorTopY, centerX + innerW * 0.32, floorTopY);
        noStroke();
        pop();
      }


      function drawJarConveyorLink(context: ModuleRenderContext): void {
        if (fullscreenModule === 'jar') return;
        let conveyorMachine = machineDefinitions.find((m) => m.key === 'conveyor');
        if (!conveyorMachine) return;
        let conveyorRect = getMachineRect(conveyorMachine);
        let conveyorCenter = getMachineCenter(conveyorRect);
        let conveyorLayout = getConveyorPanelLayout(
          conveyorMachine,
          conveyorRect,
          conveyorCenter
        );
        if (moduleStates && moduleStates.conveyor && conveyorLayout) {
          syncConveyorGeometryWithLayout(moduleStates.conveyor, conveyorLayout);
        }
        let metrics = getJarChuteMetrics();
        if (metrics) {
          jarChuteExit = {
            x: metrics.centerX,
            y: metrics.tubeBottomY || metrics.chuteCenterY + metrics.chuteHeight / 2,
            width: metrics.tubeWidth || metrics.chuteWidth,
            left:
              metrics.centerX - (metrics.tubeWidth || metrics.chuteWidth) / 2,
            right:
              metrics.centerX + (metrics.tubeWidth || metrics.chuteWidth) / 2
          };
        }
        let channelTop = jarChuteExit ? jarChuteExit.y : context.center.y + context.panelH / 2;
        let channelBottom = conveyorLayout ? conveyorLayout.innerTop : conveyorRect.y;
        if (channelBottom <= channelTop) {
          channelBottom = Math.max(channelBottom, channelTop + scaledY(6));
        }
        let basePathWidth = scaledX(MODULE_PATH_PIXEL_WIDTH);
        let channelWidth = jarChuteExit ? jarChuteExit.width : basePathWidth;
        let channelCenter = jarChuteExit ? jarChuteExit.x : context.center.x;
        let gapTop = channelTop;
        let gapBottom = channelBottom;
        push();
        rectMode(CORNERS);
        if (isMachineUnlocked('conveyor')) {
          let walkwayWidth = Math.max(channelWidth, basePathWidth);
          let walkwayCenter = channelCenter;
          let walkwayLeft = walkwayCenter - walkwayWidth / 2;
          let walkwayRight = walkwayCenter + walkwayWidth / 2;
          let pathFill = '#000000';
          let walkwayTop = gapTop - scaledY(1);
          let walkwayBottom = gapBottom + scaledY(1);
          let innerInset = Math.min(walkwayWidth * 0.25, Math.max(1, scaledX(1)));
          let innerLeft = walkwayLeft + innerInset;
          let innerRight = walkwayRight - innerInset;
          if (innerRight <= innerLeft) {
            let innerMid = (walkwayLeft + walkwayRight) / 2;
            let halfSpan = Math.max(0.5, walkwayWidth * 0.15);
            innerLeft = innerMid - halfSpan;
            innerRight = innerMid + halfSpan;
          }
          let innerTop = walkwayTop + scaledY(3);
          let innerBottom = walkwayBottom - scaledY(3);
          noStroke();
          fill(pathFill);
          rect(walkwayLeft, walkwayTop, walkwayRight, walkwayBottom);
          let conveyorState = moduleStates && moduleStates.conveyor;
          if (conveyorState && conveyorState.geometry) {
            let geometry = conveyorState.geometry;
            let entryRange = geometry.entryRange || [-0.28, 0.28];
            let walkwayTopNorm =
              geometry.bounds && geometry.bounds.minY != null
                ? geometry.bounds.minY
                : (geometry.holeTop || 0) - 0.08;
            let walkwayBottomNorm =
              geometry.holeTop != null ? geometry.holeTop : walkwayTopNorm + 0.08;
            if (walkwayBottomNorm <= walkwayTopNorm) {
              walkwayBottomNorm = walkwayTopNorm + 0.08;
            }
            let walkwayHeightNorm = walkwayBottomNorm - walkwayTopNorm;
            let walkwayWidthNorm = entryRange[1] - entryRange[0];
            let innerWidth = innerRight - innerLeft;
            let innerHeight = innerBottom - innerTop;
            if (innerWidth > 0 && innerHeight > 0) {
              let walkwayParticles = [];
              if (Array.isArray(conveyorState.fallers)) {
                for (let particle of conveyorState.fallers) {
                  if (particle && particle.y <= walkwayBottomNorm + 0.0001) {
                    walkwayParticles.push(particle);
                  }
                }
              }
              if (walkwayParticles.length > 0) {
                push();
                rectMode(CENTER);
                noStroke();
                for (let particle of walkwayParticles) {
                  let particleX =
                    particle && typeof particle.x === 'number'
                      ? particle.x
                      : lerp(entryRange[0], entryRange[1], 0.5);
                  let particleY =
                    particle && typeof particle.y === 'number'
                      ? particle.y
                      : walkwayTopNorm;
                  let xRatio =
                    walkwayWidthNorm !== 0
                      ? constrain(
                          (particleX - entryRange[0]) / walkwayWidthNorm,
                          0,
                          1
                        )
                      : 0.5;
                  let yRatio = constrain(
                    (particleY - walkwayTopNorm) / walkwayHeightNorm,
                    0,
                    1
                  );
                  let drawX = innerLeft + innerWidth * xRatio;
                  let drawY = innerTop + innerHeight * yRatio;
                  let colorHex = (particle && particle.color) || '#e7c97a';
                  let entitySize = 1;
                  if (particle && particle.entity) {
                    if (
                      particle.entity.metadata &&
                      typeof particle.entity.metadata.size === 'number'
                    ) {
                      entitySize = particle.entity.metadata.size;
                    } else if (
                      typeof particle.entity.type === 'number' &&
                      getPowderSizeByType
                    ) {
                      entitySize = Math.max(1, getPowderSizeByType(particle.entity.type));
                    }
                  }
                  let pixelSize = Math.max(
                    1,
                    Math.min(innerWidth * 0.9, Math.round(cellPixelSize * entitySize))
                  );
                  fill(colorHex);
                  rect(drawX, drawY, pixelSize, pixelSize);
                }
                pop();
              }
            }
          }
        } else {
          let barrierWidth = Math.max(channelWidth + scaledX(8), scaledX(18));
          let left = channelCenter - barrierWidth / 2;
          let right = channelCenter + barrierWidth / 2;
          noStroke();
          fill('#030b18');
          rect(left, gapTop - scaledY(4), right, gapTop + scaledY(10));
          stroke('#1e293b');
          strokeWeight(2);
          line(left, gapTop + scaledY(2), right, gapTop + scaledY(2));
        }
        pop();
      }


      function drawJarOverlay() {
        let metrics = getJarChuteMetrics();
        if (!metrics) return;
        let {
          centerX,
          centerY,
          innerW,
          innerH,
          innerTop,
          innerBottom,
          tubeWidth,
          tubeTopY,
          tubeBottomY,
          tubeRadius,
          floorTopY,
          floorHeight
        } = metrics;
        push();
        rectMode(CENTER);
        noFill();
        stroke('#38bdf8');
        strokeWeight(2);
        rect(centerX, centerY, jarRect.width, jarRect.height);
        noStroke();
        if (floorHeight > 0) {
          let floorOverlay = jarReleaseState.open
            ? withAlpha('#1d4ed8', 70)
            : withAlpha('#0b1629', 110);
          fill(floorOverlay);
          rect(
            centerX,
            floorTopY + floorHeight / 2,
            innerW * 0.9,
            floorHeight,
            12,
            12,
            6,
            6
          );
        }
        let tubeOverlay = jarReleaseState.open
          ? withAlpha('#38bdf8', 90)
          : withAlpha('#000000', 160);
        fill(tubeOverlay);
        rect(
          centerX,
          tubeTopY + (tubeBottomY - tubeTopY) / 2,
          tubeWidth + scaledX(2),
          tubeBottomY - tubeTopY,
          tubeRadius
        );
        pop();
      }


      function updateCollageLayout() {
        let horizontalPadding = Math.max(scaledX(18), PLAY_AREA_W * 0.02);
        let topPadding = Math.max(scaledY(28), SCREEN_H * 0.06);
        let bottomPadding = Math.max(scaledY(24), SCREEN_H * 0.06);
        let availableWidth = Math.max(260, PLAY_AREA_W - horizontalPadding * 2);
        let availableHeight = Math.max(260, SCREEN_H - topPadding - bottomPadding);
        let size = Math.min(availableWidth, availableHeight);
        let rightMargin = Math.max(scaledX(16), PLAY_AREA_W * 0.03);
        let playAreaLeft = MENU_W;
        let localLeft = Math.max(horizontalPadding, PLAY_AREA_W - size - rightMargin);
        collageLayout.left = playAreaLeft + localLeft;
        collageLayout.top = topPadding;
        collageLayout.width = size;
        collageLayout.height = size;
        collageLayout.cellWidth = size / 3;
        collageLayout.cellHeight = size / 3;
        let jarMachine = machineDefinitions.find((m) => m.key === 'jar');
        if (jarMachine) {
          let rect = getMachineRect(jarMachine);
          let baseSize = Math.min(rect.width, rect.height);
          let innerSize = baseSize * 0.92;
          let minimumSize = MAX_POWDER_SIZE + scaledX(10);
          let jarWidth = Math.max(minimumSize, Math.round(innerSize));
          let jarHeight = jarWidth;
          jarRect.width = Math.round(jarWidth);
          jarRect.height = Math.round(jarHeight);
          jarRect.left = Math.round(rect.x + rect.width / 2 - jarRect.width / 2);
          jarRect.top = Math.round(rect.y + rect.height - jarRect.height);
        }
      }

      function getMachineRect(machine: MachineDefinition | null | undefined): Rect {
        if (!machine) {
          return { x: collageLayout.left, y: collageLayout.top, width: 0, height: 0 };
        }
        if (fullscreenModule === machine.key) {
          let paddingX = scaledX(24);
          let width = Math.max(220, PLAY_AREA_W - paddingX);
          width = Math.min(width, PLAY_AREA_W - scaledX(32));
          let height = Math.max(220, SCREEN_H - scaledY(96));
          height = Math.min(height, SCREEN_H - scaledY(48));
          let playAreaLeft = MENU_W;
          let x = playAreaLeft + Math.max(scaledX(16), (PLAY_AREA_W - width) / 2);
          let y = scaledY(24);
          return { x, y, width, height };
        }
        let width = collageLayout.cellWidth * (machine.grid.width || 1);
        let height = collageLayout.cellHeight * (machine.grid.height || 1);
        let x = collageLayout.left + collageLayout.cellWidth * machine.grid.col;
        let y = collageLayout.top + collageLayout.cellHeight * machine.grid.row;
        return { x, y, width, height };
      }

      function getMachineCenter(rectInfo: Rect): Point {
        return {
          x: rectInfo.x + rectInfo.width / 2,
          y: rectInfo.y + rectInfo.height / 2
        };
      }

      function isMachineUnlocked(key: MachineModuleKey): boolean {
        switch (key) {
          case 'jar':
            return true;
          case 'conveyor':
            return !!tierUpgrades[0];
          case 'rocket':
            return !!tierUpgrades[1];
          case 'asteroid':
            return !!tierUpgrades[2];
          case 'planet':
            return !!tierUpgrades[3];
          case 'forge':
            return !!tierUpgrades[4];
          case 'galaxy':
            return !!tierUpgrades[5];
          case 'universe':
            return !!tierUpgrades[6];
          case 'singularity':
            return !!tierUpgrades[7];
          default:
            return false;
        }
      }

      function getTierIndexForModule(key: MachineModuleKey): number {
        return MODULE_UNLOCK_ORDER.indexOf(key);
      }

      function getNextTierToUnlock(): number {
        for (let i = 0; i < tierUpgrades.length; i++) {
          if (!tierUpgrades[i]) {
            return i;
          }
        }
        return -1;
      }

      function isInsideJar(x: number, y: number): boolean {
        if (jarRect.width <= 0 || jarRect.height <= 0) return false;
        return (
          x >= jarRect.left &&
          x <= jarRect.left + jarRect.width &&
          y >= jarRect.top &&
          y <= jarRect.top + jarRect.height
        );
      }

      function updatePowders() {
        if (gridRows <= 0 || gridCols <= 0) return;
        rebuildGrid();
        updateDuneMultiplierFromGrid();
        let fallSpeed =
          BASE_FALL_SPEED * getGravityMultiplier() * (deltaTime / 16.67);
        let fallCells = fallSpeed / cellPixelSize;
        for (let i = powders.length - 1; i >= 0; i--) {
          let p = powders[i]!;
          p.fallProgress = (p.fallProgress || 0) + fallCells;
          let removed = false;
          let movedThisFrame = false;
          let cameToRest = false;
          while (p.fallProgress >= 1 && !removed) {
            clearPowderCells(p);
            let moveResult = tryMovePowder(p, i);
            if (moveResult === 'removed') {
              removed = true;
              break;
            }
            if (moveResult) {
              p.fallProgress -= 1;
              movedThisFrame = true;
            } else {
              p.fallProgress = 0;
              cameToRest = true;
            }
            occupyPowderCells(p);
            if (!moveResult) {
              break;
            }
          }
          if (removed) {
            continue;
          }
          if (cameToRest) {
            p.settled = true;
          } else if (movedThisFrame) {
            p.settled = false;
          }
        }
        updateDuneMultiplierFromGrid();
        updateJarReleaseState();
      }

      function renderPowders() {
        if (!jarVisible) return;
        if (jarRect.width <= 0 || jarRect.height <= 0) return;
        push();
        noStroke();
        rectMode(CORNER);
        for (let p of powders) {
          const definition = powderTypes[p.type];
          if (!definition) continue;
          fill(definition.color);
          let size = getPowderSize(p);
          let width = size * cellPixelSize;
          let x = jarRect.left + p.col * cellPixelSize;
          let y = jarRect.top + p.row * cellPixelSize;
          rect(x, y, width, width);
        }
        pop();
      }

      function collectPowder(powder: ActivePowder): void {
        if (powder.collected) return;
        let type = powder.type;
        let bonusPowder = researchState.quantum || 0;
        let powderGain = 1 + bonusPowder;
        let size = getPowderSize(powder);
        let spawnRatio = 0.5;
        if (gridCols > 0) {
          let centerCol = powder.col + size / 2;
          spawnRatio = constrain(centerCol / gridCols, 0, 1);
        }
        let grains: PowderEntity[] = [];
        let storedEntities = Array.isArray(powder.entities)
          ? powder.entities.filter(Boolean)
          : [];
        if (storedEntities.length === 0) {
          let fallbackEntity = createBaseEntity(type, {
            origin: 'jar',
            metadata: { size }
          });
          storedEntities.push(fallbackEntity);
        }
        for (let entity of storedEntities) {
          if (!entity.metadata) {
            entity.metadata = {};
          }
          entity.metadata.spawnRatio = spawnRatio;
          entity.metadata.jarCol = powder.col;
          entity.metadata.jarRow = powder.row;
          entity.metadata.size = size;
          if (!entity.origin) {
            entity.origin = 'jar';
          }
          gainEntity(type, entity);
          totalPowderCollected += 1;
          grains.push(entity);
        }
        let additional = Math.max(0, powderGain - grains.length);
        for (let i = 0; i < additional; i++) {
          let bonusEntity = createBaseEntity(type, {
            origin: 'quantum',
            metadata: {
              spawnRatio,
              jarCol: powder.col,
              jarRow: powder.row,
              size
            }
          });
          gainEntity(type, bonusEntity);
          totalPowderCollected += 1;
          grains.push(bonusEntity);
        }
        let baseValue = powderTypes[type]?.dustValue ?? 1;
        let dustGain = Math.round(
          baseValue * getDustMultiplier() * duneDustMultiplier
        );
        dust += dustGain;
        totalDustEarned += dustGain;
        addLayerProgress(baseValue * powderGain);
        if (type <= 1 && grains.length > 0) {
          enqueueConveyorGrains(powder, grains);
        }
        powder.collected = true;
        powder.entities = [];
      }

      function enqueueConveyorGrains(powder: ActivePowder, grains: PowderEntity[]): void {
        if (!moduleStates || !moduleStates.conveyor) return;
        if (!isMachineUnlocked('conveyor')) return;
        if (!grains || grains.length === 0) return;
        let state = moduleStates.conveyor;
        setupConveyorGeometry(state);
        let size = getPowderSize(powder);
        let centerCol = powder.col + size / 2;
        let ratio = gridCols > 0 ? constrain(centerCol / gridCols, 0, 1) : 0.5;
        for (let i = 0; i < grains.length; i++) {
          let grain = grains[i]!;
          let spread = grains.length > 1 ? (i / Math.max(1, grains.length - 1)) - 0.5 : 0;
          let source = constrain(ratio + spread * 0.1 + random(-0.04, 0.04), 0, 1);
          startConveyorDrop(state, grain, source);
        }
      }

      function requeueSalvagedGrains(grains: PowderEntity[]): void {
        if (!moduleStates || !moduleStates.conveyor) return;
        if (!grains || grains.length === 0) return;
        let state = moduleStates.conveyor;
        setupConveyorGeometry(state);
        for (let grain of grains) {
          let baseSource =
            grain && grain.metadata && typeof grain.metadata.spawnRatio === 'number'
              ? grain.metadata.spawnRatio
              : 0.5;
          let source = constrain(baseSource + random(-0.12, 0.12), 0, 1);
          startConveyorDrop(state, grain, source);
        }
      }

      function tryMovePowder(
        powder: ActivePowder,
        index: number
      ): boolean | 'removed' {
        let size = getPowderSize(powder);
        let nextRow = powder.row + 1;
        if (nextRow + size > gridRows) {
          if (isHoleSpan(powder.col, size)) {
            collectPowder(powder);
            powders.splice(index, 1);
            return 'removed';
          }
          return false;
        }
        if (canOccupy(nextRow, powder.col, size, powder)) {
          powder.row = nextRow;
          return true;
        }
        let directions = getDirectionalPreference(powder);
        for (let dir of directions) {
          let newCol = powder.col + dir;
          if (newCol < 0 || newCol + size > gridCols) continue;
          if (canOccupy(nextRow, newCol, size, powder)) {
            powder.col = newCol;
            powder.row = nextRow;
            return true;
          }
        }
        return false;
      }

      function isHoleSpan(col: number, size: number): boolean {
        if (!jarReleaseState || !jarReleaseState.open) return false;
        if (gridCols <= 0) return false;
        if (jarNeckSpan && jarNeckSpan.end > jarNeckSpan.start) {
          let start = jarNeckSpan.start;
          let end = jarNeckSpan.end;
          let width = end - start;
          if (width < size) {
            let deficit = size - width;
            let expandLeft = Math.ceil(deficit / 2);
            let expandRight = deficit - expandLeft;
            start = Math.max(0, start - expandLeft);
            end = Math.min(gridCols, end + expandRight);
          }
          return col >= start && col + size <= end;
        }
        let pixelSize = cellPixelSize > 0 ? cellPixelSize : 1;
        let neckCells = Math.max(size, Math.round(5 / pixelSize));
        neckCells = Math.max(1, Math.min(neckCells, gridCols));
        let center = Math.floor(gridCols / 2);
        let start = center - Math.floor(neckCells / 2);
        let end = start + neckCells;
        if (start < 0) {
          end += -start;
          start = 0;
        }
        if (end > gridCols) {
          start -= end - gridCols;
          end = gridCols;
        }
        return col >= start && col + size <= end;
      }

      function rebuildGrid() {
        createEmptyGrid();
        for (let p of powders) {
          clampPowderToBounds(p);
          occupyPowderCells(p);
        }
      }

      function updateDuneMultiplierFromGrid() {
        if (gridRows <= 0 || gridCols <= 0) {
          duneHeightUnits = 0;
          duneDustMultiplier = 1;
          return;
        }
        let heightCells = 0;
        outer: for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            let occupant = grid[r]?.[c];
            if (occupant && occupant.settled) {
              heightCells = gridRows - r;
              break outer;
            }
          }
        }
        duneHeightUnits = Math.max(0, heightCells);
        duneDustMultiplier = 1 + duneHeightUnits * 0.1;
      }

      function getJarPowderCount(typeIndex: number): number {
        if (!Array.isArray(powders) || powders.length === 0) {
          return 0;
        }
        if (typeof typeIndex !== 'number') {
          return powders.length;
        }
        let total = 0;
        for (let powder of powders) {
          if (powder && powder.type === typeIndex) {
            total += 1;
          }
        }
        return total;
      }

      function updateJarReleaseState() {
        if (!jarReleaseState) {
          jarReleaseState = { open: true, openTimer: 0, cooldown: 0 };
        }
        jarReleaseState.open = true;
        jarReleaseState.openTimer = 0;
        jarReleaseState.cooldown = 0;
      }

      function refreshPowderGrid(rescale = false): void {
        let prevCols = gridCols || 1;
        let prevRows = gridRows || 1;
        let usableWidth = jarRect.width > 0 ? jarRect.width * 0.88 : 0;
        let usableHeight = jarRect.height > 0 ? jarRect.height * 0.82 : 0;
        let minWidth = Math.max(PLAY_AREA_W * 0.2, MAX_POWDER_SIZE * cellPixelSize);
        let minHeight = Math.max(SCREEN_H * 0.25, MAX_POWDER_SIZE * cellPixelSize);
        let widthPixels =
          usableWidth > 0 ? Math.max(usableWidth, MAX_POWDER_SIZE * cellPixelSize) : minWidth;
        let heightPixels =
          usableHeight > 0 ? Math.max(usableHeight, MAX_POWDER_SIZE * cellPixelSize) : minHeight;
        gridCols = Math.max(
          MAX_POWDER_SIZE,
          Math.floor(widthPixels / cellPixelSize)
        );
        gridRows = Math.max(
          MAX_POWDER_SIZE,
          Math.floor(heightPixels / cellPixelSize)
        );
        createEmptyGrid();
        for (let p of powders) {
          if (rescale && (prevCols !== gridCols || prevRows !== gridRows)) {
            let size = getPowderSize(p);
            let prevCenterCol = prevCols <= 0 ? 0 : p.col + size / 2;
            let prevCenterRow = prevRows <= 0 ? 0 : p.row + size / 2;
            let colRatio = prevCols <= 0 ? 0 : prevCenterCol / prevCols;
            let rowRatio = prevRows <= 0 ? 0 : prevCenterRow / prevRows;
            let newCenterCol = colRatio * gridCols;
            let newCenterRow = rowRatio * gridRows;
            p.col = Math.round(newCenterCol - size / 2);
            p.row = Math.round(newCenterRow - size / 2);
          } else {
            clampPowderToBounds(p);
          }
          p.fallProgress = 0;
          p.settled = false;
          clampPowderToBounds(p);
          occupyPowderCells(p);
        }
      }

      function getUpgradeLevel(key: string): number {
        return upgradesState && typeof upgradesState[key] === 'number'
          ? upgradesState[key]
          : 0;
      }

      function getGravityMultiplier() {
        return (
          1 +
          getUpgradeLevel('gravity') * 0.2 +
          crystalCores * 0.1 +
          getLayerGravityBonus() +
          milestoneBonuses.gravity * getMilestoneBonusScale()
        );
      }

      function getDustMultiplier() {
        return (
          1 +
          getUpgradeLevel('refinery') * 0.35 +
          crystalCores * 0.25 +
          getLayerDustBonus() +
          (researchState.lens || 0) * 0.2 +
          milestoneBonuses.dust * getMilestoneBonusScale()
        );
      }

      function getCompressorEfficiency() {
        return getUpgradeLevel('compressor') <= 0
          ? 0
          : 1 + getUpgradeLevel('compressor') * 0.35;
      }

      function getPowderMultiplier(index: number): number {
        if (!Array.isArray(powderTypes) || powderTypes.length === 0) {
          return 1;
        }
        if (typeof index !== 'number' || index < 0 || index >= powderTypes.length) {
          return 1;
        }
        if (index === 0) {
          return CHAIN_REQUIREMENT;
        }
        let recipe = compressionRecipes.find((entry) => entry && entry.from === index);
        if (!recipe) {
          return 1;
        }
        let efficiency = getCompressorEfficiency();
        if (efficiency <= 0) {
          return Math.max(1, Math.round(recipe.baseCost || 1));
        }
        return Math.max(1, Math.round((recipe.baseCost || 1) / efficiency));
      }

      function executeCompressionRecipe(recipe: CompressionRecipe, cost: number): boolean {
        if (!recipe || recipe.from < 2) return false;
        let consumed = takeEntities(recipe.from, cost);
        if (consumed.length < cost) {
          gainEntities(recipe.from, consumed);
          return false;
        }
        let outputs = Math.max(1, recipe.output || 1);
        for (let i = 0; i < outputs; i++) {
          let remainingOutputs = outputs - i;
          let portionSize = Math.max(1, Math.ceil(consumed.length / remainingOutputs));
          let portion = consumed.splice(0, portionSize);
          let composite = createCompositeEntity(recipe.to, portion, {
            origin: 'compression'
          });
          gainEntity(recipe.to, composite);
        }
        // Return any unused fragments
        if (consumed.length > 0) {
          gainEntities(recipe.from, consumed);
        }
        return true;
      }

      function renderRoundedRectPath(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ): void {
        let r = Math.min(radius, width / 2, height / 2);
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
      }

      function mixColors(hexA: string, hexB: string, t: number): string {
        let amount = constrain(t, 0, 1);
        let colorA = color(hexA);
        let colorB = color(hexB);
        let blended = lerpColor(colorA, colorB, amount);
        let alphaValue = alpha(blended) / 255;
        return `rgba(${Math.round(red(blended))}, ${Math.round(green(blended))}, ${Math.round(blue(blended))}, ${alphaValue})`;
      }

      function drawMenuPanelBackground(
        centerX: number,
        centerY: number,
        width: number,
        height: number
      ): void {
        let ctx = drawingContext as CanvasRenderingContext2D;
        ctx.save();
        let left = centerX - width / 2;
        let top = centerY - height / 2;
        let gradient = ctx.createLinearGradient(0, top, 0, top + height);
        gradient.addColorStop(0, MENU_THEME.panelTop);
        gradient.addColorStop(1, MENU_THEME.panelBottom);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = MENU_THEME.panelBorder;
        ctx.lineWidth = Math.max(1.5, scaledX(2));
        ctx.shadowColor = MENU_THEME.panelShadow;
        ctx.shadowBlur = Math.max(10, scaledX(16));
        ctx.shadowOffsetY = scaledY(8);
        ctx.beginPath();
        ctx.rect(left, top, width, height);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      function drawGlassCard(
        centerX: number,
        centerY: number,
        width: number,
        height: number,
        accentColor = MENU_THEME.accent
      ): void {
        let ctx = drawingContext as CanvasRenderingContext2D;
        ctx.save();
        let left = centerX - width / 2;
        let top = centerY - height / 2;
        let gradient = ctx.createLinearGradient(0, top, 0, top + height);
        gradient.addColorStop(0, MENU_THEME.cardTop);
        gradient.addColorStop(1, MENU_THEME.cardBottom);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = mixColors(accentColor, MENU_THEME.cardBorder, 0.5);
        ctx.lineWidth = Math.max(1, scaledX(1.4));
        ctx.shadowColor = MENU_THEME.cardShadow;
        ctx.shadowBlur = Math.max(6, scaledX(12));
        ctx.shadowOffsetY = scaledY(6);
        ctx.beginPath();
        ctx.rect(left, top, width, height);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      function drawNeonButton(
        x: number,
        y: number,
        w: number,
        h: number,
        options: NeonButtonOptions = {}
      ): void {
        let active = !!options.active;
        let enabled = options.enabled !== false;
        let accentColor = options.accentColor || MENU_THEME.accent;
        let baseColor = options.baseColor || MENU_THEME.buttonBase;
        let topColor;
        let bottomColor;
        let borderColor;
        let shadowColor;
        if (!enabled) {
          topColor = mixColors(MENU_THEME.buttonDisabled, '#1f2937', 0.5);
          bottomColor = MENU_THEME.buttonDisabled;
          borderColor = MENU_THEME.buttonBorder;
          shadowColor = 'rgba(2, 6, 23, 0.45)';
        } else if (active) {
          topColor = mixColors(accentColor, '#ffffff', 0.2);
          bottomColor = accentColor;
          borderColor = MENU_THEME.accentHover;
          shadowColor = withAlpha(accentColor, 180).toString();
        } else {
          topColor = mixColors(baseColor, '#1f2937', 0.35);
          bottomColor = baseColor;
          borderColor = MENU_THEME.buttonBorder;
          shadowColor = 'rgba(8, 12, 24, 0.55)';
        }

        let ctx = drawingContext as CanvasRenderingContext2D;
        let left = x - w / 2;
        let top = y - h / 2;
        ctx.save();
        let gradient = ctx.createLinearGradient(0, top, 0, top + h);
        gradient.addColorStop(0, topColor);
        gradient.addColorStop(1, bottomColor);
        ctx.fillStyle = gradient;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = Math.max(1, scaledX(1.4));
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = Math.max(6, scaledX(active ? 16 : 10));
        ctx.shadowOffsetY = scaledY(active ? 6 : 4);
        ctx.beginPath();
        ctx.rect(left, top, w, h);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      function drawMenu() {
        let panelLeft = 0;
        let panelRight = MENU_W;
        let panelWidth = MENU_W;
        let panelCenter = panelLeft + panelWidth / 2;
        drawMenuPanelBackground(panelCenter, SCREEN_H / 2, panelWidth, SCREEN_H);

        let horizontalPadding = scaledX(16);
        let tabs = getUnlockedMenuTabs();
        let tabBottom = drawMenuTabs({
          tabs,
          left: panelLeft + horizontalPadding,
          right: panelRight - horizontalPadding,
          top: scaledY(24),
          height: scaledY(88)
        });

        let contentLeft = panelLeft + horizontalPadding;
        let contentRight = panelRight - horizontalPadding;

        menuContentArea.left = contentLeft;
        menuContentArea.right = contentRight;
        menuContentArea.width = Math.max(0, contentRight - contentLeft);
        menuContentArea.center = menuContentArea.width > 0
          ? (contentLeft + contentRight) / 2
          : panelCenter;

        let headerBottom = drawResourceHeader(
          menuContentArea.center,
          menuContentArea.width,
          tabBottom + scaledY(12)
        );

        if (tabs.length === 0) {
          menuContentArea.top = headerBottom + scaledY(12);
          menuContentArea.bottom = SCREEN_H - scaledY(32);
          menuContentArea.height = Math.max(
            0,
            menuContentArea.bottom - menuContentArea.top
          );
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(11));
          text(
            'Unlock a module to access its controls.',
            menuContentArea.center,
            menuContentArea.top + scaledY(32)
          );
          menuScroll = 0;
          menuScrollMax = 0;
          return;
        }

        if (!tabs.some((tab) => tab.key === activeMenu)) {
          activeMenu = tabs[0]!.key;
        }

        let contentTop = headerBottom + scaledY(16);
        let contentBottom = SCREEN_H - scaledY(32);
        menuContentArea.top = contentTop;
        menuContentArea.bottom = contentBottom;
        menuContentArea.height = Math.max(0, contentBottom - contentTop);

        let visibleHeight = Math.max(0, menuContentArea.height);
        // Start below the clipping edge so centered section-header text is never
        // sliced in half at the top of a scrollable menu.
        let contentStart = menuContentArea.top + scaledY(12) - menuScroll;
        let contentEnd = contentStart;
        let clipWidth = menuContentArea.width;
        if (clipWidth > 0 && visibleHeight > 0) {
          const context = drawingContext as CanvasRenderingContext2D;
          context.save();
          context.beginPath();
          context.rect(
            menuContentArea.left,
            menuContentArea.top,
            clipWidth,
            visibleHeight
          );
          context.clip();
          menuContentArea.scrollOffset = menuScroll;
          contentEnd = drawActiveMenuContent(contentStart);
          context.restore();
        } else {
          menuContentArea.scrollOffset = menuScroll;
          contentEnd = drawActiveMenuContent(contentStart);
        }
        menuContentArea.scrollOffset = 0;
        let contentHeight = contentEnd - contentStart;
        menuScrollMax = Math.max(0, contentHeight - visibleHeight);
        menuScroll = constrain(menuScroll, 0, menuScrollMax);
      }

      function drawResourceHeader(
        centerX: number,
        availableWidth: number,
        topOffset: number
      ): number {
        let fallbackWidth = MENU_W - scaledX(60);
        let usableWidth = typeof availableWidth === 'number' && availableWidth > 0
          ? Math.min(availableWidth, fallbackWidth)
          : fallbackWidth;
        if (usableWidth <= 0) {
          usableWidth = Math.min(fallbackWidth, scaledX(240));
        }
        let cardHeight = scaledY(118);
        let cardTop = typeof topOffset === 'number' ? topOffset : scaledY(24);
        let cardCenterY = cardTop + cardHeight / 2;
        drawGlassCard(centerX, cardCenterY, usableWidth, cardHeight, MENU_THEME.accentSoft);

        let left = centerX - usableWidth / 2 + scaledX(16);
        let summaryY = cardCenterY - cardHeight / 2 + scaledY(26);
        push();
        textAlign(LEFT, CENTER);
        fill(MENU_THEME.text);
        textSize(scaledFont(12));
        text(`Dust: ${Math.floor(dust).toLocaleString()}`, left, summaryY);
        text(`Cores: ${crystalCores.toLocaleString()}`, left, summaryY + scaledY(18));
        text(
          `Total Grains: ${totalPowderCollected.toLocaleString()}`,
          left,
          summaryY + scaledY(36)
        );
        if (milestoneMessage) {
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(10));
          text(milestoneMessage, left, summaryY + scaledY(54));
        }
        pop();
        let countersStart = summaryY + (milestoneMessage ? scaledY(72) : scaledY(56));
        let nextY = drawPowderCounters(countersStart);
        textSize(scaledFont(14));
        return Math.max(nextY + scaledY(10), cardCenterY + cardHeight / 2 + scaledY(6));
      }

      function drawPowderCounters(y: number): number {
        let left = (menuContentArea.left || scaledX(40)) + scaledX(16);
        let lineSpacing = scaledY(18);
        push();
        fill(MENU_THEME.mutedText);
        textAlign(LEFT, CENTER);
        textSize(scaledFont(11));
        let unlocked = getUnlockedIndices();
        if (unlocked.length === 0) {
          text('No powders unlocked yet.', left, y);
          pop();
          return y + lineSpacing;
        }
        let split = Math.ceil(unlocked.length / 2);
        let firstLine = unlocked
          .slice(0, split)
          .map(
            (i) =>
              `${powderTypes[i]?.name ?? 'Unknown'}: ${(
                powderCounts[i] ?? 0
              ).toLocaleString()}`
          )
          .join('   ');
        let secondLine = unlocked
          .slice(split)
          .map(
            (i) =>
              `${powderTypes[i]?.name ?? 'Unknown'}: ${(
                powderCounts[i] ?? 0
              ).toLocaleString()}`
          )
          .join('   ');
        text(firstLine, left, y);
        if (secondLine.length > 0) {
          text(secondLine, left, y + lineSpacing);
          pop();
          return y + lineSpacing * 2;
        }
        pop();
        return y + lineSpacing;
      }

      function isMenuTabUnlocked(key: string): boolean {
        let tab = menuTabs.find((t) => t.key === key);
        if (!tab) return false;
        if (tab.requiresMilestone) {
          let state = getMilestoneState(tab.requiresMilestone);
          if (!state || !state.achieved) {
            return false;
          }
        }
        if (tab.requiresModule) {
          return isMachineUnlocked(tab.requiresModule);
        }
        return true;
      }

      function getUnlockedMenuTabs() {
        return menuTabs.filter((tab) => isMenuTabUnlocked(tab.key));
      }

      function drawMenuTabs(area: MenuTabsArea): number {
        let tabs = (area && area.tabs) || [];
        let left = area && area.left !== undefined ? area.left : scaledX(16);
        let right = area && area.right !== undefined ? area.right : MENU_W - scaledX(16);
        let width = Math.max(scaledX(80), right - left);
        let top = area && area.top !== undefined ? area.top : scaledY(20);
        let requestedHeight = area && area.height !== undefined ? area.height : scaledY(80);
        if (tabs.length === 0) {
          return top + requestedHeight;
        }

        let spacingCandidate = Math.max(scaledX(4), Math.min(scaledX(12), width * 0.04));
        let spacingLimit = width / Math.max(1, tabs.length * 2.5);
        let spacing = Math.min(spacingCandidate, spacingLimit);
        let totalSpacing = Math.max(0, (tabs.length - 1) * spacing);
        if (totalSpacing >= width) {
          spacing = width / Math.max(1, tabs.length * 3);
          totalSpacing = Math.max(0, (tabs.length - 1) * spacing);
        }

        let labelGap = scaledY(8);
        let labelHeight = scaledY(16);
        let iconMaxHeight = Math.max(scaledY(28), requestedHeight - labelGap - labelHeight);
        let availableWidth = Math.max(0, width - totalSpacing);
        let rawSize = tabs.length > 0 ? availableWidth / tabs.length : 0;
        let tabSize = Math.min(iconMaxHeight, rawSize);
        if (!isFinite(tabSize) || tabSize <= 0) {
          tabSize = Math.min(iconMaxHeight, width / Math.max(1, tabs.length));
        }

        let actualWidth = tabSize * tabs.length + Math.max(0, (tabs.length - 1) * spacing);
        let startX = left + Math.max(0, (width - actualWidth) / 2);
        let labelY = top + tabSize + labelGap + labelHeight / 2;
        let blockHeight = tabSize + labelGap + labelHeight;

        for (let i = 0; i < tabs.length; i++) {
          let tab = tabs[i]!;
          let x = startX + i * (tabSize + spacing);
          let centerX = x + tabSize / 2;
          let active = tab.key === activeMenu;
          let baseColor = active ? MENU_THEME.tabActive : MENU_THEME.tabInactive;
          let textColor = active ? MENU_THEME.invertedText : MENU_THEME.text;
          let ctx = drawingContext as CanvasRenderingContext2D;
          ctx.save();
          ctx.fillStyle = baseColor;
          ctx.strokeStyle = MENU_THEME.tabBorder;
          ctx.lineWidth = Math.max(1, scaledX(1.2));
          ctx.beginPath();
          ctx.rect(x, top, tabSize, tabSize);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          if (active) {
            push();
            stroke(MENU_THEME.accentHover);
            strokeWeight(Math.max(2, scaledY(2)));
            line(x, top + tabSize - scaledY(2), x + tabSize, top + tabSize - scaledY(2));
            pop();
          }

          let icon = typeof tab.icon === 'string' && tab.icon.length > 0
            ? tab.icon
            : (tab.label ? tab.label.charAt(0).toUpperCase() : '?');
          push();
          textAlign(CENTER, CENTER);
          textSize(Math.min(tabSize * 0.6, scaledFont(22)));
          fill(textColor);
          text(icon, centerX, top + tabSize / 2 + scaledY(1));
          pop();

          push();
          textAlign(CENTER, CENTER);
          textSize(Math.min(scaledFont(9), tabSize * 0.32));
          fill(MENU_THEME.mutedText);
          text(tab.label, centerX, labelY);
          pop();

          addButton({
            action: 'switchMenu',
            key: tab.key,
            x: centerX,
            y: top + blockHeight / 2,
            w: tabSize,
            h: blockHeight
          });
        }
        return top + blockHeight;
      }

      function drawSectionHeader(title: string, y: number): number {
        if (menuContentArea.width <= 0) {
          menuContentArea.left = scaledX(40);
          menuContentArea.right = SCREEN_W - scaledX(40);
          menuContentArea.width = menuContentArea.right - menuContentArea.left;
          menuContentArea.center = SCREEN_W / 2;
        }
        let left = menuContentArea.left;
        let right = menuContentArea.right;
        push();
        textAlign(LEFT, CENTER);
        textSize(scaledFont(11));
        fill(MENU_THEME.headerText);
        text(title.toUpperCase(), left, y);
        let ctx = drawingContext as CanvasRenderingContext2D;
        ctx.save();
        let lineLeft = left;
        let lineRight = right;
        let lineY = y + scaledY(14);
        ctx.strokeStyle = MENU_THEME.divider;
        ctx.lineWidth = Math.max(1, scaledY(1.2));
        ctx.beginPath();
        ctx.moveTo(lineLeft, lineY);
        ctx.lineTo(lineRight, lineY);
        ctx.stroke();
        ctx.restore();
        pop();
        return y + scaledY(32);
      }

      function drawSandfallMenu(y: number): number {
        y = drawSectionHeader('Grain Selection', y);
        y = drawPowderSelectRow(y + scaledY(8));
        y = drawSectionHeader('Production Statistics', y + scaledY(16));
        y = drawStageStatusCard(y + scaledY(12));
        y = drawModuleProductionStats(y + scaledY(12));
        return y;
      }

      function drawStageStatusCard(y: number): number {
        const cardW = menuContentArea.width || MENU_W - scaledX(32);
        const cardH = scaledY(184);
        const x = menuContentArea.center || MENU_W / 2;
        const centerY = y + cardH / 2;
        drawGlassCard(x, centerY, cardW, cardH, MENU_THEME.accent);
        const left = x - cardW / 2 + scaledX(16);
        const top = y + scaledY(24);
        const controller = stageWorld.controller;
        const economy = controller.economyView();
        const condition = controller.compression.definition.unlockCondition;
        const capacity = controller.compression.capacity(controller.upgradeLevels);
        const reservoir = controller.compression.state.reservoirIds.length;
        const full = reservoir + controller.transfers.length >= capacity;
        const phase = controller.compression.state.phase;
        const batchSize = controller.compression.state.batch?.motes.length ?? 0;
        const castValue = stageUpgradeValue(controller.config, controller.upgradeLevels, 'manual-cast-count');
        const gravityValue = stageUpgradeValue(controller.config, controller.upgradeLevels, 'gravity');
        push();
        textAlign(LEFT, CENTER);
        fill(MENU_THEME.text);
        textSize(scaledFont(11));
        text(`Selected: ${powderTypes[selectedPowder]?.name ?? 'Sand'} | ${Math.floor(powderCounts[selectedPowder] || 0)} visible`, left, top);
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(9));
        text(`Atrium: ${controller.sandfall.state.lifetimeCreated} lifetime | ${economy.activeByMaterial.sand} active`, left, top + scaledY(22));
        if (!controller.unlocked.has('compression-crucible') && condition.kind === 'lifetime-material') {
          text(`Crucible LOCKED | ${controller.sandfall.state.lifetimeCreated}/${condition.count} sand`, left, top + scaledY(44));
          text('Exit sealed | queued sand waits safely', left, top + scaledY(66));
        } else {
          fill(full ? MYSTICAL_UI.emberLight : MENU_THEME.mutedText);
          text(`Route: ${controller.transfers.length} transit | Reservoir ${reservoir}/${capacity}${full ? ' FULL' : ''}`, left, top + scaledY(44));
          fill(phase === 'ready' ? MENU_THEME.success : MENU_THEME.mutedText);
          text(`Crucible: ${phase === 'ready' ? 'READY - press C' : phase}${batchSize ? ` | batch ${batchSize}` : ''}`, left, top + scaledY(66));
          fill(MENU_THEME.mutedText);
          text(`Output: ${economy.spendableByMaterial.stone} stone${economy.spendableByMaterial.stone === 1 ? '' : 's'}`, left, top + scaledY(88));
        }
        fill(MENU_THEME.mutedText);
        text(`Cast x${castValue} | Gravity ${gravityValue.toFixed(0)} | Auto Cast ${controller.upgradeLevels['auto-cast'] > 0 ? 'ON' : 'OFF'}`, left, top + scaledY(116));
        text(`Ritual x${stageUpgradeValue(controller.config, controller.upgradeLevels, 'ritual-speed').toFixed(1)} | Auto Ritual ${controller.upgradeLevels['auto-ritual'] > 0 ? 'ON' : 'OFF'}`, left, top + scaledY(138));
        pop();
        return y + cardH + scaledY(10);
      }

      function formatGrainRate(value: number): string {
        if (!Number.isFinite(value) || value <= 0) {
          return '0';
        }
        if (value >= 1000) {
          return Math.round(value).toLocaleString();
        }
        if (value >= 100) {
          return value.toFixed(0);
        }
        if (value >= 10) {
          return value.toFixed(1);
        }
        return value.toFixed(2);
      }

      function drawModuleProductionStats(y: number): number {
        let modules = getModuleProductionSummaries();
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let rows = Math.max(1, modules.length);
        let rowHeight = scaledY(18);
        let cardH = scaledY(90) + rows * rowHeight;
        let x = menuContentArea.center || SCREEN_W / 2;
        const centerY = y + cardH / 2;
        drawGlassCard(x, centerY, cardW, cardH, MENU_THEME.accentSoft);
        let left = x - cardW / 2 + scaledX(16);
        let right = x + cardW / 2 - scaledX(16);
        let topY = y + scaledY(24);
        push();
        textAlign(LEFT, CENTER);
        fill(MENU_THEME.text);
        textSize(scaledFont(12));
        text('Module Grain Flow', left, topY);
        let rowY = topY + scaledY(24);
        textSize(scaledFont(10));
        if (modules.length === 0) {
          fill(MENU_THEME.mutedText);
          text('Unlock modules to track production.', left, rowY);
          pop();
          return y + cardH + scaledY(10);
        }
        for (let entry of modules) {
          fill(MENU_THEME.mutedText);
          text(entry.name || entry.key, left, rowY);
          push();
          textAlign(RIGHT, CENTER);
          fill(MENU_THEME.text);
          text(`${formatGrainRate(entry.rate)} grains/s`, right, rowY);
          pop();
          rowY += rowHeight;
        }
        pop();
        return y + cardH + scaledY(10);
      }

      function drawModuleSummaryCard(machine: MachineDefinition, y: number): number {
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let cardH = scaledY(120);
        let x = menuContentArea.center || SCREEN_W / 2;
        let unlocked = isMachineUnlocked(machine.key);
        let accent = unlocked ? MENU_THEME.accent : MENU_THEME.cardBorder;
        drawGlassCard(x, y, cardW, cardH, accent);
        push();
        textAlign(CENTER, CENTER);
        fill(MENU_THEME.text);
        textSize(scaledFont(12));
        text(machine.name, x, y - scaledY(32));
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(10));
        text(machine.description, x, y - scaledY(10), cardW - scaledX(36), scaledY(44));
        fill(unlocked ? MENU_THEME.success : MENU_THEME.mutedText);
        textSize(scaledFont(10));
        text(unlocked ? 'Status: Online' : 'Status: Locked', x, y + scaledY(12));
        if (!unlocked) {
          let tierIndex = getTierIndexForModule(machine.key);
          if (tierIndex >= 0) {
            let cost = tierUnlockCosts[tierIndex] || 0;
            let have = Math.floor(powderCounts[tierIndex] || 0);
            let resource = powderTypes[tierIndex] ? powderTypes[tierIndex].name : 'Powder';
            fill(MENU_THEME.mutedText);
            textSize(scaledFont(9));
            text(
              `Requires ${cost.toLocaleString()} ${resource} (have ${have.toLocaleString()})`,
              x,
              y + scaledY(30)
            );
          }
        }
        pop();
        return y + cardH / 2 + scaledY(12);
      }

      function drawSelectedModuleMenu(y: number): number {
        let moduleKey = selectedModule || 'jar';
        let machine = machineDefinitions.find((m) => m.key === moduleKey);
        if (!machine) {
          machine = machineDefinitions.find((m) => m.key === 'jar');
        }
        if (!machine) {
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(11));
          text(
            'Select a module in the workshop to view its upgrades.',
            menuContentArea.center || SCREEN_W / 2,
            y + scaledY(24)
          );
          return y + scaledY(48);
        }
        y = drawSectionHeader('Module Overview', y);
        y = drawModuleSummaryCard(machine, y + scaledY(14));
        if (machine.key === 'jar') {
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(11));
          text(
            'The Sandfall Jar hums along on its own. Use the Sandfall and Universal tabs to tune its flow.',
            menuContentArea.center || SCREEN_W / 2,
            y + scaledY(20),
            menuContentArea.width || SCREEN_W - scaledX(80),
            scaledY(60)
          );
          return y + scaledY(64);
        }
        if (!isMachineUnlocked(machine.key)) {
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(11));
          text(
            'Unlock this module from the workshop to access its controls.',
            menuContentArea.center || SCREEN_W / 2,
            y + scaledY(20)
          );
          return y + scaledY(44);
        }
        switch (machine.key) {
          case 'conveyor':
            return drawConveyorMenu(y + scaledY(12));
          case 'rocket':
            return drawRocketMenu(y + scaledY(12));
          case 'asteroid':
            return drawAsteroidMenu(y + scaledY(12));
          case 'planet':
            return drawPlanetMenu(y + scaledY(12));
          case 'forge':
            return drawForgeMenu(y + scaledY(12));
          case 'galaxy':
            return drawGalaxyMenu(y + scaledY(12));
          case 'universe':
            return drawUniverseMenu(y + scaledY(12));
          case 'singularity':
            return drawSingularityMenu(y + scaledY(12));
          default:
            return y;
        }
      }

      function drawUniversalMenu(y: number): number {
        y = drawSectionHeader('Gravity & Flow', y);
        y = drawSpecificUpgradeRow(['gravity'], y + scaledY(10));
        y = drawSectionHeader('Refinement', y + scaledY(12));
        y = drawSpecificUpgradeRow(['refinery', 'compressor'], y + scaledY(10));
        y = drawSectionHeader('Luminous Resonance', y + scaledY(12));
        y = drawSpecificUpgradeRow(['lanterns', 'harmonics'], y + scaledY(10));
        y = drawSectionHeader('Research Archives', y + scaledY(12));
        y = drawResearchRows(y + scaledY(10));
        y = drawSectionHeader('Geologic Layers', y + scaledY(16));
        for (let i = 0; i < strataLayers.length; i++) {
          y = drawLayerCard(strataLayers[i]!, layerStates[i]!, y + scaledY(6));
        }
        return y;
      }

      function drawAchievementsMenu(y: number): number {
        y = drawSectionHeader('Epoch Milestones', y);
        if (!codexUnlocked) {
          fill(MENU_THEME.mutedText);
          textSize(scaledFont(11));
          text(
            'Record your discoveries to unlock the codex.',
            menuContentArea.center || SCREEN_W / 2,
            y + scaledY(16)
          );
          return y + scaledY(44);
        }
        for (let i = 0; i < milestoneConfigs.length; i++) {
          y = drawMilestoneCard(milestoneConfigs[i]!, milestoneStates[i]!, y + scaledY(6));
        }
        y = drawSectionHeader('Development Roadmap', y + scaledY(18));
        y = drawDevelopmentNotes(y + scaledY(10));
        return y;
      }

      function drawConveyorMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('conveyor', y + scaledY(10));
        y = drawSectionHeader('Auto Feeders', y + scaledY(12));
        y = drawAutoDropperRow(y + scaledY(8));
        y = drawSectionHeader('Belt Diagnostics', y + scaledY(12));
        y = drawConveyorNotes(y + scaledY(10));
        return y;
      }

      function drawRocketMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('rocket', y + scaledY(10));
        y = drawSectionHeader('Refinery Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['refinery'], y + scaledY(10));
        y = drawSectionHeader('Launch Status', y + scaledY(12));
        y = drawRocketStatus(y + scaledY(12));
        return y;
      }

      function drawAsteroidMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('asteroid', y + scaledY(10));
        y = drawSectionHeader('Crucible Report', y + scaledY(12));
        y = drawAsteroidStatus(y + scaledY(12));
        return y;
      }

      function drawPlanetMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('planet', y + scaledY(10));
        y = drawSectionHeader('Planetary Ledger', y + scaledY(12));
        y = drawPlanetStatus(y + scaledY(12));
        return y;
      }

      function drawForgeMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('forge', y + scaledY(10));
        y = drawSectionHeader('Compression Engine', y + scaledY(12));
        y = drawSpecificUpgradeRow(['compressor'], y + scaledY(10));
        y = drawSectionHeader('Transmutation Matrix', y + scaledY(12));
        y = drawCompressionRow(y + scaledY(16));
        return y;
      }

      function drawGalaxyMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('galaxy', y + scaledY(10));
        y = drawSectionHeader('Luminous Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['lanterns'], y + scaledY(10));
        y = drawSectionHeader('Arcane Research', y + scaledY(12));
        y = drawResearchRows(y + scaledY(10));
        return y;
      }

      function drawUniverseMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('universe', y + scaledY(10));
        y = drawSectionHeader('Resonance Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['harmonics'], y + scaledY(10));
        y = drawSectionHeader('Automation Scripts', y + scaledY(12));
        y = drawAutomationControls(y + scaledY(10));
        return y;
      }

      function drawSingularityMenu(y: number): number {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('singularity', y + scaledY(10));
        y = drawSectionHeader('Crystal Ledger', y + scaledY(12));
        y = drawSingularityStats(y + scaledY(10));
        y = drawSectionHeader('Crystallization', y + scaledY(12));
        y = drawPrestigeRow(y + scaledY(18));
        return y;
      }

      function drawActiveMenuContent(y: number): number {
        switch (activeMenu) {
          case 'sandfall':
            return drawSandfallMenu(y);
          case 'module':
            return drawSelectedModuleMenu(y);
          case 'universal':
            return drawUniversalMenu(y);
          case 'achievements':
            return drawAchievementsMenu(y);
          default:
            return y;
        }
      }

      function drawMilestoneCard(
        config: MilestoneConfig,
        state: MilestoneState,
        y: number
      ): number {
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let cardH = scaledY(78);
        let x = menuContentArea.center || SCREEN_W / 2;
        let progressValue = getMilestoneResourceValue(config.resource);
        let ratio = config.requirement > 0
          ? constrain(progressValue / config.requirement, 0, 1)
          : 1;
        let achieved = state && state.achieved;
        let unlocked = state && state.unlocked;
        let accent = achieved ? MENU_THEME.success : MENU_THEME.accent;
        drawGlassCard(x, y, cardW, cardH, accent);
        fill(MENU_THEME.text);
        textSize(scaledFont(12));
        text(config.name, x, y - scaledY(22));
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(10));
        text(config.description, x, y - scaledY(6));
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(10));
        let resourceLabel =
          config.resource === 'cores'
            ? 'Cores'
            : config.resource === 'powder'
            ? 'Powder'
            : 'Dust';
        let progressText = achieved
          ? config.reward
          : `${resourceLabel}: ${Math.floor(progressValue)} / ${config.requirement}`;
        text(progressText, x, y + scaledY(10));
        push();
        rectMode(CORNER);
        let barW = cardW - scaledX(36);
        let barH = scaledY(8);
        let barX = x - barW / 2;
        let barY = y + scaledY(20);
        fill(MENU_THEME.progressBg);
        rect(barX, barY, barW, barH);
        let filled = Math.max(0, Math.min(barW, barW * ratio));
        fill(achieved ? MENU_THEME.success : MENU_THEME.accent);
        rect(barX, barY, filled, barH);
        pop();
        return y + cardH + scaledY(8);
      }

      function drawDevelopmentNotes(y: number): number {
        let notes = [
          'Refine automation scripting to handle new powder branches.',
          'Introduce prestige-era modules that consume singularity cores.',
          'Expand narrative entries tied to each newly stabilized layer.',
          'Design late-game events that remix earlier strata with modifiers.'
        ];
        let left = menuContentArea.left + scaledX(6);
        push();
        textAlign(LEFT, TOP);
        textSize(scaledFont(10));
        fill(MENU_THEME.mutedText);
        for (let note of notes) {
          text(`• ${note}`, left, y);
          y += scaledY(18);
        }
        pop();
        return y + scaledY(6);
      }

      function drawLayerCard(layer: StrataLayer, state: LayerState, y: number): number {
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let cardH = scaledY(70);
        let x = menuContentArea.center || SCREEN_W / 2;
        let ratio = state.completed
          ? 1
          : state.unlocked
          ? constrain(state.progress / layer.requirement, 0, 1)
          : 0;
        drawGlassCard(x, y, cardW, cardH, layer.color);
        fill(MENU_THEME.text);
        textSize(scaledFont(12));
        text(layer.name, x, y - scaledY(18));
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text(layer.description, x, y - scaledY(2));
        let remaining = Math.max(
          0,
          Math.ceil(layer.requirement - state.progress)
        );
        let statusText = state.completed
          ? 'Stabilized'
          : state.unlocked
          ? `${Math.floor(ratio * 100)}% - ${remaining} flow`
          : 'Locked';
        drawProgressBar(
          x,
          y + scaledY(16),
          cardW - scaledX(80),
          scaledY(12),
          ratio,
          layer.color
        );
        textSize(scaledFont(11));
        fill(MENU_THEME.text);
        text(statusText, x, y + scaledY(24));
        return y + scaledY(80);
      }

      function drawProgressBar(
        x: number,
        y: number,
        width: number,
        height: number,
        progress: number,
        fillColor: string
      ): void {
        push();
        rectMode(CENTER);
        let bg = MENU_THEME.progressBg;
        fill(bg);
        rect(x, y, width, height);
        if (progress > 0) {
          let barWidth = Math.max(4, width * constrain(progress, 0, 1));
          let center = x - width / 2 + barWidth / 2;
          fill(fillColor);
          rect(center, y, barWidth, height);
        }
        pop();
      }

      function drawResearchRows(y: number): number {
        if (researchProjects.length === 0) {
          return y;
        }
        const areaWidth = menuContentArea.width || MENU_W;
        const columns = Math.max(
          1,
          Math.min(2, Math.floor(areaWidth / Math.max(130, scaledX(140))))
        );
        let btnW = Math.min(
          scaledX(180),
          (areaWidth - scaledX(10) * (columns - 1)) / columns
        );
        let btnH = scaledY(46);
        for (let i = 0; i < researchProjects.length; i++) {
          let project = researchProjects[i]!;
          let level = researchState[project.key] ?? 0;
          let cost = Math.floor(
            project.baseCost * Math.pow(project.costMult ?? 3, level)
          );
          let canBuy = dust >= cost;
          const column = i % columns;
          const row = Math.floor(i / columns);
          const rowCount = Math.min(columns, researchProjects.length - row * columns);
          const xs = getRowPositions(rowCount);
          let x = xs[column]!;
          const rowY = y + row * (btnH + scaledY(10));
          drawNeonButton(x, rowY, btnW, btnH, {
            active: level > 0,
            enabled: canBuy,
            accentColor: MENU_THEME.accent,
            baseColor: MENU_THEME.buttonBase
          });
          push();
          textAlign(CENTER, CENTER);
          textSize(scaledFont(12));
          fill(canBuy ? MENU_THEME.invertedText : MENU_THEME.text);
          text(`${project.name} R${level}`, x, rowY - scaledY(12));
          textSize(scaledFont(11));
          fill(MENU_THEME.mutedText);
          text(project.description, x, rowY + scaledY(2), btnW - scaledX(12), scaledY(16));
          textSize(scaledFont(11));
          fill(MENU_THEME.text);
          text(`Cost: ${cost}`, x, rowY + scaledY(16));
          pop();
          addButton(
            {
              action: 'buyResearch',
              key: project.key,
              x,
              y: rowY,
              w: btnW,
              h: btnH
            },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + Math.ceil(researchProjects.length / columns) * (btnH + scaledY(10)) + scaledY(8);
      }

      function drawAutomationControls(y: number): number {
        let controls: Array<{
          key: keyof AutomationSettings;
          label: string;
          description: string;
        }> = [
          {
            key: 'autoDrop',
            label: 'Auto Drop',
            description: 'Continuously drop selected powder.'
          },
          {
            key: 'autoCompress',
            label: 'Auto Compress',
            description: 'Convert powders whenever possible.'
          }
        ];
        const areaWidth = menuContentArea.width || MENU_W;
        const columns = areaWidth < scaledX(380) ? 1 : 2;
        let btnW = Math.min(scaledX(170), columns === 1 ? areaWidth : areaWidth / 2 - scaledX(8));
        let btnH = scaledY(40);
        for (let i = 0; i < controls.length; i++) {
          let control = controls[i]!;
          let enabled = automationSettings[control.key];
          let unlocked = automationUnlocks[control.key];
          const column = i % columns;
          const row = Math.floor(i / columns);
          const rowCount = Math.min(columns, controls.length - row * columns);
          const xs = getRowPositions(rowCount);
          let x = xs[column]!;
          const rowY = y + row * (btnH + scaledY(8));
          if (unlocked) {
            drawNeonButton(x, rowY, btnW, btnH, {
              active: enabled,
              enabled: true,
              accentColor: MENU_THEME.accent,
              baseColor: MENU_THEME.buttonBase,
              radius: 12
            });
            fill(enabled ? MENU_THEME.invertedText : MENU_THEME.text);
            textSize(scaledFont(11));
            text(`${control.label}: ${enabled ? 'ON' : 'OFF'}`, x, rowY - scaledY(10));
            textSize(scaledFont(10));
            fill(MENU_THEME.mutedText);
            text(control.description, x, rowY + scaledY(6));
            addButton(
              {
                action: 'toggleAutomation',
                key: control.key,
                x,
                y: rowY,
                w: btnW,
                h: btnH
              },
              { scrollAware: true }
            );
          } else {
            drawNeonButton(x, rowY, btnW, btnH, {
              active: false,
              enabled: false,
              accentColor: MENU_THEME.accent,
              baseColor: MENU_THEME.buttonBase,
              radius: 12
            });
            fill(MENU_THEME.mutedText);
            textSize(scaledFont(11));
            text(`${control.label}: Locked`, x, rowY - scaledY(10));
            let milestone = getMilestoneForType(
              control.key === 'autoDrop' ? 'unlockAutoDrop' : 'unlockAutoCompress'
            );
            textSize(scaledFont(10));
            if (milestone) {
              text(
                `${milestone.name} (${milestone.requirement} ${
                  milestone.resource === 'cores' ? 'cores' : 'dust'
                })`,
                x,
                rowY + scaledY(4)
              );
            } else {
              text('Progress deeper to unlock automation.', x, rowY + scaledY(4));
            }
          }
        }
        textSize(scaledFont(14));
        return y + Math.ceil(controls.length / columns) * (btnH + scaledY(8)) + scaledY(6);
      }

      function drawPowderSelectRow(y: number): number {
        let indices = getUnlockedIndices();
        if (indices.length === 0) return y;
        let availableWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let spacingX = scaledX(6);
        let spacingY = scaledY(6);
        let minColumns = indices.length === 1 ? 1 : 2;
        let maxColumns = Math.min(4, indices.length);
        let columns = minColumns;
        let minSize = Math.max(scaledX(32), scaledY(32));
        for (let c = maxColumns; c >= minColumns; c--) {
          let candidate = (availableWidth - spacingX * (c - 1)) / c;
          if (candidate >= minSize) {
            columns = c;
            break;
          }
        }
        let rows = Math.ceil(indices.length / columns);
        let currentTop = y;
        let centerX = menuContentArea.center || SCREEN_W / 2;
        let totalHeight = 0;
        textSize(scaledFont(8));
        for (let row = 0; row < rows; row++) {
          let rowIndices = indices.slice(row * columns, row * columns + columns);
          let rowCount = rowIndices.length;
          if (rowCount === 0) {
            continue;
          }
          textSize(scaledFont(8));
          let longestLabel = 0;
          for (let powderIndex of rowIndices) {
            longestLabel = Math.max(
              longestLabel,
              textWidth(powderTypes[powderIndex]?.name || '')
            );
          }
          let rowSize = Math.min(
            Math.max(longestLabel + scaledX(16), minSize),
            Math.max(scaledX(48), scaledY(48))
          );
          let rowWidth = rowCount * rowSize + Math.max(0, rowCount - 1) * spacingX;
          let startX = centerX - rowWidth / 2;
          let centerY = currentTop + rowSize / 2;
          for (let i = 0; i < rowIndices.length; i++) {
            textSize(scaledFont(8));
            let powderIndex = rowIndices[i]!;
            let x = startX + rowSize / 2 + i * (rowSize + spacingX);
            let isSelected = powderIndex === selectedPowder;
            let definition = powderTypes[powderIndex];
            if (!definition) continue;
            let baseColor = definition.color;
            drawNeonButton(x, centerY, rowSize, rowSize, {
              active: isSelected,
              accentColor: baseColor,
              baseColor: mixColors(baseColor, '#ffffff', 0.85),
              radius: Math.min(10, rowSize / 2)
            });
            push();
            textAlign(CENTER, CENTER);
            fill(isSelected ? MENU_THEME.invertedText : MENU_THEME.text);
            text(
              definition.name,
              x,
              centerY,
              rowSize - scaledX(12),
              rowSize - scaledY(12)
            );
            pop();
            if (tierUpgrades[powderIndex]) {
              fill(MENU_THEME.success);
              textSize(scaledFont(7));
              text(`x${getPowderMultiplier(powderIndex)}`, x, centerY + rowSize / 2 - scaledY(8));
            }
            addButton(
              {
                action: 'selectPowder',
                index: powderIndex,
                x,
                y: centerY,
                w: rowSize,
                h: rowSize
              },
              { scrollAware: true }
            );
          }
          currentTop += rowSize + spacingY;
          totalHeight += rowSize + spacingY;
        }
        if (rows > 0) {
          totalHeight -= spacingY;
        }
        textSize(scaledFont(14));
        return y + Math.max(0, totalHeight);
      }

      function drawAutoDropperRow(y: number): number {
        let indices = getUnlockedIndices();
        if (indices.length === 0) return y;
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(
          scaledX(140),
          Math.max(scaledX(90), maxWidth / Math.max(1, indices.length) - scaledX(14))
        );
        let btnH = scaledY(30);
        let xs = getRowPositions(indices.length);
        textSize(scaledFont(11));
        for (let idx = 0; idx < indices.length; idx++) {
          let i = indices[idx]!;
          let x = xs[idx]!;
          let cost = getDropperCost(i);
          let canBuy = dust >= cost;
          const dropperLevel = autoDroppers[i] ?? 0;
          const powderName = powderTypes[i]?.name ?? 'Unknown';
          drawNeonButton(x, y, btnW, btnH, {
            active: dropperLevel > 0,
            enabled: canBuy || dropperLevel > 0,
            accentColor: MENU_THEME.accent,
            baseColor: MENU_THEME.buttonBase,
            radius: 10
          });
          fill(dropperLevel > 0 ? MENU_THEME.invertedText : MENU_THEME.text);
          text(
            `Auto ${powderName}: ${dropperLevel} (\u2212${cost})`,
            x,
            y
          );
          addButton(
            {
              action: 'buyDropper',
              index: i,
              x,
              y,
              w: btnW,
              h: btnH
            },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + scaledY(34);
      }

      function drawUpgradeRows(y: number): number {
        let areaWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let columns = Math.max(
          1,
          Math.min(
            3,
            Math.floor(areaWidth / Math.max(120, scaledX(125))),
            upgradeConfigs.length
          )
        );
        let btnW = Math.min(
          scaledX(120),
          Math.max(scaledX(80), areaWidth / Math.max(1, columns) - scaledX(12))
        );
        let btnH = scaledY(34);
        let rows = Math.ceil(upgradeConfigs.length / columns);
        textSize(scaledFont(10));
        for (let r = 0; r < rows; r++) {
          let start = r * columns;
          let end = Math.min(start + columns, upgradeConfigs.length);
          let count = end - start;
          let xs = getRowPositions(count);
          for (let c = 0; c < count; c++) {
          let config = upgradeConfigs[start + c]!;
          let level = getUpgradeLevel(config.key);
            let cost = getUpgradeCost(config);
            let canBuy = dust >= cost;
            let x = xs[c]!;
            let rowY = y + scaledY(r * 36);
            drawNeonButton(x, rowY, btnW, btnH, {
              active: level > 0,
              enabled: canBuy,
              accentColor: MENU_THEME.accent,
              baseColor: MENU_THEME.buttonBase,
              radius: 12
            });
            fill(level > 0 ? MENU_THEME.invertedText : MENU_THEME.text);
            text(
              `${config.name} Lv.${level} (\u2212${cost})`,
              x,
              rowY - scaledY(8)
            );
            fill(MENU_THEME.mutedText);
            text(config.description, x, rowY + scaledY(6), btnW - scaledX(10), scaledY(14));
            addButton(
              {
                action: 'buyUpgrade',
                key: config.key,
                x,
                y: rowY,
                w: btnW,
                h: btnH
              },
              { scrollAware: true }
            );
          }
        }
        textSize(scaledFont(14));
        return y + scaledY(rows * 36);
      }

      function drawSpecificUpgradeRow(keys: string[], y: number): number {
        let configs = upgradeConfigs.filter((config) => keys.includes(config.key));
        if (configs.length === 0) {
          return y;
        }
        let areaWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(
          scaledX(120),
          Math.max(scaledX(80), areaWidth / Math.max(1, configs.length) - scaledX(14))
        );
        let btnH = scaledY(30);
        let xs = getRowPositions(configs.length);
        textSize(scaledFont(10));
        for (let i = 0; i < configs.length; i++) {
          let config = configs[i]!;
          let level = getUpgradeLevel(config.key);
          let cost = getUpgradeCost(config);
          let canBuy = dust >= cost;
          let x = xs[i]!;
          drawNeonButton(x, y, btnW, btnH, {
            active: level > 0,
            enabled: canBuy,
            accentColor: MENU_THEME.accent,
            baseColor: MENU_THEME.buttonBase,
            radius: 12
          });
          fill(level > 0 ? MENU_THEME.invertedText : MENU_THEME.text);
          text(`${config.name} Lv.${level} (\u2212${cost})`, x, y - scaledY(8));
          fill(MENU_THEME.mutedText);
          text(config.description, x, y + scaledY(6));
          addButton(
            {
              action: 'buyUpgrade',
              key: config.key,
              x,
              y,
              w: btnW,
              h: btnH
            },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + btnH + scaledY(12);
      }

      function drawModuleUpgradeList(moduleKey: MachineModuleKey, y: number): number {
        let configs = upgradeConfigs.filter((config) => config.module === moduleKey);
        if (configs.length === 0) {
          return y;
        }
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let columns = configs.length >= 3 ? 3 : Math.min(2, configs.length);
        let btnW = Math.min(
          scaledX(150),
          Math.max(scaledX(110), maxWidth / Math.max(1, columns) - scaledX(16))
        );
        let btnH = scaledY(48);
        let rowSpacing = scaledY(12);
        let rows = Math.ceil(configs.length / columns);
        for (let r = 0; r < rows; r++) {
          let rowConfigs = configs.slice(r * columns, r * columns + columns);
          let xs = getRowPositions(rowConfigs.length);
          for (let i = 0; i < rowConfigs.length; i++) {
            let config = rowConfigs[i]!;
            let level = getUpgradeLevel(config.key);
            let cost = getUpgradeCost(config);
            let canBuy = dust >= cost;
            let rowY = y + r * (btnH + rowSpacing);
            let x = xs[i]!;
            drawNeonButton(x, rowY, btnW, btnH, {
              active: level > 0,
              enabled: canBuy,
              accentColor: MENU_THEME.accent,
              baseColor: MENU_THEME.buttonBase,
              radius: 14
            });
            fill(level > 0 ? MENU_THEME.invertedText : MENU_THEME.text);
            textSize(scaledFont(11));
            text(`${config.name} Lv.${level}`, x, rowY - scaledY(16));
            textSize(scaledFont(10));
            fill(MENU_THEME.mutedText);
            text(`Cost: ${cost} dust`, x, rowY - scaledY(2));
            textSize(scaledFont(9));
            fill(MENU_THEME.mutedText);
            text(config.description, x, rowY + scaledY(14));
            addButton(
              {
                action: 'buyUpgrade',
                key: config.key,
                x,
                y: rowY,
                w: btnW,
                h: btnH
              },
              { scrollAware: true }
            );
          }
        }
        textSize(scaledFont(14));
        let totalHeight = rows > 0 ? rows * (btnH + rowSpacing) - rowSpacing : 0;
        return y + Math.max(0, totalHeight);
      }

      function drawCompressionRow(y: number): number {
        if (getUpgradeLevel('compressor') <= 0) {
          textSize(scaledFont(11));
          fill(MENU_THEME.mutedText);
          text(
            'Purchase the Powder Compressor to unlock conversion recipes.',
            menuContentArea.center || SCREEN_W / 2,
            y
          );
          textSize(scaledFont(14));
          return y + scaledY(34);
        }

        let availableRecipes = compressionRecipes.filter(
          (recipe) => recipe.from >= 2 && (recipe.to === 0 ? true : tierUpgrades[recipe.to - 1]),
        );
        if (availableRecipes.length === 0) {
          return y;
        }
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(
          scaledX(140),
          Math.max(scaledX(100), maxWidth / Math.max(1, availableRecipes.length) - scaledX(14))
        );
        let btnH = scaledY(24);
        let xs = getRowPositions(availableRecipes.length);
        textSize(scaledFont(11));
        let efficiency = getCompressorEfficiency();
        for (let i = 0; i < availableRecipes.length; i++) {
          let recipe = availableRecipes[i]!;
          let cost = calculateCompressionCost(recipe, efficiency);
          let x = xs[i]!;
          let canConvert = ensureInventory(recipe.from).length >= cost;
          drawNeonButton(x, y, btnW, btnH, {
            active: false,
            enabled: canConvert,
            accentColor: MENU_THEME.accent,
            baseColor: MENU_THEME.buttonBase,
            radius: 8
          });
          fill(canConvert ? MENU_THEME.invertedText : MENU_THEME.mutedText);
          text(
            `${powderTypes[recipe.from]?.name ?? 'Unknown'} → ${
              powderTypes[recipe.to]?.name ?? 'Unknown'
            } (\u2212${cost} +${recipe.output})`,
            x,
            y
          );
          addButton(
            { action: 'compress', recipe, x, y, w: btnW, h: btnH },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + btnH + scaledY(10);
      }

      function drawPrestigeRow(y: number): number {
        let areaWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(scaledX(200), areaWidth);
        let btnH = scaledY(32);
        let gain = getPrestigeGain();
        let canPrestige = gain > 0;
        let center = menuContentArea.center || SCREEN_W / 2;
        drawNeonButton(center, y, btnW, btnH, {
          active: canPrestige,
          enabled: canPrestige,
          accentColor: MENU_THEME.accent,
          baseColor: MENU_THEME.buttonBase,
          radius: 10
        });
        fill(canPrestige ? MENU_THEME.invertedText : MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text(`Crystallize (+${gain} cores)`, center, y - scaledY(6));
        text(
          'Resets for permanent dust & gravity boosts.',
          center,
          y + scaledY(6)
        );
        textSize(scaledFont(14));
        addButton(
          { action: 'prestige', x: center, y, w: btnW, h: btnH },
          { scrollAware: true }
        );
        return y + btnH + scaledY(12);
      }

      function drawConveyorNotes(y: number): number {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text('Conveyors catch every grain slipping through the intake.', center, y);
        text(`Every ${CHAIN_REQUIREMENT} grains bundle into a single package square.`, center, y + scaledY(16));
        text('Click the module to jolt the belt and draw faster.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawRocketStatus(y: number): number {
        let state = moduleStates.rocket;
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        if (!state || !state.pods) {
          text('Launch pads are still assembling crews.', center, y);
          textSize(scaledFont(14));
          return y + scaledY(20);
        }
        let ready = state.pods.filter((pod) => pod.progress >= 1 && pod.launch === 0).length;
        text(`Pads fueled: ${ready}/${state.pods.length}`, center, y);
        text(`Packages on hand: ${powderCounts[1] || 0}`, center, y + scaledY(16));
        text(
          `Launch success chance: ${Math.round(getRocketSuccessRate() * 100)}%`,
          center,
          y + scaledY(32)
        );
        text(
          `Tap the bay to hasten the ${CHAIN_REQUIREMENT}-to-1 fueling cycle.`,
          center,
          y + scaledY(48)
        );
        textSize(scaledFont(14));
        return y + scaledY(64);
      }

      function drawAsteroidStatus(y: number): number {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text(`Launches awaiting compression: ${powderCounts[2] || 0}`, center, y);
        text(`Asteroids in storage: ${powderCounts[3] || 0}`, center, y + scaledY(16));
        text('Strike the crucible to rattle loose extra rubble.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawPlanetStatus(y: number): number {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text(`Asteroids swirling: ${powderCounts[3] || 0}`, center, y);
        text(`Planets formed: ${powderCounts[4] || 0}`, center, y + scaledY(16));
        text('Stabilize orbits by tapping the module rhythmically.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawSingularityStats(y: number): number {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(MENU_THEME.mutedText);
        textSize(scaledFont(11));
        text(`Universes awaiting collapse: ${powderCounts[7] || 0}`, center, y);
        text(`Singularities forged: ${powderCounts[8] || 0}`, center, y + scaledY(16));
        text(`Crystallized cores: ${crystalCores}`, center, y + scaledY(32));
        let coreBoost = Math.round(milestoneBonuses.core * getMilestoneBonusScale() * 100);
        if (coreBoost > 0) {
          text(`Codex bonus: +${coreBoost}% core yield`, center, y + scaledY(48));
        } else {
          text('Strike the crucible to channel fresh cores.', center, y + scaledY(48));
        }
        textSize(scaledFont(14));
        return y + scaledY(62);
      }

      function addButton(
        btn: UiButton,
        options: { scrollAware?: boolean } = {}
      ): void {
        let entry: UiButton = { ...btn };
        if (options.scrollAware) {
          let offset = menuContentArea && menuContentArea.scrollOffset
            ? menuContentArea.scrollOffset
            : 0;
          entry.y = entry.y - offset;
        }
        buttons.push(entry);
      }

      function mousePressed() {
        if (!gameInitialized) {
          return;
        }
        activeButton = null;
        menuDragState.dragging = false;
        if (mouseX <= MENU_W) {
          menuDragState.active = true;
          menuDragState.startY = mouseY;
          menuDragState.startScroll = menuScroll;
        } else {
          menuDragState.active = false;
        }
        for (let btn of buttons) {
          if (
            mouseX > btn.x - btn.w / 2 &&
            mouseX < btn.x + btn.w / 2 &&
            mouseY > btn.y - btn.h / 2 &&
            mouseY < btn.y + btn.h / 2
          ) {
            activeButton = btn;
            break;
          }
        }
        if (!activeButton && pointerIsInWorld(mouseX, MENU_W)) {
          const dropped = stageWorld.handlePointer(mouseX, mouseY, 'mouse');
          if (dropped) {
            grantManualDropDustReward();
          }
        }
      }

      function mouseWheel(event: WheelEvent): false | void {
        if (!gameInitialized) {
          return;
        }
        if (mouseX <= MENU_W) {
          let delta = event.deltaY || 0;
          menuScroll = constrain(
            menuScroll + delta * 0.6,
            0,
            menuScrollMax
          );
          menuDragState.active = false;
          menuDragState.dragging = false;
          return false;
        }
      }

      function mouseDragged() {
        if (!gameInitialized || !menuDragState.active) {
          return;
        }
        let delta = mouseY - menuDragState.startY;
        if (!menuDragState.dragging && Math.abs(delta) > 4) {
          menuDragState.dragging = true;
          activeButton = null;
        }
        if (menuDragState.dragging) {
          menuScroll = constrain(
            menuDragState.startScroll - delta,
            0,
            menuScrollMax
          );
          return false;
        }
      }

      function mouseReleased() {
        if (!gameInitialized) {
          return;
        }
        if (menuDragState.dragging) {
          menuDragState.active = false;
          menuDragState.dragging = false;
          return;
        }
        if (activeButton) {
          if (
            mouseX > activeButton.x - activeButton.w / 2 &&
            mouseX < activeButton.x + activeButton.w / 2 &&
            mouseY > activeButton.y - activeButton.h / 2 &&
            mouseY < activeButton.y + activeButton.h / 2
          ) {
            handleAction(activeButton);
          }
          activeButton = null;
        }
        menuDragState.active = false;
        menuDragState.dragging = false;
      }

      function touchMoved(_event: TouchEvent): false | void {
        if (mouseDragged() === false) {
          return false;
        }
      }

      function touchEnded() {
        mouseReleased();
      }

      function handleAction(btn: UiButton): void {
        switch (btn.action) {
          case 'selectPowder':
            selectedPowder = btn.index;
            break;
          case 'buyDropper':
            buyDropper(btn.index);
            break;
          case 'buyUpgrade':
            buyUpgrade(btn.key);
            break;
          case 'buyResearch':
            buyResearch(btn.key);
            break;
          case 'compress':
            compressPowder(btn.recipe);
            break;
          case 'prestige':
            performPrestige();
            break;
          case 'switchMenu':
            if (isMenuTabUnlocked(btn.key)) {
              activeMenu = btn.key;
              menuScroll = 0;
              menuScrollMax = 0;
            }
            break;
          case 'toggleAutomation':
            toggleAutomation(btn.key);
            break;
          case 'moduleInteract':
            selectedModule = btn.key;
            if (isMenuTabUnlocked('module')) {
              activeMenu = 'module';
              menuScroll = 0;
              menuScrollMax = 0;
            }
            if (isMachineUnlocked(btn.key)) {
              handleModuleInteraction(btn.key);
            }
            break;
          case 'focusModule':
            selectedModule = btn.key;
            if (isMenuTabUnlocked('module')) {
              activeMenu = 'module';
              menuScroll = 0;
              menuScrollMax = 0;
            }
            break;
          case 'unlockModule':
            selectedModule = btn.key;
            unlockTier(btn.index);
            break;
        }
      }

      function handleModuleInteraction(key: MachineModuleKey): void {
        switch (key) {
          case 'conveyor':
            rushConveyor();
            break;
          case 'rocket':
            boostRockets();
            break;
          case 'asteroid':
            crackAsteroidCrucible();
            break;
          case 'planet':
            tunePlanetarium();
            break;
          case 'forge':
            hammerForge();
            break;
          case 'galaxy':
            swirlGalaxy();
            break;
          case 'universe':
            syncUniverse();
            break;
          case 'singularity':
            focusSingularity();
            break;
        }
      }

      function rushConveyor() {
        let state = moduleStates.conveyor;
        if (!state || !isMachineUnlocked('conveyor')) return;
        state.spawnTimer = Math.min(state.spawnTimer || 0, 0.05);
        for (let faller of state.fallers) {
          faller.vy = (faller.vy || 0) + 0.6;
          updatePowderParticle(faller, { vy: faller.vy });
        }
        state.packageProgress = Math.min(1, (state.packageProgress || 0) + 0.18);
      }

      function boostRockets() {
        let state = moduleStates.rocket;
        if (!state || !state.pods) return;
        state.packageQueue = state.packageQueue || [];
        for (let pod of state.pods) {
          if (pod.launch > 0) continue;
          if (!pod.fueling && state.packageQueue.length > 0) {
            let nextPackage = state.packageQueue.shift();
            let consumed = nextPackage ? consumeEntity(1, nextPackage) : null;
            if (consumed) {
              pod.fueling = true;
              pod.progress = 0;
              pod.package = consumed;
            }
          }
          if (pod.fueling) {
            pod.progress = Math.min(1, pod.progress + 0.35);
          }
        }
      }

      function crackAsteroidCrucible() {
        let state = moduleStates.asteroid;
        if (!state) return;
        state.progress = Math.min(1, (state.progress || 0) + 0.35);
        if (state.fragments) {
          state.fragments.push({
            life: 1,
            angle: Math.random() * TAU,
            drift: random(0.6, 1.4),
            radius: random(0.16, 0.32)
          });
        }
      }

      function tunePlanetarium() {
        let state = moduleStates.planet;
        if (!state) return;
        state.progress = Math.min(1, (state.progress || 0) + 0.32);
        state.spin = (state.spin || 0) + 0.4;
        if (state.orbiters) {
          state.orbiters.push({
            life: 0.8,
            angle: Math.random() * TAU,
            radius: random(0.18, 0.3),
            speed: random(0.8, 1.4)
          });
        }
      }

      function hammerForge() {
        let state = moduleStates.forge;
        if (!state) return;
        state.progress = Math.min(1, state.progress + 0.5);
        if (state.pulses) {
          state.pulses.push({ life: 1, angle: Math.random() * TAU });
        }
      }

      function swirlGalaxy() {
        let state = moduleStates.galaxy;
        if (!state) return;
        state.progress = Math.min(1, state.progress + 0.45);
        state.angle += 0.4;
      }

      function syncUniverse() {
        let state = moduleStates.universe;
        if (!state) return;
        state.progress = Math.min(1, state.progress + 0.35);
        state.angle += 0.3;
      }

      function focusSingularity() {
        let state = moduleStates.singularity;
        if (!state) return;
        state.progress = Math.min(1, state.progress + 0.3);
        state.shards.push({ life: 1, angle: Math.random() * TAU });
      }

      function dropPowder(type: number, spawnX?: number): boolean {
        if (!(type === 0 || tierUpgrades[type - 1])) {
          return false;
        }
        if (type === 0) {
          const localX = spawnX === undefined
            ? 24
            : constrain((spawnX - MENU_W) / Math.max(1, PLAY_AREA_W) * 48, 3, 44);
          return stageWorld.cast(localX).length > 0;
        }
        if (gridRows <= 0 || gridCols <= 0) {
          refreshPowderGrid();
        }
        if (jarRect.width <= 0 || jarRect.height <= 0) {
          updateCollageLayout();
          refreshPowderGrid(true);
        }
        let size = getPowderSizeByType(type);
        if (gridCols < size || gridRows < size) {
          return false;
        }
        let halfWidth = (size * cellPixelSize) / 2;
        let jarLeft = jarRect.left;
        let jarRight = jarRect.left + jarRect.width;
        let centerX;
        if (spawnX === undefined) {
          let mean = jarLeft + jarRect.width / 2;
          let stdDev = jarRect.width / 6;
          let attempts = 0;
          do {
            centerX = sampleGaussian(mean, stdDev);
            attempts++;
          } while (
            (centerX < jarLeft + halfWidth || centerX > jarRight - halfWidth) &&
            attempts < 8
          );
          centerX = constrain(centerX, jarLeft + halfWidth, jarRight - halfWidth);
        } else {
          centerX = constrain(spawnX, jarLeft + halfWidth, jarRight - halfWidth);
        }
        let centerCol = (centerX - jarLeft) / cellPixelSize;
        let col = Math.round(centerCol - size / 2);
        col = Math.max(0, Math.min(gridCols - size, col));
        col = clampColumnToFunnel(col, 0, size);
        if (!canOccupy(0, col, size)) {
          return false;
        }
        let powderEntity = createBaseEntity(type, {
          origin: 'jar',
          metadata: {
            size,
            jarCol: col,
            jarRow: 0,
            spawnRatio: gridCols > 0 ? constrain((col + size / 2) / gridCols, 0, 1) : 0.5
          }
        });
        let powder = {
          col,
          row: 0,
          type: type,
          fallProgress: 0,
          collected: false,
          settled: false,
          entities: [powderEntity]
        };
        powders.push(powder);
        occupyPowderCells(powder);
        return true;
      }

      function grantManualDropDustReward() {
        let bonus = Math.max(1, Math.ceil(duneDustMultiplier));
        dust += bonus;
        totalDustEarned += bonus;
      }

      function unlockTier(index: number): void {
        if (tierUpgrades[index]) return;
        if (index === 0) {
          if (stageWorld.controller.unlocked.has('compression-crucible')) tierUpgrades[index] = true;
          return;
        }
        let cost = tierUnlockCosts[index] ?? Infinity;
        const count = powderCounts[index] ?? 0;
        if (count >= cost) {
          powderCounts[index] = count - cost;
          tierUpgrades[index] = true;
          let moduleKey = MODULE_UNLOCK_ORDER[index];
          if (moduleKey) {
            beginModuleReveal(moduleKey);
          }
        }
      }

      function autoUnlockAvailableModules() {
        let maxIterations = tierUpgrades.length;
        let attempts = 0;
        while (attempts < maxIterations) {
          let next = getNextTierToUnlock();
          if (next < 0) {
            break;
          }
          let cost = tierUnlockCosts[next] || 0;
          if ((powderCounts[next] || 0) < cost) {
            break;
          }
          unlockTier(next);
          attempts++;
        }
      }

      function getDropperCost(index: number): number {
        return calculateDropperCost(index, autoDroppers[index] ?? 0);
      }

      function buyDropper(index: number): void {
        let cost = getDropperCost(index);
        if (dust >= cost) {
          dust -= cost;
          autoDroppers[index] = (autoDroppers[index] ?? 0) + 1;
          dropperTimers[index] = 0;
        }
      }

      function getUpgradeCost(config: UpgradeConfig): number {
        let level = getUpgradeLevel(config.key);
        return calculateUpgradeCost(config, level);
      }

      function buyUpgrade(key: string): void {
        let config = upgradeConfigs.find((u) => u.key === key);
        if (!config) return;
        let cost = getUpgradeCost(config);
        if (dust >= cost) {
          dust -= cost;
          upgradesState[key] = (upgradesState[key] ?? 0) + 1;
        }
      }

      function buyResearch(key: string): void {
        let project = researchProjects.find((p) => p.key === key);
        if (!project) return;
        let level = researchState[key] ?? 0;
        let cost = Math.floor(
          project.baseCost * Math.pow(project.costMult ?? 3, level)
        );
        if (dust >= cost) {
          dust -= cost;
          researchState[key] = level + 1;
        }
      }

      function toggleAutomation(key: keyof AutomationSettings): void {
        if (!(key in automationSettings)) return;
        if (!automationUnlocks[key]) return;
        automationSettings[key] = !automationSettings[key];
        if (!automationSettings[key]) {
          if (key === 'autoDrop') {
            autoDropTimer = 0;
          }
          if (key === 'autoCompress') {
            autoCompressTimer = 0;
          }
        }
      }

      function compressPowder(recipe: CompressionRecipe): void {
        if (recipe.from < 2) {
          stageWorld.invokeRitual();
          return;
        }
        if (getUpgradeLevel('compressor') <= 0) return;
        if (!(recipe.to === 0 || tierUpgrades[recipe.to - 1])) return;
        let efficiency = getCompressorEfficiency();
        if (efficiency <= 0) return;
        let cost = calculateCompressionCost(recipe, efficiency);
        if (ensureInventory(recipe.from).length >= cost) {
          executeCompressionRecipe(recipe, cost);
        }
      }

      function getPrestigeGain() {
        return calculatePrestigeGain(totalDustEarned);
      }

      function performPrestige() {
        let gain = getPrestigeGain();
        if (gain <= 0) return;
        prestigeInProgress = true;
        try {
          crystalCores += gain;
          stageWorld.resetForPrestige();
          dust = 0;
          totalDustEarned = 0;
          totalPowderCollected = 0;
          powders = [];
          powderCounts = new Array(powderTypes.length).fill(0);
          resetInventories();
          tierUpgrades = new Array(powderTypes.length - 1).fill(false);
          autoDroppers = new Array(powderTypes.length).fill(0);
          dropperTimers = new Array(powderTypes.length).fill(0);
          upgradesState = createUpgradeState();
          researchState = researchProjects.reduce<Record<string, number>>((state, project) => {
            state[project.key] = 0;
            return state;
          }, {});
          layerStates = strataLayers.map((_, index) => ({ unlocked: index === 0, completed: false, progress: 0 }));
          selectedPowder = 0;
          automationSettings.autoDrop = false;
          automationSettings.autoCompress = false;
          automationUnlocks.autoDrop = false;
          automationUnlocks.autoCompress = false;
          autoDropTimer = 0;
          autoCompressTimer = 0;
          activeMenu = menuTabs[0]?.key ?? 'sandfall';
          fullscreenModule = null;
          selectedModule = 'jar';
          moduleStates = createDefaultModuleStates();
          resetModuleRevealStates();
          menuScroll = 0;
          menuScrollMax = 0;
          recomputeDerivedProgression();
          syncMaterialEconomyView();
          updateLayoutDimensions(true);
          refreshPowderGrid(true);
          stageWorld.save(runtimeSaveSections());
        } catch (error) {
          console.error('Powder Idle prestige reset failed before saving.', error);
          throw error;
        } finally {
          prestigeInProgress = false;
        }
      }

      function getUnlockedIndices() {
        let unlocked = [];
        for (let i = 0; i < powderTypes.length; i++) {
          if (i === 0 || tierUpgrades[i - 1]) {
            unlocked.push(i);
          }
        }
        return unlocked;
      }

      function getRowPositions(count: number): number[] {
        if (count <= 0) return [];
        let left = menuContentArea.left || scaledX(40);
        let right = menuContentArea.right || SCREEN_W - scaledX(40);
        if (count === 1) {
          return [menuContentArea.center || (left + right) / 2];
        }
        let available = Math.max(0, right - left);
        if (available <= 0) {
          return new Array(count).fill(menuContentArea.center || SCREEN_W / 2);
        }
        let step = available / (count - 1);
        let xs = [];
        for (let i = 0; i < count; i++) {
          xs.push(left + step * i);
        }
        return xs;
      }

      function withAlpha(
        hex:
          | string
          | P5.Color
          | readonly number[]
          | { 0?: string; value?: string; hex?: string },
        alpha: number
      ): P5.Color {
        if (Array.isArray(hex)) {
          let [r = 0, g = 0, b = 0] = hex;
          return color(r, g, b, alpha);
        }
        if (hex && typeof hex === 'object') {
          const legacy = hex as { 0?: string; value?: string; hex?: string };
          if (typeof legacy[0] === 'string') hex = legacy[0];
          else if (typeof legacy.value === 'string') hex = legacy.value;
          else if (typeof legacy.hex === 'string') hex = legacy.hex;
          else return color(red(hex as P5.Color), green(hex as P5.Color), blue(hex as P5.Color), alpha);
        }
        if (typeof hex !== 'string') {
          hex = '#000000';
        }
        let raw = hex.trim();
        let r = 0;
        let g = 0;
        let b = 0;
        if (raw.startsWith('#')) {
          raw = raw.slice(1);
        }
        if (raw.length === 3) {
          raw = raw
            .split('')
            .map((ch) => ch + ch)
            .join('');
        }
        if (raw.length === 6 && /^[0-9a-fA-F]+$/.test(raw)) {
          let value = parseInt(raw, 16);
          r = (value >> 16) & 255;
          g = (value >> 8) & 255;
          b = value & 255;
        } else if (/^rgba?\(/i.test(raw)) {
          let match = raw.match(/rgba?\(([^)]+)\)/i);
          if (match) {
            let parts = match[1]!
              .split(',')
              .map((part) => parseFloat(part.trim()))
              .filter((n) => !Number.isNaN(n));
            if (parts.length >= 3) {
              r = parts[0] ?? 0;
              g = parts[1] ?? 0;
              b = parts[2] ?? 0;
            }
          }
        }
        return color(r, g, b, alpha);
      }

      function getLayerDustBonus() {
        return layerStates.reduce((bonus, state, index) => {
          if (!state.unlocked) return bonus;
          const layer = strataLayers[index];
          if (!layer) return bonus;
          let ratio = state.completed
            ? 1
            : constrain(state.progress / layer.requirement, 0, 1);
          return bonus + layer.dustBonus * ratio;
        }, 0);
      }

      function getLayerGravityBonus() {
        return layerStates.reduce((bonus, state, index) => {
          if (!state.unlocked) return bonus;
          const layer = strataLayers[index];
          if (!layer) return bonus;
          let ratio = state.completed
            ? 1
            : constrain(state.progress / layer.requirement, 0, 1);
          return bonus + layer.gravityBonus * ratio;
        }, 0);
      }

      function addLayerProgress(amount: number): void {
        applyLayerProgress(
          layerStates,
          strataLayers,
          amount,
          getUpgradeLevel('lanterns')
        );
      }

      function scaledFont(value: number): number {
        let scale = Math.min(layoutScaleX, layoutScaleY);
        return constrain(Math.round(value * scale), 10, 28);
      }

      function scaledX(value: number): number {
        return value * layoutScaleX;
      }

      function scaledY(value: number): number {
        return value * layoutScaleY;
      }

      function updateLayoutDimensions(resize = false) {
        const responsive = computeResponsiveGameLayout(windowWidth, windowHeight);
        SCREEN_W = responsive.screenWidth;
        SCREEN_H = responsive.screenHeight;
        MENU_W = responsive.menuWidth;
        PLAY_AREA_W = responsive.playWidth;
        layoutScaleX = responsive.menuScale;
        layoutScaleY = responsive.verticalScale;
        let pixelScale = Math.min(layoutScaleX, layoutScaleY);
        cellPixelSize = Math.max(1, Math.floor(BASE_CELL_PIXEL_SIZE * pixelScale));
        updateCollageLayout();
        menuScroll = constrain(menuScroll, 0, menuScrollMax);
        if (resize && canvas) {
          resizeCanvas(SCREEN_W, SCREEN_H);
        }
      }

      function keyPressed() {
        if (!gameInitialized) {
          return;
        }
        if (key === ' ' || keyCode === 32) {
          dropPowder(selectedPowder);
        }
        if (key === 'e' || key === 'E') {
          if (selectedPowder === 0) stageWorld.cast(24, 8);
          else for (let i = 0; i < 8; i++) dropPowder(selectedPowder);
        }
        if (key === 'c' || key === 'C') {
          stageWorld.invokeRitual();
        }
        const localDebug = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') && new URLSearchParams(location.search).has('debugStages');
        if (localDebug && (key === 'u' || key === 'U')) {
          const condition = stageWorld.controller.compression.definition.unlockCondition;
          if (condition.kind === 'lifetime-material') {
            const remaining = Math.max(0, condition.count - stageWorld.controller.sandfall.state.lifetimeCreated);
            stageWorld.controller.sandfall.cast(remaining, 24);
          }
        }
        if (localDebug && (key === 'd' || key === 'D')) dust += 100;
        if (localDebug && (key === 'b' || key === 'B')) {
          stageWorld.controller.sandfall.cast(stageWorld.controller.compression.recipeCount, 24);
        }
        if (localDebug && (key === 'p' || key === 'P')) {
          totalDustEarned = Math.max(totalDustEarned, 200);
          performPrestige();
        }
      }

      function syncStageUpgradeHooks(): void {
        stageWorld.controller.upgradeLevels.gravity = getUpgradeLevel('gravity');
        stageWorld.controller.upgradeLevels['manual-cast-count'] = Math.floor(getUpgradeLevel('refinery') / 2);
        stageWorld.controller.upgradeLevels['cast-cooldown'] = Math.min(7, getUpgradeLevel('gravity'));
        stageWorld.controller.upgradeLevels['ritual-speed'] = getUpgradeLevel('compressor');
        stageWorld.controller.upgradeLevels['reservoir-capacity'] = getUpgradeLevel('compressor');
        stageWorld.controller.upgradeLevels['release-speed'] = getUpgradeLevel('compressor');
        stageWorld.controller.upgradeLevels['output-throughput'] = getUpgradeLevel('harmonics');
        stageWorld.controller.upgradeLevels['auto-cast'] =
          (automationSettings.autoDrop && automationUnlocks.autoDrop) || (autoDroppers[0] ?? 0) > 0 ? 1 : 0;
        stageWorld.controller.upgradeLevels['auto-ritual'] =
          automationSettings.autoCompress && automationUnlocks.autoCompress ? 1 : 0;
      }

      function saveIntegratedGame(): void {
        if (prestigeInProgress) return;
        stageWorld.save(runtimeSaveSections());
      }

      function syncMaterialEconomyView(): void {
        const economy = stageWorld.controller.economyView();
        powderCounts[0] = economy.displayedByMaterial.sand;
        powderCounts[1] = economy.displayedByMaterial.stone;
        tierInventories[0] = [];
        tierInventories[1] = [];
      }

      function saveValidationContext(): SaveValidationContext {
        return {
          powderCount: powderTypes.length,
          layerCount: strataLayers.length,
          milestoneCount: milestoneConfigs.length,
          upgradeKeys: new Set(upgradeConfigs.map((entry) => entry.key)),
          researchKeys: new Set(researchProjects.map((entry) => entry.key))
        };
      }

      function runtimeSaveSections(): RuntimeSaveSections {
        syncMaterialEconomyView();
        return {
          economy: {
            dust,
            totalDustEarned,
            crystalCores,
            totalPowderCollected,
            selectedMaterial: selectedPowder,
            tierUnlocks: [...tierUpgrades],
            autoDroppers: [...autoDroppers],
            dropperTimers: dropperTimers.map(value => Math.max(0, value)),
            powderCounts: [...powderCounts],
            legacyInventories: tierInventories.map((inventory, index) => index < 2 ? [] : structuredClone(inventory))
          },
          progression: {
            upgrades: { ...upgradesState },
            research: { ...researchState },
            layers: layerStates.map(state => ({ ...state })),
            milestones: milestoneStates.map(state => ({ ...state }))
          },
          automation: {
            settings: { ...automationSettings },
            unlocks: { ...automationUnlocks },
            autoDropTimer: Math.max(0, autoDropTimer),
            autoCompressTimer: Math.max(0, autoCompressTimer)
          },
          interface: {
            activeMenu,
            codexUnlocked,
            selectedModule
          }
        };
      }

      function restoreIntegratedGame(save: PowderIdleSaveV3): void {
        const economy = save.economy;
        dust = economy.dust;
        totalDustEarned = economy.totalDustEarned;
        crystalCores = economy.crystalCores;
        totalPowderCollected = economy.totalPowderCollected;
        selectedPowder = economy.selectedMaterial;
        tierUpgrades = [...economy.tierUnlocks];
        autoDroppers = [...economy.autoDroppers];
        dropperTimers = [...economy.dropperTimers];
        powderCounts = [...economy.powderCounts];
        tierInventories = economy.legacyInventories.map((inventory, index) => index < 2 ? [] : structuredClone(inventory));
        upgradesState = createUpgradeState(save.progression.upgrades);
        researchState = { ...researchState, ...save.progression.research };
        layerStates = save.progression.layers.map(state => ({ ...state }));
        milestoneStates = save.progression.milestones.map(state => ({ ...state }));
        automationSettings = { ...save.automation.settings };
        automationUnlocks = { ...save.automation.unlocks };
        autoDropTimer = save.automation.autoDropTimer;
        autoCompressTimer = save.automation.autoCompressTimer;
        activeMenu = menuTabs.some(tab => tab.key === save.interface.activeMenu)
          ? save.interface.activeMenu
          : (menuTabs[0]?.key ?? 'sandfall');
        codexUnlocked = save.interface.codexUnlocked;
        selectedModule = isModuleKey(save.interface.selectedModule) ? save.interface.selectedModule : 'jar';
        recomputeDerivedProgression();
        syncMaterialEconomyView();
      }

      function isModuleKey(value: string | null): value is ModuleKey {
        return value !== null && ['jar', 'conveyor', 'rocket', 'asteroid', 'planet', 'forge', 'galaxy', 'universe', 'singularity', 'inventory'].includes(value);
      }

      function recomputeDerivedProgression(): void {
        milestoneBonuses = { gravity: 0, dust: 0, automation: 0, core: 0 };
        codexUnlocked = false;
        for (let index = 0; index < milestoneStates.length; index++) {
          const state = milestoneStates[index], config = milestoneConfigs[index];
          if (!state?.achieved || !config) continue;
          state.applied = true;
          switch (config.type) {
            case 'unlockAutoDrop': automationUnlocks.autoDrop = true; break;
            case 'unlockAutoCompress': automationUnlocks.autoCompress = true; break;
            case 'gravityBonus': milestoneBonuses.gravity += config.magnitude || 0; break;
            case 'dustBonus': milestoneBonuses.dust += config.magnitude || 0; break;
            case 'codexUnlock': codexUnlocked = true; milestoneBonuses.automation += config.magnitude || 0; break;
            case 'coreBonus': milestoneBonuses.core += config.magnitude || 0; break;
          }
        }
        milestoneMessage = null;
        milestoneMessageTimer = 0;
      }

      function touchStarted(): false | void {
        if (gameInitialized && pointerIsInWorld(mouseX, MENU_W) && stageWorld.handlePointer(mouseX, mouseY, 'touch')) {
          grantManualDropDustReward();
          return false;
        }
      }

export interface PowderIdleDebugApi {
  isInitialized(): boolean;
  dropSelected(): boolean;
  snapshot(): {
    dust: number;
    powderCount: number;
    activePowders: number;
    canvasWidth: number;
    canvasHeight: number;
    fallbackUsed: boolean;
    stageUnlocked: string[];
    activeSand: number;
    queuedTransfers: number;
    reservoirSand: number;
    ritualSand: number;
    outputStones: number;
  };
}

declare global {
  interface Window {
    __powderIdleDebug?: PowderIdleDebugApi;
  }
}

export function installPowderIdle(): void {
  Object.assign(window, {
    preload,
    setup,
    draw,
    windowResized,
    mousePressed,
    mouseReleased,
    mouseDragged,
    mouseWheel,
    touchMoved,
    touchStarted,
    touchEnded,
    keyPressed
  });

  window.__powderIdleDebug = {
    isInitialized: () => gameInitialized,
    dropSelected: () => dropPowder(selectedPowder),
    snapshot: () => ({
      dust,
      powderCount: powderCounts[selectedPowder] ?? 0,
      activePowders: powders.length,
      canvasWidth: SCREEN_W,
      canvasHeight: SCREEN_H,
      fallbackUsed,
      stageUnlocked: [...stageWorld.controller.unlocked],
      activeSand: stageWorld.controller.sandfall.state.activeIds.length,
      queuedTransfers: stageWorld.controller.transfers.length,
      reservoirSand: stageWorld.controller.compression.state.reservoirIds.length,
      ritualSand: stageWorld.controller.compression.state.batch?.motes.length ?? 0,
      outputStones: stageWorld.controller.compression.state.outputIds.length
    })
  };
}
