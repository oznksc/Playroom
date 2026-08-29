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

export const GuiPanelInputSchema = GuiBaseSchema.extend({
  type: z.literal("Panel"),
  backgroundColor: z.string().optional(),
  borderColor: z.string().optional(),
  borderWidth: z.number().optional(),
  borderRadius: z.number().optional(),
});

export const GuiProgressBarInputSchema = GuiBaseSchema.extend({
  type: z.literal("ProgressBar"),
  value: z.number().default(100),
  maxValue: z.number().default(100),
  fillColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  showLabel: z.boolean().optional(),
});

export const GuiJoystickInputSchema = GuiBaseSchema.extend({
  type: z.literal("Joystick"),
  action: z.string().optional(),
  radius: z.number().default(40),
  deadzone: z.number().optional(),
  baseColor: z.string().optional(),
  knobColor: z.string().optional(),
});

export const GuiNodeInputSchema = z.discriminatedUnion("type", [
  GuiTextInputSchema,
  GuiButtonInputSchema,
  GuiImageInputSchema,
  GuiPanelInputSchema,
  GuiProgressBarInputSchema,
  GuiJoystickInputSchema,
]);

export const GuiNodeTypeSchema = z.enum([
  "Text",
  "Button",
  "Image",
  "Panel",
  "ProgressBar",
  "Joystick",
]);
