import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TimelineTrack } from "@gamekit/schema";
import type { FileIO } from "../utils/file-io.js";
import { toolJson } from "../utils/result.js";

const PropertySchema = z.enum(["position.x", "position.y", "rotation", "scale.x", "scale.y", "alpha"]);
const KeyframeSchema = z.object({
  time: z.number().min(0),
  value: z.union([z.number(), z.array(z.number())]),
  easing: z.enum(["linear", "easeIn", "easeOut", "easeInOut"]).optional(),
});

export function registerTimelineTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "get_timeline",
    "Read the scene timeline (duration, loop, tracks, keyframes) — same data as the editor Timeline panel.",
    { scenePath: z.string() },
    async ({ scenePath }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      return toolJson({ scenePath: filename, timeline: scene.timeline });
    },
  );

  server.tool(
    "set_timeline",
    "Set timeline duration / loop / playing flags (editor Timeline header).",
    {
      scenePath: z.string(),
      duration: z.number().min(0).optional(),
      loop: z.boolean().optional(),
      playing: z.boolean().optional(),
    },
    async ({ scenePath, duration, loop, playing }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      if (duration !== undefined) scene.timeline.duration = duration;
      if (loop !== undefined) scene.timeline.loop = loop;
      if (playing !== undefined) scene.timeline.playing = playing;
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, timeline: scene.timeline });
    },
  );

  server.tool(
    "upsert_timeline_track",
    "Add or replace a timeline track for an entity property with keyframes (editor Timeline panel).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      property: PropertySchema,
      keyframes: z.array(KeyframeSchema).min(1),
    },
    async ({ scenePath, entityId, property, keyframes }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      if (!scene.entities.some((e) => e.id === entityId)) {
        return toolJson({ error: `Entity "${entityId}" not found.` }, true);
      }
      const sorted = [...keyframes].sort((a, b) => a.time - b.time);
      const track: TimelineTrack = { entityId, property, keyframes: sorted };
      const index = scene.timeline.tracks.findIndex((t) => t.entityId === entityId && t.property === property);
      if (index >= 0) scene.timeline.tracks[index] = track;
      else scene.timeline.tracks.push(track);
      const maxTime = sorted[sorted.length - 1]?.time ?? 0;
      if (maxTime > scene.timeline.duration) scene.timeline.duration = maxTime;
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, track, trackCount: scene.timeline.tracks.length, duration: scene.timeline.duration });
    },
  );

  server.tool(
    "remove_timeline_track",
    "Remove a timeline track by entity + property, or by index.",
    {
      scenePath: z.string(),
      entityId: z.string().optional(),
      property: PropertySchema.optional(),
      index: z.number().int().min(0).optional(),
    },
    async ({ scenePath, entityId, property, index }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      let removed: TimelineTrack | undefined;
      if (index !== undefined) {
        if (index >= scene.timeline.tracks.length) {
          return toolJson({ error: `Track index ${index} out of range.` }, true);
        }
        removed = scene.timeline.tracks.splice(index, 1)[0];
      } else if (entityId && property) {
        const i = scene.timeline.tracks.findIndex((t) => t.entityId === entityId && t.property === property);
        if (i < 0) return toolJson({ error: "Track not found." }, true);
        removed = scene.timeline.tracks.splice(i, 1)[0];
      } else {
        return toolJson({ error: "Provide index, or entityId + property." }, true);
      }
      await fileIO.writeScene(filename, scene);
      return toolJson({ success: true, removed, trackCount: scene.timeline.tracks.length });
    },
  );
}
