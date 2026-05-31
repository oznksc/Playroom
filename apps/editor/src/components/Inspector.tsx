import type {
  AabbColliderComponent,
  GameKitAsset,
  GameKitEntity,
  SpriteComponent,
  TransformComponent
} from "@gamekit/schema";
import { Box, Circle, ImagePlus, Trash2 } from "lucide-react";
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

type InspectorProps = {
  entity?: GameKitEntity;
  assets: GameKitAsset[];
  onChange: (mutator: (entity: GameKitEntity) => void) => void;
  onDelete?: () => void;
};

export function Inspector({
  entity,
  assets,
  onChange,
  onDelete
}: InspectorProps) {
  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;

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

          <div className="inspector-section">
            <div className="inspector-section-title">
              <Box size={12} />
              General
            </div>
            <label>
              Name
              <input value={entity.name} onChange={(event) => onChange((draft) => { draft.name = event.target.value; })} />
            </label>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">
              <Circle size={12} />
              Transform
            </div>
            <div className="fieldRow">
              <NumberField label="X" value={transform.position.x} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.position.x = value;
              })} />
              <NumberField label="Y" value={transform.position.y} onChange={(value) => onChange((draft) => {
                findComponent<TransformComponent>(draft, "Transform")!.position.y = value;
              })} />
            </div>
          </div>

          {sprite ? (
            <div className="inspector-section">
              <div className="inspector-section-title">
                <ImagePlus size={12} />
                Sprite
              </div>
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
            </div>
          ) : null}

          {collider ? (
            <div className="inspector-section">
              <div className="inspector-section-title">
                <Box size={12} />
                Collider
              </div>
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
            </div>
          ) : null}
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
