# GameKit MVP 0.1

GameKit is an Expo-focused mini 2D game editor/runtime prototype. The monorepo contains:

- `@gamekit/schema`: shared JSON scene and project contract.
- `@gamekit/runtime`: Expo runtime for Skia rendering, player movement, camera follow, and AABB collision helpers.
- `@gamekit/cli`: Node CLI for init, asset import, generated asset registry, and the local editor server.
- `@gamekit/editor`: Vite/React browser editor served by the CLI.
- `templates/expo-game`: starter Expo project.

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm gamekit init
pnpm gamekit editor
```

The editor server defaults to `http://localhost:4177`.
