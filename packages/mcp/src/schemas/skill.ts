import { z } from "zod";

export const ApplySkillInputSchema = z.object({
  skillName: z.string().min(1).describe("Skill ID (e.g., 'platformer', 'topdown', 'puzzle')"),
  sceneName: z.string().optional().describe("Override scene name"),
});
