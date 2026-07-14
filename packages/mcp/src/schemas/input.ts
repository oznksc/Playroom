import { z } from "zod";

export const InputActionBindingSchema = z.object({
  action: z.string().min(1).describe("Abstract action name (e.g., 'move_left', 'jump', 'fire')"),
  keys: z.array(z.string()).default([]).describe("Keyboard keys bound to this action"),
  touchControl: z.enum(["left", "right", "jump"]).optional().describe("Virtual touch button"),
  gamepad: z.string().optional().describe("Gamepad button/axis (e.g., 'A', 'LEFT_STICK_X')"),
});

export const InputMapConfigSchema = z.object({
  bindings: z.array(InputActionBindingSchema).default([]).describe("List of action-to-key bindings"),
});
