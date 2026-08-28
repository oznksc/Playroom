import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProvidersPanel } from "../src/components/ProvidersPanel.js";

// Mock useAgentKeys
vi.mock("../src/hooks/useAgentKeys.js", () => ({
  useAgentKeys: () => ({
    keys: [{ provider: "anthropic", model: "claude-sonnet-4-5", storage: "keychain" }],
    addKey: vi.fn(),
    removeKey: vi.fn(),
    osKeychain: true,
  }),
}));

describe("ProvidersPanel", () => {
  it("renders provider cards and connected badges", () => {
    render(<ProvidersPanel embedded={false} />);

    expect(screen.getByText("Anthropic Claude")).toBeDefined();
    expect(screen.getByText("OpenAI")).toBeDefined();
    expect(screen.getByText("xAI Grok")).toBeDefined();
    expect(screen.getByText("Google AI")).toBeDefined();
    expect(screen.getByText("OpenRouter")).toBeDefined();
    expect(screen.getByText("Ollama (local)")).toBeDefined();
    expect(screen.getByText("LM Studio (local)")).toBeDefined();

    // Anthropic is connected with keychain
    expect(screen.getByText("keychain")).toBeDefined();
  });

  it("renders embedded header with keyring status when embedded=true", () => {
    const onOpenSettings = vi.fn();
    render(<ProvidersPanel embedded={true} onOpenSettings={onOpenSettings} />);

    expect(screen.getByText("AI Providers & Keyring")).toBeDefined();
    expect(screen.getByText("1 connected")).toBeDefined();
    expect(screen.getByText("OS Keychain")).toBeDefined();

    const fullSettingsBtn = screen.getByText("Full Settings");
    fireEvent.click(fullSettingsBtn);
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it("expands edit form when Add/Edit is clicked", () => {
    render(<ProvidersPanel embedded={false} />);

    // Click Add on OpenAI
    const openAiCard = screen.getByText("OpenAI").closest(".provider-card");
    expect(openAiCard).toBeDefined();

    const addButtons = screen.getAllByRole("button", { name: /add/i });
    expect(addButtons.length).toBeGreaterThan(0);
    fireEvent.click(addButtons[0]);

    // Model and Base URL inputs should be visible
    expect(screen.getByText("Model")).toBeDefined();
    expect(screen.getByText("Base URL")).toBeDefined();
    expect(screen.getByRole("button", { name: /test/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /connect/i })).toBeDefined();
  });
});
