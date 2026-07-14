import type {
  AabbColliderComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  RigidBodyComponent,
  TextComponent,
  FollowPathComponent,
  CameraFollowComponent,
  AudioSourceComponent,
  ParticleSystemComponent,
  TweenComponent,
  GameKitAsset,
  GameKitEntity,
  GameKitScene,
  SpriteComponent,
  TilemapComponent,
  TransformComponent,
  GuiNode,
  GuiComponent,
  GuiComponentInstance
} from "@gamekit/schema";
import { findComponent, colorForAsset } from "./components.js";

export type DrawSceneOptions = {
  /**
   * When true, skip clearing/filling the design viewport rect.
   * Caller is responsible for background (e.g. play mode with camera clip).
   */
  skipViewportChrome?: boolean;
  /**
   * Skip drawing Text-only entities (HUD). Used when those are drawn in
   * screen space after the camera transform is restored.
   */
  skipScreenSpaceText?: boolean;
};

export function drawScene(
  context: CanvasRenderingContext2D,
  scene: GameKitScene,
  assets: GameKitAsset[],
  images: Map<string, HTMLImageElement>,
  selectedEntityIds: Set<string>,
  showGrid = true,
  showColliders = true,
  selectedGuiNodeId?: string | null,
  guiComponents?: GuiComponent[],
  selectedComponentInstanceId?: string | null,
  showGuiOverlays = true,
  options: DrawSceneOptions = {},
) {
  if (!options.skipViewportChrome) {
    context.clearRect(0, 0, scene.viewport.width, scene.viewport.height);
    context.fillStyle = scene.viewport.background;
    context.fillRect(0, 0, scene.viewport.width, scene.viewport.height);
  }

  if (showGrid) {
    drawGrid(context, scene.viewport.width, scene.viewport.height);
  }

  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    if (!transform) {
      continue;
    }

    if (sprite) {
      const x = transform.position.x - sprite.width * sprite.anchor.x;
      const y = transform.position.y - sprite.height * sprite.anchor.y;
      const rotation = transform.rotation ?? 0;
      if (rotation !== 0) {
        context.save();
        context.translate(transform.position.x, transform.position.y);
        context.rotate(rotation);
        context.translate(-transform.position.x, -transform.position.y);
      }
      const image = images.get(sprite.assetId);
      if (image) {
        context.drawImage(image, x, y, sprite.width, sprite.height);
      } else {
        context.fillStyle = colorForAsset(sprite.assetId, assets);
        context.fillRect(x, y, sprite.width, sprite.height);
      }
      if (rotation !== 0) {
        context.restore();
      }
    }

    const tilemap = findComponent<TilemapComponent>(entity, "Tilemap");
    if (tilemap) {
      const tileImage = images.get(tilemap.tilesetId);
      for (let i = 0; i < tilemap.tiles.length; i++) {
        const tileId = tilemap.tiles[i];
        if (tileId === 0) continue;
        const gx = i % tilemap.gridWidth;
        const gy = Math.floor(i / tilemap.gridWidth);
        const x = transform.position.x + gx * tilemap.tileWidth;
        const y = transform.position.y + gy * tilemap.tileHeight;

        const srcTileIndex = tileId - 1;
        const srcX = (srcTileIndex % tilemap.columns) * tilemap.tileWidth;
        const srcY = Math.floor(srcTileIndex / tilemap.columns) * tilemap.tileHeight;

        if (tileImage) {
          context.drawImage(
            tileImage,
            srcX, srcY,
            tilemap.tileWidth, tilemap.tileHeight,
            x, y,
            tilemap.tileWidth, tilemap.tileHeight
          );
        } else {
          context.fillStyle = "#a78bfa";
          context.fillRect(x, y, tilemap.tileWidth, tilemap.tileHeight);
          context.strokeStyle = "rgba(255,255,255,0.15)";
          context.lineWidth = 1;
          context.strokeRect(x, y, tilemap.tileWidth, tilemap.tileHeight);
        }
      }
    }

    const textComp = findComponent<TextComponent>(entity, "Text");
    if (textComp) {
      // Text-only entities without sprites are treated as HUD when requested
      const isHud =
        options.skipScreenSpaceText &&
        !sprite &&
        !findComponent<TilemapComponent>(entity, "Tilemap");
      if (isHud) {
        continue;
      }
      context.save();
      context.fillStyle = textComp.color;
      context.font = `${textComp.size}px sans-serif`;
      context.textAlign = textComp.align;
      context.textBaseline = "top";
      context.fillText(textComp.text, transform.position.x, transform.position.y);
      context.restore();
    }

    if (showColliders) {
      const aabb = findComponent<AabbColliderComponent>(entity, "AabbCollider");
      if (aabb) {
        const isSelected = selectedEntityIds.has(entity.id);
        context.strokeStyle = isSelected ? "#ffb300" : aabb.isTrigger ? "#3b82f6" : "#10b981";
        context.lineWidth = isSelected ? 2 : 1;
        context.setLineDash(isSelected ? [] : [4, 4]);
        context.strokeRect(
          transform.position.x + aabb.offset.x,
          transform.position.y + aabb.offset.y,
          aabb.size.x,
          aabb.size.y
        );
        context.setLineDash([]);
      }

      const circle = findComponent<CircleColliderComponent>(entity, "CircleCollider");
      if (circle) {
        const isSelected = selectedEntityIds.has(entity.id);
        context.strokeStyle = isSelected ? "#ffb300" : circle.isTrigger ? "#3b82f6" : "#10b981";
        context.lineWidth = isSelected ? 2 : 1;
        context.setLineDash(isSelected ? [] : [4, 4]);
        context.beginPath();
        context.arc(
          transform.position.x + circle.offset.x,
          transform.position.y + circle.offset.y,
          circle.radius,
          0,
          Math.PI * 2
        );
        context.stroke();
        context.setLineDash([]);
      }

      const polygon = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
      if (polygon && polygon.points.length >= 3) {
        const isSelected = selectedEntityIds.has(entity.id);
        context.strokeStyle = isSelected ? "#ffb300" : polygon.isTrigger ? "#3b82f6" : "#10b981";
        context.lineWidth = isSelected ? 2 : 1;
        context.setLineDash(isSelected ? [] : [4, 4]);
        context.beginPath();
        const ox = transform.position.x + polygon.offset.x;
        const oy = transform.position.y + polygon.offset.y;
        context.moveTo(ox + polygon.points[0].x, oy + polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
          context.lineTo(ox + polygon.points[i].x, oy + polygon.points[i].y);
        }
        context.closePath();
        context.stroke();
        context.setLineDash([]);
      }

      const rb = findComponent<RigidBodyComponent>(entity, "RigidBody");
      if (rb && rb.velocity && (rb.velocity.x !== 0 || rb.velocity.y !== 0)) {
        drawArrow(
          context,
          transform.position.x,
          transform.position.y,
          transform.position.x + rb.velocity.x * 0.15,
          transform.position.y + rb.velocity.y * 0.15,
          "#00f0ff"
        );
      }

      // Collider fill overlays (semi-transparent)
      if (aabb) {
        const fillColor = aabb.isTrigger ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.06)";
        context.fillStyle = fillColor;
        context.fillRect(
          transform.position.x + aabb.offset.x,
          transform.position.y + aabb.offset.y,
          aabb.size.x,
          aabb.size.y
        );
      }
      if (circle) {
        const fillColor = circle.isTrigger ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.06)";
        context.fillStyle = fillColor;
        context.beginPath();
        context.arc(
          transform.position.x + circle.offset.x,
          transform.position.y + circle.offset.y,
          circle.radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      if (polygon && polygon.points.length >= 3) {
        const fillColor = polygon.isTrigger ? "rgba(59,130,246,0.08)" : "rgba(16,185,129,0.06)";
        context.fillStyle = fillColor;
        context.beginPath();
        const pox = transform.position.x + polygon.offset.x;
        const poy = transform.position.y + polygon.offset.y;
        context.moveTo(pox + polygon.points[0].x, poy + polygon.points[0].y);
        for (let i = 1; i < polygon.points.length; i++) {
          context.lineTo(pox + polygon.points[i].x, poy + polygon.points[i].y);
        }
        context.closePath();
        context.fill();
      }

      // FollowPath waypoint gizmo — connected line + dots
      const followPath = findComponent<FollowPathComponent>(entity, "FollowPath");
      if (followPath && followPath.points.length > 0) {
        const isSelected = selectedEntityIds.has(entity.id);
        context.strokeStyle = isSelected ? "#ffb300" : "#f59e0b";
        context.lineWidth = 1.5;
        context.setLineDash([3, 3]);
        context.beginPath();
        context.moveTo(
          transform.position.x + followPath.points[0].x,
          transform.position.y + followPath.points[0].y
        );
        for (let i = 1; i < followPath.points.length; i++) {
          context.lineTo(
            transform.position.x + followPath.points[i].x,
            transform.position.y + followPath.points[i].y
          );
        }
        if (followPath.loop && followPath.points.length > 1) {
          context.lineTo(
            transform.position.x + followPath.points[0].x,
            transform.position.y + followPath.points[0].y
          );
        }
        context.stroke();
        context.setLineDash([]);

        // Waypoint dots
        context.fillStyle = "#f59e0b";
        for (let i = 0; i < followPath.points.length; i++) {
          context.beginPath();
          context.arc(
            transform.position.x + followPath.points[i].x,
            transform.position.y + followPath.points[i].y,
            3, 0, Math.PI * 2
          );
          context.fill();
        }
      }

      // CameraFollow target marker (not the game screen — that is the viewport frame)
      const camFollow = findComponent<CameraFollowComponent>(entity, "CameraFollow");
      if (camFollow) {
        const cx = transform.position.x;
        const cy = transform.position.y;
        context.strokeStyle = "rgba(167, 139, 250, 0.85)";
        context.fillStyle = "rgba(167, 139, 250, 0.2)";
        context.lineWidth = 1.5;
        context.setLineDash([]);
        context.beginPath();
        context.arc(cx, cy, 10, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.beginPath();
        context.moveTo(cx - 16, cy);
        context.lineTo(cx + 16, cy);
        context.moveTo(cx, cy - 16);
        context.lineTo(cx, cy + 16);
        context.stroke();
        context.fillStyle = "rgba(196, 181, 253, 0.9)";
        context.font = "10px ui-sans-serif, system-ui, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillText("Camera", cx, cy - 14);
      }

      // ParticleSystem preview puffs
      const particles = findComponent<ParticleSystemComponent>(entity, "ParticleSystem");
      if (particles && particles.active) {
        context.fillStyle = particles.colorStart;
        const count = Math.min(12, particles.maxParticles);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const r = 8 + (i % 4) * 3;
          context.globalAlpha = 0.35;
          context.beginPath();
          context.arc(
            transform.position.x + Math.cos(a) * r,
            transform.position.y + Math.sin(a) * r,
            Math.max(1, particles.sizeStart * 0.4),
            0,
            Math.PI * 2,
          );
          context.fill();
        }
        context.globalAlpha = 1;
      }

      // AudioSource range indicator
      const audioSrc = findComponent<AudioSourceComponent>(entity, "AudioSource");
      if (audioSrc) {
        context.strokeStyle = "rgba(236,72,153,0.4)";
        context.lineWidth = 1;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.arc(transform.position.x, transform.position.y, 48, 0, Math.PI * 2);
        context.stroke();
        context.setLineDash([]);
        // Speaker icon indicator
        context.fillStyle = "rgba(236,72,153,0.6)";
        context.font = "10px sans-serif";
        context.textAlign = "center";
        context.fillText("♪", transform.position.x, transform.position.y - 52);
      }

      // Tween direction indicator
      const tweenComp = findComponent<TweenComponent>(entity, "Tween");
      if (tweenComp) {
        const delta = tweenComp.endValue - tweenComp.startValue;
        let tx = 0, ty = 0;
        if (tweenComp.property === "position.x") { tx = delta * 0.15; }
        else if (tweenComp.property === "position.y") { ty = delta * 0.15; }
        else if (tweenComp.property === "rotation") { tx = 20; ty = 0; }
        else if (tweenComp.property === "scale.x") { tx = delta * 10; }
        else if (tweenComp.property === "scale.y") { ty = delta * 10; }

        if (tx !== 0 || ty !== 0) {
          drawArrow(
            context,
            transform.position.x,
            transform.position.y,
            transform.position.x + tx,
            transform.position.y + ty,
            "#a78bfa"
          );
        }
      }
    }
  }

  // Selected entity origin crosshairs
  for (const id of selectedEntityIds) {
    const entity = scene.entities.find((e) => e.id === id);
    const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
    if (transform) {
      const cx = transform.position.x;
      const cy = transform.position.y;
      const armLen = 10;

      // Draw crosshair
      context.strokeStyle = "rgba(255,179,0,0.7)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(cx - armLen, cy);
      context.lineTo(cx + armLen, cy);
      context.moveTo(cx, cy - armLen);
      context.lineTo(cx, cy + armLen);
      context.stroke();

      // Center dot
      context.fillStyle = "#ffb300";
      context.beginPath();
      context.arc(cx, cy, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (showGuiOverlays) {
    // Draw component instances (underneath loose GUI nodes)
    const componentMap = new Map((guiComponents ?? []).map((c) => [c.id, c]));
    for (const instance of scene.gui?.componentInstances ?? []) {
      if (instance.visible === false) continue;
      const component = componentMap.get(instance.componentId);
      if (!component) continue;

      const isSelected = instance.id === selectedComponentInstanceId;
      if (isSelected) {
        const bounds = computeComponentBounds(component);
        context.strokeStyle = "#ffb300";
        context.lineWidth = 2;
        context.setLineDash([6, 3]);
        context.strokeRect(instance.x + bounds.x, instance.y + bounds.y, bounds.width, bounds.height);
        context.setLineDash([]);
      }

      for (const node of component.nodes) {
        const effectiveNode = applyNodeOverrides(node, instance);
        drawGuiNode(context, effectiveNode, images, assets, false);
      }
    }

    // Draw loose GUI overlay nodes
    if (scene.gui?.nodes) {
      for (const node of scene.gui.nodes) {
        if (node.visible === false) continue;
        drawGuiNode(context, node, images, assets, node.id === selectedGuiNodeId);
      }
    }
  }
}

function computeComponentBounds(component: GuiComponent): { x: number; y: number; width: number; height: number } {
  if (component.nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of component.nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function applyNodeOverrides(node: GuiNode, instance: GuiComponentInstance): GuiNode {
  const base = {
    ...node,
    x: node.x + instance.x,
    y: node.y + instance.y,
  };
  const overrides = instance.nodeOverrides?.[node.id];
  if (!overrides) return base;
  const { id, type, ...safeOverrides } = overrides as Record<string, unknown>;
  return { ...base, ...safeOverrides } as GuiNode;
}

export function hitComponentInstance(
  instance: GuiComponentInstance,
  component: GuiComponent,
  point: { x: number; y: number }
): boolean {
  if (instance.visible === false) return false;
  const bounds = computeComponentBounds(component);
  const bx = instance.x + bounds.x;
  const by = instance.y + bounds.y;
  return (
    point.x >= bx &&
    point.x <= bx + bounds.width &&
    point.y >= by &&
    point.y <= by + bounds.height
  );
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  context.strokeStyle = "rgba(255, 255, 255, 0.04)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

/**
 * Infinite-ish editor grid in world space (visible bounds only).
 * Call while the context is in world transform. `zoom` keeps strokes ~1 CSS px.
 */
export function drawWorldGrid(
  context: CanvasRenderingContext2D,
  worldLeft: number,
  worldTop: number,
  worldRight: number,
  worldBottom: number,
  zoom: number,
  step = 32,
  majorEvery = 4
) {
  const pad = step * 2;
  const left = Math.floor((worldLeft - pad) / step) * step;
  const top = Math.floor((worldTop - pad) / step) * step;
  const right = Math.ceil((worldRight + pad) / step) * step;
  const bottom = Math.ceil((worldBottom + pad) / step) * step;
  const z = Math.max(0.0001, zoom);
  const hair = 1 / z;
  const majorW = 1.5 / z;

  context.save();
  for (let x = left; x <= right; x += step) {
    const major = Math.round(x / step) % majorEvery === 0;
    context.strokeStyle = major
      ? "rgba(255, 255, 255, 0.16)"
      : "rgba(255, 255, 255, 0.08)";
    context.lineWidth = major ? majorW : hair;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, bottom);
    context.stroke();
  }
  for (let y = top; y <= bottom; y += step) {
    const major = Math.round(y / step) % majorEvery === 0;
    context.strokeStyle = major
      ? "rgba(255, 255, 255, 0.16)"
      : "rgba(255, 255, 255, 0.08)";
    context.lineWidth = major ? majorW : hair;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(right, y);
    context.stroke();
  }
  context.restore();
}

export type SceneFrameOptions = {
  /** Visible world bounds (for dimming everything outside the game screen). */
  worldLeft: number;
  worldTop: number;
  worldRight: number;
  worldBottom: number;
  /**
   * Top-left of the locked game screen in world space.
   * Defaults to (0,0). In play mode this tracks the camera pan for long levels.
   */
  originX?: number;
  originY?: number;
};

/**
 * Locked game screen = scene.viewport at world (originX, originY) → size.
 * Draws dim outside + solid border + corner brackets + size label.
 * Call under the world transform.
 */
export function drawSceneFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  world?: SceneFrameOptions,
  labelOverride?: string,
) {
  const z = Math.max(0.0001, zoom);
  const hair = 1 / z;
  const border = 2 / z;
  const corner = Math.min(18 / z, Math.min(width, height) * 0.12);
  const ox = world?.originX ?? 0;
  const oy = world?.originY ?? 0;

  context.save();
  context.setLineDash([]);

  // Dim workspace outside the locked screen
  if (world) {
    const { worldLeft: L, worldTop: T, worldRight: R, worldBottom: B } = world;
    context.fillStyle = "rgba(0, 0, 0, 0.48)";
    context.beginPath();
    context.rect(L, T, R - L, B - T);
    context.rect(ox, oy, width, height);
    context.fill("evenodd");
  }

  // Solid locked-region border (true game screen)
  context.strokeStyle = "rgba(0, 240, 255, 0.85)";
  context.lineWidth = border;
  context.lineJoin = "miter";
  context.strokeRect(ox, oy, width, height);

  // Soft outer halo
  context.strokeStyle = "rgba(0, 240, 255, 0.18)";
  context.lineWidth = 8 / z;
  context.strokeRect(ox - hair, oy - hair, width + 2 * hair, height + 2 * hair);

  // Corner brackets (Figma-style crop marks)
  context.strokeStyle = "rgba(0, 240, 255, 1)";
  context.lineWidth = 3 / z;
  context.lineCap = "square";
  const drawCorner = (x0: number, y0: number, dx: number, dy: number) => {
    context.beginPath();
    context.moveTo(x0, y0 + dy * corner);
    context.lineTo(x0, y0);
    context.lineTo(x0 + dx * corner, y0);
    context.stroke();
  };
  drawCorner(ox, oy, 1, 1);
  drawCorner(ox + width, oy, -1, 1);
  drawCorner(ox, oy + height, 1, -1);
  drawCorner(ox + width, oy + height, -1, -1);

  // Label: "Screen · W×H" (or custom override e.g. Play)
  const label =
    labelOverride ??
    (ox !== 0 || oy !== 0
      ? `Play cam  ${Math.round(width)}×${Math.round(height)}`
      : `Screen  ${Math.round(width)}×${Math.round(height)}`);
  const fontPx = 11 / z;
  context.font = `600 ${fontPx}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "bottom";
  const padX = 6 / z;
  const padY = 4 / z;
  const textW = context.measureText(label).width;
  const boxH = fontPx + padY * 2;
  const boxW = textW + padX * 2;
  const boxX = ox;
  const boxY = oy - boxH - 4 / z;

  context.fillStyle = "rgba(0, 240, 255, 0.16)";
  context.strokeStyle = "rgba(0, 240, 255, 0.45)";
  context.lineWidth = hair;
  const r = 4 / z;
  // rounded label chip
  context.beginPath();
  context.moveTo(boxX + r, boxY);
  context.lineTo(boxX + boxW - r, boxY);
  context.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r);
  context.lineTo(boxX + boxW, boxY + boxH - r);
  context.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH);
  context.lineTo(boxX + r, boxY + boxH);
  context.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r);
  context.lineTo(boxX, boxY + r);
  context.quadraticCurveTo(boxX, boxY, boxX + r, boxY);
  context.closePath();
  context.fill();
  context.stroke();

  context.fillStyle = "rgba(0, 240, 255, 0.95)";
  context.fillText(label, boxX + padX, boxY + boxH - padY);

  context.restore();
}

/** Draw Text-only entities in fixed screen space (HUD, no camera offset). */
export function drawScreenSpaceText(
  context: CanvasRenderingContext2D,
  scene: GameKitScene,
) {
  for (const entity of scene.entities) {
    const transform = findComponent<TransformComponent>(entity, "Transform");
    const textComp = findComponent<TextComponent>(entity, "Text");
    const sprite = findComponent<SpriteComponent>(entity, "Sprite");
    if (!transform || !textComp || sprite) continue;
    context.save();
    context.fillStyle = textComp.color;
    context.font = `${textComp.size}px sans-serif`;
    context.textAlign = textComp.align;
    context.textBaseline = "top";
    context.fillText(textComp.text, transform.position.x, transform.position.y);
    context.restore();
  }
}

function drawGuiNode(
  context: CanvasRenderingContext2D,
  node: GuiNode,
  images: Map<string, HTMLImageElement>,
  assets: GameKitAsset[],
  selected: boolean
) {
  const x = node.x;
  const y = node.y;
  const w = node.width;
  const h = node.height;

  if (selected) {
    context.strokeStyle = "#ffb300";
    context.lineWidth = 2;
    context.setLineDash([4, 4]);
    context.strokeRect(x, y, w, h);
    context.setLineDash([]);
  }

  switch (node.type) {
    case "Text": {
      const fontSize = node.fontSize ?? 16;
      const color = node.color ?? "#ffffff";
      const align = node.align ?? "left";
      context.fillStyle = color;
      context.font = `${fontSize}px sans-serif`;
      context.textAlign = align;
      context.textBaseline = "top";
      const textX = align === "center" ? x + w / 2 : align === "right" ? x + w : x;
      context.fillText(node.text, textX + 4, y + 4, w - 8);
      break;
    }
    case "Button": {
      const bg = node.backgroundColor ?? "#333333";
      const color = node.color ?? "#ffffff";
      const fontSize = node.fontSize ?? 14;
      context.fillStyle = bg;
      context.fillRect(x, y, w, h);
      context.strokeStyle = "rgba(255,255,255,0.2)";
      context.lineWidth = 1;
      context.strokeRect(x, y, w, h);
      context.fillStyle = color;
      context.font = `${fontSize}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(node.text, x + w / 2, y + h / 2, w - 8);
      break;
    }
    case "Image": {
      const image = images.get(node.assetId);
      if (image) {
        context.drawImage(image, x, y, w, h);
      } else {
        context.fillStyle = colorForAsset(node.assetId, assets);
        context.fillRect(x, y, w, h);
        context.strokeStyle = "rgba(255,255,255,0.15)";
        context.lineWidth = 1;
        context.strokeRect(x, y, w, h);
      }
      break;
    }
  }
}

export function hitGuiNode(node: GuiNode, point: { x: number; y: number }): boolean {
  if (node.visible === false) return false;
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
}

export function hitEntity(entity: GameKitEntity, point: { x: number; y: number }): boolean {
  const transform = findComponent<TransformComponent>(entity, "Transform");
  const sprite = findComponent<SpriteComponent>(entity, "Sprite");
  const aabb = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  const circle = findComponent<CircleColliderComponent>(entity, "CircleCollider");
  const tilemap = findComponent<TilemapComponent>(entity, "Tilemap");
  if (!transform) {
    return false;
  }

  if (aabb) {
    const bx = transform.position.x + aabb.offset.x;
    const by = transform.position.y + aabb.offset.y;
    return (
      point.x >= bx &&
      point.x <= bx + aabb.size.x &&
      point.y >= by &&
      point.y <= by + aabb.size.y
    );
  }

  if (circle) {
    const cx = transform.position.x + circle.offset.x;
    const cy = transform.position.y + circle.offset.y;
    const dx = point.x - cx;
    const dy = point.y - cy;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  const polygon = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
  if (polygon && polygon.points.length >= 3) {
    const ox = transform.position.x + polygon.offset.x;
    const oy = transform.position.y + polygon.offset.y;
    const pts = polygon.points.map((p) => ({ x: ox + p.x, y: oy + p.y }));
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      if ((yi > point.y) !== (yj > point.y) &&
          point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  if (sprite) {
    const bx = transform.position.x - sprite.width * sprite.anchor.x;
    const by = transform.position.y - sprite.height * sprite.anchor.y;
    return (
      point.x >= bx &&
      point.x <= bx + sprite.width &&
      point.y >= by &&
      point.y <= by + sprite.height
    );
  }

  if (tilemap) {
    const tx = transform.position.x;
    const ty = transform.position.y;
    return (
      point.x >= tx &&
      point.x <= tx + tilemap.gridWidth * tilemap.tileWidth &&
      point.y >= ty &&
      point.y <= ty + tilemap.gridHeight * tilemap.tileHeight
    );
  }

  const textComp = findComponent<TextComponent>(entity, "Text");
  if (textComp) {
    const w = textComp.text.length * textComp.size * 0.6;
    const h = textComp.size;
    let tx = transform.position.x;
    if (textComp.align === "center") tx -= w / 2;
    else if (textComp.align === "right") tx -= w;
    const ty = transform.position.y;
    return point.x >= tx && point.x <= tx + w && point.y >= ty && point.y <= ty + h;
  }

  return false;
}

function drawArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) {
  const headlen = 8;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;

  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();

  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  context.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
}
