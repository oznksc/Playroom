import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import { GameKitComponentSchema } from "@gamekit/schema";
import type { TilemapComponent } from "@gamekit/schema";

export function registerTilemapTools(server: McpServer, fileIO: FileIO): void {
  server.tool(
    "add_tilemap",
    "Add a Tilemap component to an entity",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID"),
      tilesetId: z.string().describe("Asset ID of the tileset image"),
      tileWidth: z.number().positive().describe("Width of each tile in pixels"),
      tileHeight: z.number().positive().describe("Height of each tile in pixels"),
      columns: z.number().int().positive().describe("Tiles per row in the tileset image"),
      gridWidth: z.number().int().positive().describe("Map width in tiles"),
      gridHeight: z.number().int().positive().describe("Map height in tiles"),
      solid: z.boolean().optional().describe("When true, every non-empty tile collides as a static solid"),
    },
    async ({ scenePath, entityId, tilesetId, tileWidth, tileHeight, columns, gridWidth, gridHeight, solid }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
      if (existing) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity already has a Tilemap component" }) }],
          isError: true,
        };
      }

      const component: TilemapComponent = {
        type: "Tilemap",
        tilesetId,
        tileWidth,
        tileHeight,
        columns,
        gridWidth,
        gridHeight,
        tiles: [],
        solid: solid ?? false,
      };

      entity.components.push(GameKitComponentSchema.parse(component));
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
      };
    },
  );

  server.tool(
    "set_tilemap_solid",
    "Toggle Tilemap.solid — when true, non-empty tiles become static colliders (inspector Tilemap section).",
    {
      scenePath: z.string(),
      entityId: z.string(),
      solid: z.boolean(),
    },
    async ({ scenePath, entityId, solid }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }
      const tilemap = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
      if (!tilemap) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity has no Tilemap component" }) }],
          isError: true,
        };
      }
      tilemap.solid = solid;
      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, solid: tilemap.solid }, null, 2) }],
      };
    },
  );

  server.tool(
    "paint_tile",
    "Set a tile in a Tilemap at the given grid position",
    {
      scenePath: z.string().describe("Scene filename"),
      entityId: z.string().describe("Entity ID with a Tilemap component"),
      gridX: z.number().int().min(0).describe("Tile column (0-based)"),
      gridY: z.number().int().min(0).describe("Tile row (0-based)"),
      tileId: z.number().int().min(0).describe("Tile index in tileset (0 = empty/erase)"),
    },
    async ({ scenePath, entityId, gridX, gridY, tileId }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const tilemap = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
      if (!tilemap) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity has no Tilemap component" }) }],
          isError: true,
        };
      }

      const index = gridY * tilemap.gridWidth + gridX;
      if (
        gridX < 0 ||
        gridY < 0 ||
        gridX >= tilemap.gridWidth ||
        gridY >= tilemap.gridHeight ||
        index < 0 ||
        index >= tilemap.gridWidth * tilemap.gridHeight
      ) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Grid position (${gridX}, ${gridY}) is out of bounds for map size ${tilemap.gridWidth}x${tilemap.gridHeight}` }) }],
          isError: true,
        };
      }

      while (tilemap.tiles.length <= index) {
        tilemap.tiles.push(0);
      }

      tilemap.tiles[index] = tileId;

      await fileIO.writeScene(filename, scene);
      return {
        content: [{ type: "text", text: JSON.stringify(tilemap, null, 2) }],
      };
    },
  );

  server.tool(
    "paint_tiles",
    "Paint many tiles at once: fill the whole map, fill a rectangle, or draw a horizontal/vertical line. tileId 0 erases. Prefer this over looping paint_tile.",
    {
      scenePath: z.string(),
      entityId: z.string().describe("Entity with a Tilemap"),
      mode: z.enum(["fill", "rect", "hline", "vline"]),
      tileId: z.number().int().min(0).describe("Tileset index (0 = empty)"),
      x: z.number().int().min(0).optional().describe("Start column for rect/hline/vline"),
      y: z.number().int().min(0).optional().describe("Start row for rect/hline/vline"),
      width: z.number().int().min(1).optional().describe("Rect width in tiles"),
      height: z.number().int().min(1).optional().describe("Rect height in tiles"),
      length: z.number().int().min(1).optional().describe("Line length in tiles"),
    },
    async ({ scenePath, entityId, mode, tileId, x, y, width, height, length }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);
      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }
      const tilemap = entity.components.find((c): c is TilemapComponent => c.type === "Tilemap");
      if (!tilemap) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Entity has no Tilemap component" }) }],
          isError: true,
        };
      }

      const size = tilemap.gridWidth * tilemap.gridHeight;
      while (tilemap.tiles.length < size) tilemap.tiles.push(0);
      if (tilemap.tiles.length > size) tilemap.tiles.length = size;

      const set = (col: number, row: number) => {
        if (col < 0 || row < 0 || col >= tilemap.gridWidth || row >= tilemap.gridHeight) return;
        tilemap.tiles[row * tilemap.gridWidth + col] = tileId;
      };

      let painted = 0;
      if (mode === "fill") {
        for (let i = 0; i < size; i++) tilemap.tiles[i] = tileId;
        painted = size;
      } else if (mode === "rect") {
        const ox = x ?? 0;
        const oy = y ?? 0;
        const w = width ?? 1;
        const h = height ?? 1;
        for (let row = oy; row < oy + h; row++) {
          for (let col = ox; col < ox + w; col++) {
            set(col, row);
            painted += 1;
          }
        }
      } else if (mode === "hline") {
        const ox = x ?? 0;
        const oy = y ?? 0;
        const len = length ?? width ?? 1;
        for (let col = ox; col < ox + len; col++) {
          set(col, oy);
          painted += 1;
        }
      } else {
        const ox = x ?? 0;
        const oy = y ?? 0;
        const len = length ?? height ?? 1;
        for (let row = oy; row < oy + len; row++) {
          set(ox, row);
          painted += 1;
        }
      }

      await fileIO.writeScene(filename, scene);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                mode,
                tileId,
                painted,
                grid: { width: tilemap.gridWidth, height: tilemap.gridHeight },
                tiles: tilemap.tiles,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
