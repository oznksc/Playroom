import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ENTITY_ROLES, ROLE_COMPONENTS, getRoleDescription } from "../utils/roles.js";

export function registerSuggestionTools(server: McpServer): void {
  server.tool(
    "suggest_components",
    "Suggest typical component combinations for an entity based on its role. Prefer spawn_role when you actually want to create the entity.",
    {
      role: z
        .enum(ENTITY_ROLES)
        .describe("Entity role to get component suggestions for"),
    },
    async ({ role }) => {
      const components = ROLE_COMPONENTS[role] ?? [];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            role,
            description: getRoleDescription(role),
            hint: "Call spawn_role with the same role to create this entity in one step.",
            components,
          }, null, 2),
        }],
      };
    },
  );
}
