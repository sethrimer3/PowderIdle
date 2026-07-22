# Powder Idle

Powder Idle is a browser-based p5.js idle game. Its runtime is written in strict TypeScript, while balance and content remain editable in the four JSON files under `data/`.

## Browser development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
npm test
npm run build
```

Vite prints the local development URL. Other supported commands are:

```bash
npm run typecheck   # strict TypeScript validation
npm test            # deterministic Vitest suite
npm run build       # type-check and create dist/
npm run preview     # serve the production build locally
```

`dist/` and `node_modules/` are generated and intentionally ignored.

## Electron development

```bash
npm run electron:dev
```

Development uses a separate `Powder Idle Development` Electron user-data profile, protecting production saves while preserving development saves between launches. DevTools are available only in this mode.

## Local production launch

```bash
npm run electron:start
```

Production uses Electron's stable `Powder Idle` application identity and normal OS-managed user-data directory. The existing V3 local-storage save format persists between production launches; no desktop-specific save format is introduced. Smoke tests use a separate `Powder Idle Smoke Test` profile.

## Packaging

```bash
npm run electron:pack
npm run electron:dist
npm run electron:dist:win
```

Unpacked applications and installers are written to `release/`. `electron:dist` builds only the current host target; Windows NSIS builds use `electron:dist:win`. Linux AppImage and macOS DMG/ZIP targets are configured, but must be built and runtime-verified on their respective host platforms. Development packages are unsigned. Code signing and macOS notarization remain future release-distribution work.

The packaged renderer is served entirely from the secure local `app://powder-idle` origin. p5, Cinzel, configuration JSON, scripts, styles, and images are bundled, so normal play has no remote runtime dependency.

Regenerate every checked-in desktop icon asset from its source SVG with:

```bash
npm run icons:build
```

## Stage world framework

The existing menu, dust, upgrade, research, milestone, automation, achievement, and prestige shell now hosts a fixed-timestep, ID-based stage world through one p5 lifecycle. Stage 1 begins at the center of the reserved 3×3 spiral. At 100 lifetime sand motes, Stage 2 reveals directly below it and the time-based camera expands to frame both chambers. Sand retains one authoritative owner while active, queued, in transit, buffered, ritual-locked, or contained in a composite stone.

The Compression Crucible visibly gathers 100 real sand entities, locks exactly that batch, runs a deterministic multi-phase ritual, and creates one mass-conserving stone whose contents and lineage reference every input. Future stage positions are typed and reserved but cannot produce resources. Configuration lives in `data/stages.json`; upgrade values, stage origins, camera framing, hit testing, transfers, and rendering all resolve from that validated configuration. Active transfers and rituals resume from their saved phase.

`MatterStore` is authoritative for Stage 1 sand and Stage 2 stones. Active and queued sand is displayed but cannot be spent. Reservoir sand is spendable, ritual sand is processing, Crucible output stones are spendable, and sand contained in a stone remains lineage rather than displayed inventory. The legacy instant sand-to-stone recipe redirects to the ritual. Legacy inventories remain only for higher inactive tiers; sand and stone counts are derived from the stage economy. Auto-droppers and automation toggles feed exactly one stage casting path and one ritual path.

Prestige is a guarded transition: it computes the core gain, resets stage matter, transfers, rituals, outputs, stage upgrades, unlocks, camera state, and run-local legacy progression, recomputes permanent milestone rewards, and writes one new save. Crystal cores and achieved milestones are explicitly permanent.

## Save schema and migration

Schema V3 stores a timestamp, the complete stage world, economy resources and inventory state, configured upgrade and research levels, strata and milestone source states, automation settings/unlocks/timers, and relevant interface progression. The loader validates resources, levels, configuration-sized arrays, configured keys, matter ownership, transfers, ritual collections, composites, and outputs before applying state. Milestone bonuses, Codex visibility, economy counts, capacity, camera framing, and transient caches are recomputed.

V2 integrated saves and V1 stage-world saves migrate conservatively. Missing fields receive initialized defaults; V1 cannot reconstruct legacy dust or progression. Before migration, the untouched raw save is stored under a timestamped diagnostic key. Invalid saves are also backed up and left in place, and failures are logged without stopping the game.

For local testing, append `?debugStages=1`: `U` creates the remaining sand required to reveal Stage 2, `B` casts one real Crucible recipe batch through Stage 1, `D` grants 100 dust, and `P` grants the minimum earned-dust threshold and exercises prestige. These shortcuts are accepted only on localhost.

## Source organization

- `src/main.ts` installs the browser entry point.
- `src/game/runtime.ts` preserves the p5 update/draw/input ordering and the archived module simulations from the original global-mode game.
- `src/types/game.ts` defines game data, entity, particle, module, layout, loading, and UI-action types.
- `src/config/validateGameData.ts` validates untrusted JSON before initialization.
- `src/game/persistence/saveSchema.ts` defines and validates schema V3.
- `src/game/stages/stageConfig.ts` evaluates configured upgrades, origins, and routes.
- `src/game/stages/stageVisualModels.ts` derives bounded reservoir, transfer, sand-palette, and output-slot visuals from authoritative entity state.
- `src/game/effects/stageEffects.ts` owns short-lived, capped visual effects emitted by real stage events; effects never create matter or alter hit testing.
- `src/game/layout/responsiveLayout.ts` keeps the stage viewport square and independently scales narrow menu content.
- `src/state/` contains independently testable entity/inventory logic.
- `src/simulation/` contains deterministic economy, funnel, and progression calculations.
- `tests/` covers JSON validation, costs, tier unlocks, prestige, entity identity and mass, inventories, funnel bounds, and layer progression.

The runtime deliberately keeps the tightly coupled p5 rendering and legacy module scenes together. Pure state transitions and calculations are separated so they can be tested without a canvas, while the original frame/update order remains unchanged.

## p5.js integration

Vite bundles p5.js 2.3.1 from the local npm dependency. The TypeScript entry explicitly installs `setup`, `draw`, resize, mouse, touch, and keyboard callbacks on `window` before constructing p5, preserving global-mode behavior in browser and Electron builds.

Controls remain unchanged:

- Click or tap inside the jar to drop the selected powder.
- Press Space to cast the configured manual amount.
- Press E to request eight casts through the same cooldown-enforcing API.
- Press C or click the Crucible glyph to invoke a ready ritual.

## JSON data and fallbacks

The game fetches `data/powders.json`, `data/machines.json`, `data/upgrades.json`, and `data/progression.json` from the current application origin at startup. Stage configuration is bundled from `data/stages.json`.

Fetched values are treated as `unknown` and validated field by field. A failed request or invalid file logs the affected path and loads that file's embedded fallback. Packaged Electron uses the secure standard `app://powder-idle` protocol, so validated files load normally without relying on `file:` behavior or showing the fallback warning.

## Preserved baseline behavior

The TypeScript migration intentionally does not rebalance physics, costs, rewards, cadence, unlocks, dimensions, input semantics, or archived module code. The live `machines.json` exposes only the unified Sandfall Atrium; the Stage status card therefore reports authoritative Atrium, route, reservoir, ritual, output, and configured-upgrade state instead of consulting the archived module unlock order.

One strongly supported fallback-only bug was normalized: legacy embedded research entries that specify `maxLevel` but omit `costMult` now receive the deliberate `3` multiplier used by the research progression model instead of producing `NaN` costs.
