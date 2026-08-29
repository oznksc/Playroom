# libGDX Physics & Box2D

## Box2D Architecture in libGDX

libGDX provides JNI C++ bindings to Box2D (`com.badlogic.gdx.physics.box2d.*`).

### Core Concepts
- **`World`**: Physics simulation container. Manages bodies, fixtures, joints, contacts, and gravity.
- **`Body`**: Rigid body with position, linear velocity, angular velocity, and mass.
- **`Fixture`**: Attached shape, density, friction, restitution, sensor flag, and collision filter.

## Units & Scaling: PPM (Pixels Per Meter)

Box2D is tuned for MKS units (Meters, Kilograms, Seconds) with object sizes between **0.1m and 10.0m**. Passing raw screen pixel values (e.g. `800px`, `1920px`) into Box2D causes simulation instability, tunneling, and float precision issues.

```java
public class PhysicsConstants {
    // 32 or 100 pixels = 1.0 meter in Box2D simulation
    public static final float PPM = 32.0f;

    public static float toMeters(float pixels) {
        return pixels / PPM;
    }

    public static float toPixels(float meters) {
        return meters * PPM;
    }
}
```

## Creating Bodies and Fixtures

```java
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.physics.box2d.*;

public class BodyFactory {
    private final World world;

    public BodyFactory(World world) {
        this.world = world;
    }

    // Dynamic player / entity body with box fixture
    public Body createBoxBody(float pixelX, float pixelY, float pixelWidth, float pixelHeight, boolean isStatic) {
        BodyDef bodyDef = new BodyDef();
        bodyDef.type = isStatic ? BodyDef.BodyType.StaticBody : BodyDef.BodyType.DynamicBody;
        bodyDef.position.set(PhysicsConstants.toMeters(pixelX), PhysicsConstants.toMeters(pixelY));
        bodyDef.fixedRotation = true; // Prevent player from tipping over

        Body body = world.createBody(bodyDef);

        PolygonShape shape = new PolygonShape();
        // setAsBox takes half-width and half-height in meters
        shape.setAsBox(
            PhysicsConstants.toMeters(pixelWidth / 2f),
            PhysicsConstants.toMeters(pixelHeight / 2f)
        );

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = shape;
        fixtureDef.density = 1.0f;
        fixtureDef.friction = 0.2f;
        fixtureDef.restitution = 0.0f; // Bounciness

        body.createFixture(fixtureDef);
        shape.dispose(); // Always dispose shape once fixture is created

        return body;
    }

    // Circle sensor (collectible, trigger zone)
    public Body createCircleSensor(float pixelX, float pixelY, float pixelRadius, Object userData) {
        BodyDef bodyDef = new BodyDef();
        bodyDef.type = BodyDef.BodyType.StaticBody;
        bodyDef.position.set(PhysicsConstants.toMeters(pixelX), PhysicsConstants.toMeters(pixelY));

        Body body = world.createBody(bodyDef);

        CircleShape shape = new CircleShape();
        shape.setRadius(PhysicsConstants.toMeters(pixelRadius));

        FixtureDef fixtureDef = new FixtureDef();
        fixtureDef.shape = shape;
        fixtureDef.isSensor = true; // Does not produce physical collision response

        Fixture fixture = body.createFixture(fixtureDef);
        fixture.setUserData(userData);
        shape.dispose();

        return body;
    }
}
```

## Collision Filtering with Category & Mask Bits

Use 16-bit bitmasks to define what collides with what.

```java
public class CollisionLayers {
    public static final short LAYER_DEFAULT     = 0x0001; // 0000 0001
    public static final short LAYER_PLAYER      = 0x0002; // 0000 0010
    public static final short LAYER_GROUND      = 0x0004; // 0000 0100
    public static final short LAYER_ENEMY       = 0x0008; // 0000 1000
    public static final short LAYER_COLLECTIBLE = 0x0010; // 0001 0000

    public static void applyPlayerFilter(Fixture fixture) {
        Filter filter = new Filter();
        filter.categoryBits = LAYER_PLAYER;
        // Collide with ground, enemies, and collectibles
        filter.maskBits = LAYER_GROUND | LAYER_ENEMY | LAYER_COLLECTIBLE;
        fixture.setFilterData(filter);
    }
}
```

## Handling Contacts with `ContactListener`

Never destroy Box2D bodies inside contact callbacks! Queue deletions and process them after `world.step()`.

```java
import com.badlogic.gdx.physics.box2d.*;
import com.badlogic.gdx.utils.Array;

public class GameContactListener implements ContactListener {
    private final Array<Body> bodiesToDestroy = new Array<>();

    @Override
    public void beginContact(Contact contact) {
        Fixture fixA = contact.getFixtureA();
        Fixture fixB = contact.getFixtureB();

        Object dataA = fixA.getUserData();
        Object dataB = fixB.getUserData();

        if (fixA.isSensor() || fixB.isSensor()) {
            handleTrigger(fixA, fixB);
        }
    }

    private void handleTrigger(Fixture sensor, Fixture other) {
        // Queue collectible deletion or trigger script action
    }

    @Override
    public void endContact(Contact contact) {}
    @Override
    public void preSolve(Contact contact, Manifold oldManifold) {}
    @Override
    public void postSolve(Contact contact, ContactImpulse impulse) {}

    public void flushDestructions(World world) {
        for (Body body : bodiesToDestroy) {
            world.destroyBody(body);
        }
        bodiesToDestroy.clear();
    }
}
```

## Physics Stepping & Interpolation

Use a fixed timestep (e.g. 1/60s) with accumulator to avoid physics simulation speed changes on variable frame rates.

```java
public class PhysicsSystem {
    private final World world;
    private float accumulator = 0f;
    private static final float TIME_STEP = 1f / 60f;
    private static final int VELOCITY_ITERATIONS = 6;
    private static final int POSITION_ITERATIONS = 2;

    public PhysicsSystem(World world) {
        this.world = world;
    }

    public void update(float delta) {
        // Clamp delta to prevent spiral of death during huge frame drops
        float frameTime = Math.min(delta, 0.25f);
        accumulator += frameTime;

        while (accumulator >= TIME_STEP) {
            world.step(TIME_STEP, VELOCITY_ITERATIONS, POSITION_ITERATIONS);
            accumulator -= TIME_STEP;
        }
    }
}
```
