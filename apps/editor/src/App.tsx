import { WelcomeHub } from "./components/WelcomeHub.js";
import { useEditorController } from "./hooks/useEditorController.js";
import { EditorWorkspaceShell } from "./components/EditorWorkspaceShell.js";

export function App() {
  const controller = useEditorController();
  const { project, welcomeHubOpen, setWelcomeHubOpen } = controller;

  if ((project.isTauri && !project.projectPath) || welcomeHubOpen) {
    return (
      <WelcomeHub
        recentProjects={project.recentProjects}
        exampleProjects={project.exampleProjects.map((e) => e.path)}
        isLoadingProject={project.isLoadingProject}
        projectLoadError={project.projectLoadError}
        onOpenFolder={project.handleOpenProject}
        onSelectProject={async (path) => {
          setWelcomeHubOpen(false);
          await project.loadProjectFolder(path);
        }}
        onRemoveRecent={(path) => {
          project.setRecentProjects((prev) => {
            const next = prev.filter((p) => p !== path);
            localStorage.setItem("gamekit_recent_projects", JSON.stringify(next));
            return next;
          });
        }}
      />
    );
  }

  return <EditorWorkspaceShell controller={controller} />;
}
