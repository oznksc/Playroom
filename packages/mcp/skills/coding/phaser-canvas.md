# Phaser Canvas & Rendering Best Practices

## Canvas Configuration

```ts
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#1a1a2e",
  pixelArt: true,       // crisp pixel art rendering
  roundPixels: true,    // round to nearest pixel
  antialias: false,     // disable for pixel art
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};
```

- `Phaser.AUTO` picks WebGL when available, falls back to Canvas
- `pixelArt: true` disables anti-aliasing — essential for retro games
- `scale.mode: FIT` scales canvas to fit parent while maintaining aspect ratio
- `autoCenter: CENTER_BOTH` centers horizontally and vertically

## Rendering Modes

### WebGL (default, preferred)

- Hardware-accelerated rendering
- Supports shaders, filters, and advanced effects
- Better performance for many sprites
- Use for most games

### Canvas 2D (fallback)

- Software rendering
- Used when WebGL unavailable
- Simpler API, fewer features
- Use only when WebGL isn't an option

## Sprites & Images

```ts
// Basic sprite
const player = this.add.sprite(100, 200, "player");

// With display size
const enemy = this.add.image(300, 200, "enemy");
enemy.setDisplaySize(64, 64);

// Set origin (0-1 range)
player.setOrigin(0.5, 0.5); // center (default)
player.setOrigin(0, 0);      // top-left
player.setOrigin(0.5, 1);    // bottom-center
```

- Use `sprite` for animated objects, `image` for static
- `setDisplaySize` stretches to exact dimensions
- `setOrigin` controls anchor point for positioning and rotation

## Cameras

```ts
// Follow player
this.cameras.main.startFollow(player, true, 0.08, 0.08);

// World bounds
this.cameras.main.setBounds(0, 0, 2000, 600);

// Zoom
this.cameras.main.setZoom(1.5);

// Shake effect
this.cameras.main.shake(200, 0.01);

// Fade effect
this.cameras.main.fadeIn(500);
this.cameras.main.fadeOut(500);

// Multiple cameras
const uiCamera = this.cameras.add(0, 0, 800, 100);
uiCamera.setScroll(0, 0);
```

- Use `lerp` values (0.05-0.15) for smooth camera follow
- `setBounds` prevents camera from showing outside world
- Stack cameras for UI overlays (HUD, menus)
- Effects (shake, fade) are per-camera

## Tilemaps

```ts
// Load from Tiled JSON
this.load.tilemapTiledJSON("level1", "assets/level1.json");
this.load.image("tiles", "assets/tileset.png");

create(): void {
  const map = this.make.tilemap({ key: "level1" });
  const tileset = map.addTilesetImage("tileset", "tiles");
  const groundLayer = map.createLayer("Ground", tileset, 0, 0);

  groundLayer.setCollisionByProperty({ collides: true });

  this.physics.add.collider(player, groundLayer);
}
```

- Use Tiled editor for level design
- `createLayer` creates the visual layer
- `setCollisionByProperty` enables physics on specific tiles
- Multiple layers for different collision groups

## Particle Effects

```ts
// Phaser 3.60+ particle emitter
const emitter = this.add.particles(0, 0, "particle", {
  speed: { min: 50, max: 150 },
  angle: { min: 200, max: 340 },
  scale: { start: 1, end: 0 },
  lifespan: 1000,
  gravityY: 300,
  frequency: 50,
});

emitter.explode(20); // burst 20 particles
```

- Use particle emitters for fire, smoke, sparks, explosions
- `explode(n)` for one-shot bursts
- `frequency` for continuous emission
- Combine with tween for moving emitters

## Shaders (WebGL only)

```ts
// Custom pipeline
const pipeline = this.renderer.pipelines.add(
  "Glow",
  new Phaser.Renderer.WebGL.Pipelines.PostFXPipeline({
    game: this.game,
    fragShader: `
      precision mediump float;
      uniform sampler2D uMainSampler;
      varying vec2 outTexCoord;
      void main() {
        vec4 color = texture2D(uMainSampler, outTexCoord);
        color.rgb += 0.1; // simple brightness boost
        gl_FragColor = color;
      }
    `,
  })
);

this.cameras.main.setPostPipeline(pipeline);
```

- Shaders run on GPU — great for visual effects
- Post-processing pipelines apply to entire camera
- Use for glow, blur, color correction, distortion
- Not supported in Canvas mode

## Debug Rendering

```ts
// Physics debug
this.physics.world.debug = true;

// Show bounds
this.physics.world.debugGraphic = this.add.graphics();

// Custom debug draw
this.debug.body(this.player);
this.debug.rectangle(this.zone);
```

- Enable `physics.world.debug` during development
- `this.debug.body()` draws collision bounds
- Disable all debug rendering for production builds

## Texture Management

```ts
// Generate texture from graphics
const gfx = this.add.graphics();
gfx.fillStyle(0xff0000);
gfx.fillRect(0, 0, 32, 32);
gfx.generateTexture("redSquare", 32, 32);
gfx.destroy();

// Render texture for dynamic content
const rt = this.add.renderTexture(0, 0, 800, 600);
rt.draw("player", 100, 200);
```

- `generateTexture` creates reusable textures from graphics
- `renderTexture` for compositing multiple sprites into one texture
- Great for dynamic backgrounds and procedural content
