import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { exportProject, initProject, readProject, readScene, writeProject, writeScene } from "../src/project.js";

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
    expect(stringsXml).toContain("<string name=\"app_name\">Astro Runner</string>");
    expect(stringsXml).toContain("<string name=\"game_services_project_id\">987654321012</string>");

    // Check AndroidManifest.xml
    const manifestXml = await readFile(join(exportOut, "android/AndroidManifest.xml"), "utf8");
    expect(manifestXml).toContain("android:screenOrientation=\"sensorLandscape\"");

    // Check assets/gamekit/project.json
    const exportedProjectJson = JSON.parse(await readFile(join(exportOut, "assets/gamekit/project.json"), "utf8"));
    expect(exportedProjectJson.name).toBe("Astro Runner");
    expect(exportedProjectJson.gameServices?.googlePlayAppId).toBe("987654321012");
    expect(exportedProjectJson.gameServices?.achievements).toHaveLength(1);
  });
});
