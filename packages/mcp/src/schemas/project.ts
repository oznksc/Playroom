import { z } from "zod";

export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1).optional(),
  scenes: z.array(z.string()).optional(),
  levels: z.array(z.unknown()).optional(),
});

export const AddAssetInputSchema = z.object({
  id: z.string().min(1),
  file: z.string().min(1),
  kind: z.literal("image"),
});

export const RemoveAssetInputSchema = z.object({
  id: z.string().min(1),
});
