import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileIO } from "./utils/file-io.js";
import { registerSceneTools } from "./tools/scenes.js";
import { registerEntityTools } from "./tools/entities.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerProjectTools } from "./tools/project.js";
import { registerSkillTools } from "./tools/skills.js";
import { registerPhysicsTools } from "./tools/physics.js";
import { registerGuiTools } from "./tools/gui.js";
import { registerGuiComponentTools } from "./tools/gui-components.js";
import { registerCodingSkillTools } from "./tools/coding-skills.js";
import { registerSnapshotTools } from "./tools/snapshot.js";
import { registerSceneMetaTools } from "./tools/scene-meta.js";
import { registerSuggestionTools } from "./tools/suggestions.js";
import { registerGravityTools } from "./tools/gravity.js";
import { registerSearchTools } from "./tools/search.js";
import { registerTilemapTools } from "./tools/tilemap.js";
import { registerPersistenceTools } from "./tools/persistence.js";
import { registerBehaviorTools } from "./tools/behavior.js";
import { registerSimulateTools } from "./tools/simulate.js";
import { registerResources } from "./resources/index.js";
import { registerPrompts } from "./prompts/index.js";

export { printBanner, countSkills, startMcpServer } from "./banner.js";

export function createMcpServer(basePath: string): McpServer {
  const server = new McpServer({
    name: "gamekit-mcp",
    version: "0.1.0",
  });

  const fileIO = new FileIO(basePath);

  registerSceneTools(server, fileIO);
  registerEntityTools(server, fileIO);
  registerAssetTools(server, fileIO);
  registerProjectTools(server, fileIO);
  registerSkillTools(server, fileIO);
  registerPhysicsTools(server, fileIO);
  registerGuiTools(server, fileIO);
  registerGuiComponentTools(server, fileIO);
  registerCodingSkillTools(server);
  registerSnapshotTools(server, fileIO);
  registerSceneMetaTools(server, fileIO);
  registerSuggestionTools(server);
  registerGravityTools(server, fileIO);
  registerSearchTools(server, basePath);
  registerTilemapTools(server, fileIO);
  registerPersistenceTools(server, fileIO);
  registerBehaviorTools(server, fileIO);
  registerSimulateTools(server, fileIO);
  registerResources(server, fileIO);
  registerPrompts(server);

  return server;
}
