import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

const ALLOWLIST_PATH = path.join(ROOT, "scripts/ui-allowlist.json");
const BASELINE_PATH = path.join(ROOT, "scripts/ui-baseline.json");
const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, "utf8"));

const TARGET_DIRS = [path.join(ROOT, "apps/editor/src"), path.join(ROOT, "apps/studio/src")];

// ── Categories ────────────────────────────────────────────────────────────────

/** Raw HTML control tags that must be replaced with @gamekit/ui primitives. */
const FORBIDDEN_TAGS = ["select", "textarea", "button", "input"];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function lineOf(content: string, index: number): number {
  return content.substring(0, index).split("\n").length;
}

// ── Scan ──────────────────────────────────────────────────────────────────────

interface Counts {
  rawTags: number;
  arbitraryPx: number;
  inlineColors: number;
}

const counts: Counts = { rawTags: 0, arbitraryPx: 0, inlineColors: 0 };
const details: string[] = [];

for (const dir of TARGET_DIRS) {
  const files = collectFiles(dir);
  for (const file of files) {
    if (isAllowedFile(file)) continue;

    const content = fs.readFileSync(file, "utf8");
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");

    // 1. Raw HTML control tags
    for (const tag of FORBIDDEN_TAGS) {
      const tagRegex = new RegExp(`<${tag}[\\s>/]`, "g");
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(content)) !== null) {
        const allowedTagFiles = allowlist.allowedTags?.[tag] ?? [];
        if (allowedTagFiles.some((p: string) => matchesGlob(file, p))) continue;
        details.push(`  raw-tag    ${rel}:${lineOf(content, match.index)}  <${tag}>`);
        counts.rawTags++;
      }
    }

    // 2. Arbitrary pixel utilities in className strings
    {
      // Match className props that contain [Npx] patterns
      const rx = /className=[`"'][^`"']*\[[\d.]+px\][^`"']*[`"']/g;
      let match: RegExpExecArray | null;
      while ((match = rx.exec(content)) !== null) {
        details.push(
          `  arb-px     ${rel}:${lineOf(content, match.index)}  ${match[0].slice(0, 60)}`
        );
        counts.arbitraryPx++;
      }
    }

    // 3. Hard-coded colors in inline style props (hex / rgb / rgba / hsl)
    {
      const rx =
        /style\s*=\s*\{\{[^}]*(?:color|background(?:-color)?|border(?:-color)?|fill|stroke)\s*:\s*['"](?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsl[a]?\([^)]+\))[^}]*\}\}/g;
      let match: RegExpExecArray | null;
      while ((match = rx.exec(content)) !== null) {
        details.push(
          `  inline-clr ${rel}:${lineOf(content, match.index)}  ${match[0].slice(0, 60)}`
        );
        counts.inlineColors++;
      }
    }
  }
}

// ── Baseline ratchet ──────────────────────────────────────────────────────────

type Baseline = Counts;

let baseline: Baseline = { rawTags: 0, arbitraryPx: 0, inlineColors: 0 };
if (fs.existsSync(BASELINE_PATH)) {
  baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
}

if (UPDATE_BASELINE) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(counts, null, 2) + "\n");
  console.log("✅ Baseline updated:");
  console.log(`   rawTags:      ${counts.rawTags}`);
  console.log(`   arbitraryPx:  ${counts.arbitraryPx}`);
  console.log(`   inlineColors: ${counts.inlineColors}`);
  process.exit(0);
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log("\n📋 UI Contract Report");
console.log("─────────────────────────────────────────────────────────");

type CountKey = keyof Counts;

const categories: { key: CountKey; label: string }[] = [
  { key: "rawTags", label: "Raw HTML controls  (should use @gamekit/ui)" },
  { key: "arbitraryPx", label: "Arbitrary [Npx] utilities (use design tokens)" },
  { key: "inlineColors", label: "Hard-coded colors in style= props" },
];

let regressions = 0;

for (const { key, label } of categories) {
  const current = counts[key];
  const base = baseline[key];
  const delta = current - base;
  const arrow =
    delta > 0 ? `▲ +${delta} REGRESSION` : delta < 0 ? `▼ ${delta} improved` : "  no change";
  const icon = delta > 0 ? "❌" : delta < 0 ? "✅" : "  ";
  console.log(`${icon} ${label}`);
  console.log(`     current: ${current}   baseline: ${base}   ${arrow}`);
  if (delta > 0) regressions++;
}

console.log("─────────────────────────────────────────────────────────");

if (details.length > 0 && (process.env.VERBOSE || regressions > 0)) {
  console.log("\nViolation details (set VERBOSE=1 to always show):");
  details.forEach((d) => console.log(d));
}

if (regressions > 0) {
  console.error(
    `\n❌ ${regressions} categor${regressions === 1 ? "y has" : "ies have"} regressed vs baseline.`
  );
  console.error("   Fix the new violations or run `pnpm ui:baseline` to accept the new counts.");
  process.exit(1);
} else {
  console.log("\n✅ No regressions vs baseline. Current counts at or below baseline.");
  if (counts.rawTags + counts.arbitraryPx + counts.inlineColors > 0) {
    console.log("   ℹ  Some legacy violations remain — clean them up and run `pnpm ui:baseline`.");
  }
}
