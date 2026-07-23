/**
 * Genre skill → recipe packs for one-command playable projects.
 * Skills live in packages/mcp/skills/*.json; recipes in packages/mcp/recipes/**.
 */

export type SkillPackRecipe = {
  id: string;
  /** Resolve entity by name (case-insensitive) for entity-targeted recipes. */
  entityName?: string;
  params?: Record<string, string | number | boolean>;
};

export type SkillPackTagRule = {
  /** Match entity.name */
  nameMatch: RegExp;
  tags: string[];
};

export type SkillPack = {
  /** Human label */
  label: string;
  recipes: SkillPackRecipe[];
  /** Assign tags after skill entities are built (before recipe apply). */
  tagEntities?: SkillPackTagRule[];
  /**
   * Default gameRules patch when no win recipe covers the skill
   * (still applied under resolveGameRules defaults).
   */
  fallDeathEnabled?: boolean;
  lives?: number;
};

/** Packs keyed by skill file id (platformer, topdown, …). */
export const SKILL_PACKS: Record<string, SkillPack> = {
  platformer: {
    label: "Side-scrolling platformer",
    tagEntities: [{ nameMatch: /coin|pickup|gem/i, tags: ["coin"] }],
    recipes: [
      { id: "platformer-wasd-jump" },
      { id: "win-collect-all", params: { tag: "coin", objectiveId: "collect-coins" } },
    ],
    fallDeathEnabled: true,
    lives: 3,
  },
  topdown: {
    label: "Top-down arena",
    tagEntities: [{ nameMatch: /gem|coin|target/i, tags: ["coin"] }],
    recipes: [
      { id: "topdown-wasd" },
      { id: "win-collect-all", params: { tag: "coin", objectiveId: "collect-gems" } },
    ],
    fallDeathEnabled: false,
    lives: 3,
  },
  "topdown-shooter": {
    label: "Top-down shooter",
    tagEntities: [
      { nameMatch: /enemy|hazard|spike/i, tags: ["hazard"] },
      { nameMatch: /coin|gem|pickup/i, tags: ["coin"] },
    ],
    recipes: [
      { id: "topdown-wasd" },
      { id: "hazard-kill-zone", entityName: "Enemy", params: { onTrigger: "respawn" } },
    ],
    fallDeathEnabled: false,
    lives: 3,
  },
  "physics-puzzle": {
    label: "Physics puzzle",
    tagEntities: [{ nameMatch: /^target$|^goal$/i, tags: ["goal"] }],
    recipes: [
      { id: "platformer-wasd-jump" },
      { id: "win-reach-goal", params: { tag: "goal" } },
    ],
    fallDeathEnabled: true,
    lives: 3,
  },
  puzzle: {
    label: "Puzzle",
    tagEntities: [{ nameMatch: /goal|flag|finish|target/i, tags: ["goal"] }],
    recipes: [{ id: "win-reach-goal", params: { tag: "goal" } }],
    fallDeathEnabled: false,
    lives: 0,
  },
  "endless-runner": {
    label: "Endless runner",
    tagEntities: [
      { nameMatch: /coin|pickup/i, tags: ["coin"] },
      { nameMatch: /hazard|spike|obstacle/i, tags: ["hazard"] },
    ],
    recipes: [
      { id: "platformer-wasd-jump" },
      { id: "win-collect-all", params: { tag: "coin" } },
    ],
    fallDeathEnabled: true,
    lives: 1,
  },
  "arena-brawler": {
    label: "Arena brawler",
    tagEntities: [
      { nameMatch: /enemy|foe|hazard/i, tags: ["hazard"] },
      { nameMatch: /coin|gem/i, tags: ["coin"] },
    ],
    recipes: [
      { id: "topdown-wasd" },
      { id: "hazard-kill-zone", entityName: "Enemy", params: { onTrigger: "respawn" } },
    ],
    fallDeathEnabled: false,
    lives: 3,
  },
};

export function getSkillPack(skillId: string): SkillPack {
  return (
    SKILL_PACKS[skillId] ?? {
      label: skillId,
      recipes: [],
      fallDeathEnabled: true,
      lives: 3,
    }
  );
}
