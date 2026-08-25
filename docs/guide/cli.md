# CLI reference

Run via monorepo:

```bash
pnpm gamekit <command>
```

Or after build:

```bash
node packages/cli/dist/index.js <command>
```

## Commands

| Command | Description |
|---------|-------------|
| `init [--name]` | Create `gamekit/` project scaffold |
| `editor [--port] [--host] [--tls-cert] [--tls-key] [--tls-ca] [--mtls]` | Local editor HTTP(S) server (default 4177). Pass cert+key for HTTPS; add `--mtls` + `--tls-ca` to require client certificates |
| `import <file>` | Import image/audio/font asset |
| `remove <asset-id>` | Remove asset from project |
| `generate [--platform web\|mobile]` | Regenerate `gamekit/generated/assets.ts` |
| `export [path] [--platform]` | Export runnable app: template shell + gamekit data + **generated** multi-scene entry (`App.tsx` / `src/main.ts`) |
| `create <skill-id> [--name] [--platform]` | **One-command playable game** (menu shell + skill scene + assets + recipe pack + registry). See [shipping guide](./shipping-a-game.md). |
| `mcp [project-path]` | Start MCP server over stdio |
| `skills list` | List genre skill templates |
| `skills apply <id> [--wire-shell]` | Add skill scene (+ assets); `--wire-shell` wires menu/levels/recipes |
| `recipes list [--category] [--tag] [--query]` | List ready-made effect/mechanic/script/animation/gesture recipes |
| `recipes describe <id>` | Show full recipe definition and params |
| `recipes apply <id> --scene <file> [--entity <id>] [--param k=v]` | Apply a recipe to an entity or scene input map |
| `search <query>` | Search project text |
| `validate` | Schema-validate project + scenes |
| `doctor` | Health report (assets, orphans, levels, schema version) |
| `migrate <from> <to> [--dry-run] [--force]` | Upgrade `gamekit/` project, scenes, and prefabs along the registered schema chain (`--list` prints steps) |
| `build [--out] [--platform] [--skip-doctor] [--no-pack]` | Production pack of gamekit/ (texture atlas + audio bank under `packed/` unless `--no-pack`) |
| `dev [--platform]` | Watch scenes/assets; regenerate + doctor |

## Schema migrate

`gamekit migrate <from> <to>` walks the registered chain in `@gamekit/schema` (currently `0 → 1`) and rewrites:

- `gamekit/project.json`
- `gamekit/scenes/*.scene.json`
- `gamekit/prefabs/*.prefab.json`

Version `0` is unversioned / pre-contract JSON (missing `schemaVersion`). The `0 → 1` step fills reserved blocks (`timeline`, `gui`, `responsive`, …), component defaults, and historical aliases (`static` → `isStatic`, `trigger` → `isTrigger`, `kinematic` → `isKinematic`).

```bash
pnpm gamekit migrate --list
pnpm gamekit migrate 0 1 --dry-run
pnpm gamekit migrate 0 1
```

`--force` applies the chain even when a file's detected version does not match `<from>`. Downgrades are rejected. `gamekit doctor` reports `SCHEMA_VERSION` when a document is behind (or ahead of) the CLI.

## Asset packer (`gamekit build`)

By default `gamekit build` also writes `packed/` next to the copied assets:

| Artifact | Contents |
|----------|----------|
| `packed/atlas.png` + `packed/atlas.json` | RGBA texture atlas of PNG sprites (TexturePacker hash JSON). SVG / JPEG / WebP stay as individual files (`skipped` in the JSON). |
| `packed/audio.bank` + `packed/audio-bank.json` | Concatenated audio clips with byte offsets (`mp3` / `ogg` / `wav`). |

Original assets are still copied so current runtimes keep resolving `assetId` the same way. Pass `--no-pack` to skip. The packer summary is stored on `build-manifest.json` as `packed`.

## HTTPS / mTLS (editor server)

```bash
pnpm gamekit editor --tls-cert ./certs/server.pem --tls-key ./certs/server-key.pem
pnpm gamekit editor --tls-cert ./certs/server.pem --tls-key ./certs/server-key.pem \
  --tls-ca ./certs/ca.pem --mtls
```

Equivalent env vars: `GAMEKIT_EDITOR_TLS_CERT`, `GAMEKIT_EDITOR_TLS_KEY`, `GAMEKIT_EDITOR_TLS_CA`, `GAMEKIT_EDITOR_MTLS=1`. `--mtls` requires a CA and rejects clients that do not present a certificate signed by it.

## HTTP API (editor server)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/project` | Project snapshot |
| GET/POST | `/api/scene` | Read/write scene |
| GET | `/api/scene/meta` | Scene mtime (hot-reload) |
| GET | `/api/doctor` | Doctor report |
| POST | `/api/build` | Trigger production pack (`platform`, `outDir`, `skipDoctor`, `pack`) |
| GET | `/api/skills` | List skills |
| POST | `/api/skills/apply` | Apply skill |
| GET | `/api/recipes` | List recipes (`?category=&tag=&query=`) |
| GET | `/api/recipes/:id` | Describe recipe |
| POST | `/api/recipes/apply` | Apply recipe (`recipeId`, `scenePath`, `entityId?`, `params?`) |
| GET/POST/DELETE | `/api/prefabs` | Prefab CRUD |
| `/api/agent/*` | Agent chat, keys, history | BYOK agent |
