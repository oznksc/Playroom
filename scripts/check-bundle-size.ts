import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STRICT = process.argv.includes("--strict");

interface BudgetRule {
  name: string;
  distDir: string;
  pattern: RegExp;
  maxGzipBytes: number;
  warnOnly?: boolean;
}

const BUDGETS: BudgetRule[] = [
  {
    name: "Studio Initial Bundle (gzip)",
    distDir: path.join(ROOT, "apps/studio/dist/assets"),
    pattern: /\.js$/,
    maxGzipBytes: 75 * 1024, // 75 KB
    warnOnly: !STRICT,
  },
  {
    name: "Editor Logo Asset",
    distDir: path.join(ROOT, "apps/editor/public"),
    pattern: /logo\.png$/,
    maxGzipBytes: 500 * 1024, // 500 KB
    warnOnly: true,
  },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

console.log("\n📦 Bundle Size Budget Verification");
console.log("─────────────────────────────────────────────────────────");

let hasErrors = 0;

for (const budget of BUDGETS) {
  if (!fs.existsSync(budget.distDir)) {
    console.log(
      `⚠️  ${budget.name}: directory not found (${path.relative(ROOT, budget.distDir)}). Run build first.`
    );
    continue;
  }

  const files = fs.readdirSync(budget.distDir).filter((f) => budget.pattern.test(f));
  if (files.length === 0) {
    console.log(
      `ℹ️  ${budget.name}: no matching files found in ${path.relative(ROOT, budget.distDir)}`
    );
    continue;
  }

  let totalRaw = 0;
  let totalGzip = 0;

  for (const file of files) {
    const filePath = path.join(budget.distDir, file);
    const content = fs.readFileSync(filePath);
    totalRaw += content.length;
    totalGzip += zlib.gzipSync(content).length;
  }

  const budgetGzip = budget.maxGzipBytes;
  const passed = totalGzip <= budgetGzip;
  const icon = passed ? "✅" : budget.warnOnly ? "⚠️" : "❌";
  const status = passed ? "PASS" : budget.warnOnly ? "WARN (Budget Target Exceeded)" : "FAIL";

  console.log(`${icon} ${budget.name}: ${status}`);
  console.log(
    `     Gzip: ${formatBytes(totalGzip)} / ${formatBytes(budgetGzip)} (Raw: ${formatBytes(totalRaw)})`
  );

  if (!passed && !budget.warnOnly) {
    hasErrors++;
  }
}

console.log("─────────────────────────────────────────────────────────");

if (hasErrors > 0) {
  console.error(`\n❌ ${hasErrors} bundle budget check(s) failed in strict mode.\n`);
  process.exit(1);
} else {
  console.log("\n✅ Bundle size checks completed.\n");
}
