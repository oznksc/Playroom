import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Button,
  IconButton,
  ButtonGroup,
  Label,
  Input,
  Textarea,
  Checkbox,
  CheckboxField,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SimpleSelect,
  NativeSelect,
  SegmentedControl,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AccordionSection,
  Badge,
  StatusDot,
  Kbd,
  Field,
  NumberField,
  ColorField,
  PropertyGroup,
  PropertyRow,
  NumberScrubberField,
} from "../src/ui/index.js";
import { Plus, Trash2, Layers, Move } from "lucide-react";

describe("UI Primitives Design System (Radix + Shadcn)", () => {
  describe("Button", () => {
    it("renders with default ghost variant and sm size", () => {
      render(<Button>Click me</Button>);
      const btn = screen.getByRole("button", { name: "Click me" });
      expect(btn).toBeDefined();
      expect(btn.getAttribute("data-variant")).toBe("ghost");
    });

    it("renders with primary variant and cyan styling attribute", () => {
      render(<Button variant="primary">Save</Button>);
      const btn = screen.getByRole("button", { name: "Save" });
      expect(btn.getAttribute("data-variant")).toBe("primary");
    });

    it("renders leftIcon and rightIcon slots", () => {
      render(
        <Button
          leftIcon={<Plus data-testid="left-icon" size={12} />}
          rightIcon={<Trash2 data-testid="right-icon" size={12} />}
        >
          Manage
        </Button>
      );
      expect(screen.getByTestId("left-icon")).toBeDefined();
      expect(screen.getByTestId("right-icon")).toBeDefined();
    });

    it("displays loading spinner and disables button when loading is true", () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          Submitting
        </Button>
      );
      const btn = screen.getByRole("button");
      expect(btn.hasAttribute("disabled")).toBe(true);
      expect(btn.getAttribute("aria-busy")).toBe("true");
      fireEvent.click(btn);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe("IconButton", () => {
    it("renders with icon and handles click", () => {
      const onClick = vi.fn();
      render(
        <IconButton title="Add Entity" onClick={onClick}>
          <Plus size={14} />
        </IconButton>
      );
      const btn = screen.getByTitle("Add Entity");
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("supports active state", () => {
      render(
        <IconButton active title="Active Toggle">
          <Plus size={14} />
        </IconButton>
      );
      const btn = screen.getByTitle("Active Toggle");
      expect(btn.getAttribute("data-active")).toBe("true");
      expect(btn.getAttribute("data-variant")).toBe("active");
    });
  });

  describe("ButtonGroup", () => {
    it("renders joined buttons in a group container", () => {
      render(
        <ButtonGroup data-testid="button-group">
          <Button variant="secondary">Left</Button>
          <Button variant="secondary">Middle</Button>
          <Button variant="secondary">Right</Button>
        </ButtonGroup>
      );
      const group = screen.getByTestId("button-group");
      expect(group.getAttribute("role")).toBe("group");
      expect(screen.getByText("Left")).toBeDefined();
      expect(screen.getByText("Middle")).toBeDefined();
      expect(screen.getByText("Right")).toBeDefined();
    });
  });

  describe("Label, Input & Textarea", () => {
    it("renders label and connects with input", () => {
      render(
        <div>
          <Label htmlFor="scene-name">Scene Name</Label>
          <Input id="scene-name" placeholder="level1" />
        </div>
      );
      expect(screen.getByText("Scene Name")).toBeDefined();
      const input = screen.getByPlaceholderText("level1");
      expect(input.getAttribute("id")).toBe("scene-name");
    });

    it("renders textarea", () => {
      render(<Textarea placeholder="Enter script code" />);
      expect(screen.getByPlaceholderText("Enter script code")).toBeDefined();
    });
  });

  describe("Checkbox & CheckboxField", () => {
    it("renders Radix Checkbox and toggles state", () => {
      const onCheckedChange = vi.fn();
      render(<CheckboxField label="Enable Physics" checked={false} onChange={onCheckedChange} />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox.getAttribute("aria-checked")).toBe("false");
      fireEvent.click(checkbox);
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });
  });

  describe("Switch", () => {
    it("handles boolean toggle and fires onCheckedChange", () => {
      const onChange = vi.fn();
      render(
        <Switch variant="accent" label="Snap to Grid" checked={false} onCheckedChange={onChange} />
      );

      const switchBtn = screen.getByRole("switch");
      expect(switchBtn.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(switchBtn);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("works in uncontrolled mode", () => {
      render(<Switch defaultChecked={false} label="Sound Effects" />);
      const switchBtn = screen.getByRole("switch");
      expect(switchBtn.getAttribute("aria-checked")).toBe("false");

      fireEvent.click(switchBtn);
      expect(switchBtn.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("Select & SimpleSelect", () => {
    it("renders SimpleSelect helper with trigger and value", () => {
      const onValueChange = vi.fn();
      render(
        <SimpleSelect
          value="opt1"
          onValueChange={onValueChange}
          options={[
            { value: "opt1", label: "Option 1" },
            { value: "opt2", label: "Option 2" },
          ]}
        />
      );
      expect(screen.getByRole("combobox")).toBeDefined();
    });

    it("renders NativeSelect with standard select attributes", () => {
      const onChange = vi.fn();
      render(
        <NativeSelect data-testid="native-select" onChange={onChange} defaultValue="a">
          <option value="a">Alpha</option>
          <option value="b">Beta</option>
        </NativeSelect>
      );
      const select = screen.getByTestId("native-select");
      expect(select).toBeDefined();
    });
  });

  describe("SegmentedControl", () => {
    it("renders options with radio roles and handles selection change", () => {
      const onValueChange = vi.fn();
      render(
        <SegmentedControl
          value="translate"
          onValueChange={onValueChange}
          options={[
            { value: "translate", label: "Move" },
            { value: "rotate", label: "Rotate", badge: "2D" },
            { value: "scale", label: "Scale" },
          ]}
        />
      );

      const rotateOption = screen.getByText("Rotate");
      fireEvent.click(rotateOption);
      expect(onValueChange).toHaveBeenCalledWith("rotate");
      expect(screen.getByText("2D")).toBeDefined();
    });
  });

  describe("Tabs", () => {
    it("renders segmented and underline tab triggers and shows active content", () => {
      const onTabChange = vi.fn();
      render(
        <Tabs value="tab1" onValueChange={onTabChange} variant="underline">
          <TabsList>
            <TabsTrigger value="tab1" icon={<Layers size={12} />} badge={5}>
              Tab 1
            </TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content for Tab 1</TabsContent>
          <TabsContent value="tab2">Content for Tab 2</TabsContent>
        </Tabs>
      );

      expect(screen.getByText("Content for Tab 1")).toBeDefined();
      expect(screen.queryByText("Content for Tab 2")).toBeNull();

      const tab2Trigger = screen.getByText("Tab 2");
      fireEvent.click(tab2Trigger);
      expect(onTabChange).toHaveBeenCalledWith("tab2");
    });
  });

  describe("Accordion & AccordionSection", () => {
    it("renders AccordionSection with toggling and children", () => {
      const onToggle = vi.fn();
      render(
        <AccordionSection
          label="Transform"
          icon={<Move size={12} />}
          open={true}
          onToggle={onToggle}
        >
          <div>Inner content</div>
        </AccordionSection>
      );

      expect(screen.getByText("Transform")).toBeDefined();
      expect(screen.getByText("Inner content")).toBeDefined();

      const btn = screen.getByRole("button", { name: /Transform/i });
      fireEvent.click(btn);
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("renders Radix Accordion primitive composition", () => {
      render(
        <Accordion type="single" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>Section Header</AccordionTrigger>
            <AccordionContent>Section Details</AccordionContent>
          </AccordionItem>
        </Accordion>
      );
      expect(screen.getByText("Section Header")).toBeDefined();
      expect(screen.getByText("Section Details")).toBeDefined();
    });
  });

  describe("Badges, StatusDots & Kbd", () => {
    it("renders Badge variants and Kbd chips", () => {
      render(
        <div>
          <Badge variant="accent">Cyan</Badge>
          <Badge variant="danger">Error</Badge>
          <Kbd>⌘K</Kbd>
          <StatusDot status="playing" data-testid="status-dot" />
        </div>
      );
      expect(screen.getByText("Cyan")).toBeDefined();
      expect(screen.getByText("Error")).toBeDefined();
      expect(screen.getByText("⌘K")).toBeDefined();
      expect(screen.getByTestId("status-dot")).toBeDefined();
    });
  });

  describe("Inspector Fields & NumberScrubberField", () => {
    it("renders PropertyRow with NumberScrubberField", () => {
      const onValueChange = vi.fn();
      render(
        <PropertyGroup title="Transform">
          <PropertyRow label="Position X">
            <NumberScrubberField label="X" value={42} onValueChange={onValueChange} unit="px" />
          </PropertyRow>
        </PropertyGroup>
      );

      expect(screen.getByText("Transform")).toBeDefined();
      expect(screen.getByText("Position X")).toBeDefined();
      expect(screen.getByText("X")).toBeDefined();
      expect(screen.getByText("px")).toBeDefined();
    });

    it("renders NumberField and ColorField", () => {
      const onChange = vi.fn();
      render(
        <div>
          <NumberField label="W" value={100} onChange={onChange} />
          <ColorField label="Tint" value="#00f0ff" onChange={onChange} />
        </div>
      );
      expect(screen.getByText("W")).toBeDefined();
      expect(screen.getByText("Tint")).toBeDefined();
    });
  });
});
