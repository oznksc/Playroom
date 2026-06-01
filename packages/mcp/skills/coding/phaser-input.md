# Phaser Input Handling Best Practices

## Keyboard Input

### Cursor Keys & Custom Keys

```ts
// Arrow keys
const cursors = this.input.keyboard.createCursorKeys();

// WASD
const wasd = this.input.keyboard.addKeys({
  up: Phaser.Input.Keyboard.KeyCodes.W,
  down: Phaser.Input.Keyboard.KeyCodes.S,
  left: Phaser.Input.Keyboard.KeyCodes.A,
  right: Phaser.Input.Keyboard.KeyCodes.D,
});

// Single key
const spaceKey = this.input.keyboard.addKey(
  Phaser.Input.Keyboard.KeyCodes.SPACE
);
```

### Key States

```ts
// Just pressed (one frame)
if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
  jump();
}

// Just released
if (Phaser.Input.Keyboard.JustUp(spaceKey)) {
  stopJump();
}

// Held down
if (cursors.right.isDown) {
  player.setVelocityX(200);
}

// Not held
if (!cursors.left.isDown && !cursors.right.isDown) {
  player.setVelocityX(0);
}
```

### Key Combinations

```ts
// Check multiple keys
if (cursors.up.isDown && spaceKey.isDown) {
  doubleJump();
}

// Shift + movement for run
const runSpeed = shiftKey.isDown ? 400 : 200;
player.setVelocityX(cursors.right.isDown ? runSpeed : 0);
```

### Key Events

```ts
// Press event
spaceKey.on("down", () => {
  fireBullet();
});

// Release event
spaceKey.on("up", () => {
  stopCharging();
});

// Key hold duration
let holdTime = 0;
spaceKey.on("down", () => {
  holdTime = 0;
});
spaceKey.on("up", () => {
  if (holdTime > 1000) {
    chargedShot();
  } else {
    normalShot();
  }
});
```

## Pointer (Mouse/Touch)

### Basic Events

```ts
// Click/tap
this.input.on("pointerdown", (pointer) => {
  console.log("Clicked at:", pointer.x, pointer.y);
});

// Release
this.input.on("pointerup", (pointer) => {
  console.log("Released at:", pointer.x, pointer.y);
});

// Move
this.input.on("pointermove", (pointer) => {
  if (pointer.isDown) {
    // Dragging
  }
});
```

### Pointer Properties

```ts
this.input.on("pointerdown", (pointer) => {
  pointer.x;          // x position
  pointer.y;          // y position
  pointer.worldX;     // x in world space (respects camera)
  pointer.worldY;     // y in world space
  pointer.isDown;     // currently pressed
  pointer.button;     // 0=left, 1=middle, 2=right
  pointer.width;      // touch radius
  pointer.event;      // native DOM event
});
```

### Drag & Drop

```ts
// Make object draggable
this.input.setDraggable(image);

// Drag events
this.input.on("dragstart", (pointer, gameObject) => {
  gameObject.setTint(0xff0000);
});

this.input.on("drag", (pointer, gameObject, dragX, dragY) => {
  gameObject.x = dragX;
  gameObject.y = dragY;
});

this.input.on("dragend", (pointer, gameObject) => {
  gameObject.clearTint();
});
```

### Pointer vs Mouse

```ts
// Check input type
this.input.on("pointerdown", (pointer) => {
  if (pointer.pointerType === "mouse") {
    // Mouse click
  } else {
    // Touch
  }
});

// Prevent default browser behavior
this.input.mouse.disableContextMenu();
```

## Gamepad Input

### Basic Setup

```ts
// Check for gamepad
this.input.gamepad.once("connected", (pad) => {
  console.log("Gamepad connected:", pad.id);
});

// Read input
const gamepad = this.input.gamepad.get(0);
if (gamepad) {
  // Buttons
  if (gamepad.A) jump();
  if (gamepad.B) shoot();

  // Analog sticks
  const leftX = gamepad.leftStick.x;  // -1 to 1
  const leftY = gamepad.leftStick.y;  // -1 to 1

  // D-pad
  if (gamepad.up) moveUp();
  if (gamepad.down) moveDown();
}
```

### Vibration

```ts
const gamepad = this.input.gamepad.get(0);
if (gamepad) {
  gamepad.vibration(200, 1);  // duration(ms), intensity(0-1)
}
```

### Deadzone

```ts
// Apply deadzone to analog sticks
const deadzone = 0.2;
const leftX = Math.abs(gamepad.leftStick.x) > deadzone
  ? gamepad.leftStick.x
  : 0;
```

## Input Patterns

### State Machine Pattern

```ts
enum PlayerState {
  IDLE,
  RUNNING,
  JUMPING,
  FALLING,
}

class Player {
  private state = PlayerState.IDLE;

  update(cursors: Phaser.Types.Input.Keyboard.CursorKeys) {
    switch (this.state) {
      case PlayerState.IDLE:
        if (cursors.left.isDown || cursors.right.isDown) {
          this.state = PlayerState.RUNNING;
        }
        if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
          this.state = PlayerState.JUMPING;
        }
        break;

      case PlayerState.RUNNING:
        // handle running...
        break;

      case PlayerState.JUMPING:
        // handle jumping...
        break;
    }
  }
}
```

### Input Buffering

```ts
private inputBuffer: string[] = [];
private bufferWindow = 100; // ms

addInput(action: string) {
  this.inputBuffer.push(action);
  this.time.delayedCall(this.bufferWindow, () => {
    this.inputBuffer.shift();
  });
}

checkBuffer(action: string): boolean {
  return this.inputBuffer.includes(action);
}

// Usage: buffer jump input slightly before landing
update() {
  if (Phaser.Input.Keyboard.JustDown(cursors.up)) {
    this.addInput("jump");
  }

  if (this.player.body.blocked.down && this.checkBuffer("jump")) {
    this.player.setVelocityY(-400);
    this.inputBuffer = [];
  }
}
```

### Combo Detection

```ts
private comboBuffer: string[] = [];
private comboTimeout: Phaser.Time.TimerEvent | null = null;

recordInput(key: string) {
  this.comboBuffer.push(key);

  if (this.comboTimeout) this.comboTimeout.destroy();
  this.comboTimeout = this.time.delayedCall(500, () => {
    this.comboBuffer = [];
  });

  this.checkCombo();
}

checkCombo() {
  const combo = this.comboBuffer.join("");
  if (combo.includes("↓→A")) {
    this.performHadouken();
    this.comboBuffer = [];
  }
}
```

## Mobile Touch Controls

### Virtual D-pad

```ts
// Create touch zones
const leftZone = this.add.zone(100, 500, 150, 200);
leftZone.setInteractive();

leftZone.on("pointerdown", () => { this.touchLeft = true; });
leftZone.on("pointerup", () => { this.touchLeft = false; });
leftZone.on("pointerout", () => { this.touchLeft = false; });
```

### Virtual Buttons

```ts
const jumpBtn = this.add.image(700, 500, "jumpButton");
jumpBtn.setInteractive();

jumpBtn.on("pointerdown", () => {
  if (this.player.body.blocked.down) {
    this.player.setVelocityY(-400);
  }
});
```

## Input Cleanup

```ts
shutdown(): void {
  this.input.keyboard.removeAllListeners();
  this.input.removeAllListeners();
  this.input.gamepad.removeAllListeners();
}
```

- Always clean up in `shutdown` to prevent memory leaks
- Remove specific listeners if not cleaning all
- Disable input during scene transitions
