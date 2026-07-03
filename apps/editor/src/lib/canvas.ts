import type {
  AabbColliderComponent,
  GameKitAsset,
  GameKitEntity,
  GameKitScene,
  SpriteComponent,
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
    const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
    if (!transform) {
      continue;
    }

    if (sprite) {
      const image = images.get(sprite.assetId);
      const x = transform.position.x - sprite.width * sprite.anchor.x;
      const y = transform.position.y - sprite.height * sprite.anchor.y;
      if (image) {
        context.drawImage(image, x, y, sprite.width, sprite.height);
      } else {
        context.fillStyle = colorForAsset(sprite.assetId, assets);
        context.fillRect(x, y, sprite.width, sprite.height);
      }
    }

    if (collider && showColliders) {
      const isSelected = selectedEntityIds.has(entity.id);
      context.strokeStyle = isSelected ? "#ffb300" : collider.isStatic ? "#10b981" : "#00f0ff";
      context.lineWidth = isSelected ? 2 : 1;
      context.setLineDash(isSelected ? [] : [4, 4]);
      context.strokeRect(
        transform.position.x + collider.offset.x,
        transform.position.y + collider.offset.y,
        collider.size.x,
        collider.size.y
      );
      context.setLineDash([]);
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
  const collider = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  if (!transform) {
    return false;
  }
  const box = collider
    ? {
        x: transform.position.x + collider.offset.x,
        y: transform.position.y + collider.offset.y,
        width: collider.size.x,
        height: collider.size.y
      }
    : sprite
      ? {
          x: transform.position.x - sprite.width * sprite.anchor.x,
          y: transform.position.y - sprite.height * sprite.anchor.y,
          width: sprite.width,
          height: sprite.height
        }
      : undefined;

  return !!box &&
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height;
}
