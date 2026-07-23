import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GameKitComponentSchema } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";
import {
  TweenInputSchema,
  FollowPathInputSchema,
  StateMachineInputSchema,
  ScriptInputSchema,
  TextInputSchema,
  AudioSourceInputSchema,
  ParticleSystemInputSchema,
  Light2DInputSchema,
  NineSliceInputSchema
} from "../schemas/component.js";

export function registerBehaviorTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_tween",
    "Add a Tween animation component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      tween: TweenInputSchema.omit({ type: true }).describe("Tween configuration properties"),
    },
    async ({ scenePath, entityId, tween }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "Tween" as const, ...tween };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_path",
    "Add a FollowPath component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      followPath: FollowPathInputSchema.omit({ type: true }).describe("FollowPath configuration properties"),
    },
    async ({ scenePath, entityId, followPath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "FollowPath" as const, ...followPath };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_state_machine",
    "Add a StateMachine component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      stateMachine: StateMachineInputSchema.omit({ type: true }).describe("StateMachine configuration properties"),
    },
    async ({ scenePath, entityId, stateMachine }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "StateMachine" as const, ...stateMachine };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_script",
    "Add a Script component with event handlers to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      script: ScriptInputSchema.omit({ type: true }).describe("Script configuration properties"),
    },
    async ({ scenePath, entityId, script }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "Script" as const, ...script };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_text",
    "Add a Text component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      text: TextInputSchema.omit({ type: true }).describe("Text configuration properties"),
    },
    async ({ scenePath, entityId, text }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "Text" as const, ...text };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_audio_source",
    "Add an AudioSource component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      audioSource: AudioSourceInputSchema.omit({ type: true }).describe("AudioSource configuration properties"),
    },
    async ({ scenePath, entityId, audioSource }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "AudioSource" as const, ...audioSource };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_particle_system",
    "Add a ParticleSystem component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      particleSystem: ParticleSystemInputSchema.omit({ type: true }).describe("ParticleSystem configuration properties"),
    },
    async ({ scenePath, entityId, particleSystem }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "ParticleSystem" as const, ...particleSystem };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_light",
    "Add a Light2D component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      light: Light2DInputSchema.omit({ type: true }).describe("Light2D configuration properties"),
    },
    async ({ scenePath, entityId, light }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "Light2D" as const, ...light };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );

  server.tool(
    "add_nine_slice",
    "Add a NineSlice component to an entity in a scene",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      nineSlice: NineSliceInputSchema.omit({ type: true }).describe("NineSlice configuration properties"),
    },
    async ({ scenePath, entityId, nineSlice }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const component = { type: "NineSlice" as const, ...nineSlice };
      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    }
  );
}
