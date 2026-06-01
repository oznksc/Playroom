# Phaser Physics Best Practices

## Arcade Physics

### Setup

```ts
const config: Phaser.Types.Core.GameConfig = {
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 300 },
      debug: false,
    },
  },
};
```

- Arcade is fast and simple — use for most 2D games
- `gravity.y` affects all dynamic bodies
- `debug: true` shows collision bounds in development

### Static vs Dynamic Bodies

```ts
// Static — doesn't move, used for ground/platforms
const ground = this.physics.add.staticGroup();
ground.create(400, 568, "ground");

// Dynamic — affected by physics
const player = this.physics.add.sprite(100, 100, "player");
player.setCollideWorldBounds(true);
player.setBounce(0.2);
```

- Static bodies: walls, floors, platforms (immovable)
- Dynamic bodies: players, enemies, projectiles (movable)

### Colliders & Overlaps

```ts
// Block when colliding
this.physics.add.collider(player, platforms);

// Pass through but detect
this.physics.add.overlap(player, coins, collectCoin, null, this);

// With custom callback
this.physics.add.collider(
  player,
  enemies,
  (player, enemy) => {
    enemy.destroy();
    this.score += 10;
  },
  null,
  this
);
```

- `collider` = physical collision (block movement)
- `overlap` = trigger (no physical blocking)
- Callback fires only when collision occurs

### Body Properties

```ts
player.setVelocity(200, -300);       // set velocity directly
player.setAcceleration(100, 0);       // acceleration
player.setDrag(200, 0);              // deceleration
player.setMaxVelocity(400, 600);     // speed cap
player.setBounce(0.5);              // bounce factor
player.setCollideWorldBounds(true);  // stay in world
```

- Use `setVelocity` for instant movement
- Use `setAcceleration` for gradual speed increase
- Use `setDrag` for friction/deceleration

### Physics Groups

```ts
// Create group with config
const bullets = this.physics.add.group({
  classType: Phaser.Physics.Arcade.Image,
  maxSize: 20,
  runChildUpdate: true,
});

// Fire bullet
function fireBullet() {
  const bullet = bullets.get(player.x, player.y);
  if (bullet) {
    bullet.setActive(true);
    bullet.setVisible(true);
    bullet.setVelocityY(-400);
  }
}

// Clean up inactive
bullets.getChildren().forEach((bullet) => {
  if (bullet.y < 0) {
    bullets.killAndHide(bullet);
  }
});
```

- Use groups for object pooling (bullets, enemies, particles)
- `get()` reuses inactive objects instead of creating new ones
- `runChildUpdate: true` calls `update()` on group children

## Matter.js Physics

### Setup

```ts
const config: Phaser.Types.Core.GameConfig = {
  physics: {
    default: "matter",
    matter: {
      gravity: { y: 1 },
      debug: true,
    },
  },
};
```

- Matter.js for complex physics (ropes, gears, constraints)
- Slower than Arcade — use only when needed

### Matter Bodies

```ts
// Basic body
const ball = this.matter.add.circle(400, 100, 30, {
  restitution: 0.8,  // bounciness
  friction: 0.1,
});

// Composite body
const car = this.matter.add.vehicle(200, 200, 100, 40);
```

### Constraints

```ts
// Rope constraint
this.matter.add.constraint(bodyA, bodyB, 100, 0.5);

// Pin constraint (fixed to world)
this.matter.add.worldConstraint(body, 0, 1, {
  pointA: { x: 200, y: 100 },
  pointB: { x: 0, y: 0 },
});
```

### Collision Categories

```ts
// Define categories
const PLAYER = 0x0001;
const ENEMY = 0x0002;
const BULLET = 0x0004;

// Assign to bodies
player.setCollisionCategory(PLAYER);
enemy.setCollisionCategory(ENEMY);
bullet.setCollisionCategory(BULLET);

// Set what collides with what
player.setCollidesWith([ENEMY]); // player only collides with enemies
```

- Use bitmasks for complex collision filtering
- Useful for team-based collision (player bullets don't hit player)

## Performance Tips

- Use `physics.world.step(fps)` for fixed timestep
- Disable physics on off-screen objects
- Use `body.enable = false` to temporarily disable
- Object pooling reduces garbage collection
- Limit collider count — each pair is checked every frame
- Use `CollideCallback` to skip unnecessary checks

## Debugging

```ts
// Enable debug rendering
this.physics.world.debug = true;

// Draw custom shapes
this.debug.body(this.player);
this.debug.bodyInfo(this.player, 16, 16);

// Log physics info
console.log(this.player.body.velocity);
console.log(this.player.body.acceleration);
```

- `debug: true` in config shows all collision bounds
- `this.debug.body()` shows individual body bounds
- Check `body.blocked` and `body.touching` for collision state
