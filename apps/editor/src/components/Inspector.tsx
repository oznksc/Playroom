import type {
  AabbColliderComponent,
  CameraFollowComponent,
  GameKitAsset,
  GameKitComponent,
  GameKitEntity,
  PlayerControllerComponent,
  SpriteComponent,
  TransformComponent
} from "@gamekit/schema";
import { Box, Circle, ImagePlus, Trash2, Plus, Minus, Gamepad2, Video } from "lucide-react";
import { findComponent } from "../lib/components.js";

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

type SectionHeaderProps = {
  icon: React.ReactNode;
  label: string;
  removable?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
};

function SectionHeader({ icon, label, removable, onAdd, onRemove }: SectionHeaderProps) {
  return (
    <div className="inspector-section-title-row">
      <span className="inspector-section-title">
        {icon}
        {label}
      </span>
      <span className="inspector-section-actions">
        {onAdd && (
          <button type="button" className="icon-button" onClick={onAdd} title={`Add ${label}`}>
            <Plus size={12} />
          </button>
        )}
        {removable && onRemove && (
          <button type="button" className="icon-button danger" onClick={onRemove} title={`Remove ${label}`}>
            <Minus size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

type InspectorProps = {
  entity?: GameKitEntity;
  assets: GameKitAsset[];
  onChange: (mutator: (entity: GameKitEntity) => void) => void;
  onDelete?: () => void;
};

function hasComponent(entity: GameKitEntity, type: GameKitComponent["type"]): boolean {
  return entity.components.some((c) => c.type === type);
}

export function Inspector({
  entity,
  assets,
  onChange,
  onDelete
}: InspectorProps) {
  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;
  const player = entity ? findComponent<PlayerControllerComponent>(entity, "PlayerController") : undefined;
  const camera = entity ? findComponent<CameraFollowComponent>(entity, "CameraFollow") : undefined;

  return (
    <aside className="panel inspector">
      {entity && transform ? (
        <>
          <div className="inspector-section-header">
            <h2>{entity.name}</h2>
            {onDelete && (
              <button type="button" className="icon-button danger" onClick={onDelete} title="Delete entity">
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Transform — always present, not removable */}
          <div className="inspector-section">
            <SectionHeader icon={<Circle size={12} />} label="Transform" />
            <div className="fieldRow">
              <NumberField label="X" value={transform.position.x} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
              })} />
              <NumberField label="Y" value={transform.position.y} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
              })} />
            </div>
            <div className="fieldRow">
              <NumberField label="Rot" value={transform.rotation} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.rotation = value;
              })} />
              <label />
            </div>
            <div className="fieldRow">
              <NumberField label="Scale X" value={transform.scale.x} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.scale.x = value;
              })} />
              <NumberField label="Scale Y" value={transform.scale.y} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.scale.y = value;
              })} />
            </div>
          </div>

          {/* Sprite */}
          <div className="inspector-section">
            <SectionHeader
              icon={<ImagePlus size={12} />}
              label="Sprite"
              removable={!!sprite}
              onAdd={!sprite ? () => onChange((draft) => {
                const assetId = assets[0]?.id ?? "";
                draft.components.push({
                  type: "Sprite",
                  assetId,
                  width: 64,
                  height: 64,
                  anchor: { x: 0.5, y: 0.5 }
                });
              }) : undefined}
              onRemove={sprite ? () => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "Sprite");
              }) : undefined}
            />
            {sprite ? (
              <>
                <label>
                  Asset
                  <select value={sprite.assetId} onChange={(event) => onChange((draft) => {
                    findComponent<SpriteComponent>(draft, "Sprite")!.assetId = event.target.value;
                  })}>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.id}</option>)}
                  </select>
                </label>
                <div className="fieldRow">
                  <NumberField label="W" value={sprite.width} onChange={(value) => onChange((draft) => {
                    findComponent<SpriteComponent>(draft, "Sprite")!.width = value;
                  })} />
                  <NumberField label="H" value={sprite.height} onChange={(value) => onChange((draft) => {
                    findComponent<SpriteComponent>(draft, "Sprite")!.height = value;
                  })} />
                </div>
              </>
            ) : null}
          </div>

          {/* Collider */}
          <div className="inspector-section">
            <SectionHeader
              icon={<Box size={12} />}
              label="Collider"
              removable={!!collider}
              onAdd={!collider ? () => onChange((draft) => {
                draft.components.push({
                  type: "AabbCollider",
                  offset: { x: -32, y: -32 },
                  size: { x: 64, y: 64 },
                  isStatic: false
                });
              }) : undefined}
              onRemove={collider ? () => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "AabbCollider");
              }) : undefined}
            />
            {collider ? (
              <>
                <div className="fieldRow">
                  <NumberField label="CW" value={collider.size.x} onChange={(value) => onChange((draft) => {
                    findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.x = value;
                  })} />
                  <NumberField label="CH" value={collider.size.y} onChange={(value) => onChange((draft) => {
                    findComponent<AabbColliderComponent>(draft, "AabbCollider")!.size.y = value;
                  })} />
                </div>
                <label className="check">
                  <input type="checkbox" checked={collider.isStatic} onChange={(event) => onChange((draft) => {
                    findComponent<AabbColliderComponent>(draft, "AabbCollider")!.isStatic = event.target.checked;
                  })} />
                  Static collider
                </label>
              </>
            ) : null}
          </div>

          {/* PlayerController */}
          <div className="inspector-section">
            <SectionHeader
              icon={<Gamepad2 size={12} />}
              label="Player"
              removable={!!player}
              onAdd={!player ? () => onChange((draft) => {
                draft.components.push({
                  type: "PlayerController",
                  speed: 300,
                  jumpVelocity: 600,
                  gravity: 1800
                });
              }) : undefined}
              onRemove={player ? () => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "PlayerController");
              }) : undefined}
            />
            {player ? (
              <>
                <div className="fieldRow">
                  <NumberField label="Speed" value={player.speed} onChange={(value) => onChange((draft) => {
                    findComponent<PlayerControllerComponent>(draft, "PlayerController")!.speed = value;
                  })} />
                  <NumberField label="Jump" value={player.jumpVelocity} onChange={(value) => onChange((draft) => {
                    findComponent<PlayerControllerComponent>(draft, "PlayerController")!.jumpVelocity = value;
                  })} />
                </div>
                <NumberField label="Gravity" value={player.gravity} onChange={(value) => onChange((draft) => {
                  findComponent<PlayerControllerComponent>(draft, "PlayerController")!.gravity = value;
                })} />
              </>
            ) : null}
          </div>

          {/* CameraFollow */}
          <div className="inspector-section">
            <SectionHeader
              icon={<Video size={12} />}
              label="Camera"
              removable={!!camera}
              onAdd={!camera ? () => onChange((draft) => {
                draft.components.push({
                  type: "CameraFollow",
                  targetId: entity.id,
                  smoothing: 0.18
                });
              }) : undefined}
              onRemove={camera ? () => onChange((draft) => {
                draft.components = draft.components.filter((c) => c.type !== "CameraFollow");
              }) : undefined}
            />
            {camera ? (
              <>
                <label>
                  Target ID
                  <input value={camera.targetId} onChange={(event) => onChange((draft) => {
                    findComponent<CameraFollowComponent>(draft, "CameraFollow")!.targetId = event.target.value;
                  })} />
                </label>
                <NumberField label="Smoothing" value={camera.smoothing} onChange={(value) => onChange((draft) => {
                  findComponent<CameraFollowComponent>(draft, "CameraFollow")!.smoothing = value;
                })} />
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <Box size={32} />
          <p>No entity selected</p>
        </div>
      )}
    </aside>
  );
}