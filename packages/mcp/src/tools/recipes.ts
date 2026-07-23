import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { FileIO } from "../utils/file-io.js";
import {
  listRecipes,
  loadRecipe,
  applyRecipeToScene,
  type RecipeApplyParams,
} from "../recipes/index.js";
import {
  ListRecipesInputSchema,
  DescribeRecipeInputSchema,
  ApplyRecipeInputSchema,
} from "../schemas/recipe.js";

export function registerRecipeTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "list_recipes",
    "List ready-made Playroom recipes (effects, mechanics, scripts, animations, gestures/input packs). Prefer applying a recipe over hand-building component stacks.",
    ListRecipesInputSchema.shape,
    async ({ category, tags, query }) => {
      const recipes = await listRecipes({ category, tags, query });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                count: recipes.length,
                recipes,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "describe_recipe",
    "Show full recipe definition: params, components, inputMap, merge strategy, and notes.",
    DescribeRecipeInputSchema.shape,
    async ({ recipeId }) => {
      const recipe = await loadRecipe(recipeId);
      if (!recipe) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Recipe not found: ${recipeId}` }),
            },
          ],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(recipe, null, 2) }],
      };
    },
  );

  server.tool(
    "apply_recipe",
    "Apply a recipe to a scene entity (or scene-level input map). Merges components with upsert-by-type by default. Use list_recipes / describe_recipe first.",
    ApplyRecipeInputSchema.shape,
    async ({ recipeId, scenePath, entityId, params }) => {
      const recipe = await loadRecipe(recipeId);
      if (!recipe) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: `Recipe not found: ${recipeId}` }),
            },
          ],
          isError: true,
        };
      }

      if (recipe.targets === "entity" && !entityId) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Recipe "${recipeId}" targets an entity — provide entityId`,
              }),
            },
          ],
          isError: true,
        };
      }

      try {
        const filename = fileIO.resolveScenePath(scenePath);
        const scene = await fileIO.readScene(filename);
        const result = applyRecipeToScene(scene, recipe, {
          entityId,
          params: (params ?? {}) as RecipeApplyParams,
        });
        result.scenePath = filename;
        await fileIO.writeScene(filename, scene);

        const entity = entityId
          ? scene.entities.find((e) => e.id === entityId)
          : undefined;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  ...result,
                  entity: entity
                    ? {
                        id: entity.id,
                        name: entity.name,
                        componentTypes: entity.components.map((c) => c.type),
                      }
                    : undefined,
                  inputMap: scene.inputMap ?? null,
                },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );
}
