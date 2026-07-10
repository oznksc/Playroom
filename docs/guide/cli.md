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
| `editor [--port]` | Local editor HTTP server (default 4177) |
| `import <file>` | Import image/audio/font asset |
| `remove <asset-id>` | Remove asset from project |
| `generate [--platform web\|mobile]` | Regenerate `gamekit/generated/assets.ts` |
| `export [path] [--platform]` | Copy Expo or web starter + gamekit data |
| `mcp [project-path]` | Start MCP server over stdio |
| `skills list` | List genre skill templates |
| `skills apply <name>` | Create scene from skill |
| `search <query>` | Search project text |
| `validate` | Schema-validate project + scenes |
| `doctor` | Health report (assets, orphans, levels) |
| `build [--out] [--platform] [--skip-doctor]` | Production pack of gamekit/ |
| `dev [--platform]` | Watch scenes/assets; regenerate + doctor |

## HTTP API (editor server)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/project` | Project snapshot |
| GET/POST | `/api/scene` | Read/write scene |
| GET | `/api/scene/meta` | Scene mtime (hot-reload) |
| GET | `/api/doctor` | Doctor report |
| POST | `/api/build` | Trigger production pack |
| GET | `/api/skills` | List skills |
| POST | `/api/skills/apply` | Apply skill |
| GET/POST/DELETE | `/api/prefabs` | Prefab CRUD |
| `/api/agent/*` | Agent chat, keys, history | BYOK agent |
