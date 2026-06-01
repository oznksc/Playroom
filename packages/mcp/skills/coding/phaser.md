# Phaser Best Practices

## Game Setup

```ts
import Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#2d2d2d",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);
```

- Use `Phaser.AUTO` to let Phaser choose WebGL or Canvas
- Always set `physics` config even if minimal — avoids runtime errors
- Add scenes as array — first scene auto-starts

## Scene Lifecycle

```ts
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.image("player", "assets/player.png");
  }

  create(): void {
    this.player = this.physics.add.sprite(100, 100, "player");
  }

  update(time: number, delta: number): void {
    // game loop — delta in ms
  }
}
```

- `preload` → load assets (runs once)
- `create` → set up game objects (runs once)
- `update` → game loop (runs every frame)
- Never do heavy work in `update` — pre-compute where possible

## Game Objects

- Use `this.add.image()` for static sprites
- Use `this.physics.add.sprite()` for physics-enabled sprites
- Use `this.add.group()` for object pooling
- Use `this.add.container()` for grouped objects

## Physics

### Arcade Physics

```ts
const player = this.physics.add.sprite(100, 100, "player");
player.setCollideWorldBounds(true);
player.setBounce(0.2);

const platforms = this.physics.add.staticGroup();
platforms.create(400, 568, "ground");

this.physics.add.collider(player, platforms);
```

- Arcade is fast and simple — use for most 2D games
- Matter.js for complex physics (ropes, gears, complex polygons)
- Always set `setCollideWorldBounds` for player characters

## Input

```ts
// Keyboard
const cursors = this.input.keyboard.createCursorKeys();
const wasd = this.input.keyboard.addKeys("W,A,S,D");

// Pointer (mouse/touch)
this.input.on("pointerdown", (pointer) => {
  console.log(pointer.x, pointer.y);
});

// Gamepad
const gamepad = this.input.gamepad.get(0);
if (gamepad) {
  const leftStick = gamepad.leftStick;
}
```

- Use `createCursorKeys()` for arrow keys
- Use `addKeys()` for custom key bindings
- `pointer` works for both mouse and touch

## Camera

```ts
this.cameras.main.startFollow(player, true, 0.1, 0.1);
this.cameras.main.setBounds(0, 0, 1600, 600);
this.cameras.main.setZoom(1.5);
```

- `startFollow` with `lerp` for smooth camera tracking
- Set world bounds to constrain camera
- Use `setZoom` for cinematic effects

## Scenes Management

```ts
// Start another scene (parallel)
this.scene.launch("HUDScene");

// Switch scene (replaces current)
this.scene.start("GameScene", { level: 2 });

// Pause/resume
this.scene.pause();
this.scene.resume();

// Pass data between scenes
this.scene.start("NextScene", { score: this.score });
```

- `launch` runs scenes in parallel (e.g., HUD overlay)
- `start` stops current scene and starts another
- Access passed data in `init(data)` method

## Performance

- Use object pooling for bullets, particles, enemies
- Disable physics on off-screen objects
- Use `this.physics.world.step()` for fixed timestep
- Profile with `this.game.loop.actualFps`
- Minimize draw calls — batch sprites with same texture

## Audio

```ts
this.load.audio("jump", "assets/jump.mp3");

// Play
this.sound.play("jump");

// With options
this.sound.play("jump", { volume: 0.5, rate: 1.2 });
```

- Load audio in `preload`
- Use `this.sound.decodeAudio()` for Web Audio API
- Handle audio context resume on mobile (user interaction required)

## Asset Loading

```ts
preload(): void {
  // Single image
  this.load.image("player", "assets/player.png");

  // Sprite sheet
  this.load.spritesheet("enemy", "assets/enemy.png", {
    frameWidth: 32,
    frameHeight: 32,
  });

  // Audio
  this.load.audio("bgm", "assets/bgm.mp3");

  // JSON
  this.load.json("levelData", "assets/level1.json");

  // Progress bar
  this.load.on("progress", (value: number) => {
    progressBar.fillRect(0, 250, 800 * value, 30);
  });
}
```

- Use `this.load` in `preload` — never in `create` or `update`
- Track loading progress with `load.on("progress")`
- Use texture atlases for sprite sheets (JSON + PNG)
