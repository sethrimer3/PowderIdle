# Powder Idle Design Notes

## Core Loop
- **Manual casting** – Click or tap inside the Sandfall Jar (or press Space/E) to drop the currently selected powder. Each grain settles through the jar's grid, seeking open cells and funneling toward the exit to grant dust.
- **Tier unlocking** – Collect enough of a powder to purchase the next tier from the Sandfall tab. New powders expand capacity and unlock additional machines in the collage.
- **Machines** – The live build now presents a single unified Sandfall Atrium that fills the whole collage space. The legacy nine-module pipeline is archived below for reference when reintroducing specialized machinery.
- **Resources** – Track three primary currencies: `dust` (spend on upgrades and research), `powder` (raw stock by tier), and `crystal cores` (prestige resource produced in the Singularity Crucible).
- **Layers** – Stabilize geological strata from the Sandfall tab to raise passive dust/gravity bonuses. Deeper layers unlock sequentially as the jar is flooded with higher-tier matter.

## Progression Systems
- **Upgrades & research** – Spend dust on repeatable upgrades (gravity, refinery, compressor, lanterns, harmonics) and research projects (lens, overclock, quantum, archives) to amplify production and automation cadence.
- **Automation** – Purchase auto-droppers per powder tier, then unlock automation toggles through milestones to keep the jar running and compression cycling without manual input.
- **Compression recipes** – Convert stacks of one powder tier into the next using the Stellar Forge menus. Automation can batch-run these recipes after the appropriate upgrades.
- **Prestige** – The Singularity Crucible consumes late-tier powders to mint crystal cores. Prestiging resets most progression but retains cores (and milestone rewards), seeding a faster climb on subsequent runs.
- **Milestones (Codex)** – The Codex tab records global achievements. Reaching dust or core thresholds unlocks new powers: automation toggles, bonus gravity/dust, automation cadence boosts, and enhanced crystal yields.

## Current Content Structure
- **Data modules** – Game content is defined in JSON (`data/powders.json`, `data/machines.json`, `data/upgrades.json`, `data/progression.json`). Update these files to tune balance, add new powders/machines, or adjust milestone targets without rewriting logic.
- **Rendering** – `main.js` loads data during `preload`, configures p5.js canvases, and manages stateful simulation, UI, and machine mini-scenes. `index.html` bootstraps the experience and pulls in p5 plus the main script.
- **Styling** – Visual identity uses the “Press Start 2P” typeface and neon-cosmic palette. Module panels adapt to screen size via dynamic scaling helpers.

## Direction for Further Development
1. **Late-game loops** – Introduce additional prestige layers that consume crystal cores (e.g., quantum reactors, nebula gardens) and feed back unique modifiers to the base run.
2. **Dynamic events** – Add codex-triggered events or timed anomalies that temporarily alter gravity, dust yield, or machine efficiency to keep mid-game lively.
3. **Specialist modules** – Extend the collage with optional machines that branch the production tree (e.g., powder splitters, catalyst labs) to encourage diverse strategies.
4. **Narrative expansion** – Tie each stabilized layer and milestone to lore entries inside the Codex, gradually revealing the world as players progress.
5. **Balancing & analytics** – Instrument milestone pacing (dust/core thresholds) and auto-dropper scaling for smoother curves, then expose settings in JSON for rapid iteration.
6. **Accessibility & UX** – Add tooltips, adjustable text scaling, and optional color palettes for better readability. Consider keyboard shortcuts for each tab and toggle.

## Archived Module Concepts
- **Grain Conveyor** – Drops grains into a holding bin ready for routing.
- **Launch Bay** – Bundles outbound packages into launch fuel for the skyward chain.
- **Asteroid Crucible** – Compresses launches into dense asteroids.
- **Planetarium** – Accretes asteroids into orderly planets.
- **Star Forge** – Ignites planets into newborn stars.
- **Celestial Loom** – Weaves stars into swirling galaxies.
- **Universe Foundry** – Binds galaxies into full universes.
- **Singularity Crucible** – Collapses universes into singularities for prestige loops.

Use this document as a quick orientation for contributors and a living roadmap for future sprints.
