import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FileIO } from "../utils/file-io.js";
import type { GameKitComponent, TilemapComponent } from "@gamekit/schema";

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
    },
    async ({ scenePath, entityId, tilesetId, tileWidth, tileHeight, columns, gridWidth, gridHeight }) => {
      const filename = fileIO.resolveScenePath(scenePath);
      const scene = await fileIO.readScene(filename);

      const entity = scene.entities.find((e) => e.id === entityId);
      if (!entity) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: `Entity not found: ${entityId}` }) }],
          isError: true,
        };
      }

      const existing = entity.components.find((c: any) => c.type === "Tilemap");
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
      };

      entity.components.push(component as GameKitComponent);
      await fileIO.writeScene(filename, scene);

      return {
        content: [{ type: "text", text: JSON.stringify(entity, null, 2) }],
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

      const tilemap = entity.components.find((c: any): c is TilemapComponent => c.type === "Tilemap");
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
}
