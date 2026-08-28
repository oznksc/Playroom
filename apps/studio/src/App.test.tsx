import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "./App.js";

// Mock API functions
vi.mock("./lib/api.js", () => ({
  listExampleProjects: vi
    .fn()
    .mockResolvedValue([{ id: "platformer", name: "2D Platformer", path: "/projects/platformer" }]),
  selectDirectory: vi.fn().mockResolvedValue("/projects/custom"),
  runCli: vi.fn().mockResolvedValue({ ok: true, code: 0, lines: ["Success"] }),
  startEditorServer: vi.fn().mockResolvedValue("http://127.0.0.1:4177"),
  stopEditorServer: vi.fn().mockResolvedValue(undefined),
  startMcp: vi.fn().mockResolvedValue(4178),
  stopMcp: vi.fn().mockResolvedValue(undefined),
}));

describe("GameKit Studio App", () => {
  it("renders studio header, navigation, and initial project panel", () => {
    render(<App />);
    expect(screen.getByText("GameKit Studio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /browse/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agent" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "MCP" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Editor" })).toBeInTheDocument();
  });
});
