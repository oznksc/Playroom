# architecture
- Structure as a pnpm monorepo with packages/runtime, packages/cli, apps/editor, and templates/expo-game. Confidence: 0.65
- Use local WebUI + Node CLI architecture where CLI serves the browser editor at http://localhost:4177 and owns all project file access. Confidence: 0.65
- Use JSON files as the source of truth for scene data (gamekit/scenes/*.scene.json) and project config (gamekit/project.json). Confidence: 0.60
- Validate scene JSON against a schema in the CLI before saving, failing with actionable errors on invalid data. Confidence: 0.60
- Generate a static TypeScript asset registry (gamekit/generated/assets.ts) for Expo-compatible asset imports. Confidence: 0.55
- Group GUI elements and implement them as a component that can be attached to entities, rather than standalone scene nodes. Confidence: 0.65
