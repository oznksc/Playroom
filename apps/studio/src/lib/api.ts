import { invoke } from "@tauri-apps/api/core";

export interface CliOutput {
  ok: boolean;
  code: number;
  lines: string[];
}

export interface ExampleProject {
  id: string;
  name: string;
  description: string;
  path: string;
}

export async function runCli(args: string[], projectPath: string): Promise<CliOutput> {
  return (await invoke("run_cli", { args, projectPath })) as CliOutput;
}

export async function selectDirectory(): Promise<string | null> {
  return (await invoke("select_directory")) as string | null;
}

export async function listExampleProjects(): Promise<ExampleProject[]> {
  return (await invoke("list_example_projects")) as ExampleProject[];
}

export async function startEditorServer(projectPath: string): Promise<string> {
  return (await invoke("start_editor_server", { projectPath })) as string;
}

export async function stopEditorServer(): Promise<void> {
  await invoke("stop_editor_server");
}

export async function startMcp(projectPath: string): Promise<number> {
  return (await invoke("start_mcp", { projectPath })) as number;
}

export async function stopMcp(): Promise<void> {
  await invoke("stop_mcp");
}
