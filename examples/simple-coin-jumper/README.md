# Coin Jumper (Expo + Playroom)

A simple side-scrolling platformer built with [Playroom](../../README.md) and the Expo/Skia runtime.

## Gameplay

1. **Menu** → tap **Play**
2. Move with on-screen controls (or arrow keys / WASD in simulator)
3. Collect **3 coins** and avoid falling
4. Reach the goal / clear objectives to win

## Prerequisites

- Node 18+
- From monorepo root: `pnpm install && pnpm build` (builds `@gamekit/schema` + `@gamekit/runtime`)
- Xcode + iOS Simulator (for `pnpm ios`)
- Expo CLI via local `expo` dependency

## Install & run

```bash
# from monorepo root
pnpm install
pnpm --filter @gamekit/schema build
pnpm --filter @gamekit/runtime build

cd examples/simple-coin-jumper
pnpm install
pnpm ios          # Expo Go + iOS Simulator (clears Metro cache)
# or
pnpm start        # QR / Expo Go / choose platform
```

**Native deps:** Expo SDK 57 needs exact `react-native-reanimated@4.5.0` + `react-native-worklets@0.10.0`. If you see “reanimated is not installed”, run `npx expo install react-native-reanimated react-native-worklets` then `pnpm start` again.

## Edit the game

- Scene data: `gamekit/scenes/platformer.scene.json`
- Menu shell: `gamekit/scenes/menu.scene.json`
- Assets: `gamekit/assets/`
- After changing assets:  
  `node ../../packages/cli/dist/index.js generate --platform mobile`
- Optional editor (from this folder):  
  `node ../../packages/cli/dist/index.js editor`

## Docker demo (monorepo)

From the Playroom root:

```bash
docker compose up -d
# Editor:  http://localhost:4177
# Web demo: http://localhost:5174
```
