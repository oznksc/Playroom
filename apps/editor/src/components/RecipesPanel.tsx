import { useEffect, useMemo, useState } from "react";
import { Sparkles, Wand2, Search } from "lucide-react";
import { getApiUrl } from "../lib/api.js";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  EmptyState,
  Badge,
  Input,
  Select,
  Button,
  cn,
} from "@/ui";

export type RecipeSummary = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  targets: string;
  paramKeys: string[];
};

type RecipesPanelProps = {
  scenePath: string;
  selectedEntityId: string | null;
  selectedEntityName?: string;
  onApplied?: () => void;
  onStatus?: (message: string) => void;
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "effect", label: "Effects" },
  { value: "mechanic", label: "Mechanics" },
  { value: "script", label: "Scripts" },
  { value: "animation", label: "Animations" },
  { value: "gesture", label: "Gestures / input" },
];

/**
 * Browse and apply engine recipe catalog to the current scene / selection.
 */
export function RecipesPanel({
  scenePath,
  selectedEntityId,
  selectedEntityName,
  onApplied,
  onStatus,
}: RecipesPanelProps) {
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query.trim()) params.set("query", query.trim());
    fetch(getApiUrl(`/api/recipes?${params.toString()}`))
      .then((r) => r.json())
      .then((data: { recipes?: RecipeSummary[] }) => {
        if (!cancelled) setRecipes(data.recipes ?? []);
      })
      .catch(() => {
        if (!cancelled) onStatus?.("Failed to load recipes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, query, onStatus]);

  const grouped = useMemo(() => {
    const map = new Map<string, RecipeSummary[]>();
    for (const r of recipes) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [recipes]);

  async function apply(recipe: RecipeSummary) {
    if (recipe.targets === "entity" && !selectedEntityId) {
      onStatus?.("Select an entity first to apply this recipe");
      return;
    }
    setApplying(recipe.id);
    try {
      const res = await fetch(getApiUrl("/api/recipes/apply"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          scenePath,
          entityId: selectedEntityId ?? undefined,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        appliedComponents?: string[];
        appliedInputActions?: string[];
      };
      if (!res.ok) throw new Error(body.error ?? "Apply failed");
      const parts = [
        body.appliedComponents?.length
          ? `components: ${body.appliedComponents.join(", ")}`
          : null,
        body.appliedInputActions?.length
          ? `input: ${body.appliedInputActions.join(", ")}`
          : null,
      ].filter(Boolean);
      onStatus?.(
        `Applied “${recipe.name}”${parts.length ? ` (${parts.join("; ")})` : ""}`,
      );
      onApplied?.();
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Apply recipe failed");
    } finally {
      setApplying(null);
    }
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <Sparkles size={13} className="text-accent-purple" />
          Recipes
        </PanelTitle>
        <Badge variant="muted">{recipes.length}</Badge>
      </PanelHeader>
      <PanelBody className="space-y-2 p-2">
        <p className="text-[10px] leading-snug text-text-muted">
          Ready-made effects, mechanics, scripts, animations, and input packs.
          Entity recipes need a selection
          {selectedEntityName ? (
            <>
              {" "}
              — <span className="text-accent">{selectedEntityName}</span>
            </>
          ) : null}
          .
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Search
              size={12}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <Input
              className="pl-7 text-[11px]"
              placeholder="Search recipes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value || "all"} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <p className="py-4 text-center text-[11px] text-text-muted">Loading…</p>
        ) : recipes.length === 0 ? (
          <EmptyState
            icon={<Wand2 size={16} />}
            title="No recipes"
            description="Try another category or search term."
          />
        ) : (
          <div className="space-y-3">
            {grouped.map(([cat, list]) => (
              <div key={cat} className="space-y-1">
                <div className="px-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-muted">
                  {cat}
                </div>
                {list.map((recipe) => {
                  const needsEntity = recipe.targets === "entity";
                  const disabled = needsEntity && !selectedEntityId;
                  return (
                    <div
                      key={recipe.id}
                      className={cn(
                        "rounded-md border border-border-default/70 bg-bg-elevated/30 p-2",
                        disabled && "opacity-60",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[12px] font-semibold text-text-primary">
                            {recipe.name}
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug text-text-muted">
                            {recipe.description}
                          </p>
                          {recipe.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {recipe.tags.slice(0, 4).map((tag) => (
                                <Badge key={tag} variant="muted">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={disabled || applying === recipe.id}
                          onClick={() => void apply(recipe)}
                          title={
                            disabled
                              ? "Select an entity in the hierarchy first"
                              : `Apply ${recipe.id}`
                          }
                        >
                          {applying === recipe.id ? "…" : "Apply"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}
