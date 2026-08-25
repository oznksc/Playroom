import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { GameKitEntity, TextComponent } from "@gamekit/schema";
import { TextSection } from "../../src/components/inspector/TextSection.js";

describe("TextSection (RTL)", () => {
  const defaultText: TextComponent = {
    type: "Text",
    text: "Game Over",
    fontAssetId: "default",
    size: 32,
    color: "#ff3366",
    align: "center",
  };

  it("renders text label inputs and alignment choices", () => {
    render(
      <TextSection
        textComp={defaultText}
        assets={[]}
        onChange={vi.fn()}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Text Label")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Game Over")).toBeInTheDocument();
    expect(screen.getByDisplayValue("32")).toBeInTheDocument();
    expect(screen.getAllByDisplayValue("#ff3366").length).toBeGreaterThan(0);
  });

  it("modifies text string on input", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TextSection
        textComp={defaultText}
        assets={[]}
        onChange={onChange}
        open={true}
        onToggle={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    const textInput = container.querySelector("label input[type='text']") as HTMLInputElement;
    expect(textInput).toBeInTheDocument();
    expect(textInput.value).toBe("Game Over");

    fireEvent.change(textInput, { target: { value: "You Win!" } });

    expect(onChange).toHaveBeenCalled();
    const draft: GameKitEntity = {
      id: "label",
      name: "Label",
      components: [JSON.parse(JSON.stringify(defaultText))],
    };
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    lastCall(draft);
    const updated = draft.components[0] as TextComponent;
    expect(updated.text).toBe("You Win!");
  });
});
