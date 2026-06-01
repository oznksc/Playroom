import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FileIO } from "./utils/file-io.js";
import { registerSceneTools } from "./tools/scenes.js";
import { registerEntityTools } from "./tools/entities.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerProjectTools } from "./tools/project.js";
import { registerSkillTools } from "./tools/skills.js";
import { registerGuiTools } from "./tools/gui.js";
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
  registerGuiTools(server, fileIO);
  registerResources(server, fileIO);
  registerPrompts(server);

  return server;
}
