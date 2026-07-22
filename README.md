# Powder Idle

Powder Idle is a browser-based p5.js idle game. Its runtime is written in strict TypeScript, while balance and content remain editable in the four JSON files under `data/`.

## Development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL. Other supported commands are:

```bash
npm run typecheck   # strict TypeScript validation
npm test            # deterministic Vitest suite
npm run build       # type-check and create dist/
npm run preview     # serve the production build locally
```

`dist/` and `node_modules/` are generated and intentionally ignored.

## Stage world framework

The existing menu, dust, upgrade, research, milestone, automation, achievement, and prestige shell now hosts a fixed-timestep, ID-based stage world through one p5 lifecycle. Stage 1 begins at the center of the reserved 3×3 spiral. At 100 lifetime sand motes, Stage 2 reveals directly below it and the time-based camera expands to frame both chambers. Sand retains one authoritative owner while active, queued, in transit, buffered, ritual-locked, or contained in a composite stone.

The Compression Crucible visibly gathers 100 real sand entities, locks exactly that batch, runs a deterministic multi-phase ritual, and creates one mass-conserving stone whose contents and lineage reference every input. Future stage positions are typed and reserved but cannot produce resources. Configuration lives in `data/stages.json`; in-progress rituals normalize safely to `ready` when loaded. Saves use a versioned envelope containing stage and legacy progression state. Version 1 stage saves are preserved under a diagnostic backup key before conservative migration. The pre-stage runtime had no persistent storage implementation, so there is no older browser save key to import.

For local reveal testing, append `?debugStages=1` and press `U`. The shortcut is accepted only on localhost.

## Source organization

- `src/main.ts` installs the browser entry point.
- `src/game/runtime.ts` preserves the p5 update/draw/input ordering and the archived module simulations from the original global-mode game.
- `src/types/game.ts` defines game data, entity, particle, module, layout, loading, and UI-action types.
- `src/config/validateGameData.ts` validates untrusted JSON before initialization.
- `src/state/` contains independently testable entity/inventory logic.
- `src/simulation/` contains deterministic economy, funnel, and progression calculations.
- `tests/` covers JSON validation, costs, tier unlocks, prestige, entity identity and mass, inventories, funnel bounds, and layer progression.

The runtime deliberately keeps the tightly coupled p5 rendering and legacy module scenes together. Pure state transitions and calculations are separated so they can be tested without a canvas, while the original frame/update order remains unchanged.

## p5.js integration

`index.html` loads p5.js 1.9.0 from the existing CDN. The TypeScript entry explicitly installs `setup`, `draw`, resize, mouse, touch, and keyboard callbacks on `window`, preserving p5 global-mode behavior. Vite compiles the TypeScript module for development and production.

Controls remain unchanged:

- Click or tap inside the jar to drop the selected powder.
- Press Space to drop one powder.
- Press E to drop the existing batch of eight.

## JSON data and fallbacks

The game fetches `data/powders.json`, `data/machines.json`, `data/upgrades.json`, and `data/progression.json` over HTTP at startup.

Fetched values are treated as `unknown` and validated field by field. A failed request or invalid file logs the affected path and loads that file's embedded fallback. Under the `file:` protocol, external fetches are skipped and all embedded fallbacks are used immediately. Vite uses relative production asset paths so `dist/index.html` can retain that local-file behavior where the browser permits local modules.

## Preserved baseline behavior

The TypeScript migration intentionally does not rebalance physics, costs, rewards, cadence, unlocks, dimensions, colors, labels, input semantics, or archived module code. The live `machines.json` exposes only the unified Sandfall Atrium. Because the archived unlock order is empty in that configuration, the existing Sandfall status text can display `Next Unlock: undefined — 100 Sand`; this baseline content mismatch is documented rather than silently redesigned during the migration.

One strongly supported fallback-only bug was normalized: legacy embedded research entries that specify `maxLevel` but omit `costMult` now receive the deliberate `3` multiplier used by the research progression model instead of producing `NaN` costs.
