import type {
  AabbColliderComponent,
  CameraFollowComponent,
  CircleColliderComponent,
  GameKitAsset,
  GameKitComponent,
  GameKitEntity,
  PlayerControllerComponent,
  RigidBodyComponent,
  SpriteComponent,
  TransformComponent
} from "@gamekit/schema";
import {
  Box,
  Circle,
  ImagePlus,
  Trash2,
  Plus,
  Minus,
  Gamepad2,
  Video,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  Focus
} from "lucide-react";
import { useState } from "react";
import { findComponent } from "../lib/components.js";
import { getApiUrl } from "../lib/api.js";

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

function NumberField({ label, value, onChange }: NumberFieldProps) {
  return (
    <div className="inspector-num-field">
      <span className="field-badge">{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

type SectionHeaderProps = {
  icon: React.ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  removable?: boolean;
  onRemove?: () => void;
  accentClass: string;
};

function SectionHeader({
  icon,
  label,
  isOpen,
  onToggle,
  removable,
  onRemove,
  accentClass
}: SectionHeaderProps) {
  return (
    <div className={`inspector-section-title-row ${accentClass}`}>
      <button type="button" className="accordion-toggle" onClick={onToggle}>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {icon}
        <span className="section-label-text">{label}</span>
      </button>
      <span className="inspector-section-actions">
        {removable && onRemove && (
          <button
            type="button"
            className="icon-button danger"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title={`Remove ${label}`}
          >
            <Minus size={11} />
          </button>
        )}
      </span>
    </div>
  );
}

type InspectorProps = {
  entity?: GameKitEntity;
  assets: GameKitAsset[];
  entityIds: string[];
  multiCount: number;
  onChange: (mutator: (entity: GameKitEntity) => void) => void;
  onDelete?: () => void;
};

export function Inspector({
  entity,
  assets,
  entityIds,
  multiCount,
  onChange,
  onDelete
}: InspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Transform: false,
    Sprite: false,
    Collider: false,
    CircleCollider: true,
    Player: false,
    RigidBody: true,
    Camera: false
  });

  const [selectedCompToAdd, setSelectedCompToAdd] = useState("");

  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;
  const circleCollider = entity ? findComponent<CircleColliderComponent>(entity, "CircleCollider") : undefined;
  const player = entity ? findComponent<PlayerControllerComponent>(entity, "PlayerController") : undefined;
  const rigidBody = entity ? findComponent<RigidBodyComponent>(entity, "RigidBody") : undefined;
  const camera = entity ? findComponent<CameraFollowComponent>(entity, "CameraFollow") : undefined;

  function toggleCollapse(comp: string) {
    setCollapsed((prev) => ({ ...prev, [comp]: !prev[comp] }));
  }

  function handleAddComponent(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;

    onChange((draft) => {
      if (val === "Sprite") {
        const assetId = assets[0]?.id ?? "";
        draft.components.push({
          type: "Sprite",
          assetId,
          width: 64,
          height: 64,
          anchor: { x: 0.5, y: 0.5 }
        });
      } else       if (val === "AabbCollider") {
        draft.components.push({
          type: "AabbCollider",
          offset: { x: -32, y: -32 },
          size: { x: 64, y: 64 },
          isStatic: false
        });
      } else if (val === "CircleCollider") {
        draft.components.push({
          type: "CircleCollider",
          offset: { x: 0, y: 0 },
          radius: 32,
          isStatic: false,
          isTrigger: false
        });
      } else if (val === "PlayerController") {
        draft.components.push({
          type: "PlayerController",
          speed: 300,
          jumpVelocity: 600,
          gravity: 1800
        });
      } else if (val === "RigidBody") {
        draft.components.push({
          type: "RigidBody",
          velocity: { x: 0, y: 0 },
          angularVelocity: 0,
          mass: 1,
          drag: 0,
          isKinematic: false,
          gravityScale: 1,
          useGravity: true
        });
      } else if (val === "CameraFollow") {
        draft.components.push({
          type: "CameraFollow",
          targetId: draft.id,
          smoothing: 0.18
        });
      }
    });

    setSelectedCompToAdd("");
    setCollapsed((prev) => {
      const keyMap: Record<string, string> = {
        AabbCollider: "Collider",
        CircleCollider: "CircleCollider",
        PlayerController: "Player",
        RigidBody: "RigidBody",
        CameraFollow: "Camera"
      };
      return { ...prev, [keyMap[val] ?? val]: false };
    });
  }

  // Determine what components can still be added
  const missingComponents = [];
  if (entity) {
    if (!sprite) missingComponents.push({ val: "Sprite", label: "Sprite Renderer" });
    if (!collider) missingComponents.push({ val: "AabbCollider", label: "Box Collider 2D" });
    if (!circleCollider) missingComponents.push({ val: "CircleCollider", label: "Circle Collider 2D" });
    if (!player) missingComponents.push({ val: "PlayerController", label: "Player Controller" });
    if (!rigidBody) missingComponents.push({ val: "RigidBody", label: "RigidBody 2D" });
    if (!camera) missingComponents.push({ val: "CameraFollow", label: "Camera Follow" });
  }

  return (
    <aside className="panel inspector">
      {entity && transform ? (
        <>
          {/* Inspector Header: Entity name & actions */}
          <div className="inspector-section-header">
            <div className="entity-main-details">
              <input
                type="text"
                className="entity-rename-input"
                value={entity.name}
                onChange={(e) => onChange((draft) => {
                  draft.name = e.target.value;
                })}
                placeholder="Entity Name"
                title="Double click to rename entity"
              />
              <span className="entity-uuid-badge">{entity.id.slice(0, 8)}</span>
            </div>
            {onDelete && (
              <button type="button" className="icon-button danger btn-delete-entity" onClick={onDelete} title="Delete entity">
                <Trash2 size={13} />
              </button>
            )}
          </div>

          <div className="inspector-scroll-area">
            {/* Transform — Always Present */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Circle size={12} />}
                label="Transform"
                isOpen={!collapsed.Transform}
                onToggle={() => toggleCollapse("Transform")}
                accentClass="accent-transform"
              />
              {!collapsed.Transform && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="X"
                        value={transform.position.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
                        })}
                      />
                      <NumberField
                        label="Y"
                        value={transform.position.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Scale X"
                        value={transform.scale.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<TransformComponent>(draft, "Transform")!.scale.x = value;
                        })}
                      />
                      <NumberField
                        label="Scale Y"
                        value={transform.scale.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<TransformComponent>(draft, "Transform")!.scale.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row single-field">
                      <NumberField
                        label="Rotation"
                        value={transform.rotation}
                        onChange={(value) => onChange((draft) => {
                          findComponent<TransformComponent>(draft, "Transform")!.rotation = value;
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sprite Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<ImagePlus size={12} />}
                label="Sprite Renderer"
                isOpen={!collapsed.Sprite}
                onToggle={() => toggleCollapse("Sprite")}
                removable={!!sprite}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "Sprite");
                })}
                accentClass="accent-sprite"
              />
              {!collapsed.Sprite && sprite && (
                <div className="inspector-card-body">
                  {/* Dynamic Visual Preview! */}
                  <div className="sprite-preview-inline">
                    {assets.find(a => a.id === sprite.assetId) ? (
                      <div className="sprite-preview-img-box">
                        <img src={getApiUrl(`/gamekit/assets/${assets.find(a => a.id === sprite.assetId)?.file}`)} alt="" />
                      </div>
                    ) : (
                      <div className="sprite-preview-img-box empty">
                        <FolderOpen size={16} />
                      </div>
                    )}
                    <div className="sprite-asset-select-area">
                      <label className="inspector-select-label">Asset Ref</label>
                      <select
                        value={sprite.assetId}
                        onChange={(event) => onChange((draft) => {
                          findComponent<SpriteComponent>(draft, "Sprite")!.assetId = event.target.value;
                        })}
                      >
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>{asset.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="inspector-field-grid" style={{ marginTop: 10 }}>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Width"
                        value={sprite.width}
                        onChange={(value) => onChange((draft) => {
                          findComponent<SpriteComponent>(draft, "Sprite")!.width = value;
                        })}
                      />
                      <NumberField
                        label="Height"
                        value={sprite.height}
                        onChange={(value) => onChange((draft) => {
                          findComponent<SpriteComponent>(draft, "Sprite")!.height = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Anchor X"
                        value={sprite.anchor.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<SpriteComponent>(draft, "Sprite")!.anchor.x = value;
                        })}
                      />
                      <NumberField
                        label="Anchor Y"
                        value={sprite.anchor.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<SpriteComponent>(draft, "Sprite")!.anchor.y = value;
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!sprite && !collapsed.Sprite && (
                <div className="inspector-card-body-empty">
                  <span>Sprite Renderer missing on this entity</span>
                </div>
              )}
            </div>

            {/* Collider Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Box size={12} />}
                label="Box Collider 2D"
                isOpen={!collapsed.Collider}
                onToggle={() => toggleCollapse("Collider")}
                removable={!!collider}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "AabbCollider");
                })}
                accentClass="accent-collider"
              />
              {!collapsed.Collider && collider && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Width"
                        value={collider.size.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.x = value;
                        })}
                      />
                      <NumberField
                        label="Height"
                        value={collider.size.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Offset X"
                        value={collider.offset.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.x = value;
                        })}
                      />
                      <NumberField
                        label="Offset Y"
                        value={collider.offset.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.offset.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Layer"
                        value={collider.layer ?? 1}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.layer = value;
                        })}
                      />
                      <NumberField
                        label="Mask"
                        value={collider.mask ?? 1}
                        onChange={(value) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.mask = value;
                        })}
                      />
                    </div>
                    <div className="field-checkbox-row">
                      <input
                        id="collider-static-check"
                        type="checkbox"
                        checked={collider.isStatic}
                        onChange={(event) => onChange((draft) => {
                          findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isStatic = event.target.checked;
                        })}
                      />
                      <label htmlFor="collider-static-check">Is Static (Rigid obstacle)</label>
                    </div>
                  </div>
                </div>
              )}
              {!collider && !collapsed.Collider && (
                <div className="inspector-card-body-empty">
                  <span>No Box Collider attached</span>
                </div>
              )}
            </div>

            {/* Circle Collider Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Circle size={12} />}
                label="Circle Collider 2D"
                isOpen={!collapsed.CircleCollider}
                onToggle={() => toggleCollapse("CircleCollider")}
                removable={!!circleCollider}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "CircleCollider");
                })}
                accentClass="accent-collider"
              />
              {!collapsed.CircleCollider && circleCollider && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="field-grid-row single-field">
                      <NumberField
                        label="Radius"
                        value={circleCollider.radius}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.radius = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Offset X"
                        value={circleCollider.offset.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.x = value;
                        })}
                      />
                      <NumberField
                        label="Offset Y"
                        value={circleCollider.offset.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.offset.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Layer"
                        value={circleCollider.layer ?? 1}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.layer = value;
                        })}
                      />
                      <NumberField
                        label="Mask"
                        value={circleCollider.mask ?? 1}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.mask = value;
                        })}
                      />
                    </div>
                    <div className="field-checkbox-row">
                      <input
                        id="circle-collider-static-check"
                        type="checkbox"
                        checked={circleCollider.isStatic}
                        onChange={(event) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isStatic = event.target.checked;
                        })}
                      />
                      <label htmlFor="circle-collider-static-check">Is Static (Rigid obstacle)</label>
                    </div>
                    <div className="field-checkbox-row">
                      <input
                        id="circle-collider-trigger-check"
                        type="checkbox"
                        checked={circleCollider.isTrigger}
                        onChange={(event) => onChange((draft) => {
                          findComponent<CircleColliderComponent>(draft, "CircleCollider")!.isTrigger = event.target.checked;
                        })}
                      />
                      <label htmlFor="circle-collider-trigger-check">Is Trigger (Overlap only)</label>
                    </div>
                  </div>
                </div>
              )}
              {!circleCollider && !collapsed.CircleCollider && (
                <div className="inspector-card-body-empty">
                  <span>No Circle Collider attached</span>
                </div>
              )}
            </div>

            {/* RigidBody Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Box size={12} />}
                label="RigidBody 2D"
                isOpen={!collapsed.RigidBody}
                onToggle={() => toggleCollapse("RigidBody")}
                removable={!!rigidBody}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "RigidBody");
                })}
                accentClass="accent-player"
              />
              {!collapsed.RigidBody && rigidBody && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Vel X"
                        value={rigidBody.velocity.x}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.x = value;
                        })}
                      />
                      <NumberField
                        label="Vel Y"
                        value={rigidBody.velocity.y}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.velocity.y = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Mass"
                        value={rigidBody.mass}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.mass = value;
                        })}
                      />
                      <NumberField
                        label="Ang Vel"
                        value={rigidBody.angularVelocity}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.angularVelocity = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Drag"
                        value={rigidBody.drag}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.drag = value;
                        })}
                      />
                      <NumberField
                        label="Gravity Scale"
                        value={rigidBody.gravityScale}
                        onChange={(value) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.gravityScale = value;
                        })}
                      />
                    </div>
                    <div className="field-checkbox-row">
                      <input
                        id="rigid-body-kinematic-check"
                        type="checkbox"
                        checked={rigidBody.isKinematic}
                        onChange={(event) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.isKinematic = event.target.checked;
                        })}
                      />
                      <label htmlFor="rigid-body-kinematic-check">Is Kinematic</label>
                    </div>
                    <div className="field-checkbox-row">
                      <input
                        id="rigid-body-gravity-check"
                        type="checkbox"
                        checked={rigidBody.useGravity}
                        onChange={(event) => onChange((draft) => {
                          findComponent<RigidBodyComponent>(draft, "RigidBody")!.useGravity = event.target.checked;
                        })}
                      />
                      <label htmlFor="rigid-body-gravity-check">Use Gravity</label>
                    </div>
                  </div>
                </div>
              )}
              {!rigidBody && !collapsed.RigidBody && (
                <div className="inspector-card-body-empty">
                  <span>No RigidBody attached</span>
                </div>
              )}
            </div>

            {/* Player Controller Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Gamepad2 size={12} />}
                label="Player Controller"
                isOpen={!collapsed.Player}
                onToggle={() => toggleCollapse("Player")}
                removable={!!player}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "PlayerController");
                })}
                accentClass="accent-player"
              />
              {!collapsed.Player && player && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="field-grid-row dual-fields">
                      <NumberField
                        label="Speed"
                        value={player.speed}
                        onChange={(value) => onChange((draft) => {
                          findComponent<PlayerControllerComponent>(draft, "PlayerController")!.speed = value;
                        })}
                      />
                      <NumberField
                        label="Jump Vel"
                        value={player.jumpVelocity}
                        onChange={(value) => onChange((draft) => {
                          findComponent<PlayerControllerComponent>(draft, "PlayerController")!.jumpVelocity = value;
                        })}
                      />
                    </div>
                    <div className="field-grid-row single-field">
                      <NumberField
                        label="Gravity"
                        value={player.gravity}
                        onChange={(value) => onChange((draft) => {
                          findComponent<PlayerControllerComponent>(draft, "PlayerController")!.gravity = value;
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!player && !collapsed.Player && (
                <div className="inspector-card-body-empty">
                  <span>Standard physics controller unassigned</span>
                </div>
              )}
            </div>

            {/* Camera Follow Component */}
            <div className="inspector-section-card">
              <SectionHeader
                icon={<Video size={12} />}
                label="Camera Follow"
                isOpen={!collapsed.Camera}
                onToggle={() => toggleCollapse("Camera")}
                removable={!!camera}
                onRemove={() => onChange((draft) => {
                  draft.components = draft.components.filter((c) => c.type !== "CameraFollow");
                })}
                accentClass="accent-camera"
              />
              {!collapsed.Camera && camera && (
                <div className="inspector-card-body">
                  <div className="inspector-field-grid">
                    <div className="inspector-select-wrapper">
                      <label className="inspector-select-label">Follow Focus Target</label>
                      <select
                        value={camera.targetId}
                        onChange={(event) => onChange((draft) => {
                          findComponent<CameraFollowComponent>(draft, "CameraFollow")!.targetId = event.target.value;
                        })}
                      >
                        <option value="">— Viewport Camera Centered —</option>
                        {entityIds.filter((id) => id !== entity?.id).map((id) => (
                          <option key={id} value={id}>{id}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-grid-row single-field" style={{ marginTop: 10 }}>
                      <NumberField
                        label="Smoothing"
                        value={camera.smoothing}
                        onChange={(value) => onChange((draft) => {
                          findComponent<CameraFollowComponent>(draft, "CameraFollow")!.smoothing = value;
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
              {!camera && !collapsed.Camera && (
                <div className="inspector-card-body-empty">
                  <span>Camera targeting missing</span>
                </div>
              )}
            </div>
          </div>

          {/* Component Adder Section */}
          {missingComponents.length > 0 && (
            <div className="inspector-add-component-wrapper">
              <div className="add-component-bar">
                <Plus size={13} className="add-icon" />
                <select
                  value={selectedCompToAdd}
                  onChange={handleAddComponent}
                  title="Add new script or body component to entity"
                >
                  <option value="">Add Component...</option>
                  {missingComponents.map((comp) => (
                    <option key={comp.val} value={comp.val}>{comp.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      ) : multiCount > 1 ? (
        <div className="multi-select-count">
          <Box size={32} />
          <p>{multiCount} nodes selected</p>
          {onDelete && (
            <button type="button" className="button danger" onClick={onDelete}>Delete Selection</button>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <Focus size={32} style={{ opacity: 0.1 }} />
          <p>No entity selected</p>
          <span className="tip">Click on an entity in the Viewport or Hierarchy list to inspect properties.</span>
        </div>
      )}
    </aside>
  );
}