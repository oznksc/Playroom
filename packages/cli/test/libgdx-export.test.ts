import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  exportProject,
  initProject,
  readProject,
  readScene,
  writeProject,
  writeScene,
} from "../src/project.js";

describe("libGDX export pipeline", () => {
  it("exports project to libGDX with tailored Android manifest and Google Play strings", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-libgdx-"));
    const exportOut = join(root, "exported-libgdx");

    await initProject(root, { name: "Astro Runner" });

    // Update project with game services
    const project = await readProject(root);
    project.gameServices = {
      enabled: true,
      googlePlayAppId: "987654321012",
      achievements: [
        {
          id: "first_jump",
          name: "First Jump",
          description: "Jump once",
          type: "standard",
          hidden: false,
          providers: {
            googlePlay: "CgkI_first_jump",
          },
        },
      ],
      leaderboards: [
        {
          id: "high_scores",
          name: "High Scores",
          order: "descending",
          providers: {
            googlePlay: "CgkI_high_scores",
          },
        },
      ],
    };
    await writeProject(root, project);

    // Update active scene to landscape
    const activeFile = project.activeScene || "menu.scene.json";
    const scene = await readScene(root, activeFile);
    scene.viewport = {
      ...scene.viewport,
      width: 800,
      height: 450,
      orientation: "landscape",
    };
    await writeScene(root, scene, activeFile);

    // Run export
    const result = await exportProject(root, exportOut, "libgdx");
    expect(result).toBe(exportOut);

    // Check strings.xml
    const stringsXml = await readFile(join(exportOut, "android/res/values/strings.xml"), "utf8");
    expect(stringsXml).toContain('<string name="app_name">Astro Runner</string>');
    expect(stringsXml).toContain('<string name="game_services_project_id">987654321012</string>');

    // Check AndroidManifest.xml
    const manifestXml = await readFile(join(exportOut, "android/AndroidManifest.xml"), "utf8");
    expect(manifestXml).toContain('android:screenOrientation="sensorLandscape"');

    // Check assets/gamekit/project.json
    const exportedProjectJson = JSON.parse(
      await readFile(join(exportOut, "assets/gamekit/project.json"), "utf8")
    );
    expect(exportedProjectJson.name).toBe("Astro Runner");
    expect(exportedProjectJson.gameServices?.googlePlayAppId).toBe("987654321012");
    expect(exportedProjectJson.gameServices?.achievements).toHaveLength(1);
  });

  it("exports all parity runtime components and systems for libGDX", async () => {
    const root = await mkdtemp(join(tmpdir(), "gamekit-libgdx-components-"));
    const exportOut = join(root, "exported-components");

    await initProject(root, { name: "Mega Platformer" });
    const project = await readProject(root);
    const scene = await readScene(root, "main.scene.json");

    // Add entity with Animation, Tilemap, Tween, and FollowPath
    scene.entities.push(
      {
        id: "hero_anim",
        name: "Hero Animated",
        active: true,
        components: [
          { type: "Transform", position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
          {
            type: "Animation",
            assetId: "hero_walk.png",
            frameWidth: 32,
            frameHeight: 32,
            totalFrames: 8,
            framesPerSecond: 12,
            loop: true,
          },
          {
            type: "Tween",
            property: "scale.x",
            startValue: 1,
            endValue: 1.2,
            duration: 0.5,
            easing: "easeInOut",
            loop: true,
            pingPong: true,
          },
        ],
      },
      {
        id: "tilemap_level",
        name: "Tilemap Level",
        active: true,
        components: [
          { type: "Transform", position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } },
          {
            type: "Tilemap",
            tilesetId: "tileset.png",
            tileWidth: 32,
            tileHeight: 32,
            columns: 8,
            gridWidth: 4,
            gridHeight: 2,
            tiles: [1, 1, 1, 1, 2, 2, 2, 2],
            solid: true,
          },
        ],
      },
      {
        id: "patrol_enemy",
        name: "Patrol Enemy",
        active: true,
        components: [
          { type: "Transform", position: { x: 300, y: 100 }, rotation: 0, scale: { x: 1, y: 1 } },
          {
            type: "FollowPath",
            points: [
              { x: 300, y: 100 },
              { x: 500, y: 100 },
            ],
            speed: 80,
            loop: true,
          },
        ],
      },
      {
        id: "effects_box",
        name: "Effects Box",
        active: true,
        components: [
          { type: "Transform", position: { x: 50, y: 50 }, rotation: 0, scale: { x: 1, y: 1 } },
          {
            type: "ParticleSystem",
            maxParticles: 40,
            emissionRate: 15,
            lifetime: 1.0,
            speed: 70,
            gravityScale: 0.5,
            colorStart: "#00f0ff",
            colorEnd: "#8b5cf6",
            sizeStart: 5,
            sizeEnd: 0,
            shape: "point",
            width: 0,
            height: 0,
            active: true,
          },
          {
            type: "NineSlice",
            assetId: "panel.png",
            width: 120,
            height: 80,
            leftWidth: 8,
            rightWidth: 8,
            topHeight: 8,
            bottomHeight: 8,
          },
          {
            type: "Light2D",
            kind: "point",
            range: 150,
            intensity: 1.2,
            color: "#ffffff",
          },
          {
            type: "StateMachine",
            initialState: "idle",
            states: [
              { name: "idle", duration: 2.0, then: "active" },
              { name: "active", duration: 1.0, then: "idle" },
            ],
          },
        ],
      }
    );

    await writeScene(root, scene, "main.scene.json");
    await exportProject(root, exportOut, "libgdx");

    // Verify Java component classes exist in exported project
    const animCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/AnimationComponent.java"
      ),
      "utf8"
    );
    expect(animCompJava).toContain("class AnimationComponent");

    const tilemapCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/TilemapComponent.java"
      ),
      "utf8"
    );
    expect(tilemapCompJava).toContain("class TilemapComponent");

    const tweenCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/TweenComponent.java"
      ),
      "utf8"
    );
    expect(tweenCompJava).toContain("class TweenComponent");

    const followPathJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/FollowPathComponent.java"
      ),
      "utf8"
    );
    expect(followPathJava).toContain("class FollowPathComponent");

    const particleCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/ParticleSystemComponent.java"
      ),
      "utf8"
    );
    expect(particleCompJava).toContain("class ParticleSystemComponent");

    const nineSliceCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/NineSliceComponent.java"
      ),
      "utf8"
    );
    expect(nineSliceCompJava).toContain("class NineSliceComponent");

    const lightCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/Light2DComponent.java"
      ),
      "utf8"
    );
    expect(lightCompJava).toContain("class Light2DComponent");

    const smCompJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/components/StateMachineComponent.java"
      ),
      "utf8"
    );
    expect(smCompJava).toContain("class StateMachineComponent");

    const tweenSystemJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/systems/TweenSystem.java"
      ),
      "utf8"
    );
    expect(tweenSystemJava).toContain("class TweenSystem");

    const followPathSystemJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/systems/FollowPathSystem.java"
      ),
      "utf8"
    );
    expect(followPathSystemJava).toContain("class FollowPathSystem");

    const particleSystemJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/systems/ParticleSystem.java"
      ),
      "utf8"
    );
    expect(particleSystemJava).toContain("class ParticleSystem");

    const smSystemJava = await readFile(
      join(
        exportOut,
        "core/src/main/java/com/playroom/runtime/systems/StateMachineSystem.java"
      ),
      "utf8"
    );
    expect(smSystemJava).toContain("class StateMachineSystem");

    // Verify exported scene contains the new components
    const exportedSceneJson = JSON.parse(
      await readFile(join(exportOut, "assets/gamekit/scenes/main.scene.json"), "utf8")
    );
    const animEntity = exportedSceneJson.entities.find((e: { id: string }) => e.id === "hero_anim");
    expect(animEntity.components.some((c: { type: string }) => c.type === "Animation")).toBe(true);
    expect(animEntity.components.some((c: { type: string }) => c.type === "Tween")).toBe(true);

    const tilemapEntity = exportedSceneJson.entities.find((e: { id: string }) => e.id === "tilemap_level");
    expect(tilemapEntity.components.some((c: { type: string }) => c.type === "Tilemap")).toBe(true);

    const effectsEntity = exportedSceneJson.entities.find((e: { id: string }) => e.id === "effects_box");
    expect(effectsEntity.components.some((c: { type: string }) => c.type === "ParticleSystem")).toBe(true);
    expect(effectsEntity.components.some((c: { type: string }) => c.type === "NineSlice")).toBe(true);
    expect(effectsEntity.components.some((c: { type: string }) => c.type === "Light2D")).toBe(true);
    expect(effectsEntity.components.some((c: { type: string }) => c.type === "StateMachine")).toBe(true);
  });
});
