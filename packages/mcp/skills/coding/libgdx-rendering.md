# libGDX Rendering & Graphics

## 2D Rendering with SpriteBatch

`SpriteBatch` draws batched textured quads. It buffers vertex data on the CPU and flushes to the GPU only when the texture changes or the buffer is full.

```java
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.g2d.TextureRegion;

public class Renderer {
    private SpriteBatch batch;
    private Texture characterSheet;
    private TextureRegion idleFrame;

    public void init() {
        batch = new SpriteBatch();
        characterSheet = new Texture("assets/hero.png");
        // Slice a 32x32 frame
        idleFrame = new TextureRegion(characterSheet, 0, 0, 32, 32);
    }

    public void render(float x, float y, float originX, float originY,
                       float width, float height, float scaleX, float scaleY,
                       float rotationDegrees, boolean flipX, boolean flipY) {
        batch.begin();
        batch.setColor(Color.WHITE);

        // Draw with full transformation (origin, scale, rotation, flip)
        batch.draw(
            idleFrame.getTexture(),
            x, y,
            originX, originY,
            width, height,
            scaleX, scaleY,
            rotationDegrees,
            idleFrame.getRegionX(), idleFrame.getRegionY(),
            idleFrame.getRegionWidth(), idleFrame.getRegionHeight(),
            flipX, flipY
        );

        batch.end();
    }
}
```

### Performance Rules for SpriteBatch
- **Minimize `batch.begin()` / `batch.end()` pairs**: Keep all 2D quad drawing within a single begin/end block per frame.
- **Avoid Texture Switching**: Group entities using the same texture or pack all assets into a `TextureAtlas` to achieve 1 draw call.
- **Blending**: If rendering fully opaque sprites, disable blending with `batch.disableBlending()` to reduce GPU fillrate overhead.

## Coordinate Systems: Playroom (Y-Down) to libGDX (Y-Up)

Playroom, Phaser, and web canvas coordinates place `(0, 0)` at the **top-left** with positive Y going **down**.
libGDX / OpenGL places `(0, 0)` at the **bottom-left** with positive Y going **up**.

### Converting Coordinates
When rendering a Playroom entity in libGDX:
```java
// Playroom scene viewport height: H
// Entity top-left position in Playroom: (px, py)
// Entity dimensions: (width, height)
// Entity anchor: (anchorX, anchorY) where 0.5, 0.5 is center

float libgdxX = entity.x - (entity.width * entity.anchorX);
float libgdxY = sceneHeight - entity.y - (entity.height * (1.0f - entity.anchorY));
```

## SpriteSheet Animations (`Animation<TextureRegion>`)

```java
import com.badlogic.gdx.graphics.Texture;
import com.badlogic.gdx.graphics.g2d.Animation;
import com.badlogic.gdx.graphics.g2d.TextureRegion;

public class AnimatedSprite {
    private Animation<TextureRegion> walkAnimation;
    private float stateTime = 0f;

    public void init(Texture sheet, int frameWidth, int frameHeight, int frameCount, float fps) {
        TextureRegion[][] tmp = TextureRegion.split(sheet, frameWidth, frameHeight);
        TextureRegion[] frames = new TextureRegion[frameCount];
        int index = 0;
        for (int r = 0; r < tmp.length && index < frameCount; r++) {
            for (int c = 0; c < tmp[r].length && index < frameCount; c++) {
                frames[index++] = tmp[r][c];
            }
        }

        float frameDuration = 1.0f / Math.max(1f, fps);
        walkAnimation = new Animation<>(frameDuration, frames);
        walkAnimation.setPlayMode(Animation.PlayMode.LOOP);
    }

    public void update(float delta) {
        stateTime += delta;
    }

    public TextureRegion getCurrentFrame() {
        return walkAnimation.getKeyFrame(stateTime, true);
    }
}
```

## Debug Visuals with ShapeRenderer

`ShapeRenderer` draws primitives (lines, rectangles, circles, polygons) for collider and bounds debugging.

```java
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.graphics.OrthographicCamera;

public class DebugRenderer {
    private final ShapeRenderer shapes = new ShapeRenderer();

    public void renderCollider(OrthographicCamera camera, float x, float y, float width, float height) {
        shapes.setProjectionMatrix(camera.combined);
        shapes.begin(ShapeRenderer.ShapeType.Line);
        shapes.setColor(Color.CYAN);
        shapes.rect(x, y, width, height);
        shapes.end();
    }

    public void dispose() {
        shapes.dispose();
    }
}
```
*Note*: Never interleave `ShapeRenderer.begin()` inside an active `SpriteBatch.begin()` block.

## Custom Shaders with ShaderProgram

```java
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.glutils.ShaderProgram;

public class PostShader {
    private ShaderProgram shader;

    public void load() {
        String vertexShader = "attribute vec4 a_position;\n"
            + "attribute vec4 a_color;\n"
            + "attribute vec2 a_texCoord0;\n"
            + "uniform mat4 u_projTrans;\n"
            + "varying vec4 v_color;\n"
            + "varying vec2 v_texCoords;\n"
            + "void main() {\n"
            + "    v_color = a_color;\n"
            + "    v_texCoords = a_texCoord0;\n"
            + "    gl_Position = u_projTrans * a_position;\n"
            + "}";

        String fragmentShader = "#ifdef GL_ES\n"
            + "precision mediump float;\n"
            + "#endif\n"
            + "varying vec4 v_color;\n"
            + "varying vec2 v_texCoords;\n"
            + "uniform sampler2D u_texture;\n"
            + "uniform float u_time;\n"
            + "void main() {\n"
            + "    vec4 col = texture2D(u_texture, v_texCoords) * v_color;\n"
            + "    gl_FragColor = col;\n"
            + "}";

        shader = new ShaderProgram(vertexShader, fragmentShader);
        if (!shader.isCompiled()) {
            Gdx.app.error("Shader", shader.getLog());
        }
    }
}
```
