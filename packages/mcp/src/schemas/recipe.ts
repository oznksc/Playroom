import { z } from "zod";
import { RecipeCategorySchema } from "../recipes/types.js";

export const ListRecipesInputSchema = z.object({
  category: RecipeCategorySchema.optional().describe(
    "Filter by category: effect | mechanic | script | animation | gesture",
  ),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter recipes that include any of these tags"),
  query: z
    .string()
    .optional()
    .describe("Free-text search across id, name, description, tags"),
});

export const DescribeRecipeInputSchema = z.object({
  recipeId: z
    .string()
    .min(1)
    .describe("Recipe id (e.g. 'sparkle', 'collect-on-touch', 'bob-idle')"),
});

export const ApplyRecipeInputSchema = z.object({
  recipeId: z
    .string()
    .min(1)
    .describe("Recipe id (e.g. 'sparkle', 'collect-on-touch')"),
  scenePath: z.string().min(1).describe("Scene filename (e.g. 'main.scene.json')"),
  entityId: z
    .string()
    .optional()
    .describe("Entity id — required for entity-targeted recipes"),
  params: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe("Optional parameter overrides (key → value)"),
});
