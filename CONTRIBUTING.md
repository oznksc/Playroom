# Contributing to Playroom

Thanks for taking the time to contribute. Playroom is currently an MVP focused
on a local 2D scene editor, JSON project files, and an Expo/Skia runtime.
Contributions should keep that scope sharp: prefer complete, reliable editor
workflows over broad unfinished engine features.

## Branches

- `master`: stable public branch. Changes land here through reviewed pull
  requests only.
- `develop`: integration branch for accepted feature work before release.
- `docs`: documentation-focused branch for guides, examples, and website work.
- `examples`: sample games, starter scenes, and tutorial project updates.

Use short feature branches from the closest long-lived branch:

- Feature work: `feature/<short-name>` from `develop`.
- Bug fixes: `fix/<short-name>` from `develop`.
- Documentation: `docs/<short-name>` from `docs`.
- Samples/templates: `examples/<short-name>` from `examples`.

## Development Setup

Requirements:

- Node.js 22 or newer.
- pnpm 11.3.0 or compatible.

Install and verify:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Run the editor:

```bash
pnpm gamekit editor
```

The editor server defaults to `http://127.0.0.1:4177`.

## Pull Request Checklist

Before opening a pull request:

- Keep changes scoped to one problem.
- Add or update tests when behavior changes.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build` for UI or package export changes.
- Update documentation when commands, public APIs, or user workflows change.
- Do not commit generated local output, API keys, `.env` files, or Playwright
  session artifacts.

## MVP Scope

Currently in scope:

- Project initialization and local editor server.
- JSON scene/project schema.
- Canvas editing for entities, sprites, AABB colliders, player controller, and
  camera follow.
- Image asset import/remove/generate.
- Scene file management.
- Expo/Skia runtime and starter export.
- MCP tooling as an integration surface.

Currently out of MVP scope unless discussed first:

- In-editor runtime simulation.
- Timeline/sequencer UX.
- Level progression runtime flow.
- Reusable GUI component editor.
- Advanced physics such as rigid bodies, raycasts, triggers, and collision
  callbacks.
- Audio, tilemaps, particles, lights, behavior scripts, prefabs, save systems,
  profilers, and production-grade cross-runtime parity.

## Reporting Issues

Use GitHub issues. Include:

- What you expected.
- What happened.
- Steps to reproduce.
- Your OS, Node version, pnpm version, and browser if relevant.
- Logs or screenshots when they clarify the problem.

Security issues should follow `SECURITY.md`, not public issues.
