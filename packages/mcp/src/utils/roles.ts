import { createEntity, GameKitComponentSchema, type GameKitEntity } from "@gamekit/schema";

export const ENTITY_ROLES = ["player", "enemy", "collectible", "platform", "obstacle"] as const;
export type EntityRole = (typeof ENTITY_ROLES)[number];

type ComponentDef = Record<string, unknown>;

export const ROLE_COMPONENTS: Record<EntityRole, ComponentDef[]> = {
  player: [
    { type: "Transform", position: { x: 100, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "player", width: 48, height: 48, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 48, y: 48 }, isStatic: false },
    { type: "PlayerController", speed: 300, jumpVelocity: 600, gravity: 1800 },
    { type: "CameraFollow", targetId: "self", smoothing: 0.1 },
  ],
  enemy: [
    { type: "Transform", position: { x: 300, y: 200 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "enemy", width: 48, height: 48, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 48, y: 48 }, isStatic: false },
    {
      type: "RigidBody",
      velocity: { x: -100, y: 0 },
      angularVelocity: 0,
      mass: 1,
      drag: 0,
      isKinematic: false,
      gravityScale: 1,
      useGravity: true,
    },
  ],
  collectible: [
    { type: "Transform", position: { x: 400, y: 150 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "coin", width: 24, height: 24, anchor: { x: 0.5, y: 0.5 } },
    {
      type: "AabbCollider",
      offset: { x: 0, y: 0 },
      size: { x: 24, y: 24 },
      isStatic: true,
      isTrigger: true,
    },
  ],
  platform: [
    { type: "Transform", position: { x: 400, y: 400 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "platform", width: 200, height: 32, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 200, y: 32 }, isStatic: true },
  ],
  obstacle: [
    { type: "Transform", position: { x: 500, y: 300 }, rotation: 0, scale: { x: 1, y: 1 } },
    { type: "Sprite", assetId: "obstacle", width: 32, height: 32, anchor: { x: 0.5, y: 0.5 } },
    { type: "AabbCollider", offset: { x: 0, y: 0 }, size: { x: 32, y: 32 }, isStatic: true },
  ],
};

export const ROLE_TAGS: Partial<Record<EntityRole, string[]>> = {
  collectible: ["coin"],
  obstacle: ["hazard"],
};

export function getRoleDescription(role: EntityRole): string {
  switch (role) {
    case "player":
      return "Player-controlled entity with physics, collision, and camera follow";
    case "enemy":
      return "AI-controlled entity with physics and collision";
    case "collectible":
      return "Pickup item with trigger collision";
    case "platform":
      return "Static platform for standing on";
    case "obstacle":
      return "Static obstacle that blocks movement";
  }
}

export function buildRoleEntity(opts: {
  role: EntityRole;
  name?: string;
  position?: { x: number; y: number };
  assetId?: string;
  tags?: string[];
}): GameKitEntity {
  const { role, assetId } = opts;
  const label = opts.name ?? role.charAt(0).toUpperCase() + role.slice(1);
  const position = opts.position ?? { x: 100, y: 200 };
  const entity = createEntity(label, position);
  const defs = structuredClone(ROLE_COMPONENTS[role]);
  for (const def of defs) {
    if (def.type === "Transform") {
      def.position = { ...position };
    }
    if (def.type === "CameraFollow") {
      def.targetId = entity.id;
    }
    if (def.type === "Sprite" && assetId) {
      def.assetId = assetId;
    }
  }
  entity.components = defs.map((c) => GameKitComponentSchema.parse(c));
  const roleTags = opts.tags ?? ROLE_TAGS[role];
  if (roleTags && roleTags.length > 0) entity.tags = [...roleTags];
  return entity;
}
