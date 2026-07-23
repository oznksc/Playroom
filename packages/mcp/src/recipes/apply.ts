import {
  GameKitComponentSchema,
  resolveGameRules,
  type GameKitComponent,
  type GameKitEntity,
  type GameKitScene,
  type GameRulesConfig,
  type ScriptComponent,
} from "@gamekit/schema";
import type {
  Recipe,
  RecipeApplyParams,
  RecipeApplyResult,
  RecipeMerge,
} from "./types.js";

/**
 * Resolve recipe params (defaults + overrides) and substitute `{{param}}`
 * placeholders in component/inputMap templates.
 */
export function resolveParams(
  recipe: Recipe,
  overrides: RecipeApplyParams = {},
): { values: RecipeApplyParams; warnings: string[] } {
  const values: RecipeApplyParams = {};
  const warnings: string[] = [];

  for (const [key, def] of Object.entries(recipe.params)) {
    if (key in overrides) {
      const raw = overrides[key];
      values[key] = coerceParam(raw, def.type);
      continue;
    }
    if (def.default !== undefined) {
      values[key] = def.default;
      continue;
    }
    if (def.optional) {
      continue;
    }
    warnings.push(`Missing required param "${key}"`);
  }

  for (const key of Object.keys(overrides)) {
    if (!(key in recipe.params)) {
      warnings.push(`Unknown param "${key}" ignored`);
    }
  }

  return { values, warnings };
}

function coerceParam(
  value: string | number | boolean,
  type: "string" | "number" | "boolean",
): string | number | boolean {
  if (type === "number") {
    if (typeof value === "number") return value;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === "boolean") {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      return value === "true" || value === "1";
    }
    return Boolean(value);
  }
  return String(value);
}

export function substituteParams(
  template: unknown,
  params: RecipeApplyParams,
): unknown {
  if (typeof template === "string") {
    const fullMatch = template.match(/^\{\{(\w+)\}\}$/);
    if (fullMatch) {
      const key = fullMatch[1]!;
      if (key in params) return params[key];
      return template;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
      if (key in params) return String(params[key]);
      return `{{${key}}}`;
    });
  }
  if (Array.isArray(template)) {
    return template.map((item) => substituteParams(item, params));
  }
  if (template && typeof template === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(template as Record<string, unknown>)) {
      out[k] = substituteParams(v, params);
    }
    return out;
  }
  return template;
}

function isResolvedString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !/\{\{\w+\}\}/.test(value);
}

/** Drop script actions that cannot run (e.g. playSound with empty / unresolved assetId). */
export function pruneScriptActions(component: Record<string, unknown>): Record<string, unknown> {
  if (component.type !== "Script" || !Array.isArray(component.handlers)) {
    return component;
  }

  const handlers = (component.handlers as Array<{ event: string; actions: Array<Record<string, unknown>> }>)
    .map((handler) => ({
      ...handler,
      actions: handler.actions.filter((action) => {
        if (action.type === "playSound") {
          return isResolvedString(action.assetId);
        }
        if (action.type === "switchScene") {
          return isResolvedString(action.sceneId);
        }
        return true;
      }),
    }))
    .filter((h) => h.actions.length > 0);

  return { ...component, handlers };
}

function mergeScriptComponents(
  existing: ScriptComponent,
  incoming: ScriptComponent,
): ScriptComponent {
  const handlers = [...existing.handlers];
  for (const h of incoming.handlers) {
    const idx = handlers.findIndex((x) => x.event === h.event);
    if (idx >= 0) {
      handlers[idx] = h;
    } else {
      handlers.push(h);
    }
  }
  return { type: "Script", handlers };
}

function applyComponentToEntity(
  entity: GameKitEntity,
  component: GameKitComponent,
  merge: RecipeMerge,
  skipped: string[],
): boolean {
  const existingIdx = entity.components.findIndex((c) => c.type === component.type);

  if (merge === "require-missing") {
    if (existingIdx >= 0) {
      skipped.push(component.type);
      return false;
    }
    entity.components.push(component);
    return true;
  }

  if (merge === "append") {
    entity.components.push(component);
    return true;
  }

  // upsert-by-type
  if (existingIdx < 0) {
    entity.components.push(component);
    return true;
  }

  const existing = entity.components[existingIdx]!;
  if (existing.type === "Script" && component.type === "Script") {
    entity.components[existingIdx] = mergeScriptComponents(existing, component);
    return true;
  }

  entity.components[existingIdx] = component;
  return true;
}

function mergeInputMap(
  scene: GameKitScene,
  bindings: Array<{
    action: string;
    keys?: string[];
    touchControl?: "left" | "right" | "jump" | "fire" | "action";
    gamepad?: string;
  }>,
): string[] {
  const current = scene.inputMap?.bindings ? [...scene.inputMap.bindings] : [];
  const applied: string[] = [];

  for (const binding of bindings) {
    const next = {
      action: binding.action,
      keys: binding.keys ?? [],
      ...(binding.touchControl ? { touchControl: binding.touchControl } : {}),
      ...(binding.gamepad ? { gamepad: binding.gamepad } : {}),
    };
    const idx = current.findIndex((b) => b.action === binding.action);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...next };
    } else {
      current.push(next);
    }
    applied.push(binding.action);
  }

  scene.inputMap = { bindings: current };
  return applied;
}

/**
 * Apply a recipe onto a scene (mutates scene). Entity recipes require entityId.
 */
export function applyRecipeToScene(
  scene: GameKitScene,
  recipe: Recipe,
  options: {
    entityId?: string;
    params?: RecipeApplyParams;
  } = {},
): RecipeApplyResult {
  const warnings: string[] = [];
  const appliedComponents: string[] = [];
  const skippedComponents: string[] = [];
  const appliedGameRulesKeys: string[] = [];
  const appliedEntityTags: string[] = [];
  let appliedInputActions: string[] = [];

  const { values, warnings: paramWarnings } = resolveParams(recipe, options.params ?? {});
  warnings.push(...paramWarnings);

  // Default CameraFollow targetId to the entity being edited
  if (
    options.entityId &&
    recipe.params.targetId &&
    values.targetId === undefined
  ) {
    values.targetId = options.entityId;
  }

  if (recipe.targets === "entity") {
    if (!options.entityId) {
      throw new Error(`Recipe "${recipe.id}" targets an entity — provide entityId`);
    }
    const entity = scene.entities.find((e) => e.id === options.entityId);
    if (!entity) {
      throw new Error(`Entity not found: ${options.entityId}`);
    }

    for (const raw of recipe.components) {
      const substituted = substituteParams(raw, values) as Record<string, unknown>;
      const pruned = pruneScriptActions(substituted);
      let component: GameKitComponent;
      try {
        component = GameKitComponentSchema.parse(pruned);
      } catch (err) {
        warnings.push(
          `Skipped invalid component ${String(pruned.type)}: ${err instanceof Error ? err.message : String(err)}`,
        );
        continue;
      }

      const applied = applyComponentToEntity(
        entity,
        component,
        recipe.merge,
        skippedComponents,
      );
      if (applied) {
        appliedComponents.push(component.type);
      }
    }
  }

  if (recipe.inputMap?.bindings?.length) {
    const substituted = substituteParams(recipe.inputMap, values) as {
      bindings: Array<{
        action: string;
        keys?: string[];
        touchControl?: "left" | "right" | "jump" | "fire" | "action";
        gamepad?: string;
      }>;
    };
    appliedInputActions = mergeInputMap(scene, substituted.bindings);
  }

  if (recipe.gameRules && Object.keys(recipe.gameRules).length > 0) {
    const patch = substituteParams(recipe.gameRules, values) as Record<string, unknown>;
    const current = resolveGameRules(scene.gameRules);
    const next: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      const existing = next[key];
      if (Array.isArray(existing) && Array.isArray(value)) {
        next[key] = [...existing, ...value];
      } else {
        next[key] = value;
      }
      appliedGameRulesKeys.push(key);
    }
    scene.gameRules = resolveGameRules(next as GameRulesConfig);
  }

  if (recipe.entityTags?.length && options.entityId) {
    const entity = scene.entities.find((e) => e.id === options.entityId);
    if (entity) {
      const tags = new Set(entity.tags ?? []);
      for (const t of recipe.entityTags) {
        if (!tags.has(t)) {
          tags.add(t);
          appliedEntityTags.push(t);
        }
      }
      entity.tags = [...tags];
    }
  }

  if (
    recipe.targets === "scene" &&
    recipe.components.length === 0 &&
    !recipe.inputMap &&
    !recipe.gameRules
  ) {
    warnings.push(`Recipe "${recipe.id}" has no scene-level mutations`);
  }

  // Scene-target recipes may also attach components when entityId is provided
  if (recipe.targets === "scene" && recipe.components.length > 0 && options.entityId) {
    const entity = scene.entities.find((e) => e.id === options.entityId);
    if (entity) {
      for (const raw of recipe.components) {
        const substituted = substituteParams(raw, values) as Record<string, unknown>;
        const pruned = pruneScriptActions(substituted);
        try {
          const component = GameKitComponentSchema.parse(pruned);
          const applied = applyComponentToEntity(
            entity,
            component,
            recipe.merge,
            skippedComponents,
          );
          if (applied) appliedComponents.push(component.type);
        } catch (err) {
          warnings.push(
            `Skipped invalid component: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  return {
    recipeId: recipe.id,
    scenePath: "",
    entityId: options.entityId,
    appliedComponents,
    appliedInputActions,
    appliedGameRulesKeys,
    appliedEntityTags,
    skippedComponents,
    warnings,
  };
}
