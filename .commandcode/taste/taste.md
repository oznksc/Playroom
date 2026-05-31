# workflow
- Use pnpm as the package manager for all workspace operations. Confidence: 0.65
- Use TypeScript as the primary language. Confidence: 0.65

# architecture
- Structure as a pnpm monorepo with packages/runtime, packages/cli, apps/editor, and templates/expo-game. Confidence: 0.65
- Use local WebUI + Node CLI architecture where CLI serves the browser editor at http://localhost:4177 and owns all project file access. Confidence: 0.65
- Use JSON files as the source of truth for scene data (gamekit/scenes/*.scene.json) and project config (gamekit/project.json). Confidence: 0.60
- Validate scene JSON against a schema in the CLI before saving, failing with actionable errors on invalid data. Confidence: 0.60
- Generate a static TypeScript asset registry (gamekit/generated/assets.ts) for Expo-compatible asset imports. Confidence: 0.55

# editor
- Use React + Vite for the browser-based editor frontend. Confidence: 0.55

# runtime
- Use Skia for 2D runtime rendering in the Expo app. Confidence: 0.55
- Use Reanimated for animation and game loop where practical, with a small runtime loop abstraction. Confidence: 0.50

# naming
- Use @gamekit/runtime and @gamekit/cli as the NPM package names. Confidence: 0.50
