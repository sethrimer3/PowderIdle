// Game constants
      const BASE_SCREEN_W = 360;
      const BASE_SCREEN_H = 640;
      let SCREEN_W = BASE_SCREEN_W;
      let SCREEN_H = BASE_SCREEN_H;
      let MENU_H = SCREEN_H / 3;
      let POWDER_AREA_H = SCREEN_H - MENU_H;
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
      let upgradesState = {
        gravity: 0,
        refinery: 0,
        compressor: 0,
        lanterns: 0,
        harmonics: 0
      };
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
      let fullscreenModule = null;
      let jarVisible = true;
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
      let moduleStates = createDefaultModuleStates();

      function createDefaultModuleStates() {
        return {
          conveyor: { grains: [], spawnTimer: 0, packageProgress: 0, packagePulse: 0 },
          rocket: { pods: [] },
          asteroid: { progress: 0, fragments: [], ring: 0 },
          planet: { progress: 0, orbiters: [], spin: 0 },
          forge: { progress: 0, pulses: [], corona: 0 },
          galaxy: { progress: 0, angle: 0, pixels: [] },
          universe: { progress: 0, angle: 0, nodes: [] },
          singularity: { progress: 0, shards: [], orbit: 0, halo: 0 }
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
      let menuContentArea = { left: 0, right: 0, center: 0, width: 0, top: 0, bottom: 0 };
      let powdersDataRaw = null;
      let machinesDataRaw = null;
      let upgradesDataRaw = null;
      let progressionDataRaw = null;
      let milestoneLookup = {};

      function preload() {
        powdersDataRaw = loadJSON('data/powders.json');
        machinesDataRaw = loadJSON('data/machines.json');
        upgradesDataRaw = loadJSON('data/upgrades.json');
        progressionDataRaw = loadJSON('data/progression.json');
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

        let progressionData = progressionDataRaw || {};
        strataLayers = progressionData.strataLayers || [];
        milestoneConfigs = progressionData.milestones || [];
        milestoneLookup = milestoneConfigs.reduce((acc, milestone, index) => {
          acc[milestone.key] = index;
          return acc;
        }, {});
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
        upgradesState.gravity = 0;
        upgradesState.refinery = 0;
        upgradesState.compressor = 0;
        upgradesState.lanterns = 0;
        upgradesState.harmonics = 0;
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
        moduleStates = createDefaultModuleStates();
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
        initializeGameData();
        initializeGameState();
        updateLayoutDimensions();
        canvas = createCanvas(SCREEN_W, SCREEN_H);
        pixelDensity(1);
        rectMode(CENTER);
        textAlign(CENTER, CENTER);
        textFont('Press Start 2P');
        noStroke();
        frameRate(60);
        updateLayoutDimensions(true);
        refreshPowderGrid(true);
      }

      function windowResized() {
        updateLayoutDimensions(true);
        refreshPowderGrid(true);
      }

      function draw() {
        background('#050a16');

        buttons = [];
        jarVisible = false;

        drawPowderField();

        updateAutoDroppers();
        updateAutomationControllers();
        updatePowders();
        updateMilestones();
        if (jarVisible) {
          renderPowders();
          drawJarOverlay();
        }
        drawMenu();
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

      function drawCollageBackdrop() {
        push();
        noStroke();
        let panelPaddingX = scaledX(32);
        let panelPaddingY = scaledY(36);
        let panelCenterY = collageLayout.top + collageLayout.height / 2;
        fill('#071021');
        rect(
          SCREEN_W / 2,
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
        let panelW = rectInfo.width * 0.88;
        let panelH = rectInfo.height * 0.78;
        push();
        rectMode(CENTER);
        stroke(unlocked ? '#1e3a8a' : '#1e293b');
        strokeWeight(2);
        fill(unlocked ? '#0b1220' : '#040810');
        rect(center.x, center.y, panelW, panelH, 18);
        noStroke();
        let interactButton = null;
        if (!unlocked) {
          fill(withAlpha('#020617', 220));
          rect(center.x, center.y, panelW - 8, panelH - 8, 16);
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
          buttons.push(interactButton);
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

      function updateConveyorState(dt) {
        let state = moduleStates.conveyor;
        if (!state) return;
        let speedBoost = 1 + upgradesState.gravity * 0.12 + getLayerGravityBonus() * 0.6;
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = Math.max(0.35, 1.1 / speedBoost + random(-0.3, 0.3));
          state.grains.push({
            progress: 0,
            speed: 0.4 + Math.random() * 0.3,
            offset: random(-0.2, 0.2),
            size: 0.08 + Math.random() * 0.05
          });
        }
        for (let i = state.grains.length - 1; i >= 0; i--) {
          let grain = state.grains[i];
          grain.progress += dt * grain.speed * speedBoost;
          if (grain.progress >= 1) {
            powderCounts[0] += 1;
            dust += Math.max(1, Math.round(getDustMultiplier()));
            state.grains.splice(i, 1);
          }
        }
        while (state.grains.length > 14) {
          state.grains.shift();
        }
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
          }
        } else {
          state.packageProgress = Math.max(0, (state.packageProgress || 0) - dt * 0.4);
        }
        state.packagePulse = Math.max(0, (state.packagePulse || 0) - dt * 2.2);
      }

      function updateRocketState(dt) {
        let state = moduleStates.rocket;
        if (!state) return;
        if (!state.pods || state.pods.length === 0) {
          state.pods = new Array(3)
            .fill(0)
            .map(() => ({ progress: 0, launch: 0, fueling: false }));
        }
        let fuelSpeed = 0.32 + upgradesState.refinery * 0.08 + getGravityMultiplier() * 0.03;
        for (let pod of state.pods) {
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
              powderCounts[2] += 1;
              dust += Math.max(2, Math.round(6 * getDustMultiplier()));
            }
          } else {
            pod.progress = Math.max(0, pod.progress - dt * 0.3);
          }
        }
      }

      function updateAsteroidState(dt) {
        let state = moduleStates.asteroid;
        if (!state) return;
        state.ring = (state.ring || 0) + dt * 0.8;
        if (!state.fragments) {
          state.fragments = [];
        }
        craftNextTier(
          state,
          2,
          3,
          0.26 + (researchState.lens || 0) * 0.03,
          dt,
          8,
          () => {
            state.fragments.push({
              life: 1,
              angle: Math.random() * TAU,
              drift: random(0.4, 1.1),
              radius: random(0.12, 0.28)
            });
          }
        );
        for (let i = state.fragments.length - 1; i >= 0; i--) {
          let fragment = state.fragments[i];
          fragment.life -= dt * 0.9;
          fragment.angle += dt * fragment.drift;
          if (fragment.life <= 0) {
            state.fragments.splice(i, 1);
          }
        }
      }

      function updatePlanetState(dt) {
        let state = moduleStates.planet;
        if (!state) return;
        state.spin = (state.spin || 0) + dt * 0.6;
        if (!state.orbiters) {
          state.orbiters = [];
        }
        craftNextTier(
          state,
          3,
          4,
          0.24 + (researchState.overclock || 0) * 0.02,
          dt,
          10,
          () => {
            state.orbiters.push({
              life: 1,
              angle: Math.random() * TAU,
              radius: random(0.18, 0.32),
              speed: random(0.5, 1.3)
            });
          }
        );
        for (let i = state.orbiters.length - 1; i >= 0; i--) {
          let orbiter = state.orbiters[i];
          orbiter.life -= dt * 0.6;
          orbiter.angle += dt * orbiter.speed;
          if (orbiter.life <= 0) {
            state.orbiters.splice(i, 1);
          }
        }
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
          0.22 + upgradesState.compressor * 0.05,
          dt,
          12,
          () => {
            state.pulses.push({ life: 1, angle: Math.random() * TAU });
          }
        );
        for (let i = state.pulses.length - 1; i >= 0; i--) {
          state.pulses[i].life -= dt * 1.6;
          if (state.pulses[i].life <= 0) {
            state.pulses.splice(i, 1);
          }
        }
      }

      function updateGalaxyState(dt) {
        let state = moduleStates.galaxy;
        if (!state) return;
        state.angle += dt * 0.6;
        if (!state.pixels || state.pixels.length === 0) {
          state.pixels = [];
          for (let i = 0; i < 24; i++) {
            state.pixels.push({
              radius: random(0.12, 0.48),
              size: random(0.02, 0.06),
              offset: random(TAU)
            });
          }
        }
        craftNextTier(
          state,
          5,
          6,
          0.18 + (researchState.lens || 0) * 0.03 + upgradesState.lanterns * 0.02,
          dt,
          15
        );
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
          0.16 + (researchState.overclock || 0) * 0.02 + upgradesState.harmonics * 0.02,
          dt,
          18
        );
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
      }

      function drawConveyorModule(context) {
        let { center, panelW, panelH } = context;
        let state = moduleStates.conveyor;
        push();
        translate(center.x, center.y);
        fill('#0b182c');
        rect(0, panelH * 0.12, panelW * 0.86, panelH * 0.22, 8);
        fill('#162a4a');
        rect(0, panelH * 0.1, panelW * 0.8, panelH * 0.16, 6);
        let wheelRadius = Math.max(10, panelH * 0.1);
        fill('#243453');
        circle(-panelW * 0.36, panelH * 0.2, wheelRadius);
        circle(panelW * 0.36, panelH * 0.2, wheelRadius);
        if (state) {
          let start = -panelW * 0.38;
          let end = panelW * 0.38;
          for (let grain of state.grains) {
            let x = lerp(start, end, constrain(grain.progress, 0, 1));
            let y = -panelH * 0.05 + grain.offset * panelH * 0.06;
            let size = Math.max(6, panelW * grain.size * 0.25);
            fill('#e7c97a');
            rect(x, y, size, size, 3);
            fill('#bfa568');
            rect(x - size * 0.28, y - size * 0.24, size * 0.6, size * 0.4, 2);
          }
          let housingW = panelW * 0.24;
          let housingH = panelH * 0.34;
          push();
          translate(panelW * 0.34, -panelH * 0.02);
          fill('#0f1a2c');
          rect(0, 0, housingW, housingH, 10);
          fill('#1e2b44');
          rect(0, -housingH * 0.08, housingW * 0.78, housingH * 0.56, 8);
          let pulse = 1 + (state.packagePulse || 0) * 0.25;
          push();
          translate(0, -housingH * 0.1);
          rotate(frameCount / 18);
          fill('#facc15');
          rect(0, 0, housingW * 0.26 * pulse, housingW * 0.26 * pulse, 6);
          pop();
          push();
          translate(0, -housingH * 0.1);
          rotate(-frameCount / 24);
          stroke('#fde68a');
          strokeWeight(2);
          noFill();
          rect(0, 0, housingW * 0.4, housingW * 0.4, 9);
          pop();
          noStroke();
          fill('#f59e0b');
          let gaugeHeight = housingH * 0.58 * constrain(state.packageProgress || 0, 0, 1);
          rect(-housingW * 0.34, housingH * 0.12 - gaugeHeight / 2, housingW * 0.16, gaugeHeight, 4);
          pop();
          let packagesVisible = Math.min(4, Math.floor(powderCounts[1] || 0));
          for (let i = 0; i < packagesVisible; i++) {
            let stackX = panelW * 0.48;
            let stackY = panelH * 0.16 - i * panelH * 0.08;
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
        fill('#0d1527');
        rect(0, 0, panelW * 0.86, panelH * 0.68, 12);
        stroke('#1e293b');
        strokeWeight(2);
        noFill();
        ellipse(0, 0, panelW * 0.62, panelH * 0.44);
        ellipse(0, 0, panelW * 0.44, panelH * 0.3);
        noStroke();
        fill('#1f2937');
        rect(0, 0, panelW * 0.32, panelW * 0.32, 10);
        fill('#94a3b8');
        rect(0, 0, panelW * 0.16, panelW * 0.16, 6);
        let baseAngle = state.ring || 0;
        for (let fragment of state.fragments || []) {
          let angle = baseAngle + fragment.angle;
          let radiusX = panelW * fragment.radius;
          let radiusY = panelH * fragment.radius * 0.6;
          let x = Math.cos(angle) * radiusX;
          let y = Math.sin(angle) * radiusY;
          let size = Math.max(4, panelW * 0.08 * fragment.life);
          fill(withAlpha('#e2e8f0', fragment.life * 220));
          rect(x, y, size, size * 0.8, 4);
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
        fill('#0c1729');
        rect(0, 0, panelW * 0.88, panelH * 0.68, 12);
        let spin = state.spin || 0;
        let planetSize = panelW * 0.28;
        noStroke();
        fill('#102a44');
        rect(0, 0, planetSize * 1.6, planetSize, planetSize * 0.6);
        push();
        rotate(spin);
        fill('#38bdf8');
        rect(0, 0, planetSize * 1.2, planetSize * 1.2, planetSize * 0.6);
        pop();
        stroke('#22d3ee');
        strokeWeight(2);
        noFill();
        ellipse(0, 0, planetSize * 2.6, planetSize * 1.8);
        noStroke();
        for (let orbiter of state.orbiters || []) {
          let angle = orbiter.angle || 0;
          let radiusX = panelW * orbiter.radius;
          let radiusY = panelH * orbiter.radius * 0.6;
          let x = Math.cos(angle) * radiusX;
          let y = Math.sin(angle) * radiusY;
          let size = Math.max(4, panelW * 0.08 * orbiter.life);
          fill(withAlpha('#f8fafc', orbiter.life * 220));
          rect(x, y, size, size, 4);
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
        fill('#0f172a');
        rect(0, 0, panelW * 0.88, panelH * 0.7, 12);
        if (!state.pixels) {
          state.pixels = [];
        }
        for (let pix of state.pixels) {
          let angle = state.angle + pix.offset;
          let radiusX = panelW * pix.radius;
          let radiusY = panelH * pix.radius * 0.6;
          let x = Math.cos(angle) * radiusX;
          let y = Math.sin(angle) * radiusY;
          let size = Math.max(4, panelW * pix.size * 0.5);
          let alpha = 160 + Math.sin(angle * 2) * 50;
          fill(withAlpha('#c084fc', alpha));
          rect(x, y, size, size, 3);
        }
        fill('#f8fafc');
        rect(0, 0, panelW * 0.12, panelW * 0.12, 4);
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
          buttons.push({ action: 'toggleFullscreen', key, x, y, w: size, h: size });
        }
      }

      function drawJarFrame(machine) {
        let rectInfo = getMachineRect(machine);
        let center = getMachineCenter(rectInfo);
        let panelW = rectInfo.width * 0.92;
        let panelH = rectInfo.height * 0.86;
        push();
        rectMode(CENTER);
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
        let horizontalPadding = Math.max(36, SCREEN_W * 0.08);
        let topPadding = Math.max(28, POWDER_AREA_H * 0.08);
        let bottomPadding = Math.max(36, POWDER_AREA_H * 0.12);
        let width = Math.max(180, SCREEN_W - horizontalPadding * 2);
        let height = Math.max(200, POWDER_AREA_H - topPadding - bottomPadding);
        collageLayout.left = (SCREEN_W - width) / 2;
        collageLayout.top = topPadding;
        collageLayout.width = width;
        collageLayout.height = height;
        collageLayout.cellWidth = width / 3;
        collageLayout.cellHeight = height / 3;
        let jarMachine = machineDefinitions.find((m) => m.key === 'jar');
        if (jarMachine) {
          let rect = getMachineRect(jarMachine);
          let jarWidth;
          let jarHeight;
          if (fullscreenModule === 'jar') {
            jarWidth = Math.round(rect.width * 0.92);
            jarHeight = Math.round(rect.height * 0.9);
          } else {
            let targetWidth = SCREEN_W * 0.2;
            let maxWidth = rect.width * 0.82;
            jarWidth = Math.max(
              MAX_POWDER_SIZE + 6,
              Math.min(targetWidth, maxWidth)
            );
            let maxHeight = rect.height * 0.92;
            let targetHeight = POWDER_AREA_H * 0.5;
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
          let width = Math.max(220, SCREEN_W - paddingX * 2);
          let height = Math.max(220, POWDER_AREA_H - scaledY(48));
          height = Math.max(160, Math.min(height, POWDER_AREA_H - scaledY(16)));
          let x = (SCREEN_W - width) / 2;
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
        let dustGain = Math.round(baseValue * getDustMultiplier());
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

      function refreshPowderGrid(rescale = false) {
        let prevCols = gridCols || 1;
        let prevRows = gridRows || 1;
        let widthPixels = Math.max(jarRect.width, SCREEN_W * 0.2);
        let heightPixels = Math.max(jarRect.height, POWDER_AREA_H * 0.4);
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

      function getGravityMultiplier() {
        return (
          1 +
          upgradesState.gravity * 0.2 +
          crystalCores * 0.1 +
          getLayerGravityBonus() +
          milestoneBonuses.gravity * getMilestoneBonusScale()
        );
      }

      function getDustMultiplier() {
        return (
          1 +
          upgradesState.refinery * 0.35 +
          crystalCores * 0.25 +
          getLayerDustBonus() +
          (researchState.lens || 0) * 0.2 +
          milestoneBonuses.dust * getMilestoneBonusScale()
        );
      }

      function getCompressorEfficiency() {
        return upgradesState.compressor <= 0
          ? 0
          : 1 + upgradesState.compressor * 0.35;
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
          upgradesState.compressor > 0
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
        fill('#0f172a');
        rect(SCREEN_W / 2, POWDER_AREA_H + MENU_H / 2, SCREEN_W, MENU_H);

        let headerBottom = drawResourceHeader();
        let tabs = getUnlockedMenuTabs();
        if (tabs.length === 0) {
          return;
        }
        if (!tabs.some((tab) => tab.key === activeMenu)) {
          activeMenu = tabs[tabs.length - 1].key;
        }
        let tabsBottom = drawMenuTabs(headerBottom + scaledY(6), tabs);
        let contentStart = tabsBottom + scaledY(18);
        let panelBottom = POWDER_AREA_H + MENU_H - scaledY(24);
        let panelHeight = Math.max(scaledY(120), panelBottom - contentStart);
        let panelWidth = SCREEN_W - scaledX(60);
        let panelX = SCREEN_W / 2;
        let panelY = contentStart + panelHeight / 2;
        fill('#0a1326');
        rect(panelX, panelY, panelWidth, panelHeight, 18);
        menuContentArea.left = panelX - panelWidth / 2 + scaledX(28);
        menuContentArea.right = panelX + panelWidth / 2 - scaledX(28);
        menuContentArea.width = menuContentArea.right - menuContentArea.left;
        menuContentArea.center = (menuContentArea.left + menuContentArea.right) / 2;
        menuContentArea.top = contentStart + scaledY(26);
        menuContentArea.bottom = panelBottom - scaledY(22);
        let contentY = menuContentArea.top;

        switch (activeMenu) {
          case 'jar':
            drawJarMenu(contentY);
            break;
          case 'conveyor':
            drawConveyorMenu(contentY);
            break;
          case 'rocket':
            drawRocketMenu(contentY);
            break;
          case 'asteroid':
            drawAsteroidMenu(contentY);
            break;
          case 'planet':
            drawPlanetMenu(contentY);
            break;
          case 'forge':
            drawForgeMenu(contentY);
            break;
          case 'galaxy':
            drawGalaxyMenu(contentY);
            break;
          case 'universe':
            drawUniverseMenu(contentY);
            break;
          case 'singularity':
            drawSingularityMenu(contentY);
            break;
          case 'codex':
            drawCodexMenu(contentY);
            break;
        }

        drawDropButton(activeMenu !== 'jar');
      }

      function drawResourceHeader() {
        fill('#f8fafc');
        textSize(scaledFont(13));
        text(
          `Dust: ${Math.floor(dust)} | Cores: ${crystalCores} | Powder: ${totalPowderCollected}`,
          SCREEN_W / 2,
          POWDER_AREA_H + scaledY(24)
        );
        if (milestoneMessage) {
          fill('#38bdf8');
          textSize(scaledFont(10));
          text(milestoneMessage, SCREEN_W / 2, POWDER_AREA_H + scaledY(38));
        }
        let counterOffset = milestoneMessage ? 58 : 46;
        let nextY = drawPowderCounters(POWDER_AREA_H + scaledY(counterOffset));
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
        let tabW = scaledX(68);
        let tabH = scaledY(30);
        let xs = getRowPositions(tabs.length);
        textSize(scaledFont(12));
        for (let i = 0; i < tabs.length; i++) {
          let tab = tabs[i];
          let active = tab.key === activeMenu;
          fill(active ? '#22d3ee' : '#1b2640');
          rect(xs[i], y, tabW, tabH, 10);
          fill(active ? '#071426' : '#f0f4f8');
          text(tab.label, xs[i], y);
          buttons.push({
            action: 'switchMenu',
            key: tab.key,
            x: xs[i],
            y,
            w: tabW,
            h: tabH
          });
        }
        textSize(scaledFont(14));
        return y + scaledY(30);
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
        y = drawSectionHeader('Auto Feeders', y);
        y = drawAutoDropperRow(y + scaledY(8));
        y = drawSectionHeader('Belt Diagnostics', y + scaledY(12));
        y = drawConveyorNotes(y + scaledY(10));
        return y;
      }

      function drawRocketMenu(y) {
        y = drawSectionHeader('Refinery Upgrades', y);
        y = drawSpecificUpgradeRow(['refinery'], y + scaledY(10));
        y = drawSectionHeader('Launch Status', y + scaledY(12));
        y = drawRocketStatus(y + scaledY(12));
        return y;
      }

      function drawAsteroidMenu(y) {
        y = drawSectionHeader('Crucible Report', y);
        y = drawAsteroidStatus(y + scaledY(12));
        return y;
      }

      function drawPlanetMenu(y) {
        y = drawSectionHeader('Planetary Ledger', y);
        y = drawPlanetStatus(y + scaledY(12));
        return y;
      }

      function drawForgeMenu(y) {
        y = drawSectionHeader('Compression Engine', y);
        y = drawSpecificUpgradeRow(['compressor'], y + scaledY(10));
        y = drawSectionHeader('Transmutation Matrix', y + scaledY(12));
        y = drawCompressionRow(y + scaledY(16));
        return y;
      }

      function drawGalaxyMenu(y) {
        y = drawSectionHeader('Luminous Upgrades', y);
        y = drawSpecificUpgradeRow(['lanterns'], y + scaledY(10));
        y = drawSectionHeader('Arcane Research', y + scaledY(12));
        y = drawResearchRows(y + scaledY(10));
        return y;
      }

      function drawUniverseMenu(y) {
        y = drawSectionHeader('Resonance Upgrades', y);
        y = drawSpecificUpgradeRow(['harmonics'], y + scaledY(10));
        y = drawSectionHeader('Automation Scripts', y + scaledY(12));
        y = drawAutomationControls(y + scaledY(10));
        return y;
      }

      function drawSingularityMenu(y) {
        y = drawSectionHeader('Crystal Ledger', y);
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
          buttons.push({
            action: 'buyResearch',
            key: project.key,
            x,
            y,
            w: btnW,
            h: btnH
          });
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
            buttons.push({
              action: 'toggleAutomation',
              key: control.key,
              x,
              y,
              w: btnW,
              h: btnH
            });
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
          buttons.push({
            action: 'selectPowder',
            index: i,
            x,
            y,
            w: btnW,
            h: btnH
          });
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
          buttons.push({
            action: 'tierUpgrade',
            index: i,
            x,
            y,
            w: btnW,
            h: btnH
          });
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
          buttons.push({
            action: 'buyDropper',
            index: i,
            x,
            y,
            w: btnW,
            h: btnH
          });
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
            let level = upgradesState[config.key];
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
            buttons.push({
              action: 'buyUpgrade',
              key: config.key,
              x,
              y: rowY,
              w: btnW,
              h: btnH
            });
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
          let level = upgradesState[config.key];
          let cost = getUpgradeCost(config);
          let canBuy = dust >= cost;
          let x = xs[i];
          fill(canBuy ? '#8e24aa' : '#4a148c');
          rect(x, y, btnW, btnH, 8);
          fill('#fff');
          text(`${config.name} Lv.${level} (\u2212${cost})`, x, y - scaledY(8));
          text(config.description, x, y + scaledY(6));
          buttons.push({
            action: 'buyUpgrade',
            key: config.key,
            x,
            y,
            w: btnW,
            h: btnH
          });
        }
        textSize(scaledFont(14));
        return y + scaledY(36);
      }

      function drawCompressionRow(y) {
        if (upgradesState.compressor <= 0) {
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
          buttons.push({ action: 'compress', recipe, x, y, w: btnW, h: btnH });
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
        buttons.push({ action: 'prestige', x: center, y, w: btnW, h: btnH });
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
        text(`Tap the bay to hasten the ${CHAIN_REQUIREMENT}-to-1 fueling cycle.`, center, y + scaledY(32));
        textSize(scaledFont(14));
        return y + scaledY(48);
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
          (menuContentArea.bottom || POWDER_AREA_H + MENU_H - scaledY(32)) -
          scaledY(compact ? 14 : 18);
        fill(compact ? '#2dd4bf' : '#1976d2');
        rect(dropX, dropY, btnW, btnH, compact ? 8 : 10);
        fill('#f8fafc');
        textSize(scaledFont(compact ? 11 : 12));
        text(compact ? 'Quick Drop' : 'Drop', dropX, dropY);
        textSize(scaledFont(14));
        buttons.push({ action: 'drop', x: dropX, y: dropY, w: btnW, h: btnH });
      }

      function mousePressed() {
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
            }
            break;
          case 'toggleAutomation':
            toggleAutomation(btn.key);
            break;
          case 'moduleInteract':
            handleModuleInteraction(btn.key);
            break;
          case 'toggleFullscreen':
            toggleModuleFullscreen(btn.key);
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
        let level = upgradesState[config.key];
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
        if (upgradesState.compressor <= 0) return;
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
        upgradesState.gravity = 0;
        upgradesState.refinery = 0;
        if (upgradesState.compressor > 0) {
          upgradesState.compressor = 1; // retain basic access to compression if purchased
        }
        upgradesState.lanterns = 0;
        upgradesState.harmonics = 0;
        selectedPowder = 0;
        automationSettings.autoDrop = false;
        automationSettings.autoCompress = false;
        autoDropTimer = 0;
        autoCompressTimer = 0;
        activeMenu = menuTabs[0].key;
        fullscreenModule = null;
        moduleStates = createDefaultModuleStates();
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
          upgradesState.gravity * 0.15 +
          upgradesState.harmonics * 0.2 +
          crystalCores * 0.1 +
          (researchState.overclock || 0) * 0.15 +
          getLayerGravityBonus() * 0.5 +
          milestoneBonuses.automation * getMilestoneBonusScale()
        );
      }

      function getAutomationIntervalMultiplier() {
        return (
          1 +
          upgradesState.harmonics * 0.2 +
          crystalCores * 0.1 +
          (researchState.overclock || 0) * 0.15 +
          getLayerGravityBonus() * 0.4 +
          milestoneBonuses.automation * getMilestoneBonusScale()
        );
      }

      function addLayerProgress(amount) {
        if (amount <= 0) return;
        let amplified = amount * (1 + upgradesState.lanterns * 0.25);
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
        MENU_H = Math.round(SCREEN_H * 0.35);
        POWDER_AREA_H = SCREEN_H - MENU_H;
        layoutScaleX = SCREEN_W / BASE_SCREEN_W;
        layoutScaleY = SCREEN_H / BASE_SCREEN_H;
        cellPixelSize = 1;
        updateCollageLayout();
        if (resize && canvas) {
          resizeCanvas(SCREEN_W, SCREEN_H);
        }
      }

      function keyPressed() {
        if (key === ' ' || keyCode === 32) {
          dropPowder(selectedPowder);
        }
        if (key === 'e' || key === 'E') {
          for (let i = 0; i < 8; i++) {
            dropPowder(selectedPowder);
          }
        }
      }
