# How to ship a game with Playroom

End-to-end path from zero to a runnable web or mobile build. All commands assume
the Playroom monorepo is built (`pnpm install && pnpm build` at the repo root)
and `pnpm gamekit` (or `node packages/cli/dist/index.js`) is on your path.

---

## 1. Create the project

### Option A — One-command genre game (recommended)

```bash
mkdir my-game && cd my-game
pnpm gamekit create platformer --name "Jump Quest"
```

This produces:

| Path | Role |
|------|------|
| `gamekit/project.json` | Project, levels, GUI library, transitions |
| `gamekit/scenes/menu.scene.json` | Start menu |
| `gamekit/scenes/settings.scene.json` | Settings |
| `gamekit/scenes/<skill>.scene.json` | Gameplay (e.g. `platformer.scene.json`) |
| `gamekit/assets/*` | Skill SVG/PNG assets |
| `gamekit/generated/assets.ts` | Asset registry for runtimes |

**Skills:** `platformer`, `topdown`, `physics-puzzle`, `topdown-shooter`,
`puzzle`, `endless-runner`, `arena-brawler`, …  
List them with `pnpm gamekit skills list`.

### Option B — Blank shell, then skill

```bash
pnpm gamekit init --name "My Game"
pnpm gamekit skills apply platformer --wire-shell
```

### Option C — Copy an example

```bash
cp -R path/to/Playroom/examples/simple-coin-jumper ./my-game
cd my-game && pnpm install
```

---

## 2. Edit content

### Editor

```bash
pnpm gamekit editor
# → http://127.0.0.1:4177
```

- Open **Entities** / **Inspector** to tweak Transform, colliders, rules  
- **Play** runs the real Phaser host (export-parity physics and game rules)  
- GUI buttons (`startGame`, `backToMenu`, …) switch scenes during play  
- Optional: Agent panel (BYOK) for MCP-driven edits  

### Assets

```bash
pnpm gamekit import ./art/player.png
pnpm gamekit generate --platform mobile   # or web
```

Supported: images (png/jpg/webp/svg), audio (mp3/ogg/wav), fonts (ttf/otf).

### Recipes (composable mechanics)

```bash
pnpm gamekit recipes list --category mechanic
pnpm gamekit recipes apply win-collect-all --scene platformer.scene.json
pnpm gamekit recipes apply topdown-wasd --scene topdown.scene.json
```

---

## 3. Validate

```bash
pnpm gamekit doctor
pnpm gamekit validate
```

Fix errors (missing assets, invalid scene JSON) before export. Warnings about
unused assets are usually safe.

---

## 4. Play locally

| Target | Command |
|--------|---------|
| Editor | `pnpm gamekit editor` → Play |
| Web export | `pnpm gamekit export ./build --platform web` then `cd build && pnpm install && pnpm dev` |
| Mobile export | `pnpm gamekit export ./build --platform mobile` then Expo tooling in `build/` |

Export **generates** multi-scene entrypoints (`src/main.ts` or `App.tsx`) from
every `*.scene.json` — no manual import list.

---

## 5. Production pack (data only)

```bash
pnpm gamekit build --platform web
# → build/gamekit/ compact JSON + build-manifest.json
```

Use this when you already have a host app and only need the gamekit data pack.

---

## 6. Checklist before release

- [ ] Menu → Play → gameplay → win/lose/pause all work in **editor Play**  
- [ ] Same flow works after **web export**  
- [ ] Mobile controls (virtual stick / buttons) usable on device or simulator  
- [ ] `doctor` reports **0 errors**  
- [ ] Levels unlocked progression OK if you use more than one level  
- [ ] Assets referenced in scenes exist under `gamekit/assets/`  
- [ ] Privacy / store metadata outside Playroom (App Store Connect, etc.)  

---

## Architecture reminder

```
gamekit/*.json  ──►  @gamekit/schema (validate)
                 ├──►  Editor (edit + Phaser play host)
                 ├──►  @gamekit/runtime      (Expo / Skia)
                 └──►  @gamekit/runtime-web  (Phaser)
```

CLI owns files on disk. Editor and MCP never bypass validation.

---

## Automated verification

From the Playroom monorepo root:

```bash
pnpm test                 # unit + headless pipeline (create/doctor/simulate/export/API)
pnpm test:e2e:install     # once: Chromium for Playwright
pnpm test:e2e             # editor → Play host → Stop
```

CI runs both on push/PR (see `.github/workflows/ci.yml`).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Export missing a scene | List it in `project.scenes` or place `*.scene.json` under `gamekit/scenes/` and re-export |
| Play starts wrong scene | Set `project.activeScene` (usually `menu.scene.json`) |
| Menu Play goes nowhere | `startGame` action must `switchScene` to the gameplay **scene id** (not only filename) |
| Top-down cannot move up/down | Use `gamekit create topdown` or apply recipe `topdown-wasd`; player needs `gravity: 0` |
| Missing textures | `gamekit import` + `gamekit generate --platform …` |
| Doctor noise after skill | Re-run `gamekit create` or `skills apply … --wire-shell` so shell and levels match |

---

## Related docs

- [Getting started](./getting-started.md)
- [CLI reference](./cli.md)
- [Editor & agent](./editor-agent.md)
- [Schema & components](./schema.md)
- Root [ROADMAP.md](../../ROADMAP.md)
