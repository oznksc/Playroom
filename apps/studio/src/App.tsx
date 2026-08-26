import { useEffect, useState } from "react";
import {
  listExampleProjects,
  selectDirectory,
  type ExampleProject,
} from "./lib/api";
import { ProjectPanel } from "./panels/ProjectPanel";
import { AgentPanel } from "./panels/AgentPanel";
import { McpPanel } from "./panels/McpPanel";
import { EditorPanel } from "./panels/EditorPanel";

type TabId = "project" | "agent" | "mcp" | "editor";

const TABS: { id: TabId; label: string }[] = [
  { id: "project", label: "Project" },
  { id: "agent", label: "Agent" },
  { id: "mcp", label: "MCP" },
  { id: "editor", label: "Editor" },
];

export function App() {
  const [tab, setTab] = useState<TabId>("project");
  const [projectPath, setProjectPath] = useState<string>("");
  const [examples, setExamples] = useState<ExampleProject[]>([]);

  useEffect(() => {
    listExampleProjects()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, []);

  async function browse() {
    const dir = await selectDirectory();
    if (dir) setProjectPath(dir);
  }

  return (
    <div className="flex h-full flex-col bg-bg-base text-text-primary">
      <header className="flex items-center gap-4 border-b border-border-default bg-bg-surface px-4 py-2">
        <div className="type-display text-accent">GameKit Studio</div>
        <div className="flex flex-1 items-center gap-2">
          <input
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Project path (gamekit/ folder)…"
            className="type-mono flex-1 rounded-md border border-border-default bg-bg-base px-2 py-1.5 text-text-primary focus-ring"
          />
          <button
            onClick={browse}
            className="rounded-md border border-border-default bg-bg-elevated px-3 py-1.5 text-md text-text-primary hover:border-accent hover:text-accent"
          >
            Browse
          </button>
          <select
            value=""
            onChange={(e) => {
              const ex = examples.find((x) => x.id === e.target.value);
              if (ex) setProjectPath(ex.path);
            }}
            className="rounded-md border border-border-default bg-bg-elevated px-2 py-1.5 text-md text-text-primary focus-ring"
          >
            <option value="">Examples…</option>
            {examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-border-default bg-bg-surface px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-md transition-colors ${
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden">
        {tab === "project" && <ProjectPanel projectPath={projectPath} />}
        {tab === "agent" && <AgentPanel projectPath={projectPath} />}
        {tab === "mcp" && <McpPanel projectPath={projectPath} />}
        {tab === "editor" && <EditorPanel projectPath={projectPath} />}
      </main>
    </div>
  );
}
