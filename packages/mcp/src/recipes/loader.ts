import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RecipeSchema,
  type Recipe,
  type RecipeCategory,
  type RecipeSummary,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** packages/mcp/recipes — works from both src/ and dist/ */
export function getRecipesDir(): string {
  return join(__dirname, "..", "..", "recipes");
}

const CATEGORY_DIRS: RecipeCategory[] = [
  "effect",
  "mechanic",
  "script",
  "animation",
  "gesture",
];

/** Map category → subdirectory name (plural). */
function categoryDir(category: RecipeCategory): string {
  switch (category) {
    case "effect":
      return "effects";
    case "mechanic":
      return "mechanics";
    case "script":
      return "scripts";
    case "animation":
      return "animations";
    case "gesture":
      return "gestures";
  }
}

function toSummary(recipe: Recipe): RecipeSummary {
  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    description: recipe.description,
    tags: recipe.tags,
    targets: recipe.targets,
    paramKeys: Object.keys(recipe.params),
  };
}

async function loadRecipeFile(filePath: string): Promise<Recipe | null> {
  try {
    const raw = JSON.parse(await readFile(filePath, "utf8"));
    const parsed = RecipeSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export async function listRecipes(options?: {
  category?: RecipeCategory;
  tags?: string[];
  query?: string;
}): Promise<RecipeSummary[]> {
  const root = getRecipesDir();
  const categories = options?.category
    ? [options.category]
    : CATEGORY_DIRS;

  const summaries: RecipeSummary[] = [];

  for (const category of categories) {
    const dir = join(root, categoryDir(category));
    let files: string[];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
      continue;
    }

    for (const file of files) {
      const recipe = await loadRecipeFile(join(dir, file));
      if (!recipe) continue;

      if (options?.tags?.length) {
        const hasTag = options.tags.some((t) =>
          recipe.tags.map((x) => x.toLowerCase()).includes(t.toLowerCase()),
        );
        if (!hasTag) continue;
      }

      if (options?.query) {
        const q = options.query.toLowerCase();
        const hay = [
          recipe.id,
          recipe.name,
          recipe.description,
          ...recipe.tags,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) continue;
      }

      summaries.push(toSummary(recipe));
    }
  }

  return summaries.sort((a, b) => a.id.localeCompare(b.id));
}

export async function loadRecipe(recipeId: string): Promise<Recipe | null> {
  const root = getRecipesDir();
  const id = recipeId.replace(/\.json$/, "");

  // Prefer category/<id>.json, then fall back to scanning all categories
  for (const category of CATEGORY_DIRS) {
    const path = join(root, categoryDir(category), `${id}.json`);
    const recipe = await loadRecipeFile(path);
    if (recipe) {
      // Normalize id from filename if mismatch
      return { ...recipe, id: recipe.id || id };
    }
  }

  return null;
}

export async function describeRecipe(recipeId: string): Promise<Recipe | null> {
  return loadRecipe(recipeId);
}
