import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  IconButton,
  ButtonGroup,
  Label,
  Input,
  Textarea,
  Checkbox,
  Switch,
  Badge,
  StatusDot,
  Kbd,
  Field,
  NumberField,
  CheckboxField,
  ColorField,
  Panel,
  PanelHeader,
  PanelTitle,
  PanelBody,
  Range,
  SelectableCard,
  LoadingState,
  ErrorState,
  Toolbar,
  ToolbarButton,
} from "./index.js";

describe("@gamekit/ui primitives", () => {
  it("renders Button and handles click", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders IconButton with accessible name", () => {
    const handleClick = vi.fn();
    render(
      <IconButton aria-label="Close action" onClick={handleClick}>
        X
      </IconButton>
    );
    const btn = screen.getByRole("button", { name: /close action/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders Input and receives text", () => {
    const handleChange = vi.fn();
    render(<Input placeholder="Type here" onChange={(e) => handleChange(e.target.value)} />);
    const input = screen.getByPlaceholderText("Type here");
    fireEvent.change(input, { target: { value: "Hello" } });
    expect(handleChange).toHaveBeenCalledWith("Hello");
  });

  it("renders Checkbox and toggles checked", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <Checkbox aria-label="Enable sound" checked={false} onCheckedChange={handleChange} />
    );
    const checkbox = screen.getByRole("checkbox", { name: /enable sound/i });
    expect(checkbox).toHaveAttribute("data-state", "unchecked");

    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalledWith(true);

    rerender(<Checkbox aria-label="Enable sound" checked={true} onCheckedChange={handleChange} />);
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });

  it("renders Switch with label and toggles", () => {
    const handleChange = vi.fn();
    render(<Switch label="Mute audio" onCheckedChange={handleChange} />);
    const sw = screen.getByRole("switch");
    fireEvent.click(sw);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it("renders Range slider and updates value", () => {
    const handleChange = vi.fn();
    render(<Range value={50} min={0} max={100} onValueChange={handleChange} aria-label="Volume" />);
    const slider = screen.getByRole("slider", { name: /volume/i });
    fireEvent.change(slider, { target: { value: "75" } });
    expect(handleChange).toHaveBeenCalledWith(75);
  });

  it("renders SelectableCard and triggers onSelect", () => {
    const handleSelect = vi.fn();
    render(
      <SelectableCard
        selected={false}
        onSelect={handleSelect}
        title="2D Platformer"
        description="Side scrolling physics template"
      />
    );
    const card = screen.getByRole("checkbox", { name: /2d platformer/i });
    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it("renders LoadingState with message", () => {
    render(<LoadingState message="Generating sprite…" />);
    expect(screen.getByText("Generating sprite…")).toBeInTheDocument();
  });

  it("renders ErrorState with retry button", () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Export Failed"
        message="Could not write build output."
        onRetry={handleRetry}
      />
    );
    expect(screen.getByText("Export Failed")).toBeInTheDocument();
    expect(screen.getByText("Could not write build output.")).toBeInTheDocument();
    const retryBtn = screen.getByRole("button", { name: /retry/i });
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("renders Toolbar and ToolbarButton with accessible name", () => {
    const handleClick = vi.fn();
    render(
      <Toolbar>
        <ToolbarButton label="Move Tool" onClick={handleClick}>
          M
        </ToolbarButton>
      </Toolbar>
    );
    const btn = screen.getByRole("button", { name: /move tool/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
