import { z } from "zod";
import { GuiNodeInputSchema } from "./gui.js";

export const GuiComponentInstanceInputSchema = z.object({
  componentId: z.string().min(1),
  x: z.number().default(0),
  y: z.number().default(0),
  visible: z.boolean().optional(),
  interactive: z.boolean().optional(),
  nodeOverrides: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
});
