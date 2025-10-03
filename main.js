// Game constants
      const BASE_SCREEN_W = 360;
      const BASE_SCREEN_H = 640;
      let SCREEN_W = BASE_SCREEN_W;
      let SCREEN_H = BASE_SCREEN_H;
      let MENU_W = Math.round(SCREEN_W * 0.34);
      let PLAY_AREA_W = SCREEN_W - MENU_W;
      let cellPixelSize = 6;
      let layoutScaleX = 1;
      let layoutScaleY = 1;
      let canvas;
      const BASE_FALL_SPEED = 2;
      const BASE_DROPPER_INTERVAL = 2000; // ms
      const AUTO_DROP_INTERVAL = 1200;
      const AUTO_COMPRESS_INTERVAL = 1800;
      const CHAIN_REQUIREMENT = 100;

      let powderTypes = [];
      let machineDefinitions = [];
      let machineConnections = [];
      let menuTabs = [];
      let tierUnlockCosts = [];
      let compressionRecipes = [];
      let upgradeConfigs = [];
      let researchProjects = [];
      let strataLayers = [];
      let milestoneConfigs = [];
      let MAX_POWDER_SIZE = 1;

      let powders = []; // {col, row, type, fallProgress, collected}
      let powderCounts = [];
      let selectedPowder = 0;
      let tierUpgrades = [];
      let autoDroppers = [];
      let dropperTimers = [];
      let dust = 0;
      let totalDustEarned = 0;
      let crystalCores = 0;
      let totalPowderCollected = 0;
      let upgradesState = {};
      let activeMenu = 'jar';
      let layerStates = [];
      let researchState = {};
      let automationSettings = {
        autoDrop: false,
        autoCompress: false
      };
      let automationUnlocks = {
        autoDrop: false,
        autoCompress: false
      };
      let autoDropTimer = 0;
      let autoCompressTimer = 0;
      let milestoneStates = [];
      let milestoneBonuses = {
        gravity: 0,
        dust: 0,
        automation: 0,
        core: 0
      };
      let milestoneMessage = null;
      let milestoneMessageTimer = 0;
      let codexUnlocked = false;
      let buttons = [];
      let menuScroll = 0;
      let menuScrollMax = 0;
      let fullscreenModule = null;
      let jarVisible = true;
      let selectedModule = null;
      let duneHeightUnits = 0;
      let duneDustMultiplier = 1;
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
      const FALLBACK_DATA = {
        powders: {
          types: [
            { key: 'grain', name: 'Grains', color: '#e7c97a', size: 1 },
            { key: 'package', name: 'Packages', color: '#f2b066', size: 2 },
            { key: 'launch', name: 'Launches', color: '#4ade80', size: 3 },
            { key: 'asteroid', name: 'Asteroids', color: '#94a3b8', size: 4 },
            { key: 'planet', name: 'Planets', color: '#38bdf8', size: 5 },
            { key: 'star', name: 'Stars', color: '#fde68a', size: 6 },
            { key: 'galaxy', name: 'Galaxies', color: '#c084fc', size: 7 },
            { key: 'universe', name: 'Universes', color: '#22d3ee', size: 8 },
            { key: 'singularity', name: 'Singularities', color: '#f8fafc', size: 9 }
          ],
          tierUnlockCosts: [10, 60, 260, 1100, 4600, 19000, 78000, 320000],
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
            { key: 'jar', label: 'Sandfall', machine: 'jar' },
            { key: 'conveyor', label: 'Conveyor', machine: 'conveyor' },
            { key: 'rocket', label: 'Launch Bay', machine: 'rocket' },
            { key: 'asteroid', label: 'Asteroids', machine: 'asteroid' },
            { key: 'planet', label: 'Planets', machine: 'planet' },
            { key: 'forge', label: 'Star Forge', machine: 'forge' },
            { key: 'galaxy', label: 'Galaxies', machine: 'galaxy' },
            { key: 'universe', label: 'Universe', machine: 'universe' },
            { key: 'singularity', label: 'Singularity', machine: 'singularity' },
            { key: 'codex', label: 'Codex', requiresMilestone: 'chronicle' }
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
      };
      let moduleStates = createDefaultModuleStates();

      function createDefaultModuleStates() {
        return {
          conveyor: {
            fallers: [],
            modules: [],
            spawnTimer: 0,
            nextHole: 0,
            moldCooldown: 0,
            deliveryPulse: 0,
            packageProgress: 0,
            packagePulse: 0,
            autoTimer: 0
          },
          rocket: { pods: [], autoTimer: 0, explosions: [], successPulse: 0 },
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
      let grid = [];
      let gridCols = 0;
      let gridRows = 0;
      let collageLayout = {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        cellWidth: 0,
        cellHeight: 0
      };
      let jarRect = { left: 0, top: 0, width: 0, height: 0 };
      let menuContentArea = {
        left: 0,
        right: 0,
        center: 0,
        width: 0,
        top: 0,
        bottom: 0,
        scrollOffset: 0
      };
      let powdersDataRaw = null;
      let machinesDataRaw = null;
      let upgradesDataRaw = null;
      let progressionDataRaw = null;
      let milestoneLookup = {};
      let gameInitialized = false;
      let dataLoadError = null;
      let fallbackUsed = false;
      let loadingMessage = 'Preparing the atelier...';

      function cloneData(data) {
        return JSON.parse(JSON.stringify(data));
      }

      function loadJSONWithFallback(path, fallback, forceFallback = false) {
        if (forceFallback) {
          fallbackUsed = true;
          return Promise.resolve(cloneData(fallback));
        }
        return fetch(path)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            return response.json();
          })
          .catch((err) => {
            console.warn(`Falling back to embedded data for ${path}`, err);
            fallbackUsed = true;
            if (!dataLoadError) {
              dataLoadError = err;
            }
            return cloneData(fallback);
          });
      }

      function loadGameData() {
        let forceFallback = window.location && window.location.protocol === 'file:';
        loadingMessage = 'Channeling powder schematics...';
        return Promise.all([
          loadJSONWithFallback('data/powders.json', FALLBACK_DATA.powders, forceFallback),
          loadJSONWithFallback('data/machines.json', FALLBACK_DATA.machines, forceFallback),
          loadJSONWithFallback('data/upgrades.json', FALLBACK_DATA.upgrades, forceFallback),
          loadJSONWithFallback('data/progression.json', FALLBACK_DATA.progression, forceFallback)
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
              milestoneMessage = 'Running with bundled data (local JSON unavailable).';
              milestoneMessageTimer = 5600;
            }
          })
          .catch((err) => {
            console.error('Failed to initialize Powder Idle data.', err);
            dataLoadError = err;
            powdersDataRaw = cloneData(FALLBACK_DATA.powders);
            machinesDataRaw = cloneData(FALLBACK_DATA.machines);
            upgradesDataRaw = cloneData(FALLBACK_DATA.upgrades);
            progressionDataRaw = cloneData(FALLBACK_DATA.progression);
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
        let powderData = powdersDataRaw || {};
        powderTypes = (powderData.types || []).map((type) => ({
          ...type,
          dustValue: Math.pow(type.size || 1, 2)
        }));
        tierUnlockCosts = powderData.tierUnlockCosts || [];
        compressionRecipes = powderData.compressionRecipes || [];
        MAX_POWDER_SIZE = powderTypes.reduce(
          (max, type) => Math.max(max, type.size || 1),
          1
        );

        let machineData = machinesDataRaw || {};
        machineDefinitions = machineData.definitions || [];
        machineConnections = machineData.connections || [];
        menuTabs = machineData.menuTabs || [];
        if (!menuTabs.some((tab) => tab.key === 'jar')) {
          menuTabs.unshift({ key: 'jar', label: 'Sandfall', machine: 'jar' });
        }

        let upgradeData = upgradesDataRaw || {};
        upgradeConfigs = upgradeData.upgrades || [];
        researchProjects = upgradeData.research || [];
        upgradesState = createUpgradeState(upgradesState);

        let progressionData = progressionDataRaw || {};
        strataLayers = progressionData.strataLayers || [];
        milestoneConfigs = progressionData.milestones || [];
        milestoneLookup = milestoneConfigs.reduce((acc, milestone, index) => {
          acc[milestone.key] = index;
          return acc;
        }, {});
      }

      function createUpgradeState(source) {
        let state = {};
        for (let config of upgradeConfigs) {
          let value = source && typeof source[config.key] === 'number'
            ? source[config.key]
            : 0;
          state[config.key] = value;
        }
        return state;
      }

      function initializeGameState() {
        powders = [];
        powderCounts = new Array(powderTypes.length).fill(0);
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
        researchState = researchProjects.reduce((acc, project) => {
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
        activeMenu = menuTabs.length > 0 ? menuTabs[0].key : 'jar';
        codexUnlocked = false;
        selectedModule = activeMenu === 'jar' ? 'jar' : null;
        moduleStates = createDefaultModuleStates();
        menuScroll = 0;
        menuScrollMax = 0;
      }

      function getMilestoneState(key) {
        if (!(key in milestoneLookup)) {
          return null;
        }
        return milestoneStates[milestoneLookup[key]];
      }

      function getMilestoneConfig(key) {
        if (!(key in milestoneLookup)) return null;
        return milestoneConfigs[milestoneLookup[key]];
      }

      function getMilestoneForType(type) {
        return milestoneConfigs.find((milestone) => milestone.type === type);
      }

      function getMilestoneResourceValue(resource) {
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

      function applyMilestoneReward(config) {
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
          if (!state) continue;
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

      function getPowderSizeByType(type) {
        if (!powderTypes[type]) return 1;
        return powderTypes[type].size;
      }

      function getPowderSize(powder) {
        return getPowderSizeByType(powder.type);
      }

      function createEmptyGrid() {
        grid = Array.from({ length: gridRows }, () =>
          new Array(gridCols).fill(null)
        );
      }

      function occupyPowderCells(powder) {
        let size = getPowderSize(powder);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let row = powder.row + r;
            let col = powder.col + c;
            if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
              grid[row][col] = powder;
            }
          }
        }
      }

      function clearPowderCells(powder) {
        let size = getPowderSize(powder);
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let row = powder.row + r;
            let col = powder.col + c;
            if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
              if (grid[row][col] === powder) {
                grid[row][col] = null;
              }
            }
          }
        }
      }

      function canOccupy(row, col, size, ignorePowder = null) {
        if (row < 0 || col < 0) return false;
        if (row + size > gridRows || col + size > gridCols) return false;
        for (let r = 0; r < size; r++) {
          for (let c = 0; c < size; c++) {
            let occupant = grid[row + r][col + c];
            if (occupant && occupant !== ignorePowder) {
              return false;
            }
          }
        }
        return true;
      }

      function clampPowderToBounds(powder) {
        let size = getPowderSize(powder);
        if (gridCols <= 0 || gridRows <= 0) return;
        powder.col = Math.max(0, Math.min(gridCols - size, powder.col));
        powder.row = Math.max(0, Math.min(gridRows - size, powder.row));
      }

      function measureOpenDepth(powder, dir) {
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

      function getDirectionalPreference(powder) {
        let dirs = [-1, 1];
        dirs.sort((a, b) => measureOpenDepth(powder, b) - measureOpenDepth(powder, a));
        return dirs;
      }

      function sampleGaussian(mean, stdDev) {
        let u = 0;
        let v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        let mag = Math.sqrt(-2.0 * Math.log(u));
        let z = mag * Math.cos(2.0 * Math.PI * v);
        return z * stdDev + mean;
      }

      function setup() {
        updateLayoutDimensions();
        canvas = createCanvas(SCREEN_W, SCREEN_H);
        pixelDensity(1);
        rectMode(CENTER);
        textAlign(CENTER, CENTER);
        textFont('Press Start 2P');
        noStroke();
        frameRate(60);
        updateLayoutDimensions(true);
        beginGameInitialization();
      }

      function windowResized() {
        updateLayoutDimensions(true);
        if (gameInitialized) {
          refreshPowderGrid(true);
        }
      }

      function draw() {
        background('#050a16');

        buttons = [];
        jarVisible = false;

        if (!gameInitialized) {
          drawLoadingState();
          return;
        }

        drawPowderField();

        updateAutoDroppers();
        updateAutomationControllers();
        updatePowders();
        updateMilestones();
        if (jarVisible) {
          renderPowders();
          drawJarOverlay();
        }
        drawDuneMultiplierIndicator();
        drawMenu();
      }

      function drawLoadingState() {
        fill('#22d3ee');
        textSize(scaledFont(14));
        text(loadingMessage, SCREEN_W / 2, SCREEN_H / 2);
        let messageY = SCREEN_H / 2 + scaledY(24);
        if (fallbackUsed) {
          fill('#94a3b8');
          textSize(scaledFont(10));
          text('Using bundled data assets.', SCREEN_W / 2, messageY);
          messageY += scaledY(18);
        }
        if (dataLoadError) {
          fill('#fca5a5');
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
        let x = PLAY_AREA_W - scaledX(18);
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

      function drawMachinePanel(machine) {
        let rectInfo = getMachineRect(machine);
        let center = getMachineCenter(rectInfo);
        let unlocked = isMachineUnlocked(machine.key);
        let panelSize = Math.min(rectInfo.width, rectInfo.height) * 0.8;
        let panelW = panelSize;
        let panelH = panelSize;
        push();
        rectMode(CENTER);
        if (selectedModule === machine.key) {
          stroke('#facc15');
          strokeWeight(4);
          noFill();
          rect(center.x, center.y, panelW + scaledX(18), panelH + scaledY(18));
        }
        stroke(unlocked ? '#1e3a8a' : '#1e293b');
        strokeWeight(2);
        fill(unlocked ? '#0b1220' : '#040810');
        rect(center.x, center.y, panelW, panelH);
        noStroke();
        let interactButton = null;
        if (!unlocked) {
          fill(withAlpha('#020617', 220));
          rect(center.x, center.y, panelW - scaledX(8), panelH - scaledY(8));
          fill('#334155');
          textSize(scaledFont(10));
          text('Locked', center.x, center.y);
          fill('#64748b');
          textSize(scaledFont(9));
          text(machine.description, center.x, center.y + scaledY(20));
        } else {
          drawPanelPixelBackdrop(center, panelW, panelH);
          updateModuleState(machine.key, {
            center,
            panelW,
            panelH,
            rect: rectInfo
          });
          drawModuleScene(machine.key, {
            center,
            panelW,
            panelH,
            rect: rectInfo
          });
          let hint = moduleInteractionHints[machine.key];
          if (hint) {
            fill('#cbd5f5');
            textSize(scaledFont(9));
            text(hint, center.x, center.y + panelH / 2 - scaledY(22));
          }
          fill('#94a3b8');
          textSize(scaledFont(9));
          text(machine.description, center.x, center.y + panelH / 2 - scaledY(10));
          let interactW = Math.max(0, panelW - scaledX(24));
          let interactH = Math.max(0, panelH - scaledY(56));
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
        fill('#a5b4fc');
        textSize(scaledFont(11));
        text(machine.name, center.x, center.y - panelH / 2 + scaledY(14));
        pop();
        drawFullscreenToggle(rectInfo, machine.key, unlocked);
        if (interactButton) {
          addButton(interactButton);
        }
      }

      function drawModuleScene(key, context) {
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

      function drawPanelPixelBackdrop(center, panelW, panelH) {
        let left = center.x - panelW / 2 + scaledX(14);
        let right = center.x + panelW / 2 - scaledX(14);
        let top = center.y - panelH / 2 + scaledY(30);
        let bottom = center.y + panelH / 2 - scaledY(30);
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

      function updateModuleState(key, context) {
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

      function craftNextTier(state, inputIndex, outputIndex, speed, dt, dustBase, onCraft) {
        if (!state) return;
        state.progress = state.progress || 0;
        if (powderCounts[inputIndex] >= CHAIN_REQUIREMENT) {
          state.progress += dt * speed;
          while (state.progress >= 1 && powderCounts[inputIndex] >= CHAIN_REQUIREMENT) {
            state.progress -= 1;
            powderCounts[inputIndex] -= CHAIN_REQUIREMENT;
            powderCounts[outputIndex] += 1;
            if (dustBase && dustBase > 0) {
              let gain = Math.max(1, Math.round(dustBase * getDustMultiplier()));
              dust += gain;
            }
            if (onCraft) {
              onCraft();
            }
          }
        } else {
          state.progress = Math.max(0, state.progress - dt * 0.35);
        }
      }

      function runModuleAutomation(state, moduleKey, dt, baseInterval, action) {
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

      function updateConveyorState(dt) {
        let state = moduleStates.conveyor;
        if (!state) return;
        setupConveyorGeometry(state);
        let speedBoost = 1 + getUpgradeLevel('gravity') * 0.12 + getLayerGravityBonus() * 0.6;
        let spawnRate = state.geometry.spawnRate / Math.max(0.2, speedBoost);
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          spawnConveyorBatch(state);
          state.spawnTimer = spawnRate + random(-0.2, 0.2);
        }
        updateConveyorFallers(state, dt, speedBoost);
        updateConveyorModules(state, dt, speedBoost);
        if (powderCounts[0] >= CHAIN_REQUIREMENT) {
          let packagingSpeed = 0.45 + speedBoost * 0.08;
          state.packageProgress = (state.packageProgress || 0) + dt * packagingSpeed;
          while (
            state.packageProgress >= 1 &&
            powderCounts[0] >= CHAIN_REQUIREMENT
          ) {
            state.packageProgress -= 1;
            powderCounts[0] -= CHAIN_REQUIREMENT;
            powderCounts[1] += 1;
            state.packagePulse = 1;
            let overfillLevel = getUpgradeLevel('conveyorOverfill');
            if (overfillLevel > 0) {
              let extraChance = Math.min(0.6, 0.18 * overfillLevel);
              if (Math.random() < extraChance) {
                powderCounts[1] += 1;
                dust += Math.max(
                  1,
                  Math.round((2 + overfillLevel) * getDustMultiplier())
                );
                state.deliveryPulse = 1;
              }
            }
          }
        } else {
          state.packageProgress = Math.max(0, (state.packageProgress || 0) - dt * 0.4);
        }
        state.packagePulse = Math.max(0, (state.packagePulse || 0) - dt * 2.2);
        state.deliveryPulse = Math.max(0, (state.deliveryPulse || 0) - dt * 1.6);
        runModuleAutomation(state, 'conveyor', dt, 5.5, rushConveyor);
      }

      function setupConveyorGeometry(state) {
        if (state.initialized) return;
        state.initialized = true;
        state.fallers = state.fallers || [];
        state.modules = state.modules || [];
        state.geometry = {
          moldTop: -0.78,
          moldSettle: -0.46,
          releaseY: -0.3,
          beltY: -0.22,
          dropThreshold: -0.18,
          holes: [-0.58, -0.18, 0.28],
          spawnRate: 1.05,
          beltSegments: [
            {
              from: { x: 0.74, y: -0.22 },
              to: { x: -0.82, y: -0.22 },
              speed: 0.34,
              type: 'belt'
            },
            {
              from: { x: -0.82, y: -0.22 },
              to: { x: -0.82, y: 0.08 },
              speed: 0.62,
              type: 'drop'
            },
            {
              from: { x: -0.82, y: 0.08 },
              to: { x: 0.66, y: 0.08 },
              speed: 0.3,
              type: 'belt'
            },
            {
              from: { x: 0.66, y: 0.08 },
              to: { x: 0.66, y: 0.34 },
              speed: 0.68,
              type: 'drop'
            },
            {
              from: { x: 0.66, y: 0.34 },
              to: { x: -0.86, y: 0.34 },
              speed: 0.32,
              type: 'belt'
            }
          ]
        };
      }

      function spawnConveyorBatch(state) {
        if (!state.geometry) return;
        let patterns = [
          [
            { x: -0.24, y: 0 },
            { x: 0, y: 0 },
            { x: 0.24, y: 0 }
          ],
          [
            { x: -0.3, y: 0 },
            { x: -0.1, y: -0.08 },
            { x: 0.12, y: 0.06 },
            { x: 0.32, y: -0.04 }
          ],
          [
            { x: -0.2, y: 0.04 },
            { x: 0, y: -0.04 },
            { x: 0.2, y: 0.04 },
            { x: 0.4, y: -0.04 }
          ]
        ];
        let pattern = random(patterns);
        for (let offset of pattern) {
          state.fallers.push({
            x: offset.x,
            y: state.geometry.moldTop + random(-0.04, 0.04),
            vx: 0,
            vy: 0,
            phase: 'mold',
            timer: 0.25 + Math.random() * 0.25,
            jitter: Math.random() * TAU,
            size: 0.06 + Math.random() * 0.04,
            targetHole: null,
            drop: false
          });
        }
        while (state.fallers.length > 18) {
          state.fallers.shift();
        }
      }

      function updateConveyorFallers(state, dt, speedBoost) {
        if (!state.geometry) return;
        let gravity = 1.4 * speedBoost;
        let moldSettle = state.geometry.moldSettle;
        let releaseY = state.geometry.releaseY;
        let beltY = state.geometry.beltY;
        let dropThreshold = state.geometry.dropThreshold;
        for (let i = state.fallers.length - 1; i >= 0; i--) {
          let faller = state.fallers[i];
          if (faller.phase === 'mold') {
            faller.y = Math.min(moldSettle, faller.y + dt * 0.55 * speedBoost);
            faller.timer -= dt * speedBoost;
            if (faller.y >= moldSettle - 0.01 && faller.timer <= 0) {
              faller.phase = 'settled';
              faller.timer = 0.25 + Math.random() * 0.35;
            }
          } else if (faller.phase === 'settled') {
            faller.timer -= dt * speedBoost;
            faller.jitter += dt * 3;
            faller.y = moldSettle + Math.sin(faller.jitter) * 0.01;
            if (faller.timer <= 0) {
              faller.phase = 'release';
              faller.targetHole = state.geometry.holes[state.nextHole % state.geometry.holes.length];
              state.nextHole += 1;
              faller.vx = 0;
              faller.vy = 0.2;
            }
          } else if (faller.phase === 'release') {
            if (!faller.drop) {
              let dx = (faller.targetHole || 0) - faller.x;
              faller.vx += dx * dt * 2.2 * speedBoost;
              faller.vx = constrain(faller.vx, -0.9, 0.9);
              faller.x += faller.vx * dt;
              faller.vx *= 0.94;
              faller.y = Math.min(releaseY, faller.y + faller.vy * dt);
              if (Math.abs(dx) < 0.04) {
                faller.drop = true;
                faller.vy = 0;
              }
            } else {
              faller.vy += gravity * dt;
              faller.y += faller.vy * dt;
              faller.x += faller.vx * dt * 0.4;
            }
          } else {
            faller.vy += gravity * dt;
            faller.y += faller.vy * dt;
          }
          if (faller.y >= dropThreshold) {
            state.modules.push({
              segment: 0,
              progress: 0,
              wobble: Math.random() * TAU,
              size: 0.9 + Math.random() * 0.4,
              x: faller.x,
              y: beltY,
              vy: 0
            });
            if (state.modules.length > 18) {
              state.modules.shift();
            }
            state.fallers.splice(i, 1);
            continue;
          }
          if (faller.y > 1.2 || Math.abs(faller.x) > 1.2) {
            state.fallers.splice(i, 1);
          }
        }
      }

      function updateConveyorModules(state, dt, speedBoost) {
        if (!state.geometry) return;
        let segments = state.geometry.beltSegments;
        for (let i = state.modules.length - 1; i >= 0; i--) {
          let module = state.modules[i];
          let segment = segments[module.segment];
          if (!segment) {
            powderCounts[0] += 1;
            dust += Math.max(1, Math.round(getDustMultiplier()));
            state.modules.splice(i, 1);
            state.deliveryPulse = 1;
            continue;
          }
          let speed = segment.speed * (segment.type === 'drop' ? Math.max(1, speedBoost * 1.2) : speedBoost);
          module.progress += dt * speed;
          if (module.progress >= 1) {
            module.progress -= 1;
            module.segment += 1;
            segment = segments[module.segment];
            if (!segment) {
              powderCounts[0] += 1;
              dust += Math.max(1, Math.round(getDustMultiplier()));
              state.modules.splice(i, 1);
              state.deliveryPulse = 1;
              continue;
            }
          }
          let eased = segment.type === 'drop' ? module.progress * module.progress : smoothStep(module.progress);
          module.x = lerp(segment.from.x, segment.to.x, eased);
          module.y = lerp(segment.from.y, segment.to.y, eased);
          module.wobble += dt * 6;
        }
      }

      function smoothStep(t) {
        let clamped = constrain(t, 0, 1);
        return clamped * clamped * (3 - 2 * clamped);
      }

      function updateRocketState(dt) {
        let state = moduleStates.rocket;
        if (!state) return;
        if (!state.pods || state.pods.length === 0) {
          state.pods = new Array(3)
            .fill(0)
            .map(() => ({ progress: 0, launch: 0, fueling: false }));
        }
        state.explosions = state.explosions || [];
        state.successPulse = Math.max(0, (state.successPulse || 0) - dt * 1.1);
        let fuelSpeed = 0.32 + getUpgradeLevel('refinery') * 0.08 + getGravityMultiplier() * 0.03;
        let successRate = getRocketSuccessRate();
        for (let i = 0; i < state.pods.length; i++) {
          let pod = state.pods[i];
          if (pod.launch > 0) {
            pod.launch += dt;
            if (pod.launch >= 0.6) {
              pod.launch = 0;
              pod.progress = 0;
            }
            continue;
          }
          if (!pod.fueling && powderCounts[1] >= CHAIN_REQUIREMENT) {
            powderCounts[1] -= CHAIN_REQUIREMENT;
            pod.fueling = true;
            pod.progress = 0;
          }
          if (pod.fueling) {
            pod.progress += dt * fuelSpeed;
            if (pod.progress >= 1) {
              pod.progress = 1;
              pod.launch = 0.01;
              pod.fueling = false;
              if (Math.random() < successRate) {
                powderCounts[2] += 1;
                dust += Math.max(2, Math.round(6 * getDustMultiplier()));
                state.successPulse = 1;
              } else {
                let salvage = Math.floor(
                  CHAIN_REQUIREMENT * (0.05 + getUpgradeLevel('rocketSuccessRate') * 0.05)
                );
                if (salvage > 0) {
                  powderCounts[1] += salvage;
                }
                state.explosions.push({ life: 1, index: i });
              }
            }
          } else {
            pod.progress = Math.max(0, pod.progress - dt * 0.3);
          }
        }
        for (let i = state.explosions.length - 1; i >= 0; i--) {
          state.explosions[i].life -= dt * 1.5;
          if (state.explosions[i].life <= 0) {
            state.explosions.splice(i, 1);
          }
        }
        runModuleAutomation(state, 'rocket', dt, 7, boostRockets);
      }

      function updateAsteroidState(dt) {
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
          () => {
            spawnAsteroidPowder(state);
            applyAsteroidFissionBonus(state);
          }
        );
        updateAsteroidPowder(state, dt);
        updateAsteroidBodies(state, dt);
        state.ringPulse = Math.max(0, (state.ringPulse || 0) - dt * 1.4);
        runModuleAutomation(state, 'asteroid', dt, 6.5, crackAsteroidCrucible);
      }

      function initializeAsteroidField(state) {
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

      function spawnAsteroidPowder(state) {
        if (!state.powderBits) {
          state.powderBits = [];
        }
        for (let i = 0; i < 4; i++) {
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
      }

      function applyAsteroidFissionBonus(state) {
        let level = getUpgradeLevel('asteroidFissionBoost');
        if (level <= 0) return;
        let bonusChance = Math.min(0.65, 0.2 + level * 0.12);
        if (Math.random() < bonusChance) {
          powderCounts[3] += 1;
          state.ringPulse = 1;
        }
        dust += Math.max(1, Math.round((3 + level * 2) * getDustMultiplier()));
      }

      function updateAsteroidPowder(state, dt) {
        if (!state.powderBits) return;
        let asteroids = state.asteroids || [];
        for (let i = state.powderBits.length - 1; i >= 0; i--) {
          let bit = state.powderBits[i];
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

      function updateAsteroidBodies(state, dt) {
        if (!state.asteroids) return;
        let asteroids = state.asteroids;
        let gravityConstant = 0.22;
        for (let i = 0; i < asteroids.length; i++) {
          let asteroid = asteroids[i];
          asteroid.vx += -asteroid.x * 0.12 * dt;
          asteroid.vy += -asteroid.y * 0.12 * dt;
          asteroid.mergeGlow = Math.max(0, asteroid.mergeGlow - dt * 1.6);
        }
        for (let i = 0; i < asteroids.length; i++) {
          let a = asteroids[i];
          for (let j = i + 1; j < asteroids.length; j++) {
            let b = asteroids[j];
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
        }
        for (let i = 0; i < asteroids.length; i++) {
          let a = asteroids[i];
          for (let j = i + 1; j < asteroids.length; j++) {
            let b = asteroids[j];
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
              asteroids.splice(j, 1);
              j--;
              state.ringPulse = 1;
            }
          }
        }
        state.coreMass = asteroids.reduce((max, asteroid) => Math.max(max, asteroid.mass), 0);
        while (asteroids.length > 10) {
          asteroids.shift();
        }
      }

      function asteroidRadius(mass) {
        return 0.08 + Math.sqrt(Math.max(0, mass)) * 0.028;
      }

      function updatePlanetState(dt) {
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
          () => spawnPlanetesimals(state)
        );
        updatePlanetesimals(state, dt);
        updatePlanetMoons(state, dt);
        state.coreGlow = Math.max(0, (state.coreGlow || 0) - dt * 1.2);
        state.moonPulse = Math.max(0, (state.moonPulse || 0) - dt * 1.1);
        runModuleAutomation(state, 'planet', dt, 7.5, tunePlanetarium);
      }

      function initializePlanetField(state) {
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

      function spawnPlanetesimals(state) {
        if (!state.planetesimals) {
          state.planetesimals = [];
        }
        for (let i = 0; i < 3; i++) {
          let angle = random(TAU);
          let radius = random(0.26, 0.58);
          state.planetesimals.push(createPlanetesimal(angle, radius));
        }
        while (state.planetesimals.length > 40) {
          state.planetesimals.shift();
        }
        state.coreGlow = 1;
      }

      function createPlanetesimal(angle, radius) {
        let tangential = 0.32 + Math.random() * 0.18;
        let mass = 1 + Math.random() * 0.9;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.72,
          vx: -Math.sin(angle) * tangential,
          vy: Math.cos(angle) * tangential * 0.72,
          mass,
          radius: planetesimalRadius(mass),
          colorPhase: Math.random(),
          spin: random(0.8, 1.6),
          phase: random(TAU)
        };
      }

      function updatePlanetesimals(state, dt) {
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
          let a = bodies[i];
          for (let j = i + 1; j < bodies.length; j++) {
            let b = bodies[j];
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
          let a = bodies[i];
          for (let j = i + 1; j < bodies.length; j++) {
            let b = bodies[j];
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
          let body = bodies[i];
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
      }

      function createPlanetMoon(radius, mass) {
        return {
          angle: random(TAU),
          radius: radius * 0.9 + random(0.24, 0.42),
          speed: random(0.4, 0.9),
          wobble: random(TAU),
          size: 0.05 + mass * 0.02
        };
      }

      function applyPlanetMoonNurseryBonus(state) {
        let level = getUpgradeLevel('planetMoonNursery');
        if (level <= 0) return;
        let bonusPlanets = Math.max(1, level);
        powderCounts[4] += bonusPlanets;
        dust += Math.max(1, Math.round((6 + level * 2) * getDustMultiplier()));
        state.moonPulse = 1;
      }

      function updatePlanetMoons(state, dt) {
        if (!state.moons) return;
        for (let moon of state.moons) {
          moon.angle += dt * moon.speed;
          moon.wobble += dt * 2;
        }
      }

      function planetRadius(mass) {
        return 0.18 + Math.sqrt(Math.max(0, mass)) * 0.025;
      }

      function planetesimalRadius(mass) {
        return 0.05 + Math.pow(Math.max(0.2, mass), 0.58) * 0.04;
      }

      function updateForgeState(dt) {
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
          () => {
            state.pulses.push({ life: 1, angle: Math.random() * TAU });
            applyForgeSupernovaBonus(state);
          }
        );
        for (let i = state.pulses.length - 1; i >= 0; i--) {
          state.pulses[i].life -= dt * 1.6;
          if (state.pulses[i].life <= 0) {
            state.pulses.splice(i, 1);
          }
        }
        runModuleAutomation(state, 'forge', dt, 9, hammerForge);
      }

      function applyForgeSupernovaBonus(state) {
        let level = getUpgradeLevel('forgeSupernova');
        if (level <= 0) return;
        if (Math.random() < Math.min(0.55, 0.2 * level)) {
          powderCounts[5] += 1;
        }
        dust += Math.max(1, Math.round((8 + level * 5) * getDustMultiplier()));
        if (state && state.pulses) {
          state.pulses.push({ life: 0.6 + level * 0.08, angle: Math.random() * TAU });
          while (state.pulses.length > 12) {
            state.pulses.shift();
          }
        }
      }

      function updateGalaxyState(dt) {
        let state = moduleStates.galaxy;
        if (!state) return;
        initializeGalaxyField(state);
        state.angle = (state.angle || 0) + dt * 0.4;
        for (let vortex of state.vortices) {
          vortex.angle += dt * vortex.speed;
        }
        for (let particle of state.particles) {
          let vortex = state.vortices[particle.band % state.vortices.length];
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
          let burst = state.bursts[i];
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
          () => {
            spawnGalaxyBurst(state);
            applyGalaxyClusterBonus(state);
          }
        );
        runModuleAutomation(state, 'galaxy', dt, 10.5, swirlGalaxy);
      }

      function initializeGalaxyField(state) {
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

      function spawnGalaxyBurst(state) {
        if (!state.bursts) {
          state.bursts = [];
        }
        state.bursts.push({
          radius: random(0.1, 0.4),
          angle: random(TAU),
          life: 1
        });
        while (state.bursts.length > 6) {
          state.bursts.shift();
        }
      }

      function applyGalaxyClusterBonus(state) {
        let level = getUpgradeLevel('galaxyCluster');
        if (level <= 0) return;
        let extra = 0;
        for (let i = 0; i < level; i++) {
          if (Math.random() < 0.35) {
            extra++;
          }
        }
        if (extra > 0) {
          powderCounts[6] += extra;
        }
        dust += Math.max(1, Math.round((10 + level * 6) * getDustMultiplier()));
        if (state && state.bursts) {
          state.bursts.push({ radius: random(0.18, 0.42), angle: random(TAU), life: 0.9 });
          while (state.bursts.length > 8) {
            state.bursts.shift();
          }
        }
      }

      function angleWrap(value) {
        while (value > Math.PI) value -= TAU;
        while (value < -Math.PI) value += TAU;
        return value;
      }

      function updateUniverseState(dt) {
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
          () => applyUniverseContinuumBonus(state)
        );
        runModuleAutomation(state, 'universe', dt, 12, syncUniverse);
      }

      function applyUniverseContinuumBonus(state) {
        let level = getUpgradeLevel('universeContinuum');
        if (level <= 0) return;
        if (Math.random() < Math.min(0.5, 0.18 * level)) {
          powderCounts[7] += 1;
        }
        dust += Math.max(1, Math.round((12 + level * 6) * getDustMultiplier()));
        let singularity = moduleStates.singularity;
        if (singularity) {
          singularity.progress = (singularity.progress || 0) + level * 0.12;
        }
      }

      function updateSingularityState(dt) {
        let state = moduleStates.singularity;
        if (!state) return;
        state.orbit += dt * 0.5;
        state.halo = (state.halo || 0) + dt * 1.1;
        let speed = 0.12 + crystalCores * 0.008;
        if (powderCounts[7] >= CHAIN_REQUIREMENT) {
          state.progress += dt * speed;
          while (state.progress >= 1 && powderCounts[7] >= CHAIN_REQUIREMENT) {
            state.progress -= 1;
            powderCounts[7] -= CHAIN_REQUIREMENT;
            powderCounts[8] += 1;
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
          }
        } else {
          state.progress = Math.max(0, state.progress - dt * 0.25);
        }
        for (let i = state.shards.length - 1; i >= 0; i--) {
          state.shards[i].life -= dt * 1.2;
          if (state.shards[i].life <= 0) {
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

      function drawConveyorModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.conveyor;
        push();
        translate(center.x, center.y);
        rectMode(CENTER);
        fill('#051225');
        rect(0, 0, panelW * 0.92, panelH * 0.72, 14);
        if (state && state.geometry) {
          let scaleX = panelW * 0.45;
          let scaleY = panelH * 0.38;
          let px = (x) => x * scaleX;
          let py = (y) => y * scaleY;
          let moldHeight = Math.max(
            scaledY(18),
            (state.geometry.moldSettle - state.geometry.moldTop) * scaleY
          );
          fill('#0a1a31');
          rect(0, py((state.geometry.moldSettle + state.geometry.moldTop) / 2), panelW * 0.72, moldHeight, 12);
          fill('#112845');
          rect(0, py(state.geometry.releaseY) - scaledY(3), panelW * 0.76, scaledY(14), 8);
          fill('#061123');
          rect(0, py(state.geometry.moldSettle) + scaledY(12), panelW * 0.76, scaledY(24), 12);
          for (let hole of state.geometry.holes) {
            let hx = px(hole);
            push();
            translate(hx, py(state.geometry.releaseY));
            fill('#030914');
            rect(0, 0, panelW * 0.14, scaledY(20), 6);
            fill('#173155');
            rect(0, 0, panelW * 0.08, scaledY(20), 4);
            pop();
          }
          let thickness = panelH * 0.11;
          for (let i = 0; i < state.geometry.beltSegments.length; i++) {
            let segment = state.geometry.beltSegments[i];
            let fromPix = createVector(px(segment.from.x), py(segment.from.y));
            let toPix = createVector(px(segment.to.x), py(segment.to.y));
            let centerPix = p5.Vector.add(fromPix, toPix).mult(0.5);
            let delta = p5.Vector.sub(toPix, fromPix);
            let angle = Math.atan2(delta.y, delta.x);
            let length = Math.max(8, delta.mag());
            let baseColor = segment.type === 'drop' ? '#0d1a2c' : '#13233d';
            let highlight = i === state.geometry.beltSegments.length - 1 ? state.deliveryPulse || 0 : 0;
            push();
            translate(centerPix.x, centerPix.y);
            rotate(angle);
            noStroke();
            fill(baseColor);
            rect(0, 0, length + thickness * 0.4, thickness, thickness * 0.4);
            let overlayColor = segment.type === 'drop' ? '#1f2a40' : '#1d3f67';
            fill(withAlpha(overlayColor, segment.type === 'drop' ? 180 : 210));
            rect(0, 0, length + thickness * 0.16, thickness * 0.56, thickness * 0.3);
            if (highlight > 0.01) {
              fill(withAlpha('#38bdf8', 120 + highlight * 120));
              rect(0, 0, length + thickness * 0.12, thickness * 0.46, thickness * 0.25);
            }
            if (segment.type === 'drop') {
              fill(withAlpha('#0b1220', 200));
              rect(0, 0, thickness * 0.38, length + thickness * 0.16, thickness * 0.2);
              fill(withAlpha('#22d3ee', 90));
              rect(0, 0, thickness * 0.16, length + thickness * 0.16, thickness * 0.12);
            }
            pop();
          }
          if (state.fallers) {
            for (let faller of state.fallers) {
              let fx = px(faller.x);
              let fy = py(faller.y);
              let size = Math.max(4, panelW * faller.size * 0.22);
              push();
              translate(fx, fy);
              rotate(Math.sin((faller.jitter || 0) + frameCount / 10) * 0.05);
              fill('#f8e3a2');
              rect(0, 0, size, size * 0.84, 4);
              fill('#d9c079');
              rect(0, -size * 0.18, size * 0.62, size * 0.36, 3);
              pop();
            }
          }
          if (state.modules) {
            for (let module of state.modules) {
              let mx = px(module.x || 0);
              let my = py(module.y || 0);
              let size = Math.max(6, panelW * 0.08 * (module.size || 1));
              push();
              translate(mx, my);
              rotate(Math.sin(module.wobble || 0) * 0.08);
              fill('#f2d28b');
              rect(0, 0, size, size * 0.72, 4);
              fill('#c09257');
              rect(0, -size * 0.18, size * 0.66, size * 0.32, 3);
              fill('#fde68a');
              rect(0, size * 0.1, size * 0.54, size * 0.16, 3);
              pop();
            }
          }
        }
        if (state) {
          let housingW = panelW * 0.26;
          let housingH = panelH * 0.36;
          push();
          translate(panelW * 0.28, panelH * 0.18);
          fill('#0c182a');
          rect(0, 0, housingW, housingH, 12);
          fill('#1c2e49');
          rect(0, -housingH * 0.04, housingW * 0.78, housingH * 0.54, 10);
          let pulse = 1 + (state.packagePulse || 0) * 0.3;
          push();
          translate(0, -housingH * 0.14);
          rotate(frameCount / 20);
          fill('#facc15');
          rect(0, 0, housingW * 0.24 * pulse, housingW * 0.24 * pulse, 6);
          pop();
          push();
          translate(0, -housingH * 0.14);
          rotate(-frameCount / 26);
          stroke('#fde68a');
          strokeWeight(2);
          noFill();
          rect(0, 0, housingW * 0.38, housingW * 0.38, 9);
          pop();
          noStroke();
          fill('#f59e0b');
          let gaugeHeight = housingH * 0.58 * constrain(state.packageProgress || 0, 0, 1);
          rect(-housingW * 0.34, housingH * 0.1 - gaugeHeight / 2, housingW * 0.16, gaugeHeight, 4);
          pop();
          push();
          translate(-panelW * 0.42, panelH * 0.2);
          fill('#1f2937');
          rect(0, panelH * 0.18, panelW * 0.2, panelH * 0.1, 8);
          fill('#0f172a');
          rect(0, panelH * 0.04, panelW * 0.18, panelH * 0.32, 10);
          fill('#22d3ee');
          rect(0, -panelH * 0.02, panelW * 0.12, panelH * 0.24, 8);
          fill('#f8fafc');
          rect(0, -panelH * 0.18, panelW * 0.08, panelH * 0.14, 6);
          fill('#f87171');
          triangle(
            -panelW * 0.04,
            -panelH * 0.1,
            panelW * 0.04,
            -panelH * 0.1,
            0,
            panelH * 0.04
          );
          pop();
          let packagesVisible = Math.min(4, Math.floor(powderCounts[1] || 0));
          for (let i = 0; i < packagesVisible; i++) {
            let stackX = -panelW * 0.4;
            let stackY = panelH * 0.12 - i * panelH * 0.08;
            fill('#f2b066');
            rect(stackX, stackY, panelW * 0.16, panelH * 0.08, 4);
            fill('#c08457');
            rect(stackX, stackY - panelH * 0.02, panelW * 0.1, panelH * 0.04, 3);
          }
        }
        pop();
      }

      function drawRocketModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.rocket;
        if (!state || !state.pods) return;
        push();
        translate(center.x, center.y);
        fill('#0d1628');
        rect(0, panelH * 0.28, panelW * 0.9, panelH * 0.18, 8);
        if (state.successPulse > 0) {
          fill(withAlpha('#22c55e', 60 + state.successPulse * 120));
          rect(0, -panelH * 0.12, panelW * 0.96, panelH * 0.36, 12);
        }
        let spacing = panelW * 0.3;
        for (let i = 0; i < state.pods.length; i++) {
          let pod = state.pods[i];
          push();
          translate(-spacing + spacing * i, 0);
          let bodyW = panelW * 0.18;
          let bodyH = panelH * 0.42;
          fill('#1f2a40');
          rect(0, 0, bodyW, bodyH, 6);
          let fueling = pod.fueling && pod.launch === 0;
          fill(fueling ? '#2563eb' : '#334c7a');
          rect(0, -bodyH * 0.2, bodyW * 0.78, bodyH * 0.48, 4);
          let fuelHeight = constrain(pod.progress, 0, 1) * bodyH * 0.6;
          fill('#f59e0b');
          rect(0, bodyH * 0.12 - fuelHeight / 2, bodyW * 0.6, fuelHeight, 2);
          fill('#9ca3af');
          rect(0, -bodyH * 0.55, bodyW * 0.52, bodyH * 0.26, 4);
          if (fueling) {
            push();
            translate(0, -bodyH * 0.18);
            rotate(frameCount / 14 + i);
            stroke('#fcd34d');
            strokeWeight(2);
            noFill();
            rect(0, 0, bodyW * 0.46, bodyW * 0.46, 6);
            pop();
          }
          if (pod.launch > 0) {
            let flame = (Math.sin(frameCount / 3 + i) * 0.2 + 1) * bodyH * 0.22;
            fill('#fb923c');
            rect(0, bodyH * 0.38 + flame / 2, bodyW * 0.46, flame, 3);
          } else {
            fill('#1f2937');
            rect(0, bodyH * 0.38, bodyW * 0.46, bodyH * 0.14, 3);
          }
          pop();
        }
        if (state.explosions) {
          noStroke();
          for (let blast of state.explosions) {
            let index = blast.index || 0;
            let life = Math.max(0, Math.min(1, blast.life || 0));
            let x = -spacing + spacing * index;
            let radius = panelW * 0.3 * (1.2 - life * 0.6);
            fill(withAlpha('#f87171', 180 * life));
            ellipse(x, panelH * 0.1, radius, radius * 0.7);
            fill(withAlpha('#fde68a', 200 * life));
            ellipse(x, panelH * 0.12, radius * 0.6, radius * 0.4);
          }
        }
        let queue = Math.min(6, Math.floor((powderCounts[1] || 0) / 5));
        for (let i = 0; i < queue; i++) {
          let qx = -panelW * 0.48;
          let qy = panelH * 0.24 - i * panelH * 0.08;
          fill('#f2b066');
          rect(qx, qy, panelW * 0.14, panelH * 0.08, 4);
          fill('#c08457');
          rect(qx, qy - panelH * 0.02, panelW * 0.08, panelH * 0.04, 3);
        }
        pop();
      }

      function drawAsteroidModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.asteroid;
        if (!state) return;
        push();
        translate(center.x, center.y);
        rectMode(CENTER);
        fill('#0d1527');
        rect(0, 0, panelW * 0.88, panelH * 0.7, 12);
        let scaleX = panelW * 0.36;
        let scaleY = panelH * 0.3;
        let ring = state.ring || 0;
        let pulse = 1 + Math.sin(ring * 1.8) * 0.05 + (state.ringPulse || 0) * 0.12;
        noFill();
        stroke(withAlpha('#1e293b', 200));
        strokeWeight(2);
        ellipse(0, 0, panelW * 0.7, panelH * 0.48);
        stroke(withAlpha('#0f1a2c', 220));
        ellipse(0, 0, panelW * 0.54, panelH * 0.36);
        stroke(withAlpha('#38bdf8', 140 + (state.ringPulse || 0) * 80));
        ellipse(0, 0, panelW * 0.42 * pulse, panelH * 0.3 * pulse);
        noStroke();
        fill(withAlpha('#0b1220', 220));
        rect(0, 0, panelW * 0.28, panelW * 0.28, 12);
        fill(withAlpha('#1e3a8a', 200));
        rect(0, 0, panelW * 0.12, panelW * 0.12, 8);
        if (state.powderBits) {
          for (let bit of state.powderBits) {
            let x = bit.x * scaleX;
            let y = bit.y * scaleY;
            let size = Math.max(3, bit.size * panelW * 0.22);
            let alpha = 160 + Math.sin((bit.life || 1) * TAU + frameCount / 6) * 40;
            fill(withAlpha('#cbd5f5', alpha));
            rect(x, y, size, size * 0.7, 3);
          }
        }
        if (state.asteroids) {
          for (let asteroid of state.asteroids) {
            let x = asteroid.x * scaleX;
            let y = asteroid.y * scaleY;
            let size = Math.max(8, asteroid.radius * panelW * 0.5);
            if (asteroid.mergeGlow > 0) {
              fill(withAlpha('#38bdf8', asteroid.mergeGlow * 120));
              ellipse(x, y, size * 1.5, size * 1.3);
            }
            let hueT = constrain((asteroid.hue - 0.1) / 0.4, 0, 1);
            let bodyColor = lerpColor(color('#475569'), color('#e2e8f0'), hueT);
            fill(bodyColor);
            ellipse(x, y, size, size * 0.78);
            fill(withAlpha('#020617', 140));
            ellipse(x + size * 0.16, y - size * 0.12, size * 0.46, size * 0.38);
            fill(withAlpha('#94a3b8', 200));
            ellipse(x - size * 0.12, y + size * 0.08, size * 0.24, size * 0.2);
          }
        }
        if (state.coreMass && state.coreMass > 7) {
          let coreSize = panelW * (0.12 + Math.sqrt(state.coreMass - 6) * 0.02);
          fill(withAlpha('#1d4ed8', 200));
          ellipse(0, 0, coreSize, coreSize * 0.78);
          fill(withAlpha('#60a5fa', 180));
          ellipse(0, 0, coreSize * 0.6, coreSize * 0.55);
        }
        drawModuleProgressBar(0, panelH * 0.3, panelW * 0.6, state.progress || 0, '#94a3b8');
        pop();
      }

      function drawPlanetModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.planet;
        if (!state) return;
        push();
        translate(center.x, center.y);
        rectMode(CENTER);
        fill('#0c1729');
        rect(0, 0, panelW * 0.9, panelH * 0.7, 12);
        let scaleX = panelW * 0.38;
        let scaleY = panelH * 0.32;
        let spin = state.spin || 0;
        if (state.moonPulse > 0) {
          fill(withAlpha('#fde68a', 80 + state.moonPulse * 90));
          ellipse(0, 0, panelW * 0.82, panelH * 0.58);
        }
        stroke(withAlpha('#12304c', 220));
        strokeWeight(2);
        noFill();
        ellipse(0, 0, panelW * 0.78, panelH * 0.52);
        stroke(withAlpha('#1f6feb', 120));
        ellipse(0, 0, panelW * 0.58, panelH * 0.4);
        noStroke();
        if (state.planetesimals) {
          for (let body of state.planetesimals) {
            let x = body.x * scaleX;
            let y = body.y * scaleY;
            let size = Math.max(4, body.radius * panelW * 0.42);
            let twinkle = (Math.sin(body.phase || 0) + 1) / 2;
            let colorA = lerpColor(color('#22d3ee'), color('#bae6fd'), twinkle);
            fill(colorA);
            ellipse(x, y, size, size * 0.9);
            fill(withAlpha('#0f172a', 160));
            ellipse(x + size * 0.18, y - size * 0.18, size * 0.45, size * 0.4);
          }
        }
        let core = state.planetCore || { mass: 6, radius: planetRadius(6), angle: 0 };
        let planetSize = core.radius * panelW * 0.9;
        let glow = 1 + (state.coreGlow || 0) * 0.3;
        push();
        rotate(spin * 0.4);
        fill(withAlpha('#1d4ed8', 200));
        ellipse(0, 0, planetSize * glow, planetSize * 0.82 * glow);
        fill(withAlpha('#60a5fa', 200));
        ellipse(0, 0, planetSize * 0.72 * glow, planetSize * 0.64 * glow);
        fill(withAlpha('#f8fafc', 160));
        ellipse(-planetSize * 0.12, -planetSize * 0.06, planetSize * 0.32, planetSize * 0.28);
        pop();
        if (state.moons) {
          stroke(withAlpha('#334155', 180));
          strokeWeight(1.5);
          noFill();
          for (let moon of state.moons) {
            let orbitW = moon.radius * scaleX * 2;
            let orbitH = moon.radius * scaleY * 2;
            ellipse(0, 0, orbitW, orbitH);
          }
          noStroke();
          for (let moon of state.moons) {
            let x = Math.cos(moon.angle) * moon.radius * scaleX;
            let y = Math.sin(moon.angle) * moon.radius * scaleY;
            let size = Math.max(4, moon.size * panelW * 0.28);
            push();
            translate(x, y);
            rotate(Math.sin(moon.wobble) * 0.15);
            fill('#e2e8f0');
            ellipse(0, 0, size, size * 0.82);
            fill(withAlpha('#94a3b8', 180));
            ellipse(size * 0.14, -size * 0.12, size * 0.4, size * 0.34);
            pop();
          }
        }
        drawModuleProgressBar(0, panelH * 0.32, panelW * 0.6, state.progress || 0, '#38bdf8');
        pop();
      }

      function drawForgeModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.forge;
        push();
        translate(center.x, center.y);
        fill('#120b1f');
        rect(0, panelH * 0.24, panelW * 0.82, panelH * 0.28, 10);
        let corona = 1 + Math.sin((state && state.corona) || 0) * 0.08;
        fill('#fde68a');
        rect(0, -panelH * 0.04, panelW * 0.32 * corona, panelW * 0.32 * corona, 12);
        fill('#fcd34d');
        rect(0, -panelH * 0.04, panelW * 0.2 * corona, panelW * 0.2 * corona, 8);
        if (state) {
          for (let pulse of state.pulses) {
            let radius = panelW * 0.18 + (1 - pulse.life) * panelW * 0.28;
            let size = Math.max(6, panelW * 0.08 * pulse.life);
            let x = Math.cos(pulse.angle) * radius;
            let y = Math.sin(pulse.angle) * radius * 0.6;
            fill(withAlpha('#fbbf24', pulse.life * 220));
            rect(x, y, size, size, 4);
          }
          drawModuleProgressBar(0, panelH * 0.3, panelW * 0.6, state.progress || 0, '#fde68a');
        }
        pop();
      }

      function drawGalaxyModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.galaxy;
        if (!state) return;
        push();
        translate(center.x, center.y);
        rectMode(CENTER);
        fill('#0f172a');
        rect(0, 0, panelW * 0.92, panelH * 0.72, 14);
        let scaleX = panelW * 0.42;
        let scaleY = panelH * 0.34;
        let baseColors = [color('#38bdf8'), color('#c084fc'), color('#f472b6')];
        if (state.bursts) {
          for (let burst of state.bursts) {
            let angle = burst.angle + state.angle * 0.6;
            let radius = burst.radius;
            let x = Math.cos(angle) * radius * scaleX;
            let y = Math.sin(angle) * radius * scaleY;
            let glowSize = panelW * 0.24 * burst.life;
            fill(withAlpha('#f0abfc', burst.life * 160));
            ellipse(x, y, glowSize, glowSize * 0.7);
            fill(withAlpha('#bae6fd', burst.life * 140));
            ellipse(x, y, glowSize * 0.5, glowSize * 0.4);
          }
        }
        if (state.particles) {
          for (let particle of state.particles) {
            let angle = particle.angle + state.angle * 0.25;
            let radius = particle.radius;
            let x = Math.cos(angle) * radius * scaleX;
            let y = Math.sin(angle) * radius * scaleY;
            let twinkle = (Math.sin(particle.twinkle) + 1) / 2;
            let base = baseColors[particle.band % baseColors.length];
            let shade = lerpColor(base, color('#f8fafc'), twinkle * 0.6 + 0.2);
            let size = panelW * (0.02 + particle.band * 0.008);
            fill(shade);
            ellipse(x, y, size, size * 0.86);
            fill(withAlpha('#0b1120', 120));
            ellipse(x + size * 0.16, y - size * 0.16, size * 0.45, size * 0.4);
          }
        }
        if (state.vortices) {
          for (let vortex of state.vortices) {
            let angle = vortex.angle + state.angle * 0.5;
            let x = Math.cos(angle) * vortex.radius * scaleX;
            let y = Math.sin(angle) * vortex.radius * scaleY;
            fill('#fdf2f8');
            ellipse(x, y, panelW * 0.05, panelW * 0.05);
            fill('#fb7185');
            ellipse(x, y, panelW * 0.028, panelW * 0.028);
          }
        }
        fill('#f8fafc');
        ellipse(0, 0, panelW * 0.16, panelW * 0.16);
        fill('#c084fc');
        ellipse(0, 0, panelW * 0.08, panelW * 0.08);
        drawModuleProgressBar(0, panelH * 0.32, panelW * 0.6, state.progress, '#38bdf8');
        pop();
      }

      function drawUniverseModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.universe;
        if (!state) return;
        push();
        translate(center.x, center.y);
        fill('#0b1220');
        rect(0, 0, panelW * 0.9, panelH * 0.72, 14);
        stroke('#1d4ed8');
        strokeWeight(2);
        noFill();
        ellipse(0, 0, panelW * 0.74, panelH * 0.52);
        ellipse(0, 0, panelW * 0.52, panelH * 0.36);
        noStroke();
        for (let node of state.nodes || []) {
          let angle = state.angle + node.offset;
          let x = Math.cos(angle) * panelW * node.radius;
          let y = Math.sin(angle) * panelH * node.radius * 0.6;
          let size = Math.max(4, panelW * node.size * 0.4);
          fill(withAlpha('#38bdf8', 210));
          rect(x, y, size, size, 3);
        }
        fill('#fde68a');
        rect(0, 0, panelW * 0.14, panelW * 0.14, 4);
        drawModuleProgressBar(0, panelH * 0.34, panelW * 0.6, state.progress, '#22d3ee');
        pop();
      }

      function drawSingularityModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.singularity;
        if (!state) return;
        push();
        translate(center.x, center.y);
        fill('#050910');
        rect(0, 0, panelW * 0.86, panelH * 0.7, 14);
        let halo = 1 + Math.sin((state.halo || 0)) * 0.08;
        stroke('#fb7185');
        strokeWeight(2);
        noFill();
        ellipse(0, 0, panelW * 0.64 * halo, panelH * 0.46 * halo);
        stroke('#38bdf8');
        ellipse(0, 0, panelW * 0.5 * halo, panelH * 0.36 * halo);
        noStroke();
        fill('#0f172a');
        rect(0, 0, panelW * 0.24, panelW * 0.24, 6);
        fill('#f8fafc');
        rect(0, 0, panelW * 0.08, panelW * 0.08, 4);
        for (let shard of state.shards) {
          let radius = panelW * 0.32 + (1 - shard.life) * panelW * 0.16;
          let size = Math.max(4, panelW * 0.08 * shard.life);
          let angle = shard.angle + state.orbit;
          let x = Math.cos(angle) * radius;
          let y = Math.sin(angle) * radius * 0.6;
          fill(withAlpha('#fde68a', shard.life * 220));
          rect(x, y, size, size, 3);
        }
        drawModuleProgressBar(0, panelH * 0.34, panelW * 0.6, state.progress || 0, '#fb7185');
        pop();
      }

      function drawModuleProgressBar(offsetX, offsetY, width, progress, colorHex) {
        push();
        translate(offsetX, offsetY);
        let h = scaledY(10);
        fill(withAlpha('#020617', 200));
        rect(0, 0, width, h, h / 2);
        if (progress > 0) {
          let clamped = constrain(progress, 0, 1);
          let barWidth = Math.max(4, width * clamped);
          fill(withAlpha(colorHex, 230));
          rect(-width / 2 + barWidth / 2, 0, barWidth, h, h / 2);
        }
        pop();
      }

      function drawFullscreenToggle(rectInfo, key, enabled) {
        let size = Math.max(16, scaledX(16));
        let x = rectInfo.x + rectInfo.width - size / 2 - scaledX(12);
        let y = rectInfo.y + size / 2 + scaledY(12);
        let active = fullscreenModule === key;
        push();
        rectMode(CENTER);
        stroke('#0f172a');
        strokeWeight(1);
        let baseColor = enabled
          ? active
            ? '#22d3ee'
            : '#1e3a8a'
          : '#111c2d';
        fill(baseColor);
        rect(x, y, size, size, 4);
        noStroke();
        fill(active ? '#0b1120' : '#cbd5f5');
        let inset = size * 0.35;
        if (active) {
          rect(x, y, size - inset, size - inset, 2);
        } else {
          rect(x - inset / 2, y - inset / 2, size / 2, size / 2, 2);
          rect(x + inset / 2, y + inset / 2, size / 2, size / 2, 2);
        }
        pop();
        if (enabled) {
        addButton({ action: 'toggleFullscreen', key, x, y, w: size, h: size });
        }
      }

      function drawJarFrame(machine) {
        let rectInfo = getMachineRect(machine);
        let center = getMachineCenter(rectInfo);
        let panelW = rectInfo.width * 0.92;
        let panelH = rectInfo.height * 0.86;
        push();
        rectMode(CENTER);
        if (selectedModule === machine.key) {
          stroke('#facc15');
          strokeWeight(4);
          noFill();
          rect(center.x, center.y, panelW + scaledX(18), panelH + scaledY(18), 28);
        }
        stroke('#1d4ed8');
        strokeWeight(2);
        fill(withAlpha('#020617', 180));
        rect(center.x, center.y, panelW, panelH, 22);
        fill('#a5b4fc');
        textSize(scaledFont(12));
        text('Sandfall Jar', center.x, center.y - panelH / 2 + scaledY(14));
        pop();
        drawFullscreenToggle(rectInfo, machine.key, true);
      }

      function drawJarInterior() {
        if (jarRect.width <= 0 || jarRect.height <= 0) return;
        let centerX = jarRect.left + jarRect.width / 2;
        let centerY = jarRect.top + jarRect.height / 2;
        let corner = Math.min(jarRect.width, jarRect.height) * 0.18;
        push();
        rectMode(CENTER);
        noStroke();
        fill(withAlpha('#081527', 240));
        rect(centerX, centerY, jarRect.width, jarRect.height, corner);
        let totalLayers = strataLayers.length;
        if (totalLayers > 0) {
          let segmentHeight = jarRect.height / totalLayers;
          for (let i = 0; i < totalLayers; i++) {
            let state = layerStates[i];
            let layer = strataLayers[i];
            let ratio = 0;
            if (state.completed) {
              ratio = 1;
            } else if (state.unlocked) {
              ratio = constrain(state.progress / layer.requirement, 0, 1);
            }
            let alpha = 80 + ratio * 160;
            fill(withAlpha(layer.color, alpha));
            let y = jarRect.top + segmentHeight * (i + 0.5);
            rect(centerX, y, jarRect.width - 8, segmentHeight + 4, corner * 0.6);
          }
        }
        let nozzleH = Math.max(12, jarRect.height * 0.12);
        fill('#1e293b');
        rect(centerX, jarRect.top - nozzleH * 0.45, jarRect.width * 0.6, nozzleH, corner * 0.5);
        fill('#38bdf8');
        rect(centerX, jarRect.top - nozzleH * 0.2, jarRect.width * 0.22, nozzleH * 0.6, corner * 0.4);
        let trayH = Math.max(10, jarRect.height * 0.08);
        fill('#10203a');
        rect(centerX, jarRect.top + jarRect.height + trayH * 0.4, jarRect.width * 0.78, trayH, corner * 0.4);
        pop();
      }

      function drawJarOverlay() {
        if (jarRect.width <= 0 || jarRect.height <= 0) return;
        let centerX = jarRect.left + jarRect.width / 2;
        let centerY = jarRect.top + jarRect.height / 2;
        let corner = Math.min(jarRect.width, jarRect.height) * 0.18;
        push();
        rectMode(CENTER);
        noFill();
        stroke('#38bdf8');
        strokeWeight(2);
        rect(centerX, centerY, jarRect.width, jarRect.height, corner);
        noStroke();
        fill(withAlpha('#f8fafc', 40));
        rect(
          centerX - jarRect.width * 0.18,
          centerY - jarRect.height * 0.12,
          jarRect.width * 0.08,
          jarRect.height * 0.6,
          corner * 0.6
        );
        fill('#e2e8f0');
        textSize(scaledFont(10));
        text('Click or press Space/E to drop sand', centerX, jarRect.top - scaledY(20));
        let jarMachine = machineDefinitions.find((m) => m.key === 'jar');
        if (jarMachine) {
          fill('#94a3b8');
          textSize(scaledFont(10));
          text(jarMachine.description, centerX, jarRect.top + jarRect.height + scaledY(18));
        }
        pop();
      }

      function updateCollageLayout() {
        let horizontalPadding = Math.max(24, PLAY_AREA_W * 0.04);
        let topPadding = Math.max(32, SCREEN_H * 0.08);
        let bottomPadding = Math.max(32, SCREEN_H * 0.08);
        let availableWidth = Math.max(220, PLAY_AREA_W - horizontalPadding * 2);
        let availableHeight = Math.max(220, SCREEN_H - topPadding - bottomPadding);
        let size = Math.min(availableWidth, availableHeight);
        let rightMargin = Math.max(horizontalPadding, PLAY_AREA_W * 0.08);
        collageLayout.left = Math.max(horizontalPadding, PLAY_AREA_W - size - rightMargin);
        collageLayout.top = topPadding;
        collageLayout.width = size;
        collageLayout.height = size;
        collageLayout.cellWidth = size / 3;
        collageLayout.cellHeight = size / 3;
        let jarMachine = machineDefinitions.find((m) => m.key === 'jar');
        if (jarMachine) {
          let rect = getMachineRect(jarMachine);
          let jarWidth;
          let jarHeight;
          if (fullscreenModule === 'jar') {
            jarWidth = Math.round(rect.width * 0.92);
            jarHeight = Math.round(rect.height * 0.9);
          } else {
            let targetWidth = PLAY_AREA_W * 0.28;
            let maxWidth = rect.width * 0.82;
            jarWidth = Math.max(
              MAX_POWDER_SIZE + 6,
              Math.min(targetWidth, maxWidth)
            );
            let maxHeight = rect.height * 0.92;
            let targetHeight = SCREEN_H * 0.5;
            jarHeight = Math.max(
              MAX_POWDER_SIZE + 32,
              Math.min(targetHeight, maxHeight)
            );
          }
          jarRect.width = Math.round(jarWidth);
          jarRect.height = Math.round(jarHeight);
          jarRect.left = Math.round(rect.x + (rect.width - jarRect.width) / 2);
          jarRect.top = Math.round(rect.y + (rect.height - jarRect.height) / 2);
        }
      }

      function getMachineRect(machine) {
        if (!machine) {
          return { x: collageLayout.left, y: collageLayout.top, width: 0, height: 0 };
        }
        if (fullscreenModule === machine.key) {
          let paddingX = scaledX(24);
          let width = Math.max(220, PLAY_AREA_W - paddingX);
          width = Math.min(width, PLAY_AREA_W - scaledX(32));
          let height = Math.max(220, SCREEN_H - scaledY(96));
          height = Math.min(height, SCREEN_H - scaledY(48));
          let x = Math.max(scaledX(16), (PLAY_AREA_W - width) / 2);
          let y = scaledY(24);
          return { x, y, width, height };
        }
        let width = collageLayout.cellWidth * (machine.grid.width || 1);
        let height = collageLayout.cellHeight * (machine.grid.height || 1);
        let x = collageLayout.left + collageLayout.cellWidth * machine.grid.col;
        let y = collageLayout.top + collageLayout.cellHeight * machine.grid.row;
        return { x, y, width, height };
      }

      function getMachineCenter(rectInfo) {
        return {
          x: rectInfo.x + rectInfo.width / 2,
          y: rectInfo.y + rectInfo.height / 2
        };
      }

      function isMachineUnlocked(key) {
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

      function isInsideJar(x, y) {
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
          let p = powders[i];
          p.fallProgress = (p.fallProgress || 0) + fallCells;
          let removed = false;
          while (p.fallProgress >= 1 && !removed) {
            clearPowderCells(p);
            let moveResult = tryMovePowder(p, i);
            if (moveResult === 'removed') {
              removed = true;
              break;
            }
            if (moveResult) {
              p.fallProgress -= 1;
            } else {
              p.fallProgress = 0;
            }
            occupyPowderCells(p);
            if (!moveResult) {
              break;
            }
          }
          if (removed) {
            continue;
          }
        }
        updateDuneMultiplierFromGrid();
      }

      function renderPowders() {
        if (!jarVisible) return;
        if (jarRect.width <= 0 || jarRect.height <= 0) return;
        push();
        noStroke();
        rectMode(CORNER);
        for (let p of powders) {
          fill(powderTypes[p.type].color);
          let size = getPowderSize(p);
          let width = size * cellPixelSize;
          let x = jarRect.left + p.col * cellPixelSize;
          let y = jarRect.top + p.row * cellPixelSize;
          rect(x, y, width, width);
        }
        pop();
      }

      function collectPowder(powder) {
        if (powder.collected) return;
        let type = powder.type;
        let bonusPowder = researchState.quantum || 0;
        let powderGain = 1 + bonusPowder;
        powderCounts[type] += powderGain;
        totalPowderCollected += powderGain;
        let baseValue = powderTypes[type].dustValue;
        let dustGain = Math.round(
          baseValue * getDustMultiplier() * duneDustMultiplier
        );
        dust += dustGain;
        totalDustEarned += dustGain;
        addLayerProgress(baseValue * powderGain);
        powder.collected = true;
      }

      function tryMovePowder(powder, index) {
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

      function isHoleSpan(col, size) {
        if (gridCols <= 0) return false;
        let collectorWidth = Math.max(size, Math.floor(gridCols * 0.2));
        collectorWidth = Math.min(collectorWidth, Math.floor(gridCols * 0.6));
        let start = Math.floor((gridCols - collectorWidth) / 2);
        return col >= start && col + size <= start + collectorWidth;
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
            if (grid[r][c]) {
              heightCells = gridRows - r;
              break outer;
            }
          }
        }
        duneHeightUnits = Math.max(0, heightCells);
        duneDustMultiplier = 1 + duneHeightUnits * 0.1;
      }

      function refreshPowderGrid(rescale = false) {
        let prevCols = gridCols || 1;
        let prevRows = gridRows || 1;
        let widthPixels = Math.max(jarRect.width, PLAY_AREA_W * 0.3);
        let heightPixels = Math.max(jarRect.height, SCREEN_H * 0.4);
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
          clampPowderToBounds(p);
          occupyPowderCells(p);
        }
      }

      function getUpgradeLevel(key) {
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

      function updateAutoDroppers() {
        for (let i = 0; i < autoDroppers.length; i++) {
          if (autoDroppers[i] <= 0) continue;
          if (!(i === 0 || tierUpgrades[i - 1])) continue;
          let baseInterval = BASE_DROPPER_INTERVAL / (1 + (autoDroppers[i] - 1) * 0.4);
          baseInterval /= getAutoDropperSpeedMultiplier();
          dropperTimers[i] -= deltaTime;
          if (dropperTimers[i] <= 0) {
            for (let d = 0; d < autoDroppers[i]; d++) {
              dropPowder(i);
            }
            dropperTimers[i] += Math.max(320, baseInterval);
          }
        }
      }

      function updateAutomationControllers() {
        if (automationSettings.autoDrop && automationUnlocks.autoDrop) {
          let interval = Math.max(
            260,
            AUTO_DROP_INTERVAL / getAutomationIntervalMultiplier()
          );
          autoDropTimer -= deltaTime;
          if (autoDropTimer <= 0) {
            dropPowder(selectedPowder);
            autoDropTimer += interval;
          }
        } else {
          autoDropTimer = 0;
        }

        if (
          automationSettings.autoCompress &&
          automationUnlocks.autoCompress &&
          getUpgradeLevel('compressor') > 0
        ) {
          let interval = Math.max(
            380,
            AUTO_COMPRESS_INTERVAL / getAutomationIntervalMultiplier()
          );
          autoCompressTimer -= deltaTime;
          if (autoCompressTimer <= 0) {
            attemptAutoCompression();
            autoCompressTimer += interval;
          }
        } else {
          autoCompressTimer = 0;
        }
      }

      function attemptAutoCompression() {
        let efficiency = getCompressorEfficiency();
        if (efficiency <= 0) return;
        let availableRecipes = compressionRecipes
          .filter((recipe) =>
            recipe.to === 0 ? true : tierUpgrades[recipe.to - 1]
          )
          .sort((a, b) => b.to - a.to);
        for (let recipe of availableRecipes) {
          let cost = Math.max(2, Math.round(recipe.baseCost / efficiency));
          if (powderCounts[recipe.from] >= cost) {
            powderCounts[recipe.from] -= cost;
            powderCounts[recipe.to] += recipe.output;
            break;
          }
        }
      }

      function drawMenu() {
        let panelLeft = PLAY_AREA_W;
        let panelRight = SCREEN_W;
        let panelWidth = MENU_W;
        let panelCenter = panelLeft + panelWidth / 2;
        fill('#0f172a');
        rect(panelCenter, SCREEN_H / 2, panelWidth, SCREEN_H);

        menuContentArea.left = panelLeft + scaledX(20);
        menuContentArea.right = panelRight - scaledX(20);
        menuContentArea.width = Math.max(
          0,
          menuContentArea.right - menuContentArea.left
        );
        menuContentArea.center =
          (menuContentArea.left + menuContentArea.right) / 2;

        let headerBottom = drawResourceHeader(panelCenter);
        let tabs = getUnlockedMenuTabs();
        if (tabs.length === 0) {
          menuContentArea.bottom = SCREEN_H - scaledY(32);
          drawDropButton(true);
          return;
        }
        if (!tabs.some((tab) => tab.key === activeMenu)) {
          activeMenu = tabs[tabs.length - 1].key;
        }
        let tabsBottom = drawMenuTabs(headerBottom + scaledY(8), tabs);
        let contentTop = tabsBottom + scaledY(14);
        let contentBottom = SCREEN_H - scaledY(90);
        menuContentArea.top = contentTop;
        menuContentArea.bottom = contentBottom;
        menuContentArea.height = Math.max(0, contentBottom - contentTop);

        let visibleHeight = Math.max(0, menuContentArea.bottom - menuContentArea.top);
        let contentStart = menuContentArea.top - menuScroll;
        let contentEnd = contentStart;
        let clipWidth = menuContentArea.width;
        if (clipWidth > 0 && visibleHeight > 0) {
          drawingContext.save();
          drawingContext.beginPath();
          drawingContext.rect(
            menuContentArea.left,
            menuContentArea.top,
            clipWidth,
            visibleHeight
          );
          drawingContext.clip();
          menuContentArea.scrollOffset = menuScroll;
          contentEnd = drawActiveMenuContent(contentStart);
          drawingContext.restore();
        } else {
          menuContentArea.scrollOffset = menuScroll;
          contentEnd = drawActiveMenuContent(contentStart);
        }
        menuContentArea.scrollOffset = 0;
        let contentHeight = contentEnd - contentStart;
        menuScrollMax = Math.max(0, contentHeight - visibleHeight);
        menuScroll = constrain(menuScroll, 0, menuScrollMax);

        drawDropButton(activeMenu !== 'jar');
      }

      function drawResourceHeader(panelCenter) {
        let headerY = scaledY(32);
        fill('#f8fafc');
        textSize(scaledFont(13));
        text(
          `Dust: ${Math.floor(dust)} | Cores: ${crystalCores} | Powder: ${totalPowderCollected}`,
          panelCenter,
          headerY
        );
        let nextLineY = headerY + scaledY(20);
        if (milestoneMessage) {
          fill('#38bdf8');
          textSize(scaledFont(10));
          text(milestoneMessage, panelCenter, nextLineY);
          nextLineY += scaledY(18);
        }
        let nextY = drawPowderCounters(nextLineY + scaledY(8));
        textSize(scaledFont(14));
        return nextY;
      }

      function drawPowderCounters(y) {
        fill('#cfd8dc');
        textSize(scaledFont(12));
        let unlocked = getUnlockedIndices();
        if (unlocked.length === 0) {
          text('No powders unlocked yet.', menuContentArea.center || SCREEN_W / 2, y);
          return y + scaledY(20);
        }
        let split = Math.ceil(unlocked.length / 2);
        let firstLine = unlocked
          .slice(0, split)
          .map((i) => `${powderTypes[i].name}: ${powderCounts[i]}`)
          .join('   ');
        let secondLine = unlocked
          .slice(split)
          .map((i) => `${powderTypes[i].name}: ${powderCounts[i]}`)
          .join('   ');
        text(firstLine, menuContentArea.center || SCREEN_W / 2, y);
        if (secondLine.length > 0) {
          text(secondLine, menuContentArea.center || SCREEN_W / 2, y + scaledY(16));
          return y + scaledY(32);
        }
        return y + scaledY(20);
      }

      function isMenuTabUnlocked(key) {
        let tab = menuTabs.find((t) => t.key === key);
        if (!tab) return false;
        if (tab.requiresMilestone) {
          let state = getMilestoneState(tab.requiresMilestone);
          if (!state || !state.achieved) {
            return false;
          }
        }
        if (!tab.machine || tab.machine === 'jar') return true;
        return isMachineUnlocked(tab.machine);
      }

      function getUnlockedMenuTabs() {
        let available = [];
        for (let tab of menuTabs) {
          if (!isMenuTabUnlocked(tab.key)) {
            break;
          }
          available.push(tab);
        }
        return available;
      }

      function drawMenuTabs(y, tabs) {
        if (!tabs || tabs.length === 0) {
          return y;
        }
        let columns = Math.min(3, tabs.length);
        let rows = Math.ceil(tabs.length / columns);
        let tabH = scaledY(28);
        let spacingY = scaledY(10);
        let currentY = y;
        textSize(scaledFont(12));
        for (let row = 0; row < rows; row++) {
          let rowTabs = tabs.slice(row * columns, row * columns + columns);
          let availableWidth = menuContentArea.width || SCREEN_W - scaledX(80);
          let tabW = Math.min(
            scaledX(120),
            Math.max(
              scaledX(60),
              availableWidth / Math.max(1, rowTabs.length) - scaledX(8)
            )
          );
          let xs = getRowPositions(rowTabs.length);
          for (let i = 0; i < rowTabs.length; i++) {
            let tab = rowTabs[i];
            let active = tab.key === activeMenu;
            fill(active ? '#22d3ee' : '#1b2640');
            rect(xs[i], currentY, tabW, tabH, 8);
            fill(active ? '#071426' : '#f0f4f8');
            text(tab.label, xs[i], currentY);
            addButton(
              {
                action: 'switchMenu',
                key: tab.key,
                x: xs[i],
                y: currentY,
                w: tabW,
                h: tabH
              }
            );
          }
          currentY += tabH + spacingY;
        }
        textSize(scaledFont(14));
        return currentY - spacingY + scaledY(2);
      }

      function drawSectionHeader(title, y) {
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
        fill('#38bdf8');
        text(title.toUpperCase(), left, y);
        stroke('#17233b');
        strokeWeight(2);
        line(left, y + scaledY(12), right, y + scaledY(12));
        pop();
        return y + scaledY(28);
      }

      function drawJarMenu(y) {
        y = drawSectionHeader('Powder Selection', y);
        y = drawPowderSelectRow(y + scaledY(8));
        y = drawSectionHeader('Tier Unlocks', y + scaledY(10));
        y = drawTierUpgradeRow(y + scaledY(8));
        y = drawSectionHeader('Gravity Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['gravity'], y + scaledY(10));
        y = drawSectionHeader('Geologic Layers', y + scaledY(12));
        for (let i = 0; i < strataLayers.length; i++) {
          y = drawLayerCard(strataLayers[i], layerStates[i], y);
        }
        return y;
      }

      function drawConveyorMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('conveyor', y + scaledY(10));
        y = drawSectionHeader('Auto Feeders', y + scaledY(12));
        y = drawAutoDropperRow(y + scaledY(8));
        y = drawSectionHeader('Belt Diagnostics', y + scaledY(12));
        y = drawConveyorNotes(y + scaledY(10));
        return y;
      }

      function drawRocketMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('rocket', y + scaledY(10));
        y = drawSectionHeader('Refinery Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['refinery'], y + scaledY(10));
        y = drawSectionHeader('Launch Status', y + scaledY(12));
        y = drawRocketStatus(y + scaledY(12));
        return y;
      }

      function drawAsteroidMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('asteroid', y + scaledY(10));
        y = drawSectionHeader('Crucible Report', y + scaledY(12));
        y = drawAsteroidStatus(y + scaledY(12));
        return y;
      }

      function drawPlanetMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('planet', y + scaledY(10));
        y = drawSectionHeader('Planetary Ledger', y + scaledY(12));
        y = drawPlanetStatus(y + scaledY(12));
        return y;
      }

      function drawForgeMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('forge', y + scaledY(10));
        y = drawSectionHeader('Compression Engine', y + scaledY(12));
        y = drawSpecificUpgradeRow(['compressor'], y + scaledY(10));
        y = drawSectionHeader('Transmutation Matrix', y + scaledY(12));
        y = drawCompressionRow(y + scaledY(16));
        return y;
      }

      function drawGalaxyMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('galaxy', y + scaledY(10));
        y = drawSectionHeader('Luminous Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['lanterns'], y + scaledY(10));
        y = drawSectionHeader('Arcane Research', y + scaledY(12));
        y = drawResearchRows(y + scaledY(10));
        return y;
      }

      function drawUniverseMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('universe', y + scaledY(10));
        y = drawSectionHeader('Resonance Upgrades', y + scaledY(12));
        y = drawSpecificUpgradeRow(['harmonics'], y + scaledY(10));
        y = drawSectionHeader('Automation Scripts', y + scaledY(12));
        y = drawAutomationControls(y + scaledY(10));
        return y;
      }

      function drawSingularityMenu(y) {
        y = drawSectionHeader('Module Upgrades', y);
        y = drawModuleUpgradeList('singularity', y + scaledY(10));
        y = drawSectionHeader('Crystal Ledger', y + scaledY(12));
        y = drawSingularityStats(y + scaledY(10));
        y = drawSectionHeader('Crystallization', y + scaledY(12));
        y = drawPrestigeRow(y + scaledY(18));
        return y;
      }

      function drawCodexMenu(y) {
        y = drawSectionHeader('Epoch Milestones', y);
        for (let i = 0; i < milestoneConfigs.length; i++) {
          y = drawMilestoneCard(milestoneConfigs[i], milestoneStates[i], y + scaledY(6));
        }
        y = drawSectionHeader('Development Roadmap', y + scaledY(18));
        y = drawDevelopmentNotes(y + scaledY(10));
        return y;
      }

      function drawActiveMenuContent(y) {
        switch (activeMenu) {
          case 'jar':
            return drawJarMenu(y);
          case 'conveyor':
            return drawConveyorMenu(y);
          case 'rocket':
            return drawRocketMenu(y);
          case 'asteroid':
            return drawAsteroidMenu(y);
          case 'planet':
            return drawPlanetMenu(y);
          case 'forge':
            return drawForgeMenu(y);
          case 'galaxy':
            return drawGalaxyMenu(y);
          case 'universe':
            return drawUniverseMenu(y);
          case 'singularity':
            return drawSingularityMenu(y);
          case 'codex':
            return drawCodexMenu(y);
          default:
            return y;
        }
      }

      function drawMilestoneCard(config, state, y) {
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let cardH = scaledY(78);
        let x = menuContentArea.center || SCREEN_W / 2;
        let progressValue = getMilestoneResourceValue(config.resource);
        let ratio = config.requirement > 0
          ? constrain(progressValue / config.requirement, 0, 1)
          : 1;
        let achieved = state && state.achieved;
        let unlocked = state && state.unlocked;
        let baseColor = achieved ? '#0ea5e9' : unlocked ? '#1e3a8a' : '#1e293b';
        fill(withAlpha(baseColor, achieved ? 230 : unlocked ? 190 : 140));
        rect(x, y, cardW, cardH, 12);
        fill('#f8fafc');
        textSize(scaledFont(12));
        text(config.name, x, y - scaledY(22));
        fill('#cbd5f5');
        textSize(scaledFont(10));
        text(config.description, x, y - scaledY(6));
        fill('#94a3b8');
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
        fill('#0f172a');
        rect(barX, barY, barW, barH, 4);
        let filled = Math.max(0, Math.min(barW, barW * ratio));
        fill(achieved ? '#22d3ee' : '#3b82f6');
        rect(barX, barY, filled, barH, 4);
        pop();
        return y + cardH + scaledY(8);
      }

      function drawDevelopmentNotes(y) {
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
        fill('#cbd5f5');
        for (let note of notes) {
          text(`• ${note}`, left, y);
          y += scaledY(18);
        }
        pop();
        return y + scaledY(6);
      }

      function drawLayerCard(layer, state, y) {
        let cardW = menuContentArea.width || SCREEN_W - scaledX(60);
        let cardH = scaledY(70);
        let x = menuContentArea.center || SCREEN_W / 2;
        let ratio = state.completed
          ? 1
          : state.unlocked
          ? constrain(state.progress / layer.requirement, 0, 1)
          : 0;
        fill(withAlpha(layer.color, state.unlocked ? 200 : 90));
        rect(x, y, cardW, cardH, 12);
        fill('#f8fafc');
        textSize(scaledFont(12));
        text(layer.name, x, y - scaledY(18));
        fill('#e0e7ff');
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
        fill('#f8fafc');
        text(statusText, x, y + scaledY(24));
        return y + scaledY(80);
      }

      function drawProgressBar(x, y, width, height, progress, fillColor) {
        push();
        let bg = withAlpha('#0f172a', 200);
        fill(bg);
        rect(x, y, width, height, height / 2);
        if (progress > 0) {
          let barWidth = Math.max(4, width * constrain(progress, 0, 1));
          let center = x - width / 2 + barWidth / 2;
          fill(withAlpha(fillColor, 220));
          rect(center, y, barWidth, height, height / 2);
        }
        pop();
      }

      function drawResearchRows(y) {
        if (researchProjects.length === 0) {
          return y;
        }
        let btnW = Math.min(scaledX(200), (menuContentArea.width || SCREEN_W) / 2);
        let btnH = scaledY(46);
        let xs = getRowPositions(researchProjects.length);
        for (let i = 0; i < researchProjects.length; i++) {
          let project = researchProjects[i];
          let level = researchState[project.key];
          let cost = Math.floor(project.baseCost * Math.pow(project.costMult, level));
          let canBuy = dust >= cost;
          let x = xs[i];
          fill(canBuy ? '#9575cd' : '#4a3f6b');
          rect(x, y, btnW, btnH, 12);
          fill('#f8f9ff');
          textSize(scaledFont(12));
          text(`${project.name} R${level}`, x, y - scaledY(12));
          textSize(scaledFont(11));
          text(project.description, x, y + scaledY(2));
          textSize(scaledFont(11));
          text(`Cost: ${cost}`, x, y + scaledY(16));
          addButton(
            {
              action: 'buyResearch',
              key: project.key,
              x,
              y,
              w: btnW,
              h: btnH
            },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + btnH + scaledY(18);
      }

      function drawAutomationControls(y) {
        let controls = [
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
        let btnW = Math.min(scaledX(200), (menuContentArea.width || SCREEN_W) / 2);
        let btnH = scaledY(52);
        let xs = getRowPositions(controls.length);
        for (let i = 0; i < controls.length; i++) {
          let control = controls[i];
          let enabled = automationSettings[control.key];
          let unlocked = automationUnlocks[control.key];
          let x = xs[i];
          if (unlocked) {
            fill(enabled ? '#66bb6a' : '#455a64');
            rect(x, y, btnW, btnH, 12);
            fill(enabled ? '#0b1120' : '#f8fafc');
            textSize(scaledFont(12));
            text(`${control.label}: ${enabled ? 'ON' : 'OFF'}`, x, y - scaledY(12));
            textSize(scaledFont(11));
            text(control.description, x, y + scaledY(6));
            addButton(
              {
                action: 'toggleAutomation',
                key: control.key,
                x,
                y,
                w: btnW,
                h: btnH
              },
              { scrollAware: true }
            );
          } else {
            fill('#1e293b');
            rect(x, y, btnW, btnH, 12);
            fill('#64748b');
            textSize(scaledFont(12));
            text(`${control.label}: Locked`, x, y - scaledY(12));
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
                y + scaledY(4)
              );
            } else {
              text('Progress deeper to unlock automation.', x, y + scaledY(4));
            }
          }
        }
        textSize(scaledFont(14));
        return y + btnH + scaledY(18);
      }

      function drawPowderSelectRow(y) {
        let indices = getUnlockedIndices();
        if (indices.length === 0) return y;
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(
          scaledX(110),
          Math.max(scaledX(72), maxWidth / Math.max(1, indices.length) - scaledX(12))
        );
        let btnH = scaledY(32);
        let xs = getRowPositions(indices.length);
        textSize(scaledFont(13));
        for (let idx = 0; idx < indices.length; idx++) {
          let i = indices[idx];
          let x = xs[idx];
          let isSelected = i === selectedPowder;
          let baseColor = powderTypes[i].color;
          fill(isSelected ? '#22d3ee' : withAlpha(baseColor, 200));
          rect(x, y, btnW, btnH, 10);
          fill(isSelected ? '#0b1120' : '#f8fafc');
          text(powderTypes[i].name, x, y);
          addButton(
            {
              action: 'selectPowder',
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

      function drawTierUpgradeRow(y) {
        let btnW = scaledX(110);
        let btnH = scaledY(30);
        let xs = getRowPositions(tierUnlockCosts.length);
        textSize(scaledFont(11));
        for (let i = 0; i < tierUnlockCosts.length; i++) {
          let x = xs[i];
          let cost = tierUnlockCosts[i];
          let canUpgrade = powderCounts[i] >= cost && !tierUpgrades[i];
          fill(canUpgrade ? '#4caf50' : '#546e7a');
          rect(x, y, btnW, btnH, 8);
          fill('#fff');
          text(
            tierUpgrades[i]
              ? `${powderTypes[i + 1].name} unlocked`
              : `Unlock ${powderTypes[i + 1].name} (-${cost})`,
            x,
            y
          );
          addButton(
            {
              action: 'tierUpgrade',
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

      function drawAutoDropperRow(y) {
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
          let i = indices[idx];
          let x = xs[idx];
          let cost = getDropperCost(i);
          let canBuy = dust >= cost;
          fill(canBuy ? '#009688' : '#455a64');
          rect(x, y, btnW, btnH, 8);
          fill('#fff');
          text(
            `Auto ${powderTypes[i].name}: ${autoDroppers[i]} (\u2212${cost})`,
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

      function drawUpgradeRows(y) {
        let columns = Math.min(3, upgradeConfigs.length);
        let btnW = scaledX(120);
        let btnH = scaledY(34);
        let rows = Math.ceil(upgradeConfigs.length / columns);
        textSize(scaledFont(10));
        for (let r = 0; r < rows; r++) {
          let start = r * columns;
          let end = Math.min(start + columns, upgradeConfigs.length);
          let count = end - start;
          let xs = getRowPositions(count);
          for (let c = 0; c < count; c++) {
          let config = upgradeConfigs[start + c];
          let level = getUpgradeLevel(config.key);
            let cost = getUpgradeCost(config);
            let canBuy = dust >= cost;
            let x = xs[c];
            let rowY = y + scaledY(r * 36);
            fill(canBuy ? '#8e24aa' : '#4a148c');
            rect(x, rowY, btnW, btnH, 8);
            fill('#fff');
            text(
              `${config.name} Lv.${level} (\u2212${cost})`,
              x,
              rowY - scaledY(8)
            );
            text(config.description, x, rowY + scaledY(6));
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

      function drawSpecificUpgradeRow(keys, y) {
        let configs = upgradeConfigs.filter((config) => keys.includes(config.key));
        if (configs.length === 0) {
          return y;
        }
        let btnW = scaledX(140);
        let btnH = scaledY(34);
        let xs = getRowPositions(configs.length);
        textSize(scaledFont(10));
        for (let i = 0; i < configs.length; i++) {
          let config = configs[i];
          let level = getUpgradeLevel(config.key);
          let cost = getUpgradeCost(config);
          let canBuy = dust >= cost;
          let x = xs[i];
          fill(canBuy ? '#8e24aa' : '#4a148c');
          rect(x, y, btnW, btnH, 8);
          fill('#fff');
          text(`${config.name} Lv.${level} (\u2212${cost})`, x, y - scaledY(8));
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
        return y + scaledY(36);
      }

      function drawModuleUpgradeList(moduleKey, y) {
        let configs = upgradeConfigs.filter((config) => config.module === moduleKey);
        if (configs.length === 0) {
          return y;
        }
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let columns = configs.length >= 3 ? 3 : Math.min(2, configs.length);
        let btnW = Math.min(
          scaledX(180),
          Math.max(scaledX(130), maxWidth / Math.max(1, columns) - scaledX(16))
        );
        let btnH = scaledY(60);
        let rows = Math.ceil(configs.length / columns);
        for (let r = 0; r < rows; r++) {
          let rowConfigs = configs.slice(r * columns, r * columns + columns);
          let xs = getRowPositions(rowConfigs.length);
          for (let i = 0; i < rowConfigs.length; i++) {
            let config = rowConfigs[i];
            let level = getUpgradeLevel(config.key);
            let cost = getUpgradeCost(config);
            let canBuy = dust >= cost;
            let rowY = y + scaledY(r * 68);
            let x = xs[i];
            fill(canBuy ? '#facc15' : '#854d0e');
            rect(x, rowY, btnW, btnH, 12);
            fill(canBuy ? '#0f172a' : '#f8fafc');
            textSize(scaledFont(11));
            text(`${config.name} Lv.${level}`, x, rowY - scaledY(16));
            textSize(scaledFont(10));
            fill('#f8fafc');
            text(`Cost: ${cost} dust`, x, rowY - scaledY(2));
            textSize(scaledFont(9));
            fill('#e2e8f0');
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
        return y + scaledY(rows * 68);
      }

      function drawCompressionRow(y) {
        if (getUpgradeLevel('compressor') <= 0) {
          textSize(scaledFont(11));
          fill('#b0bec5');
          text(
            'Purchase the Powder Compressor to unlock conversion recipes.',
            menuContentArea.center || SCREEN_W / 2,
            y
          );
          textSize(scaledFont(14));
          return y + scaledY(34);
        }

        let availableRecipes = compressionRecipes.filter((recipe) =>
          recipe.to === 0 ? true : tierUpgrades[recipe.to - 1]
        );
        if (availableRecipes.length === 0) {
          return y;
        }
        let maxWidth = menuContentArea.width || SCREEN_W - scaledX(80);
        let btnW = Math.min(
          scaledX(160),
          Math.max(scaledX(120), maxWidth / Math.max(1, availableRecipes.length) - scaledX(12))
        );
        let btnH = scaledY(28);
        let xs = getRowPositions(availableRecipes.length);
        textSize(scaledFont(11));
        let efficiency = getCompressorEfficiency();
        for (let i = 0; i < availableRecipes.length; i++) {
          let recipe = availableRecipes[i];
          let cost = Math.max(2, Math.round(recipe.baseCost / efficiency));
          let x = xs[i];
          let canConvert = powderCounts[recipe.from] >= cost;
          fill(canConvert ? '#ff7043' : '#5d4037');
          rect(x, y, btnW, btnH, 8);
          fill('#fff');
          text(
            `${powderTypes[recipe.from].name} → ${powderTypes[recipe.to].name} (\u2212${cost} +${recipe.output})`,
            x,
            y
          );
          addButton(
            { action: 'compress', recipe, x, y, w: btnW, h: btnH },
            { scrollAware: true }
          );
        }
        textSize(scaledFont(14));
        return y + scaledY(34);
      }

      function drawPrestigeRow(y) {
        let btnW = scaledX(220);
        let btnH = scaledY(38);
        let gain = getPrestigeGain();
        let canPrestige = gain > 0;
        let center = menuContentArea.center || SCREEN_W / 2;
        fill(canPrestige ? '#ffca28' : '#8d6e63');
        rect(center, y, btnW, btnH, 10);
        fill('#222');
        textSize(scaledFont(12));
        text(`Crystallize (+${gain} cores)`, center, y - scaledY(8));
        text(
          'Resets for permanent dust & gravity boosts.',
          center,
          y + scaledY(8)
        );
        textSize(scaledFont(14));
        addButton(
          { action: 'prestige', x: center, y, w: btnW, h: btnH },
          { scrollAware: true }
        );
        return y + btnH + scaledY(12);
      }

      function drawConveyorNotes(y) {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill('#cbd5f5');
        textSize(scaledFont(11));
        text('Conveyors sweep stray grains into the packager.', center, y);
        text(`Every ${CHAIN_REQUIREMENT} grains bundles a fresh package.`, center, y + scaledY(16));
        text('Click the module to jolt the belt and draw faster.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawRocketStatus(y) {
        let state = moduleStates.rocket;
        let center = menuContentArea.center || SCREEN_W / 2;
        fill('#cbd5f5');
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

      function drawAsteroidStatus(y) {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill('#cbd5f5');
        textSize(scaledFont(11));
        text(`Launches awaiting compression: ${powderCounts[2] || 0}`, center, y);
        text(`Asteroids in storage: ${powderCounts[3] || 0}`, center, y + scaledY(16));
        text('Strike the crucible to rattle loose extra rubble.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawPlanetStatus(y) {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill('#cbd5f5');
        textSize(scaledFont(11));
        text(`Asteroids swirling: ${powderCounts[3] || 0}`, center, y);
        text(`Planets formed: ${powderCounts[4] || 0}`, center, y + scaledY(16));
        text('Stabilize orbits by tapping the module rhythmically.', center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
      }

      function drawSingularityStats(y) {
        let center = menuContentArea.center || SCREEN_W / 2;
        fill('#cbd5f5');
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

      function drawDropButton(compact = false) {
        let btnW = scaledX(compact ? 84 : 104);
        let btnH = scaledY(compact ? 28 : 36);
        let dropX =
          (menuContentArea.right || SCREEN_W - scaledX(70)) -
          scaledX(compact ? 18 : 22);
        let dropY =
          (menuContentArea.bottom || SCREEN_H - scaledY(32)) -
          scaledY(compact ? 14 : 18);
        fill(compact ? '#2dd4bf' : '#1976d2');
        rect(dropX, dropY, btnW, btnH, compact ? 8 : 10);
        fill('#f8fafc');
        textSize(scaledFont(compact ? 11 : 12));
        text(compact ? 'Quick Drop' : 'Drop', dropX, dropY);
        textSize(scaledFont(14));
        addButton({ action: 'drop', x: dropX, y: dropY, w: btnW, h: btnH });
      }

      function addButton(btn, options = {}) {
        let entry = { ...btn };
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
        let handled = false;
        for (let btn of buttons) {
          if (
            mouseX > btn.x - btn.w / 2 &&
            mouseX < btn.x + btn.w / 2 &&
            mouseY > btn.y - btn.h / 2 &&
            mouseY < btn.y + btn.h / 2
          ) {
            handleAction(btn);
            handled = true;
            break;
          }
        }
        if (!handled && jarVisible && isInsideJar(mouseX, mouseY)) {
          dropPowder(selectedPowder, mouseX);
        }
      }

      function mouseWheel(event) {
        if (!gameInitialized) {
          return;
        }
        let panelLeft = PLAY_AREA_W;
        if (mouseX >= panelLeft) {
          let delta = event.delta || 0;
          menuScroll = constrain(
            menuScroll + delta * 0.6,
            0,
            menuScrollMax
          );
          return false;
        }
      }

      function handleAction(btn) {
        switch (btn.action) {
          case 'selectPowder':
            selectedPowder = btn.index;
            break;
          case 'tierUpgrade':
            unlockTier(btn.index);
            break;
          case 'drop':
            dropPowder(selectedPowder);
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
              let tab = menuTabs.find((t) => t.key === btn.key);
              if (tab && tab.machine) {
                selectedModule = tab.machine;
              }
            }
            break;
          case 'toggleAutomation':
            toggleAutomation(btn.key);
            break;
          case 'moduleInteract':
            selectedModule = btn.key;
            if (isMenuTabUnlocked(btn.key)) {
              activeMenu = btn.key;
              menuScroll = 0;
              menuScrollMax = 0;
            }
            handleModuleInteraction(btn.key);
            break;
          case 'toggleFullscreen':
            toggleModuleFullscreen(btn.key);
            selectedModule = btn.key;
            break;
        }
      }

      function handleModuleInteraction(key) {
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
        if (!state) return;
        state.spawnTimer = Math.min(state.spawnTimer, 0.25);
        state.grains.push({
          progress: 0,
          speed: 0.9 + Math.random() * 0.4,
          offset: random(-0.12, 0.12),
          size: 0.12
        });
      }

      function boostRockets() {
        let state = moduleStates.rocket;
        if (!state || !state.pods) return;
        for (let pod of state.pods) {
          if (pod.launch > 0) continue;
          if (!pod.fueling && powderCounts[1] >= CHAIN_REQUIREMENT) {
            powderCounts[1] -= CHAIN_REQUIREMENT;
            pod.fueling = true;
            pod.progress = 0;
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

      function toggleModuleFullscreen(key) {
        if (key !== 'jar' && !isMachineUnlocked(key)) {
          return;
        }
        fullscreenModule = fullscreenModule === key ? null : key;
        updateLayoutDimensions(true);
        refreshPowderGrid(true);
      }

      function dropPowder(type, spawnX) {
        if (!(type === 0 || tierUpgrades[type - 1])) {
          return;
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
          return;
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
        if (!canOccupy(0, col, size)) {
          return;
        }
        let powder = {
          col,
          row: 0,
          type: type,
          fallProgress: 0,
          collected: false
        };
        powders.push(powder);
        occupyPowderCells(powder);
      }

      function unlockTier(index) {
        if (tierUpgrades[index]) return;
        let cost = tierUnlockCosts[index];
        if (powderCounts[index] >= cost) {
          powderCounts[index] -= cost;
          tierUpgrades[index] = true;
        }
      }

      function getDropperCost(index) {
        return Math.floor(40 * (index + 1) * Math.pow(1.7, autoDroppers[index]));
      }

      function buyDropper(index) {
        let cost = getDropperCost(index);
        if (dust >= cost) {
          dust -= cost;
          autoDroppers[index]++;
          dropperTimers[index] = 0;
        }
      }

      function getUpgradeCost(config) {
        let level = getUpgradeLevel(config.key);
        return Math.floor(config.baseCost * Math.pow(config.costMult, level));
      }

      function buyUpgrade(key) {
        let config = upgradeConfigs.find((u) => u.key === key);
        if (!config) return;
        let cost = getUpgradeCost(config);
        if (dust >= cost) {
          dust -= cost;
          upgradesState[key]++;
        }
      }

      function buyResearch(key) {
        let project = researchProjects.find((p) => p.key === key);
        if (!project) return;
        let level = researchState[key];
        let cost = Math.floor(project.baseCost * Math.pow(project.costMult, level));
        if (dust >= cost) {
          dust -= cost;
          researchState[key]++;
        }
      }

      function toggleAutomation(key) {
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

      function compressPowder(recipe) {
        if (getUpgradeLevel('compressor') <= 0) return;
        if (!(recipe.to === 0 || tierUpgrades[recipe.to - 1])) return;
        let efficiency = getCompressorEfficiency();
        if (efficiency <= 0) return;
        let cost = Math.max(2, Math.round(recipe.baseCost / efficiency));
        if (powderCounts[recipe.from] >= cost) {
          powderCounts[recipe.from] -= cost;
          powderCounts[recipe.to] += recipe.output;
        }
      }

      function getPrestigeGain() {
        return Math.floor(Math.sqrt(totalDustEarned / 200));
      }

      function performPrestige() {
        let gain = getPrestigeGain();
        if (gain <= 0) return;
        crystalCores += gain;
        dust = 0;
        powders = [];
        powderCounts = new Array(powderTypes.length).fill(0);
        tierUpgrades = new Array(powderTypes.length - 1).fill(false);
        autoDroppers = new Array(powderTypes.length).fill(0);
        dropperTimers = new Array(powderTypes.length).fill(0);
        let hadCompressor = getUpgradeLevel('compressor') > 0;
        upgradesState = createUpgradeState();
        if (hadCompressor && typeof upgradesState.compressor === 'number') {
          upgradesState.compressor = Math.max(1, upgradesState.compressor);
        }
        selectedPowder = 0;
        automationSettings.autoDrop = false;
        automationSettings.autoCompress = false;
        autoDropTimer = 0;
        autoCompressTimer = 0;
        activeMenu = menuTabs[0].key;
        fullscreenModule = null;
        selectedModule = activeMenu === 'jar' ? 'jar' : null;
        moduleStates = createDefaultModuleStates();
        menuScroll = 0;
        menuScrollMax = 0;
        updateLayoutDimensions(true);
        refreshPowderGrid(true);
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

      function getRowPositions(count) {
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

      function withAlpha(hex, alpha) {
        let c = color(hex);
        return color(red(c), green(c), blue(c), alpha);
      }

      function getLayerDustBonus() {
        return layerStates.reduce((bonus, state, index) => {
          if (!state.unlocked) return bonus;
          let ratio = state.completed
            ? 1
            : constrain(state.progress / strataLayers[index].requirement, 0, 1);
          return bonus + strataLayers[index].dustBonus * ratio;
        }, 0);
      }

      function getLayerGravityBonus() {
        return layerStates.reduce((bonus, state, index) => {
          if (!state.unlocked) return bonus;
          let ratio = state.completed
            ? 1
            : constrain(state.progress / strataLayers[index].requirement, 0, 1);
          return bonus + strataLayers[index].gravityBonus * ratio;
        }, 0);
      }

      function getAutoDropperSpeedMultiplier() {
        return (
          1 +
          getUpgradeLevel('gravity') * 0.15 +
          getUpgradeLevel('harmonics') * 0.2 +
          crystalCores * 0.1 +
          (researchState.overclock || 0) * 0.15 +
          getLayerGravityBonus() * 0.5 +
          milestoneBonuses.automation * getMilestoneBonusScale()
        );
      }

      function getAutomationIntervalMultiplier() {
        return (
          1 +
          getUpgradeLevel('harmonics') * 0.2 +
          crystalCores * 0.1 +
          (researchState.overclock || 0) * 0.15 +
          getLayerGravityBonus() * 0.4 +
          milestoneBonuses.automation * getMilestoneBonusScale()
        );
      }

      function addLayerProgress(amount) {
        if (amount <= 0) return;
        let amplified = amount * (1 + getUpgradeLevel('lanterns') * 0.25);
        let target = layerStates.findIndex((state) => state.unlocked && !state.completed);
        if (target === -1) {
          let next = layerStates.findIndex((state) => !state.unlocked);
          if (next >= 0) {
            layerStates[next].unlocked = true;
            target = next;
          }
        }
        if (target === -1) {
          return;
        }
        let state = layerStates[target];
        state.progress = Math.min(
          strataLayers[target].requirement,
          state.progress + amplified
        );
        if (state.progress >= strataLayers[target].requirement) {
          state.completed = true;
          if (target + 1 < layerStates.length) {
            layerStates[target + 1].unlocked = true;
          }
        }
      }

      function scaledFont(value) {
        let scale = Math.min(layoutScaleX, layoutScaleY);
        return constrain(Math.round(value * scale), 10, 28);
      }

      function scaledX(value) {
        return value * layoutScaleX;
      }

      function scaledY(value) {
        return value * layoutScaleY;
      }

      function updateLayoutDimensions(resize = false) {
        let margin = 40;
        let availableWidth = Math.max(windowWidth - margin, BASE_SCREEN_W);
        let availableHeight = Math.max(windowHeight - margin, BASE_SCREEN_H);
        SCREEN_W = Math.round(
          Math.min(Math.max(availableWidth, BASE_SCREEN_W), 1280)
        );
        SCREEN_H = Math.round(
          Math.min(Math.max(availableHeight, BASE_SCREEN_H), 960)
        );
        let desiredMenuW = Math.max(160, Math.round(SCREEN_W * 0.32));
        if (SCREEN_W - desiredMenuW < 240) {
          desiredMenuW = Math.max(120, SCREEN_W - 240);
        }
        MENU_W = Math.max(120, Math.min(desiredMenuW, SCREEN_W - 160));
        PLAY_AREA_W = SCREEN_W - MENU_W;
        layoutScaleX = SCREEN_W / BASE_SCREEN_W;
        layoutScaleY = SCREEN_H / BASE_SCREEN_H;
        cellPixelSize = 1;
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
          for (let i = 0; i < 8; i++) {
            dropPowder(selectedPowder);
          }
        }
      }
