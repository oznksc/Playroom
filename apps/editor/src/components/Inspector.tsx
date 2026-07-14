import type {
  AabbColliderComponent,
  CameraFollowComponent,
  CircleColliderComponent,
  PolygonColliderComponent,
  GameKitAsset,
  GameKitEntity,
  PlayerControllerComponent,
  RigidBodyComponent,
  SpriteComponent,
  TransformComponent,
  TilemapComponent,
  ParticleSystemComponent,
  TextComponent,
  AudioSourceComponent,
  AudioListenerComponent,
  TweenComponent,
  FollowPathComponent,
  StateMachineComponent,
  ScriptComponent,
  Light2DComponent,
  NineSliceComponent,
} from "@gamekit/schema";
import {
  Box,
  Plus,
  Focus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { findComponent } from "../lib/components.js";
import {
  Select,
  Button,
  EmptyState,
  IconButton,
} from "@/ui";

// Section components
import { TransformSection } from "./inspector/TransformSection.js";
import { SpriteSection } from "./inspector/SpriteSection.js";
import { AabbColliderSection } from "./inspector/AabbColliderSection.js";
import { CircleColliderSection } from "./inspector/CircleColliderSection.js";
import { PolygonColliderSection } from "./inspector/PolygonColliderSection.js";
import { RigidBodySection } from "./inspector/RigidBodySection.js";
import { PlayerControllerSection } from "./inspector/PlayerControllerSection.js";
import { CameraFollowSection } from "./inspector/CameraFollowSection.js";
import { TilemapSection } from "./inspector/TilemapSection.js";
import { TextSection } from "./inspector/TextSection.js";
import { AudioSourceSection } from "./inspector/AudioSourceSection.js";
import { AudioListenerSection } from "./inspector/AudioListenerSection.js";
import { Light2DSection } from "./inspector/Light2DSection.js";
import { NineSliceSection } from "./inspector/NineSliceSection.js";
import { TweenSection } from "./inspector/TweenSection.js";
import { FollowPathSection } from "./inspector/FollowPathSection.js";
import { StateMachineSection } from "./inspector/StateMachineSection.js";
import { ScriptSection } from "./inspector/ScriptSection.js";
import { ParticleSystemSection } from "./inspector/ParticleSystemSection.js";

const MVP_SHOW_ADVANCED_PHYSICS = true;

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
  onDelete,
}: InspectorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Transform: false,
    Sprite: false,
    Collider: false,
    CircleCollider: true,
    PolygonCollider: true,
    Player: false,
    RigidBody: true,
    Camera: false,
    Tilemap: false,
    Text: false,
    AudioSource: true,
    AudioListener: true,
    Tween: true,
    FollowPath: true,
    StateMachine: true,
    Script: true,
    ParticleSystem: true,
    Light2D: true,
    NineSlice: true,
  });

  const [selectedCompToAdd, setSelectedCompToAdd] = useState("");

  const transform = entity ? findComponent<TransformComponent>(entity, "Transform") : undefined;
  const sprite = entity ? findComponent<SpriteComponent>(entity, "Sprite") : undefined;
  const collider = entity ? findComponent<AabbColliderComponent>(entity, "AabbCollider") : undefined;
  const circleCollider = entity ? findComponent<CircleColliderComponent>(entity, "CircleCollider") : undefined;
  const polygonCollider = entity ? findComponent<PolygonColliderComponent>(entity, "PolygonCollider") : undefined;
  const player = entity ? findComponent<PlayerControllerComponent>(entity, "PlayerController") : undefined;
  const rigidBody = entity ? findComponent<RigidBodyComponent>(entity, "RigidBody") : undefined;
  const camera = entity ? findComponent<CameraFollowComponent>(entity, "CameraFollow") : undefined;
  const tilemap = entity ? findComponent<TilemapComponent>(entity, "Tilemap") : undefined;
  const textComp = entity ? findComponent<TextComponent>(entity, "Text") : undefined;
  const audioSource = entity ? findComponent<AudioSourceComponent>(entity, "AudioSource") : undefined;
  const audioListener = entity ? findComponent<AudioListenerComponent>(entity, "AudioListener") : undefined;
  const tween = entity ? findComponent<TweenComponent>(entity, "Tween") : undefined;
  const followPath = entity ? findComponent<FollowPathComponent>(entity, "FollowPath") : undefined;
  const stateMachine = entity ? findComponent<StateMachineComponent>(entity, "StateMachine") : undefined;
  const script = entity ? findComponent<ScriptComponent>(entity, "Script") : undefined;
  const particleSystem = entity ? findComponent<ParticleSystemComponent>(entity, "ParticleSystem") : undefined;
  const light2D = entity ? findComponent<Light2DComponent>(entity, "Light2D") : undefined;
  const nineSlice = entity ? findComponent<NineSliceComponent>(entity, "NineSlice") : undefined;

  function toggleCollapse(comp: string) {
    setCollapsed((prev) => ({ ...prev, [comp]: !prev[comp] }));
  }

  function handleAddComponent(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;

    onChange((draft) => {
      if (val === "Sprite") {
        const assetId = assets[0]?.id ?? "";
        draft.components.push({ type: "Sprite", assetId, width: 64, height: 64, anchor: { x: 0.5, y: 0.5 } });
      } else if (val === "AabbCollider") {
        draft.components.push({ type: "AabbCollider", offset: { x: -32, y: -32 }, size: { x: 64, y: 64 }, isStatic: false });
      } else if (val === "CircleCollider") {
        draft.components.push({ type: "CircleCollider", offset: { x: 0, y: 0 }, radius: 24, isStatic: false, isTrigger: false, layer: 1, mask: 1 });
      } else if (val === "PolygonCollider") {
        draft.components.push({ type: "PolygonCollider", offset: { x: 0, y: 0 }, points: [{ x: -16, y: -16 }, { x: 16, y: -16 }, { x: 16, y: 16 }, { x: -16, y: 16 }], isStatic: false, layer: 1, mask: 1 });
      } else if (val === "PlayerController") {
        draft.components.push({ type: "PlayerController", speed: 300, jumpVelocity: 600, gravity: 1800 });
      } else if (val === "RigidBody") {
        draft.components.push({ type: "RigidBody", velocity: { x: 0, y: 0 }, angularVelocity: 0, mass: 1, drag: 0, isKinematic: false, gravityScale: 1, useGravity: true });
      } else if (val === "CameraFollow") {
        draft.components.push({ type: "CameraFollow", targetId: draft.id, smoothing: 0.18 });
      } else if (val === "Tilemap") {
        const tilesetId = assets.find((a) => a.kind === "image")?.id ?? "";
        draft.components.push({ type: "Tilemap", tilesetId, tileWidth: 32, tileHeight: 32, columns: 8, gridWidth: 10, gridHeight: 10, tiles: new Array(100).fill(0) });
      } else if (val === "Text") {
        const fontAssetId = assets.find((a) => a.kind === "font")?.id ?? "default";
        draft.components.push({ type: "Text", text: "Hello World", fontAssetId, size: 24, color: "#ffffff", align: "left" });
      } else if (val === "AudioSource") {
        const assetId = assets.find((a) => a.kind === "audio")?.id ?? "";
        draft.components.push({ type: "AudioSource", assetId, volume: 1.0, loop: false, playOnStart: true });
      } else if (val === "AudioListener") {
        draft.components.push({ type: "AudioListener", enabled: true });
      } else if (val === "Tween") {
        draft.components.push({ type: "Tween", property: "position.x", startValue: 0, endValue: 100, duration: 1.0, easing: "linear", loop: true, pingPong: true });
      } else if (val === "FollowPath") {
        draft.components.push({ type: "FollowPath", points: [], speed: 100, loop: true });
      } else if (val === "StateMachine") {
        draft.components.push({ type: "StateMachine", initialState: "idle", states: [{ name: "idle" }] });
      } else if (val === "Script") {
        draft.components.push({ type: "Script", handlers: [] });
      } else if (val === "ParticleSystem") {
        draft.components.push({ type: "ParticleSystem", maxParticles: 40, emissionRate: 18, lifetime: 0.9, speed: 70, gravityScale: 0.35, colorStart: "#00f0ff", colorEnd: "#8b5cf6", sizeStart: 5, sizeEnd: 0, shape: "point", width: 0, height: 0, active: true });
      } else if (val === "Light2D") {
        draft.components.push({ type: "Light2D", kind: "point", range: 200, intensity: 1.0, color: "#ffffff" });
      } else if (val === "NineSlice") {
        draft.components.push({ type: "NineSlice", assetId: assets[0]?.id ?? "", width: 100, height: 100, leftWidth: 10, rightWidth: 10, topHeight: 10, bottomHeight: 10 });
      }
    });

    setSelectedCompToAdd("");
    setCollapsed((prev) => {
      const keyMap: Record<string, string> = {
        AabbCollider: "Collider",
        CircleCollider: "CircleCollider",
        PolygonCollider: "PolygonCollider",
        PlayerController: "Player",
        RigidBody: "RigidBody",
        CameraFollow: "Camera",
        ParticleSystem: "ParticleSystem",
        Light2D: "Light2D",
        NineSlice: "NineSlice",
      };
      return { ...prev, [keyMap[val] ?? val]: false };
    });
  }

  // Determine what components can still be added
  const missingComponents = [];
  if (entity) {
    if (!sprite) missingComponents.push({ val: "Sprite", label: "Sprite Renderer" });
    if (!tilemap) missingComponents.push({ val: "Tilemap", label: "Tilemap Renderer" });
    if (!textComp) missingComponents.push({ val: "Text", label: "Text Label" });
    if (!collider) missingComponents.push({ val: "AabbCollider", label: "Box Collider 2D" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !circleCollider) missingComponents.push({ val: "CircleCollider", label: "Circle Collider 2D" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !polygonCollider) missingComponents.push({ val: "PolygonCollider", label: "Polygon Collider 2D" });
    if (!player) missingComponents.push({ val: "PlayerController", label: "Player Controller" });
    if (MVP_SHOW_ADVANCED_PHYSICS && !rigidBody) missingComponents.push({ val: "RigidBody", label: "RigidBody 2D" });
    if (!camera) missingComponents.push({ val: "CameraFollow", label: "Camera Follow" });
    if (!audioSource) missingComponents.push({ val: "AudioSource", label: "Audio Source" });
    if (!audioListener) missingComponents.push({ val: "AudioListener", label: "Audio Listener" });
    if (!tween) missingComponents.push({ val: "Tween", label: "Tween Animation" });
    if (!followPath) missingComponents.push({ val: "FollowPath", label: "Path Follower" });
    if (!stateMachine) missingComponents.push({ val: "StateMachine", label: "FSM State Machine" });
    if (!script) missingComponents.push({ val: "Script", label: "Behavior Script" });
    if (!particleSystem) missingComponents.push({ val: "ParticleSystem", label: "Particle System" });
    if (!light2D) missingComponents.push({ val: "Light2D", label: "Light 2D" });
    if (!nineSlice) missingComponents.push({ val: "NineSlice", label: "NineSlice Sprite" });
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent">
      {entity && transform ? (
        <>
          {/* Inspector Header: Entity name & actions */}
          <div className="flex h-[42px] shrink-0 items-center justify-between gap-2 px-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <input
                type="text"
                className="w-full rounded-sm border border-transparent bg-transparent px-1 py-0.5 text-[13px] font-bold text-text-primary outline-none hover:border-border-strong hover:bg-bg-elevated focus:border-accent focus:bg-bg-elevated"
                value={entity.name}
                onChange={(e) => onChange((draft) => { draft.name = e.target.value; })}
                placeholder="Entity Name"
                title="Double click to rename entity"
              />
              <span className="font-mono text-[9px] tracking-wide text-text-muted">{entity.id.slice(0, 8)}</span>
            </div>
            {onDelete && (
              <IconButton size="sm" variant="danger" onClick={onDelete} title="Delete entity">
                <Trash2 size={13} />
              </IconButton>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
            {/* Transform — Always Present */}
            <TransformSection
              transform={transform}
              onChange={onChange}
              open={!collapsed.Transform}
              onToggle={() => toggleCollapse("Transform")}
            />

            {/* Sprite */}
            <SpriteSection
              sprite={sprite}
              assets={assets}
              onChange={onChange}
              open={!collapsed.Sprite}
              onToggle={() => toggleCollapse("Sprite")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Sprite"); })}
            />

            {/* Box Collider */}
            <AabbColliderSection
              collider={collider}
              onChange={onChange}
              open={!collapsed.Collider}
              onToggle={() => toggleCollapse("Collider")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "AabbCollider"); })}
            />

            {/* Circle Collider */}
            {MVP_SHOW_ADVANCED_PHYSICS && (
              <CircleColliderSection
                circleCollider={circleCollider}
                onChange={onChange}
                open={!collapsed.CircleCollider}
                onToggle={() => toggleCollapse("CircleCollider")}
                onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "CircleCollider"); })}
              />
            )}

            {/* Polygon Collider */}
            {MVP_SHOW_ADVANCED_PHYSICS && (
              <PolygonColliderSection
                polygonCollider={polygonCollider}
                onChange={onChange}
                open={!collapsed.PolygonCollider}
                onToggle={() => toggleCollapse("PolygonCollider")}
                onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "PolygonCollider"); })}
              />
            )}

            {/* RigidBody */}
            {MVP_SHOW_ADVANCED_PHYSICS && (
              <RigidBodySection
                rigidBody={rigidBody}
                onChange={onChange}
                open={!collapsed.RigidBody}
                onToggle={() => toggleCollapse("RigidBody")}
                onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "RigidBody"); })}
              />
            )}

            {/* Player Controller */}
            <PlayerControllerSection
              player={player}
              onChange={onChange}
              open={!collapsed.Player}
              onToggle={() => toggleCollapse("Player")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "PlayerController"); })}
            />

            {/* Camera Follow */}
            <CameraFollowSection
              camera={camera}
              entityIds={entityIds}
              currentEntityId={entity?.id}
              onChange={onChange}
              open={!collapsed.Camera}
              onToggle={() => toggleCollapse("Camera")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "CameraFollow"); })}
            />

            {/* Tilemap */}
            <TilemapSection
              tilemap={tilemap}
              assets={assets}
              onChange={onChange}
              open={!collapsed.Tilemap}
              onToggle={() => toggleCollapse("Tilemap")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Tilemap"); })}
            />

            {/* Text */}
            <TextSection
              textComp={textComp}
              assets={assets}
              onChange={onChange}
              open={!collapsed.Text}
              onToggle={() => toggleCollapse("Text")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Text"); })}
            />

            {/* Audio Source */}
            <AudioSourceSection
              audioSource={audioSource}
              assets={assets}
              onChange={onChange}
              open={!collapsed.AudioSource}
              onToggle={() => toggleCollapse("AudioSource")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "AudioSource"); })}
            />

            {/* Audio Listener */}
            <AudioListenerSection
              audioListener={audioListener}
              onChange={onChange}
              open={!collapsed.AudioListener}
              onToggle={() => toggleCollapse("AudioListener")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "AudioListener"); })}
            />

            {/* Light 2D */}
            <Light2DSection
              light2D={light2D}
              onChange={onChange}
              open={!collapsed.Light2D}
              onToggle={() => toggleCollapse("Light2D")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Light2D"); })}
            />

            {/* NineSlice */}
            <NineSliceSection
              nineSlice={nineSlice}
              assets={assets}
              onChange={onChange}
              open={!collapsed.NineSlice}
              onToggle={() => toggleCollapse("NineSlice")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "NineSlice"); })}
            />

            {/* Tween */}
            <TweenSection
              tween={tween}
              onChange={onChange}
              open={!collapsed.Tween}
              onToggle={() => toggleCollapse("Tween")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Tween"); })}
            />

            {/* FollowPath */}
            <FollowPathSection
              followPath={followPath}
              onChange={onChange}
              open={!collapsed.FollowPath}
              onToggle={() => toggleCollapse("FollowPath")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "FollowPath"); })}
            />

            {/* State Machine */}
            <StateMachineSection
              stateMachine={stateMachine}
              onChange={onChange}
              open={!collapsed.StateMachine}
              onToggle={() => toggleCollapse("StateMachine")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "StateMachine"); })}
            />

            {/* Script */}
            <ScriptSection
              script={script}
              onChange={onChange}
              open={!collapsed.Script}
              onToggle={() => toggleCollapse("Script")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "Script"); })}
            />

            {/* Particle System */}
            <ParticleSystemSection
              particleSystem={particleSystem}
              onChange={onChange}
              open={!collapsed.ParticleSystem}
              onToggle={() => toggleCollapse("ParticleSystem")}
              onRemove={() => onChange((draft) => { draft.components = draft.components.filter((c) => c.type !== "ParticleSystem"); })}
            />
          </div>

          {/* Component Adder Section */}
          {missingComponents.length > 0 && (
            <div className="shrink-0 p-2">
              <div className="flex items-center gap-2">
                <Plus size={13} className="shrink-0 text-accent" />
                <Select
                  value={selectedCompToAdd}
                  onChange={handleAddComponent}
                  title="Add new script or body component to entity"
                  className="min-w-0 flex-1"
                >
                  <option value="">Add Component...</option>
                  {missingComponents.map((comp) => (
                    <option key={comp.val} value={comp.val}>{comp.label}</option>
                  ))}
                </Select>
              </div>
            </div>
          )}
        </>
      ) : multiCount > 1 ? (
        <EmptyState
          icon={<Box size={16} />}
          title={`${multiCount} nodes selected`}
          description="Multi-edit is limited. Delete selection or pick a single entity."
          action={
            onDelete ? (
              <Button size="sm" variant="danger" onClick={onDelete}>
                Delete selection
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          icon={<Focus size={16} />}
          title="No entity selected"
          description="Click an entity in the viewport or hierarchy to inspect properties."
        />
      )}
    </aside>
  );
}
