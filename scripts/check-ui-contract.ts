import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ALLOWLIST_PATH = path.join(ROOT, "scripts/ui-allowlist.json");
const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));

const TARGET_DIRS = [path.join(ROOT, "apps/editor/src"), path.join(ROOT, "apps/studio/src")];

// Elements to check
const FORBIDDEN_TAGS = ["select", "textarea"];

function matchesGlob(filePath: string, globPattern: string): boolean {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, "/");
  const regexPattern = globPattern.replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp(`^${regexPattern}$`).test(relative);
}

function isAllowedFile(filePath: string): boolean {
  return allowlist.allowedFiles.some((pattern: string) => matchesGlob(filePath, pattern));
}

function collectFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath));
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

let violations = 0;

for (const dir of TARGET_DIRS) {
  const files = collectFiles(dir);
  for (const file of files) {
    if (isAllowedFile(file)) continue;

    const content = fs.readFileSync(file, "utf8");
    const relativePath = path.relative(ROOT, file).replace(/\\/g, "/");

    // Check for raw tags
    for (const tag of FORBIDDEN_TAGS) {
      const tagRegex = new RegExp(`<${tag}[\\s>/]`, "g");
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(content)) !== null) {
        // Check if allowed for this tag
        const allowedTagFiles = allowlist.allowedTags?.[tag] ?? [];
        const isTagAllowed = allowedTagFiles.some((pattern: string) => matchesGlob(file, pattern));
        if (isTagAllowed) continue;

        const lineNumber = content.substring(0, match.index).split("\n").length;
        console.error(
          `[UI Contract Violation] ${relativePath}:${lineNumber} — Raw <${tag}> tag used. Use @gamekit/ui primitives instead.`
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n❌ Total UI contract violations: ${violations}`);
  process.exit(1);
} else {
  console.log("✅ All UI components conform to the @gamekit/ui contract.");
}
