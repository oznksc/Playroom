# Top-Down Arena

Portrait top-down arena: collect 3 gems, avoid the hazard zone. Four-way movement (WASD / stick).

## Prerequisites

- Node 18+
- From monorepo root: `pnpm install && pnpm build`

## Run (Expo)

```bash
cd examples/top-down-arena
pnpm install
pnpm start
# or
pnpm ios
```

## Edit

- Gameplay: `gamekit/scenes/arena.scene.json`
- Menu / settings: `gamekit/scenes/menu.scene.json`, `settings.scene.json`
- Assets: `gamekit/assets/`

After asset changes:

```bash
node ../../packages/cli/dist/index.js generate --platform mobile
```

## Export

```bash
pnpm export        # Expo pack under ./build
pnpm export:web    # Vite/Phaser pack under ./build-web
```
