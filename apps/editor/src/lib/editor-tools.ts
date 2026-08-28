export type CanvasTool =
  "select" | "translate" | "rotate" | "scale" | "paint" | "erase" | "polygon-edit";

export type TilePaintMode = "brush" | "erase" | "fill" | "rect" | "eyedropper";

export function isTilePaintTool(tool: CanvasTool): boolean {
  return tool === "paint" || tool === "erase";
}

export function tilePaintModeForTool(tool: CanvasTool, mode: TilePaintMode): TilePaintMode {
  if (tool === "erase") return "erase";
  if (tool !== "paint") return mode;
  return mode === "erase" ? "brush" : mode;
}
