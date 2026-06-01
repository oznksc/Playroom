# Phaser Scene Management Best Practices

## Scene Lifecycle

```ts
class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  init(data: Record<string, unknown>): void {
    // Receive data from previous scene
    this.score = data.score ?? 0;
  }

  preload(): void {
    // Load assets — shows loading bar
    this.load.on("progress", (value: number) => {
      this.progressBar.fillProgress(value);
    });
  }

  create(): void {
    // Set up game objects — called once after preload
  }

  update(time: number, delta: number): void {
    // Game loop — called every frame
  }

  shutdown(): void {
    // Cleanup — called when scene is stopped/destroyed
  }
}
```

- `init` receives data from `scene.start("SceneName", data)`
- `preload` → `create` → `update` is the standard flow
- `shutdown` for cleanup (remove listeners, cancel timers)

## Scene Transitions

```ts
// Start new scene (stops current)
this.scene.start("GameScene", { level: 2 });

// Launch scene in parallel (current keeps running)
this.scene.launch("HUDScene");

// Stop a running scene
this.scene.stop("HUDScene");

// Pause/resume
this.scene.pause();
this.scene.resume("GameScene");

// Bring scene to front
this.scene.bringToTop("PauseScene");

// Remove scene from display list
this.scene.remove("OldScene");
```

### Transition Effects

```ts
// Camera fade before transition
this.cameras.main.fadeOut(300, 0, 0, 0);
this.cameras.main.once("camerafadeoutcomplete", () => {
  this.scene.start("NextScene");
});

// In new scene
this.cameras.main.fadeIn(300, 0, 0, 0);
```

## Scene Data Passing

```ts
// Sender
this.scene.start("GameOverScene", {
  score: this.score,
  level: this.currentLevel,
  time: this.gameTime,
});

// Receiver
class GameOverScene extends Phaser.Scene {
  init(data: { score: number; level: number; time: number }) {
    this.finalScore = data.score;
    this.levelReached = data.level;
  }

  create() {
    this.add.text(400, 200, `Score: ${this.finalScore}`);
  }
}
```

- Data is passed once at scene start — not reactive
- For ongoing communication, use events or shared state
- Keep data minimal — pass IDs, not full objects

## Parallel Scenes (HUD, Menus)

```ts
// Launch HUD alongside game
this.scene.launch("HUDScene");

// HUD listens to game events
class HUDScene extends Phaser.Scene {
  create() {
    const gameScene = this.scene.get("GameScene");
    gameScene.events.on("scoreChanged", (score: number) => {
      this.scoreText.setText(`Score: ${score}`);
    });
  }
}
```

- Use `this.scene.get("SceneName")` to access other scenes
- Event-driven communication between parallel scenes
- HUD scene typically ignores input (set `input.topOnly = false`)

## Scene Groups & Organization

```ts
// Scene queue for sequential levels
const levels = ["Level1", "Level2", "Level3"];
let currentLevel = 0;

class LevelComplete extends Phaser.Scene {
  nextLevel() {
    currentLevel++;
    if (currentLevel < levels.length) {
      this.scene.start(levels[currentLevel]);
    } else {
      this.scene.start("VictoryScene");
    }
  }
}
```

- Keep scenes focused — one responsibility per scene
- Boot → Preload → Menu → Game → Pause → GameOver is a common flow
- Use scene keys as constants to avoid typos

## State Management Across Scenes

```ts
// Game state shared via scene registry
this.registry.set("score", 0);
this.registry.set("lives", 3);

// Any scene can read
const score = this.registry.get("score");

// Or use events
this.registry.events.on("changedata", (parent, key, value) => {
  if (key === "score") this.updateScoreDisplay(value);
});
```

- `this.registry` is a global data store shared across all scenes
- Use events for reactive updates
- Better than singletons — tied to game lifecycle

## Scene Input Management

```ts
// Disable input when paused
create() {
  this.input.keyboard.enabled = false;
}

// Re-enable on resume
resume() {
  this.input.keyboard.enabled = true;
}

// Per-scene input
this.input.on("pointerdown", (pointer) => {
  if (this.scene.isActive("GameScene")) {
    // Only handle input when game scene is active
  }
});
```

- Check `scene.isActive()` before processing input
- Disable input during transitions to prevent double-actions
- Use scene events for input coordination

## Cleanup & Memory

```ts
shutdown(): void {
  // Remove all event listeners
  this.events.removeAllListeners();

  // Stop all tweens
  this.tweens.killAll();

  // Remove physics bodies
  this.physics.world.colliders.destroy();

  // Destroy game objects
  this.children.removeAll();

  // Cancel any pending timers
  this.time.removeAllEvents();
}
```

- Always clean up in `shutdown` to prevent memory leaks
- Remove specific listeners with `off()` if not cleaning all
- Destroy objects explicitly if they hold large resources
