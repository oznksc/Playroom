import { z } from "zod";

const GuiBaseSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive(),
  anchorX: z.number().optional(),
  anchorY: z.number().optional(),
  visible: z.boolean().optional(),
  interactive: z.boolean().optional(),
});

export const GuiTextInputSchema = GuiBaseSchema.extend({
  type: z.literal("Text"),
  text: z.string().default("Text"),
  fontSize: z.number().positive().optional(),
  color: z.string().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

export const GuiButtonInputSchema = GuiBaseSchema.extend({
  type: z.literal("Button"),
  text: z.string().default("Button"),
  action: z.string().optional(),
  fontSize: z.number().positive().optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export const GuiImageInputSchema = GuiBaseSchema.extend({
  type: z.literal("Image"),
  assetId: z.string().min(1),
});

export const GuiNodeInputSchema = z.discriminatedUnion("type", [
  GuiTextInputSchema,
  GuiButtonInputSchema,
  GuiImageInputSchema,
]);

export const GuiNodeTypeSchema = z.enum(["Text", "Button", "Image"]);
