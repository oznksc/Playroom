import { z } from "zod";

export const RecipeCategorySchema = z.enum([
  "effect",
  "mechanic",
  "script",
  "animation",
  "gesture",
]);
export type RecipeCategory = z.infer<typeof RecipeCategorySchema>;

export const RecipeTargetSchema = z.enum(["entity", "scene"]);
export type RecipeTarget = z.infer<typeof RecipeTargetSchema>;

export const RecipeMergeSchema = z.enum([
  "upsert-by-type",
  "append",
  "require-missing",
]);
export type RecipeMerge = z.infer<typeof RecipeMergeSchema>;

export const RecipeParamDefSchema = z.object({
  type: z.enum(["string", "number", "boolean"]),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  optional: z.boolean().optional(),
  description: z.string().optional(),
});
export type RecipeParamDef = z.infer<typeof RecipeParamDefSchema>;

export const RecipeInputBindingSchema = z.object({
  action: z.string().min(1),
  keys: z.array(z.string()).optional(),
  touchControl: z.enum(["left", "right", "jump", "fire", "action"]).optional(),
  gamepad: z.string().optional(),
});

export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: RecipeCategorySchema,
  description: z.string().min(1),
  tags: z.array(z.string()).default([]),
  targets: RecipeTargetSchema,
  params: z.record(RecipeParamDefSchema).default({}),
  merge: RecipeMergeSchema.default("upsert-by-type"),
  components: z.array(z.record(z.unknown())).default([]),
  inputMap: z
    .object({
      bindings: z.array(RecipeInputBindingSchema),
    })
    .optional(),
  /**
   * Partial gameRules merged onto the scene (scene-level recipes).
   * Arrays (objectives, hazards, onWin, …) are concatenated; scalars overwrite.
   */
  gameRules: z.record(z.unknown()).optional(),
  /** Tags appended to the target entity when targets=entity. */
  entityTags: z.array(z.string().min(1)).optional(),
  notes: z.string().optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export type RecipeSummary = {
  id: string;
  name: string;
  category: RecipeCategory;
  description: string;
  tags: string[];
  targets: RecipeTarget;
  paramKeys: string[];
};

export type RecipeApplyParams = Record<string, string | number | boolean>;

export type RecipeApplyResult = {
  recipeId: string;
  scenePath: string;
  entityId?: string;
  appliedComponents: string[];
  appliedInputActions: string[];
  appliedGameRulesKeys: string[];
  appliedEntityTags: string[];
  skippedComponents: string[];
  warnings: string[];
};
