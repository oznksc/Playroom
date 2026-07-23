/**
 * Scaffold examples/top-down-arena and examples/physics-puzzle as full games
 * (menu + settings + gameplay + GUI + assets + generated App.tsx).
 *
 * Run from monorepo root:
 *   pnpm --filter @gamekit/schema build
 *   pnpm exec tsx scripts/scaffold-samples.mjs
 */
import { cp, mkdir, writeFile, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createMenuScene,
  createSettingsScene,
  createEmptyScene,
  createDefaultGuiComponents,
  createDefaultMenuTransitions,
  projectToJson,
  sceneToJson,
  DEFAULT_GAME_RULES,
  DEFAULT_INPUT_MAP,
  GUI_MENU_EVENTS,
  validateProject,
  validateScene,
} from "../packages/schema/src/index.ts";
import {
  generateMobileApp,
  resolveTransitionMs,
  sceneFileToImportVar,
  bareSceneName,
} from "../packages/cli/src/export-bootstrap.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skillAssets = join(root, "packages/mcp/skills/assets");

function menuController(sceneId) {
  return {
    id: "menu-controller",
    name: "Menu Controller",
    components: [
      {
        type: "Transform",
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      {
        type: "Script",
        handlers: [
          {
            event: GUI_MENU_EVENTS.startGame,
            actions: [{ type: "switchScene", sceneId }],
          },
          {
            event: GUI_MENU_EVENTS.openSettings,
            actions: [{ type: "switchScene", sceneId: "settings" }],
          },
        ],
      },
    ],
  };
}

function gameController(gameplayId) {
  return {
    id: "game-controller",
    name: "Game Controller",
    components: [
      {
        type: "Transform",
        position: { x: 0, y: 0 },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      {
        type: "Script",
        handlers: [
          {
            event: GUI_MENU_EVENTS.backToMenu,
            actions: [{ type: "switchScene", sceneId: "menu" }],
          },
          {
            event: GUI_MENU_EVENTS.restartLevel,
            actions: [{ type: "switchScene", sceneId: gameplayId }],
          },
          {
            event: GUI_MENU_EVENTS.retryGame,
            actions: [{ type: "switchScene", sceneId: gameplayId }],
          },
          {
            event: GUI_MENU_EVENTS.nextLevel,
            actions: [{ type: "nextLevel" }],
          },
          { event: GUI_MENU_EVENTS.resumeGame, actions: [] },
        ],
      },
    ],
  };
}

function solidWall(id, name, x, y, w, h) {
  return {
    id,
    name,
    components: [
      {
        type: "Transform",
        position: { x, y },
        rotation: 0,
        scale: { x: 1, y: 1 },
      },
      {
        type: "AabbCollider",
        offset: { x: -w / 2, y: -h / 2 },
        size: { x: w, y: h },
        isStatic: true,
        isTrigger: false,
        layer: 1,
        mask: 1,
      },
    ],
  };
}

function spriteBody({
  id,
  name,
  x,
  y,
  assetId,
  w,
  h,
  staticSolid = false,
  trigger = false,
  rigidBody = null,
  player = null,
  cameraTarget = null,
  tags = [],
}) {
  const components = [
    {
      type: "Transform",
      position: { x, y },
      rotation: 0,
      scale: { x: 1, y: 1 },
    },
    {
      type: "Sprite",
      assetId,
      width: w,
      height: h,
      anchor: { x: 0.5, y: 0.5 },
    },
    {
      type: "AabbCollider",
      offset: { x: -w / 2, y: -h / 2 },
      size: { x: w, y: h },
      isStatic: staticSolid,
      isTrigger: trigger,
      layer: trigger ? 2 : 1,
      mask: 1,
    },
  ];
  if (rigidBody) {
    components.push({
      type: "RigidBody",
      velocity: { x: 0, y: 0 },
      angularVelocity: 0,
      mass: rigidBody.mass ?? 1,
      drag: rigidBody.drag ?? 0.05,
      isKinematic: rigidBody.isKinematic ?? false,
      gravityScale: rigidBody.gravityScale ?? 1,
      useGravity: rigidBody.useGravity ?? true,
    });
  }
  if (player) {
    components.push({
      type: "PlayerController",
      speed: player.speed,
      jumpVelocity: player.jumpVelocity,
      gravity: player.gravity,
    });
  }
  if (cameraTarget) {
    components.push({
      type: "CameraFollow",
      targetId: cameraTarget,
      smoothing: 0.12,
    });
  }
  return { id, name, components, ...(tags.length ? { tags } : {}) };
}

function buildTopDownArenaScene() {
  const scene = createEmptyScene("Arena");
  scene.id = "arena";
  scene.name = "Arena";
  scene.viewport = { width: 390, height: 844, background: "#0b1020" };
  scene.gravity = { x: 0, y: 0 };
  scene.assets = ["player", "obstacle", "target", "crate"];
  scene.inputMap = {
    bindings: [
      {
        action: "move_left",
        keys: ["ArrowLeft", "a", "A"],
        touchControl: "left",
        gamepad: "LEFT_STICK_X_NEG",
      },
      {
        action: "move_right",
        keys: ["ArrowRight", "d", "D"],
        touchControl: "right",
        gamepad: "LEFT_STICK_X_POS",
      },
      {
        action: "move_up",
        keys: ["ArrowUp", "w", "W"],
        gamepad: "LEFT_STICK_Y_NEG",
      },
      {
        action: "move_down",
        keys: ["ArrowDown", "s", "S"],
        gamepad: "LEFT_STICK_Y_POS",
      },
    ],
  };
  scene.entities = [
    spriteBody({
      id: "player",
      name: "Player",
      x: 195,
      y: 700,
      assetId: "player",
      w: 44,
      h: 44,
      rigidBody: {
        mass: 1,
        drag: 0.25,
        isKinematic: false,
        gravityScale: 0,
        useGravity: false,
      },
      player: { speed: 240, jumpVelocity: 0, gravity: 0 },
      cameraTarget: "player",
    }),
    solidWall("wall-top", "Wall Top", 195, 12, 390, 24),
    solidWall("wall-bottom", "Wall Bottom", 195, 832, 390, 24),
    solidWall("wall-left", "Wall Left", 12, 422, 24, 844),
    solidWall("wall-right", "Wall Right", 378, 422, 24, 844),
    spriteBody({
      id: "obstacle-1",
      name: "Obstacle1",
      x: 120,
      y: 320,
      assetId: "obstacle",
      w: 64,
      h: 64,
      staticSolid: true,
    }),
    spriteBody({
      id: "obstacle-2",
      name: "Obstacle2",
      x: 270,
      y: 520,
      assetId: "obstacle",
      w: 64,
      h: 64,
      staticSolid: true,
    }),
    spriteBody({
      id: "hazard-1",
      name: "Hazard Spikes",
      x: 195,
      y: 420,
      assetId: "crate",
      w: 40,
      h: 40,
      staticSolid: false,
      trigger: true,
      tags: ["hazard"],
    }),
    spriteBody({
      id: "gem-1",
      name: "Gem1",
      x: 80,
      y: 180,
      assetId: "target",
      w: 28,
      h: 28,
      trigger: true,
      tags: ["gem"],
    }),
    spriteBody({
      id: "gem-2",
      name: "Gem2",
      x: 310,
      y: 260,
      assetId: "target",
      w: 28,
      h: 28,
      trigger: true,
      tags: ["gem"],
    }),
    spriteBody({
      id: "gem-3",
      name: "Gem3",
      x: 195,
      y: 100,
      assetId: "target",
      w: 28,
      h: 28,
      trigger: true,
      tags: ["gem"],
    }),
    gameController("arena"),
  ];
  scene.gui = {
    nodes: [],
    componentInstances: [
      { id: "inst-hud", componentId: "hud", x: 0, y: 0, visible: true },
    ],
  };
  scene.gameRules = {
    ...DEFAULT_GAME_RULES,
    fallDeathEnabled: false,
    lives: 3,
    onFall: "respawn",
    winMessage: "Arena cleared!",
    gameOverMessage: "You were eliminated",
    spawnPoint: { x: 195, y: 700 },
    hazards: [
      {
        id: "spikes",
        type: "tagContact",
        tag: "hazard",
        onTrigger: "respawn",
        cooldown: 0.5,
      },
    ],
    objectives: [{ id: "collect-gems", type: "collect", tag: "gem", count: 3 }],
    objectiveMode: "all",
    onStart: [],
    onWin: [{ type: "completeLevel" }],
    onLose: [],
  };
  return scene;
}

function buildPhysicsPuzzleScene() {
  const scene = createEmptyScene("Puzzle");
  scene.id = "puzzle";
  scene.name = "Physics Puzzle";
  scene.viewport = { width: 844, height: 390, background: "#101820" };
  scene.gravity = { x: 0, y: 1600 };
  scene.assets = ["player", "crate", "ground", "platform", "goal"];
  scene.inputMap = {
    bindings: [...DEFAULT_INPUT_MAP.bindings],
  };
  scene.entities = [
    spriteBody({
      id: "ground",
      name: "Ground",
      x: 422,
      y: 370,
      assetId: "ground",
      w: 844,
      h: 40,
      staticSolid: true,
    }),
    spriteBody({
      id: "platform",
      name: "Platform",
      x: 560,
      y: 260,
      assetId: "platform",
      w: 200,
      h: 20,
      staticSolid: true,
    }),
    spriteBody({
      id: "block-low",
      name: "BlockLow",
      x: 540,
      y: 220,
      assetId: "crate",
      w: 40,
      h: 40,
      rigidBody: { mass: 1.5, drag: 0.02, useGravity: true, gravityScale: 1 },
    }),
    spriteBody({
      id: "block-mid",
      name: "BlockMid",
      x: 580,
      y: 180,
      assetId: "crate",
      w: 40,
      h: 40,
      rigidBody: { mass: 1.2, drag: 0.02, useGravity: true, gravityScale: 1 },
    }),
    spriteBody({
      id: "block-top",
      name: "BlockTop",
      x: 560,
      y: 140,
      assetId: "crate",
      w: 36,
      h: 36,
      rigidBody: { mass: 1, drag: 0.02, useGravity: true, gravityScale: 1 },
    }),
    spriteBody({
      id: "goal",
      name: "Goal",
      x: 700,
      y: 330,
      assetId: "goal",
      w: 40,
      h: 40,
      trigger: true,
      tags: ["goal"],
    }),
    spriteBody({
      id: "player",
      name: "Pusher",
      x: 120,
      y: 300,
      assetId: "player",
      w: 44,
      h: 44,
      rigidBody: {
        mass: 2,
        drag: 0.05,
        isKinematic: false,
        gravityScale: 1,
        useGravity: true,
      },
      player: { speed: 280, jumpVelocity: 520, gravity: 1600 },
      cameraTarget: "player",
    }),
    gameController("puzzle"),
  ];
  scene.gui = {
    nodes: [],
    componentInstances: [
      { id: "inst-hud", componentId: "hud", x: 0, y: 0, visible: true },
    ],
  };
  scene.gameRules = {
    ...DEFAULT_GAME_RULES,
    fallDeathEnabled: true,
    fallMargin: 80,
    lives: 3,
    onFall: "respawn",
    winMessage: "Tower toppled — goal reached!",
    gameOverMessage: "Fell off the stage",
    spawnPoint: { x: 120, y: 300 },
    hazards: [],
    objectives: [{ id: "reach-goal", type: "reach", tag: "goal" }],
    objectiveMode: "all",
    onStart: [],
    onWin: [{ type: "completeLevel" }],
    onLose: [],
  };
  return scene;
}

async function writeAssets(destDir, ids) {
  await mkdir(destDir, { recursive: true });
  // goal.svg may not exist in skill assets — reuse target
  for (const id of ids) {
    const srcName = id === "goal" ? "target.svg" : `${id}.svg`;
    const src = join(skillAssets, srcName);
    const dest = join(destDir, `${id}.svg`);
    try {
      await cp(src, dest);
    } catch {
      // try from templates
      const alt = join(root, "templates/web-game/gamekit/assets", srcName);
      await cp(alt, dest);
    }
  }
}

function assetsTs(ids) {
  const lines = ids.map((id) => `  "${id}": require("../assets/${id}.svg"),`);
  return `/* This file is generated by Playroom CLI. */
/* eslint-disable @typescript-eslint/no-var-requires */
export const gamekitAssets = {
${lines.join("\n")}
} as const;

export type GameKitAssetId = keyof typeof gamekitAssets;
`;
}

async function writeExpoShell(exampleDir, name, slug, orientation) {
  await writeFile(
    join(exampleDir, "package.json"),
    JSON.stringify(
      {
        name: slug,
        version: "0.1.0",
        private: true,
        main: "index.js",
        scripts: {
          start: "expo start -c",
          ios: "expo start --ios",
          android: "expo start --android",
          typecheck: "tsc --noEmit",
          export: "node ../../packages/cli/dist/index.js export ./build --platform mobile",
          "export:web": "node ../../packages/cli/dist/index.js export ./build-web --platform web",
          doctor: "node ../../packages/cli/dist/index.js doctor",
        },
        dependencies: {
          "@gamekit/runtime": "workspace:*",
          "@gamekit/schema": "workspace:*",
          "@shopify/react-native-skia": "^2.6.2",
          expo: "^57.0.8",
          react: "19.2.3",
          "react-native": "0.86.0",
          "react-native-gesture-handler": "~2.32.0",
          "react-native-reanimated": "4.5.0",
          "react-native-safe-area-context": "~5.7.0",
          "react-native-worklets": "0.10.0",
          zod: "^3.23.8",
        },
        devDependencies: {
          "@babel/core": "^7.26.0",
          "@types/react": "^19.2.17",
          typescript: "^6.0.3",
        },
      },
      null,
      2,
    ) + "\n",
  );

  await writeFile(
    join(exampleDir, "app.json"),
    JSON.stringify(
      {
        expo: {
          name,
          slug,
          version: "0.1.0",
          orientation,
          userInterfaceStyle: "dark",
          newArchEnabled: true,
          ios: {
            supportsTablet: true,
            bundleIdentifier: `com.playroom.${slug.replace(/-/g, "")}`,
          },
          android: {
            package: `com.playroom.${slug.replace(/-/g, "")}`,
          },
        },
      },
      null,
      2,
    ) + "\n",
  );

  await writeFile(
    join(exampleDir, "babel.config.js"),
    `module.exports = function babel(api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-reanimated/plugin"],
  };
};
`,
  );

  await writeFile(
    join(exampleDir, "index.js"),
    `import "react-native-gesture-handler";
import "react-native-reanimated";

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
`,
  );

  await writeFile(
    join(exampleDir, "tsconfig.json"),
    JSON.stringify(
      {
        extends: "expo/tsconfig.base",
        compilerOptions: {
          strict: true,
          resolveJsonModule: true,
        },
        include: ["**/*.ts", "**/*.tsx", "gamekit/**/*.json"],
      },
      null,
      2,
    ) + "\n",
  );

  // Reuse coin-jumper metro config pattern
  const metro = await readFile(
    join(root, "examples/simple-coin-jumper/metro.config.js"),
    "utf8",
  );
  await writeFile(join(exampleDir, "metro.config.js"), metro);
}

async function scaffoldExample({
  folder,
  name,
  slug,
  orientation,
  gameplayFile,
  gameplayScene,
  assetIds,
  description,
}) {
  const exampleDir = join(root, "examples", folder);
  const gk = join(exampleDir, "gamekit");
  await mkdir(join(gk, "scenes"), { recursive: true });
  await mkdir(join(gk, "generated"), { recursive: true });

  const menu = createMenuScene(name);
  menu.entities = [menuController(gameplayScene.id)];
  // Point title subtitle at this sample
  const settings = createSettingsScene();

  const project = {
    schemaVersion: 1,
    name,
    scenes: ["menu.scene.json", "settings.scene.json", gameplayFile],
    activeScene: "menu.scene.json",
    levels: [
      {
        id: "level-1",
        name: name,
        order: 1,
        sceneIds: [gameplayScene.id],
        unlocked: true,
      },
    ],
    assets: assetIds.map((id) => ({ id, file: `${id}.svg`, kind: "image" })),
    guiComponents: createDefaultGuiComponents(),
    transitions: [
      {
        id: "to-game",
        name: "Menu → Game",
        fromSceneId: "menu",
        toSceneId: gameplayScene.id,
        type: "fade",
        duration: 0.35,
      },
      {
        id: "to-menu",
        name: "Back to Menu",
        toSceneId: "menu",
        type: "fade",
        duration: 0.25,
      },
      {
        id: "to-settings",
        name: "Open Settings",
        fromSceneId: "menu",
        toSceneId: "settings",
        type: "fade",
        duration: 0.25,
      },
    ],
  };

  const vp = validateProject(project);
  if (!vp.ok) throw new Error(`${folder} project invalid:\n${vp.errors.join("\n")}`);
  for (const [label, scene] of [
    ["menu", menu],
    ["settings", settings],
    [gameplayScene.id, gameplayScene],
  ]) {
    const vs = validateScene(scene);
    if (!vs.ok) throw new Error(`${folder} ${label} invalid:\n${vs.errors.join("\n")}`);
  }

  await writeFile(join(gk, "project.json"), projectToJson(project));
  await writeFile(join(gk, "scenes", "menu.scene.json"), sceneToJson(menu));
  await writeFile(join(gk, "scenes", "settings.scene.json"), sceneToJson(settings));
  await writeFile(join(gk, "scenes", gameplayFile), sceneToJson(gameplayScene));
  await writeAssets(join(gk, "assets"), assetIds);
  await writeFile(join(gk, "generated", "assets.ts"), assetsTs(assetIds));

  await writeExpoShell(exampleDir, name, slug, orientation);

  // Bootstrap App.tsx
  const scenes = [
    {
      file: "menu.scene.json",
      bare: "menu",
      importVar: sceneFileToImportVar("menu.scene.json"),
      sceneId: "menu",
      hasPlayerController: false,
    },
    {
      file: "settings.scene.json",
      bare: "settings",
      importVar: sceneFileToImportVar("settings.scene.json"),
      sceneId: "settings",
      hasPlayerController: false,
    },
    {
      file: gameplayFile,
      bare: bareSceneName(gameplayFile),
      importVar: sceneFileToImportVar(gameplayFile),
      sceneId: gameplayScene.id,
      hasPlayerController: true,
    },
  ];
  await writeFile(
    join(exampleDir, "App.tsx"),
    generateMobileApp({
      scenes,
      activeScene: "menu.scene.json",
      transition: resolveTransitionMs(project.transitions),
    }),
  );

  await writeFile(
    join(exampleDir, "README.md"),
    `# ${name}

${description}

## Prerequisites

- Node 18+
- From monorepo root: \`pnpm install && pnpm build\`

## Run (Expo)

\`\`\`bash
cd examples/${folder}
pnpm install
pnpm start
# or
pnpm ios
\`\`\`

## Edit

- Gameplay: \`gamekit/scenes/${gameplayFile}\`
- Menu / settings: \`gamekit/scenes/menu.scene.json\`, \`settings.scene.json\`
- Assets: \`gamekit/assets/\`

After asset changes:

\`\`\`bash
node ../../packages/cli/dist/index.js generate --platform mobile
\`\`\`

## Export

\`\`\`bash
pnpm export        # Expo pack under ./build
pnpm export:web    # Vite/Phaser pack under ./build-web
\`\`\`
`,
  );

  console.log(`✓ scaffolded examples/${folder}`);
}

await scaffoldExample({
  folder: "top-down-arena",
  name: "Top-Down Arena",
  slug: "top-down-arena",
  orientation: "portrait",
  gameplayFile: "arena.scene.json",
  gameplayScene: buildTopDownArenaScene(),
  assetIds: ["player", "obstacle", "target", "crate"],
  description:
    "Portrait top-down arena: collect 3 gems, avoid the hazard zone. Four-way movement (WASD / stick).",
});

await scaffoldExample({
  folder: "physics-puzzle",
  name: "Physics Puzzle",
  slug: "physics-puzzle",
  orientation: "landscape",
  gameplayFile: "puzzle.scene.json",
  gameplayScene: buildPhysicsPuzzleScene(),
  assetIds: ["player", "crate", "ground", "platform", "goal"],
  description:
    "Landscape physics puzzle: knock the crate stack and reach the goal. Lives + fall respawn.",
});

console.log("Done.");
