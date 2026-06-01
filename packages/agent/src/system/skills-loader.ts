import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type SkillSummary = {
  name: string;
  description: string;
};

export async function loadSkillSummaries(skillsDir: string): Promise<SkillSummary[]> {
  const summaries: SkillSummary[] = [];

  try {
    const files = await readdir(skillsDir);
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = JSON.parse(await readFile(join(skillsDir, file), "utf8"));
        summaries.push({
          name: raw.name ?? file.replace(".json", ""),
          description: raw.description ?? "",
        });
      } catch {
        // skip invalid files
      }
    }
  } catch {
    // skills dir not found — return empty
  }

  return summaries;
}
