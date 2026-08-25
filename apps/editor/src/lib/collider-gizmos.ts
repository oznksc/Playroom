import type {
  AabbColliderComponent,
  CircleColliderComponent,
  GameKitEntity,
  PolygonColliderComponent,
  RigidBodyComponent,
  TransformComponent,
} from "@gamekit/schema";
import { findComponent } from "./components.js";

export type ColliderGizmoKind = "solid" | "trigger";

export type ColliderGizmoStyle = {
  kind: ColliderGizmoKind;
  stroke: string;
  fill: string;
  hatch: string;
  dash: number[];
  lineWidth: number;
  badge: string;
};

export type ColliderGizmoOptions = {
  selected: boolean;
  zoom?: number;
  activeTool?: string;
  showLabels?: boolean;
};

const SOLID_STROKE = "#34d399";
const TRIGGER_STROKE = "#38bdf8";
const SELECTED_STROKE = "#ffb300";
const ORIGIN_STROKE = "rgba(255,179,0,0.7)";

export function colliderGizmoStyle(input: {
  isTrigger: boolean;
  isStatic: boolean;
  selected: boolean;
  kinematic?: boolean;
}): ColliderGizmoStyle {
  const kind: ColliderGizmoKind = input.isTrigger ? "trigger" : "solid";
  const stroke = input.selected ? SELECTED_STROKE : kind === "trigger" ? TRIGGER_STROKE : SOLID_STROKE;
  const fill = input.isTrigger
    ? input.selected
      ? "rgba(56,189,248,0.16)"
      : "rgba(56,189,248,0.10)"
    : input.selected
      ? "rgba(52,211,153,0.14)"
      : "rgba(52,211,153,0.08)";
  const hatch = input.isTrigger ? "rgba(56,189,248,0.35)" : "rgba(52,211,153,0.28)";
  const dash = input.isTrigger ? (input.selected ? [7, 4] : [5, 4]) : [];
  const lineWidth = input.selected ? 2 : input.isStatic ? 1.5 : 1;
  const tags: string[] = [];
  if (input.isTrigger) tags.push("T");
  if (input.isStatic) tags.push("S");
  if (input.kinematic) tags.push("K");
  return { kind, stroke, fill, hatch, dash, lineWidth, badge: tags.join("") };
}

export function colliderCenter(offset: { x: number; y: number }, size?: { x: number; y: number }): { x: number; y: number } {
  if (!size) return { x: offset.x, y: offset.y };
  return { x: offset.x + size.x / 2, y: offset.y + size.y / 2 };
}

export function layerMaskLabel(layer: number | undefined, mask: number | undefined): string {
  return `L${layer ?? 1}·M${mask ?? 1}`;
}

function hair(zoom: number): number {
  return 1 / Math.max(0.0001, zoom);
}

function fontSize(zoom: number): number {
  return 10 / Math.max(0.0001, zoom);
}

function setStroke(
  context: CanvasRenderingContext2D,
  style: ColliderGizmoStyle,
  zoom: number,
): void {
  context.strokeStyle = style.stroke;
  context.fillStyle = style.fill;
  context.lineWidth = style.lineWidth * hair(zoom);
  context.setLineDash(style.dash.map((d) => d * hair(zoom) * 8));
}

function hatchShape(
  context: CanvasRenderingContext2D,
  path: () => void,
  bounds: { x: number; y: number; w: number; h: number },
  color: string,
  zoom: number,
): void {
  context.save();
  context.beginPath();
  path();
  context.clip();
  context.strokeStyle = color;
  context.lineWidth = hair(zoom);
  context.setLineDash([]);
  const step = 6 / Math.max(0.0001, zoom);
  const { x, y, w, h } = bounds;
  const extra = w + h;
  for (let d = -extra; d < w + extra; d += step) {
    context.beginPath();
    context.moveTo(x + d, y);
    context.lineTo(x + d - h, y + h);
    context.stroke();
  }
  context.restore();
}

function drawInwardArrows(
  context: CanvasRenderingContext2D,
  edges: Array<{ x: number; y: number; nx: number; ny: number }>,
  color: string,
  zoom: number,
): void {
  const len = 8 / Math.max(0.0001, zoom);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = hair(zoom);
  context.setLineDash([]);
  for (const edge of edges) {
    const tx = edge.x + edge.nx * len;
    const ty = edge.y + edge.ny * len;
    context.beginPath();
    context.moveTo(edge.x, edge.y);
    context.lineTo(tx, ty);
    context.stroke();
    const ang = Math.atan2(edge.ny, edge.nx);
    const head = 3.5 / Math.max(0.0001, zoom);
    context.beginPath();
    context.moveTo(tx, ty);
    context.lineTo(tx - head * Math.cos(ang - Math.PI / 6), ty - head * Math.sin(ang - Math.PI / 6));
    context.lineTo(tx - head * Math.cos(ang + Math.PI / 6), ty - head * Math.sin(ang + Math.PI / 6));
    context.closePath();
    context.fill();
  }
  context.restore();
}

function drawBadge(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  style: ColliderGizmoStyle,
  zoom: number,
): void {
  if (!text) return;
  const size = fontSize(zoom);
  context.save();
  context.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  context.textAlign = "left";
  context.textBaseline = "bottom";
  const pad = 2 / Math.max(0.0001, zoom);
  const metrics = context.measureText(text);
  const w = metrics.width + pad * 2;
  const h = size + pad * 2;
  context.fillStyle = "rgba(6,9,14,0.78)";
  context.fillRect(x, y - h, w, h);
  context.strokeStyle = style.stroke;
  context.lineWidth = hair(zoom);
  context.setLineDash([]);
  context.strokeRect(x, y - h, w, h);
  context.fillStyle = style.stroke;
  context.fillText(text, x + pad, y - pad);
  context.restore();
}

function drawOffsetStem(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  centerX: number,
  centerY: number,
  zoom: number,
): void {
  const dx = centerX - originX;
  const dy = centerY - originY;
  if (dx * dx + dy * dy < 1) return;
  context.save();
  context.strokeStyle = ORIGIN_STROKE;
  context.lineWidth = hair(zoom);
  context.setLineDash([4 * hair(zoom) * 8, 3 * hair(zoom) * 8]);
  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(centerX, centerY);
  context.stroke();
  context.setLineDash([]);
  context.fillStyle = SELECTED_STROKE;
  context.beginPath();
  context.arc(centerX, centerY, 2.5 / Math.max(0.0001, zoom), 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawDimension(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  zoom: number,
): void {
  const size = fontSize(zoom);
  context.save();
  context.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  context.fillStyle = "rgba(255,179,0,0.92)";
  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillText(text, x, y + 3 / Math.max(0.0001, zoom));
  context.restore();
}

export function drawAabbColliderGizmo(
  context: CanvasRenderingContext2D,
  transform: TransformComponent,
  aabb: AabbColliderComponent,
  options: ColliderGizmoOptions,
): void {
  const zoom = options.zoom ?? 1;
  const style = colliderGizmoStyle({
    isTrigger: !!aabb.isTrigger,
    isStatic: !!aabb.isStatic,
    selected: options.selected,
  });
  const x = transform.position.x + aabb.offset.x;
  const y = transform.position.y + aabb.offset.y;
  const w = aabb.size.x;
  const h = aabb.size.y;
  const path = () => {
    context.rect(x, y, w, h);
  };

  context.save();
  setStroke(context, style, zoom);
  context.beginPath();
  path();
  context.fill();
  if (aabb.isStatic || aabb.isTrigger) {
    hatchShape(context, path, { x, y, w, h }, style.hatch, zoom);
  }
  context.beginPath();
  path();
  context.stroke();
  context.setLineDash([]);

  if (aabb.isTrigger) {
    drawInwardArrows(
      context,
      [
        { x: x + w / 2, y, nx: 0, ny: 1 },
        { x: x + w / 2, y: y + h, nx: 0, ny: -1 },
        { x, y: y + h / 2, nx: 1, ny: 0 },
        { x: x + w, y: y + h / 2, nx: -1, ny: 0 },
      ],
      style.stroke,
      zoom,
    );
  }

  if (options.selected) {
    const tick = 5 / Math.max(0.0001, zoom);
    context.strokeStyle = SELECTED_STROKE;
    context.lineWidth = 1.5 * hair(zoom);
    const corners = [
      [x, y, 1, 1],
      [x + w, y, -1, 1],
      [x, y + h, 1, -1],
      [x + w, y + h, -1, -1],
    ] as const;
    for (const [cx, cy, sx, sy] of corners) {
      context.beginPath();
      context.moveTo(cx, cy + sy * tick);
      context.lineTo(cx, cy);
      context.lineTo(cx + sx * tick, cy);
      context.stroke();
    }
    drawOffsetStem(
      context,
      transform.position.x,
      transform.position.y,
      x + w / 2,
      y + h / 2,
      zoom,
    );
    if (options.showLabels !== false) {
      drawDimension(context, x + w / 2, y + h, `${Math.round(w)}×${Math.round(h)}`, zoom);
    }
  }

  if (options.showLabels !== false) {
    const badge = [style.badge, layerMaskLabel(aabb.layer, aabb.mask)].filter(Boolean).join(" ");
    drawBadge(context, x, y - 2 / Math.max(0.0001, zoom), badge, style, zoom);
  }
  context.restore();
}

export function drawCircleColliderGizmo(
  context: CanvasRenderingContext2D,
  transform: TransformComponent,
  circle: CircleColliderComponent,
  options: ColliderGizmoOptions,
): void {
  const zoom = options.zoom ?? 1;
  const style = colliderGizmoStyle({
    isTrigger: !!circle.isTrigger,
    isStatic: !!circle.isStatic,
    selected: options.selected,
  });
  const cx = transform.position.x + circle.offset.x;
  const cy = transform.position.y + circle.offset.y;
  const r = circle.radius;
  const path = () => {
    context.arc(cx, cy, r, 0, Math.PI * 2);
  };

  context.save();
  setStroke(context, style, zoom);
  context.beginPath();
  path();
  context.fill();
  if (circle.isStatic || circle.isTrigger) {
    hatchShape(context, path, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, style.hatch, zoom);
  }
  context.beginPath();
  path();
  context.stroke();
  context.setLineDash([]);

  context.beginPath();
  context.moveTo(cx, cy);
  context.lineTo(cx + r, cy);
  context.stroke();

  if (circle.isTrigger) {
    const arrows: Array<{ x: number; y: number; nx: number; ny: number }> = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      arrows.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r,
        nx: -Math.cos(a),
        ny: -Math.sin(a),
      });
    }
    drawInwardArrows(context, arrows, style.stroke, zoom);
  }

  if (options.selected) {
    drawOffsetStem(context, transform.position.x, transform.position.y, cx, cy, zoom);
    if (options.showLabels !== false) {
      drawDimension(context, cx, cy + r, `r ${Math.round(r)}`, zoom);
    }
  }

  if (options.showLabels !== false) {
    const badge = [style.badge, layerMaskLabel(circle.layer, circle.mask)].filter(Boolean).join(" ");
    drawBadge(context, cx - r, cy - r - 2 / Math.max(0.0001, zoom), badge, style, zoom);
  }
  context.restore();
}

export function drawPolygonColliderGizmo(
  context: CanvasRenderingContext2D,
  transform: TransformComponent,
  polygon: PolygonColliderComponent,
  options: ColliderGizmoOptions,
): void {
  if (polygon.points.length < 1) return;
  const zoom = options.zoom ?? 1;
  const style = colliderGizmoStyle({
    isTrigger: !!polygon.isTrigger,
    isStatic: !!polygon.isStatic,
    selected: options.selected,
  });
  const ox = transform.position.x + polygon.offset.x;
  const oy = transform.position.y + polygon.offset.y;
  const pts = polygon.points.map((p) => ({ x: ox + p.x, y: oy + p.y }));

  const path = () => {
    context.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) context.lineTo(pts[i].x, pts[i].y);
    context.closePath();
  };

  let minX = pts[0].x;
  let minY = pts[0].y;
  let maxX = pts[0].x;
  let maxY = pts[0].y;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  context.save();
  if (pts.length >= 3) {
    setStroke(context, style, zoom);
    context.beginPath();
    path();
    context.fill();
    if (polygon.isStatic || polygon.isTrigger) {
      hatchShape(context, () => {
        context.beginPath();
        path();
      }, { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, style.hatch, zoom);
    }
    context.beginPath();
    path();
    context.stroke();
    context.setLineDash([]);

    if (polygon.isTrigger) {
      const arrows: Array<{ x: number; y: number; nx: number; ny: number }> = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const ex = b.x - a.x;
        const ey = b.y - a.y;
        const len = Math.hypot(ex, ey) || 1;
        // Inward for CCW: left normal; if winding is CW this still reads as a sensor tick.
        const nx = -ey / len;
        const ny = ex / len;
        arrows.push({ x: mx, y: my, nx, ny });
      }
      drawInwardArrows(context, arrows, style.stroke, zoom);
    }
  }

  if (options.selected) {
    drawOffsetStem(context, transform.position.x, transform.position.y, ox, oy, zoom);
  }

  if (options.selected && options.activeTool === "polygon-edit") {
    const radius = 5 / Math.max(0.0001, zoom);
    const size = fontSize(zoom);
    for (let i = 0; i < pts.length; i++) {
      context.fillStyle = SELECTED_STROKE;
      context.beginPath();
      context.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#fff";
      context.lineWidth = hair(zoom);
      context.setLineDash([]);
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.9)";
      context.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
      context.textAlign = "left";
      context.textBaseline = "bottom";
      context.fillText(String(i), pts[i].x + radius, pts[i].y - radius);
    }
  }

  if (options.showLabels !== false) {
    const badge = [style.badge, layerMaskLabel(polygon.layer, polygon.mask)].filter(Boolean).join(" ");
    drawBadge(context, minX, minY - 2 / Math.max(0.0001, zoom), badge, style, zoom);
  }
  context.restore();
}

export function drawRigidBodyGizmo(
  context: CanvasRenderingContext2D,
  transform: TransformComponent,
  body: RigidBodyComponent,
  zoom = 1,
): void {
  const vx = body.velocity?.x ?? 0;
  const vy = body.velocity?.y ?? 0;
  const speed = Math.hypot(vx, vy);
  if (speed > 0.5) {
    drawGizmoArrow(
      context,
      transform.position.x,
      transform.position.y,
      transform.position.x + vx * 0.15,
      transform.position.y + vy * 0.15,
      "#00f0ff",
      zoom,
    );
  }
  const av = body.angularVelocity ?? 0;
  if (Math.abs(av) > 0.2) {
    const r = 16;
    const sweep = Math.max(-Math.PI * 0.75, Math.min(Math.PI * 0.75, av * 0.08));
    context.save();
    context.strokeStyle = "#a78bfa";
    context.lineWidth = 1.5 * hair(zoom);
    context.setLineDash([]);
    context.beginPath();
    context.arc(transform.position.x, transform.position.y, r, -Math.PI / 2, -Math.PI / 2 + sweep, sweep < 0);
    context.stroke();
    context.restore();
  }
  if (body.isKinematic) {
    const style = colliderGizmoStyle({ isTrigger: false, isStatic: false, selected: false, kinematic: true });
    drawBadge(
      context,
      transform.position.x + 8 / Math.max(0.0001, zoom),
      transform.position.y - 8 / Math.max(0.0001, zoom),
      "K",
      style,
      zoom,
    );
  }
}

export function drawGizmoArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  zoom = 1,
): void {
  const headlen = 8 / Math.max(0.0001, zoom);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2 * hair(zoom);
  context.setLineDash([]);
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
  context.restore();
}

export function drawEntityColliderGizmos(
  context: CanvasRenderingContext2D,
  entity: GameKitEntity,
  transform: TransformComponent,
  options: ColliderGizmoOptions,
): void {
  const aabb = findComponent<AabbColliderComponent>(entity, "AabbCollider");
  if (aabb) drawAabbColliderGizmo(context, transform, aabb, options);

  const circle = findComponent<CircleColliderComponent>(entity, "CircleCollider");
  if (circle) drawCircleColliderGizmo(context, transform, circle, options);

  const polygon = findComponent<PolygonColliderComponent>(entity, "PolygonCollider");
  if (polygon) drawPolygonColliderGizmo(context, transform, polygon, options);

  const rb = findComponent<RigidBodyComponent>(entity, "RigidBody");
  if (rb) drawRigidBodyGizmo(context, transform, rb, options.zoom ?? 1);
}
