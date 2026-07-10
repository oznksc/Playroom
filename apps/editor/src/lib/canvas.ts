import type {
  AabbColliderComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  RigidBodyComponent,
  TextComponent,
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
  showGuiOverlays = true
) {
  context.clearRect(0, 0, scene.viewport.width, scene.viewport.height);
  context.fillStyle = scene.viewport.background;
  context.fillRect(0, 0, scene.viewport.width, scene.viewport.height);
  
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
    }
  }

  for (const id of selectedEntityIds) {
    const entity = scene.entities.find((e) => e.id === id);
    const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
    if (transform) {
      context.fillStyle = "#ffb300";
      context.beginPath();
      context.arc(transform.position.x, transform.position.y, 4, 0, Math.PI * 2);
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
