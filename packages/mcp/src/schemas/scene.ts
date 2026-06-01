import { z } from "zod";
import { ComponentInputSchema, ComponentTypeSchema } from "./component.js";

export const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  background: z.string(),
});

export const GravitySchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const CreateSceneInputSchema = z.object({
  name: z.string().min(1),
  orientation: z.enum(["landscape", "portrait"]).default("landscape"),
  viewport: ViewportSchema.optional(),
  gravity: GravitySchema.optional(),
});

export const AddEntityInputSchema = z.object({
  scenePath: z.string().min(1),
  name: z.string().min(1),
  components: z.array(ComponentInputSchema).optional(),
});

export const RemoveEntityInputSchema = z.object({
  scenePath: z.string().min(1),
  entityId: z.string().min(1),
});

export const UpdateEntityInputSchema = z.object({
  scenePath: z.string().min(1),
  entityId: z.string().min(1),
  name: z.string().min(1).optional(),
});

export const AddComponentInputSchema = z.object({
  scenePath: z.string().min(1),
  entityId: z.string().min(1),
  component: ComponentInputSchema,
});

export const UpdateComponentInputSchema = z.object({
  scenePath: z.string().min(1),
  entityId: z.string().min(1),
  componentType: ComponentTypeSchema,
  props: z.record(z.unknown()),
});

export const RemoveComponentInputSchema = z.object({
  scenePath: z.string().min(1),
  entityId: z.string().min(1),
  componentType: ComponentTypeSchema,
});
