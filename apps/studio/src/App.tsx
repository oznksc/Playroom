import { useEffect, useState } from "react";
import { listExampleProjects, selectDirectory, type ExampleProject } from "./lib/api.js";
import { ProjectPanel } from "./panels/ProjectPanel.js";
import { AgentPanel } from "./panels/AgentPanel.js";
import { McpPanel } from "./panels/McpPanel.js";
import { EditorPanel } from "./panels/EditorPanel.js";
import { Button, Input, NativeSelect, Tabs, TabsList, TabsTrigger, TabsContent } from "@gamekit/ui";
import { FolderOpen } from "lucide-react";

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
      <header className="flex items-center gap-4 border-b border-border-default bg-bg-surface px-4 py-2.5">
        <div className="type-display text-accent tracking-brand select-none">GameKit Studio</div>
        <div className="flex flex-1 items-center gap-2">
          <Input
            mono
            inputSize="sm"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            placeholder="Project path (gamekit/ folder)…"
            className="flex-1"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={browse}
            leftIcon={<FolderOpen size={13} />}
          >
            Browse
          </Button>
          <NativeSelect
            selectSize="sm"
            value=""
            onChange={(e) => {
              const ex = examples.find((x) => x.id === e.target.value);
              if (ex) setProjectPath(ex.path);
            }}
            className="w-40"
          >
            <option value="">Examples…</option>
            {examples.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </header>

      <Tabs
        value={tab}
        onValueChange={(val) => setTab(val as TabId)}
        variant="underline"
        size="md"
        className="flex-1 overflow-hidden"
      >
        <TabsList className="px-4 bg-bg-surface">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <main className="flex-1 overflow-hidden">
          <TabsContent value="project" className="h-full">
            <ProjectPanel projectPath={projectPath} />
          </TabsContent>
          <TabsContent value="agent" className="h-full">
            <AgentPanel projectPath={projectPath} />
          </TabsContent>
          <TabsContent value="mcp" className="h-full">
            <McpPanel projectPath={projectPath} />
          </TabsContent>
          <TabsContent value="editor" className="h-full">
            <EditorPanel projectPath={projectPath} />
          </TabsContent>
        </main>
      </Tabs>
    </div>
  );
}
