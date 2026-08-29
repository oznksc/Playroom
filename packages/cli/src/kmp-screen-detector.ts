import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

export interface DiscoveredScreen {
  name: string;
  className: string;
  filePath: string;
  packageName?: string;
  isPlayroomScreen: boolean;
  isComposable: boolean;
}

/**
 * Scan a project's Kotlin source directories to discover all Screen classes.
 */
export async function detectProjectScreens(root: string): Promise<DiscoveredScreen[]> {
  const screens: DiscoveredScreen[] = [];
  const candidateSourceDirs = [
    join(root, "shared", "src", "commonMain", "kotlin"),
    join(root, "composeApp", "src", "commonMain", "kotlin"),
    join(root, "core", "src", "main", "kotlin"),
    join(root, "src", "main", "kotlin"),
  ];

  for (const dir of candidateSourceDirs) {
    if (existsSync(dir)) {
      await scanKotlinFiles(dir, screens);
    }
  }

  return screens;
}

async function scanKotlinFiles(dir: string, results: DiscoveredScreen[]): Promise<void> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanKotlinFiles(fullPath, results);
      } else if (entry.isFile() && entry.name.endsWith(".kt")) {
        const content = await readFile(fullPath, "utf8");
        const screenInfo = parseKotlinScreen(fullPath, content);
        if (screenInfo) {
          results.push(screenInfo);
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }
}

function parseKotlinScreen(filePath: string, content: string): DiscoveredScreen | null {
  const isScreenFile =
    filePath.endsWith("Screen.kt") ||
    filePath.endsWith("Modal.kt") ||
    content.includes("PlayroomScreen") ||
    content.includes(": Screen") ||
    content.includes(": KtxScreen");

  if (!isScreenFile) return null;

  const pkgMatch = content.match(/package\s+([a-zA-Z0-9_.]+)/);
  const packageName = pkgMatch ? pkgMatch[1] : undefined;

  const classMatch = content.match(/(?:class|object)\s+([a-zA-Z0-9_]+)/);
  const className = classMatch ? classMatch[1] : filePath.split("/").pop()?.replace(".kt", "") || "UnknownScreen";

  const isPlayroomScreen = content.includes("PlayroomScreen");
  const isComposable = content.includes("@Composable");

  return {
    name: className.replace(/(Screen|Modal)$/, "").toLowerCase() || className.toLowerCase(),
    className,
    filePath,
    packageName,
    isPlayroomScreen,
    isComposable,
  };
}
