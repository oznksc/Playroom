import { useState } from "react";
import {
  Box,
  Copy,
  SlidersHorizontal,
  Play,
  Square,
  Sparkles,
  Plus,
  Trash2,
  Move,
  RotateCw,
  Maximize2,
  Layers,
  FileCode,
  Globe,
  Settings,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  Button,
  IconButton,
  ButtonGroup,
  Switch,
  Checkbox,
  Dialog,
  Kbd,
  Badge,
  StatusDot,
  ModalShell,
  NumberScrubberField,
  PropertyGroup,
  PropertyRow,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SimpleSelect,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  SimpleTooltip,
  Field,
  NumberField,
  CheckboxField,
  ColorField,
  type SegmentedControlOption,
} from "@/ui";

const transformOptions = [
  { value: "translate", label: "Move", icon: <Move size={12} /> },
  { value: "rotate", label: "Rotate", icon: <RotateCw size={12} /> },
  { value: "scale", label: "Scale", icon: <Maximize2 size={12} />, badge: "3D" },
] as const satisfies readonly SegmentedControlOption<"translate" | "rotate" | "scale">[];

const selectOptions = [
  { value: "arcade", label: "Arcade Physics" },
  { value: "matter", label: "Matter.js Rigid Body" },
  { value: "kinematic", label: "Kinematic Controller" },
  { value: "custom", label: "Custom Solver", disabled: true },
];

/** Internal visual contract for shared editor primitives. Open with ?view=ui-gallery. */
export function UiGallery() {
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [activeTab, setActiveTab] = useState("entities");
  const [underlineTab, setUnderlineTab] = useState("general");
  const [selectedEngine, setSelectedEngine] = useState("arcade");
  const [x, setX] = useState(128);
  const [rotation, setRotation] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [checkboxState, setCheckboxState] = useState(true);
  const [activeIconButton, setActiveIconButton] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [dropdownCheck, setDropdownCheck] = useState(true);
  const [colorValue, setColorValue] = useState("#00f0ff");

  return (
    <main className="min-h-full overflow-auto bg-surface-base p-5 text-text-primary sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <p className="type-label mb-1 uppercase tracking-[0.1em] text-signal-select">Playroom / Design System</p>
            <h1 className="m-0 text-xl font-semibold tracking-[-0.025em]">UI Component Gallery</h1>
            <p className="type-body mb-0 mt-1">Radix UI primitives, shadcn architecture, and custom cyber/glass styling.</p>
          </div>
          <div className="flex items-center gap-1.5 type-micro">
            <span>Open with</span>
            <Kbd>?view=ui-gallery</Kbd>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── BUTTON VARIANTS ── */}
          <GalleryCard title="Button Variants" description="Unified styling palette across primary, secondary, solid, ghost, danger, and simulation transports.">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary">Primary (Cyan)</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="solid">Solid / Accent</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="play" leftIcon={<Play size={12} fill="currentColor" />}>Play</Button>
              <Button variant="stop" leftIcon={<Square size={10} fill="currentColor" />}>Stop</Button>
            </div>
          </GalleryCard>

          {/* ── BUTTON SIZES & STATES ── */}
          <GalleryCard title="Button Sizes & States" description="Ultra-dense xs (24px) for inspector rows up to lg (36px). Includes loading spinners and icon slots.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="xs" variant="secondary">Size XS (24px)</Button>
                <Button size="sm" variant="secondary">Size SM (28px)</Button>
                <Button size="md" variant="secondary">Size MD (32px)</Button>
                <Button size="lg" variant="secondary">Size LG (36px)</Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
                <Button variant="solid" leftIcon={<Sparkles size={12} />} onClick={() => setIsLoading(!isLoading)}>
                  {isLoading ? "Loading..." : "Toggle Loading"}
                </Button>
                <Button variant="primary" loading={isLoading} leftIcon={<Plus size={12} />}>
                  Save Project
                </Button>
                <Button variant="secondary" disabled>
                  Disabled
                </Button>
              </div>
            </div>
          </GalleryCard>

          {/* ── ICON BUTTONS & TOOLTIPS ── */}
          <GalleryCard title="Icon Buttons & Tooltips" description="Compact action triggers with active states, loaders, and Radix floating tooltips.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SimpleTooltip content="Settings (XS)">
                  <IconButton size="xs" variant="ghost" title="XS Ghost"><Settings size={11} /></IconButton>
                </SimpleTooltip>
                <SimpleTooltip content="Add Entity (SM)">
                  <IconButton size="sm" variant="secondary" title="SM Secondary"><Plus size={13} /></IconButton>
                </SimpleTooltip>
                <SimpleTooltip content="Magic Action (MD)">
                  <IconButton size="md" variant="solid" title="MD Solid"><Sparkles size={14} /></IconButton>
                </SimpleTooltip>
                <SimpleTooltip content="Play Simulation (LG)">
                  <IconButton size="lg" variant="primary" title="LG Primary"><Play size={15} fill="currentColor" /></IconButton>
                </SimpleTooltip>
                <SimpleTooltip content="Delete Entity">
                  <IconButton size="md" variant="danger" title="Danger"><Trash2 size={14} /></IconButton>
                </SimpleTooltip>
                <SimpleTooltip content="Toggle Active State">
                  <IconButton
                    size="md"
                    active={activeIconButton}
                    onClick={() => setActiveIconButton(!activeIconButton)}
                    title="Toggle active"
                  >
                    <Check size={14} />
                  </IconButton>
                </SimpleTooltip>
                <IconButton size="md" loading title="Loading"><Sparkles size={14} /></IconButton>
              </div>
            </div>
          </GalleryCard>

          {/* ── BUTTON GROUPS ── */}
          <GalleryCard title="Button Groups" description="Joined toolbars and zoom controls without redundant internal borders.">
            <div className="flex flex-wrap items-center gap-4">
              <ButtonGroup attached>
                <Button size="sm" variant="secondary">Left</Button>
                <Button size="sm" variant="secondary">Middle</Button>
                <Button size="sm" variant="secondary">Right</Button>
              </ButtonGroup>

              <ButtonGroup attached>
                <IconButton size="sm" variant="secondary" title="Zoom In"><ZoomIn size={13} /></IconButton>
                <IconButton size="sm" variant="secondary" title="Zoom Out"><ZoomOut size={13} /></IconButton>
                <IconButton size="sm" variant="secondary" title="Reset View"><RotateCcw size={13} /></IconButton>
              </ButtonGroup>
            </div>
          </GalleryCard>

          {/* ── RADIX SELECT PRIMITIVES ── */}
          <GalleryCard title="Radix Select & SimpleSelect" description="Accessible glass dropdown with full keyboard navigation and scroll buttons.">
            <div className="space-y-3">
              <div>
                <span className="type-micro mb-1 block text-text-muted">SimpleSelect Helper:</span>
                <SimpleSelect
                  value={selectedEngine}
                  onValueChange={setSelectedEngine}
                  options={selectOptions}
                  size="sm"
                />
              </div>
              <div className="pt-2 border-t border-border-subtle">
                <span className="type-micro mb-1 block text-text-muted">Radix Composition Pattern:</span>
                <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Choose solver..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Physics Solvers</SelectLabel>
                      {selectOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} disabled={opt.disabled}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </GalleryCard>

          {/* ── RADIX ACCORDION ── */}
          <GalleryCard title="Radix Accordion & Sections" description="Collapsible inspector cards powered by Radix Accordion with animated heights.">
            <div className="space-y-3">
              <AccordionSection
                label="Transform Component"
                icon={<Move size={12} />}
                open={accordionOpen}
                onToggle={() => setAccordionOpen(!accordionOpen)}
              >
                <div className="space-y-1.5 text-xs text-text-muted">
                  <PropertyRow label="Position X">
                    <NumberScrubberField label="X" value={x} onValueChange={setX} unit="px" />
                  </PropertyRow>
                </div>
              </AccordionSection>

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger icon={<Layers size={12} />}>Colliders & Physics</AccordionTrigger>
                  <AccordionContent>
                    Box collider dynamic body with restitution 0.8 and friction 0.2.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </GalleryCard>

          {/* ── SEGMENTED CONTROL ── */}
          <GalleryCard title="Segmented Controls" description="Mutually exclusive mode switchers with icon, badge, and size options.">
            <div className="space-y-3">
              <div>
                <span className="type-micro mb-1 block text-text-muted">Standard (sm):</span>
                <SegmentedControl value={mode} onValueChange={setMode} options={transformOptions} />
              </div>
              <div>
                <span className="type-micro mb-1 block text-text-muted">Pill Variant (xs):</span>
                <SegmentedControl size="xs" variant="pills" value={mode} onValueChange={setMode} options={transformOptions} />
              </div>
              <p className="type-micro mt-2">
                Active mode: <span className="type-mono text-signal-select font-semibold">{mode}</span>
              </p>
            </div>
          </GalleryCard>

          {/* ── RADIX TABS (SEGMENTED & UNDERLINE) ── */}
          <GalleryCard title="Radix Tabs Navigation" description="Multi-style tab containers (Segmented vs Underline) with full Radix keyboard navigation.">
            <div className="space-y-4">
              <div>
                <span className="type-micro mb-1.5 block text-text-muted">Segmented Tabs:</span>
                <Tabs variant="segmented" size="sm" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="entities" icon={<Layers size={13} />} badge={12}>
                      Entities
                    </TabsTrigger>
                    <TabsTrigger value="scenes" icon={<FileCode size={13} />}>
                      Scenes
                    </TabsTrigger>
                    <TabsTrigger value="world" icon={<Globe size={13} />}>
                      World
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="entities" className="mt-2 text-xs text-text-muted">
                    Displaying 12 scene hierarchy entities...
                  </TabsContent>
                  <TabsContent value="scenes" className="mt-2 text-xs text-text-muted">
                    Scenes: main.scene.json, level2.scene.json...
                  </TabsContent>
                  <TabsContent value="world" className="mt-2 text-xs text-text-muted">
                    World physics and gravity parameters...
                  </TabsContent>
                </Tabs>
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <span className="type-micro mb-1.5 block text-text-muted">Underline Tabs (Dock / Drawers):</span>
                <Tabs variant="underline" size="xs" value={underlineTab} onValueChange={setUnderlineTab}>
                  <TabsList>
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="physics" badge="New">Physics</TabsTrigger>
                    <TabsTrigger value="audio">Audio</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </GalleryCard>

          {/* ── RADIX SWITCH & CHECKBOX ── */}
          <GalleryCard title="Radix Switch & Checkbox" description="Accessible boolean toggles with cyan/green signals, smooth micro-animation, and label integration.">
            <div className="space-y-3">
              <Switch
                checked={snapEnabled}
                onCheckedChange={setSnapEnabled}
                variant="accent"
                label="Snap to Grid"
                description="Align objects to 16px tile increments."
              />
              <Switch
                checked={audioEnabled}
                onCheckedChange={setAudioEnabled}
                variant="success"
                label="Spatial Audio"
                description="Enable 3D distance attenuation for audio emitters."
              />
              <div className="pt-2 border-t border-border-subtle flex items-center gap-4">
                <CheckboxField
                  label="Enable Gravity Simulation"
                  checked={checkboxState}
                  onChange={setCheckboxState}
                />
              </div>
            </div>
          </GalleryCard>

          {/* ── MENUS (DROPDOWN & CONTEXT) ── */}
          <GalleryCard title="Dropdown & Context Menus" description="Floating glass menus with submenus, checkboxes, and keyboard shortcuts.">
            <div className="flex flex-wrap items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" rightIcon={<ChevronDown size={12} />}>
                    Options Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Project Actions</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Plus size={13} className="mr-1.5 text-accent" /> New Scene <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuCheckboxItem checked={dropdownCheck} onCheckedChange={setDropdownCheck}>
                    Show Grid Overlay
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem danger>
                    <Trash2 size={13} className="mr-1.5" /> Delete Project
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div className="flex h-9 items-center justify-center rounded-[10px] border border-dashed border-white/[0.15] bg-white/[0.02] px-3 text-[11px] text-text-muted select-none">
                    Right click here for Context Menu
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem>
                    <Copy size={13} className="mr-1.5 text-accent" /> Duplicate Entity <ContextMenuShortcut>⌘D</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem danger>
                    <Trash2 size={13} className="mr-1.5" /> Delete Entity
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          </GalleryCard>

          {/* ── KEYBOARD HINTS, BADGES & STATUS DOTS ── */}
          <GalleryCard title="Signals, Badges & Status Dots" description="Adjacent keyboard shortcut badges and luminous status signals.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary"><Copy size={13} /> Duplicate <Kbd>⌘D</Kbd></Button>
                <Kbd>Esc</Kbd>
                <Kbd>Space</Kbd>
                <Kbd>⌘K</Kbd>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-subtle">
                <Badge variant="accent">Cyan</Badge>
                <Badge variant="purple">Violet</Badge>
                <Badge variant="success">Active</Badge>
                <Badge variant="danger">Error</Badge>
                <Badge variant="mono">0.1.0-alpha</Badge>
                <span className="flex items-center gap-1.5 text-xs text-text-muted ml-2">
                  <StatusDot status="loading" /> Syncing
                </span>
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <StatusDot status="playing" /> Running
                </span>
              </div>
            </div>
          </GalleryCard>

          {/* ── FORM FIELDS & COLOR PICKER ── */}
          <GalleryCard title="Inspector Fields & Color Picker" description="Composed fields with badge labels, color swatches, and numeric inputs.">
            <div className="space-y-2">
              <ColorField label="Tint" value={colorValue} onChange={setColorValue} />
              <NumberField label="Speed" value={120} onChange={() => {}} step={10} min={0} max={500} />
            </div>
          </GalleryCard>

          {/* ── INSPECTOR PROPERTIES ── */}
          <GalleryCard title="Inspector Properties" description="Drag a label horizontally or enter a numeric value directly.">
            <PropertyGroup title="Transform" className="border-0 py-0">
              <PropertyRow label="Position X" hint="World-space horizontal position.">
                <NumberScrubberField label="X" value={x} onValueChange={setX} unit="px" />
              </PropertyRow>
              <PropertyRow label="Rotation" hint="Clockwise angle in degrees.">
                <NumberScrubberField label="R" value={rotation} onValueChange={setRotation} unit="deg" step={5} />
              </PropertyRow>
            </PropertyGroup>
          </GalleryCard>

          {/* ── MODAL ANATOMY ── */}
          <GalleryCard title="Modal Anatomy" description="Fixed title bar, scrolling content, and sticky action buttons.">
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              <SlidersHorizontal size={13} /> Open modal demo
            </Button>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <ModalShell
                className="w-[min(480px,calc(100vw-32px))]"
                title="Physics Settings"
                description="Configure world gravity and collision behaviour."
                icon={<Box size={15} />}
                onClose={() => setModalOpen(false)}
                footer={
                  <>
                    <Button variant="ghost" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="primary" onClick={() => setModalOpen(false)}>
                      Apply Changes
                    </Button>
                  </>
                }
              >
                <PropertyGroup title="World">
                  <PropertyRow label="Gravity X">
                    <NumberScrubberField label="X" value={0} onValueChange={() => {}} unit="px/s²" />
                  </PropertyRow>
                  <PropertyRow label="Gravity Y">
                    <NumberScrubberField label="Y" value={980} onValueChange={() => {}} unit="px/s²" />
                  </PropertyRow>
                </PropertyGroup>
                <p className="type-body mt-2">
                  The body area scrolls independently when a modal has more content than the viewport.
                </p>
              </ModalShell>
            </Dialog>
          </GalleryCard>
        </div>
      </div>
    </main>
  );
}

function GalleryCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-border-default bg-surface-raised p-4 shadow-sm flex flex-col justify-between">
      <div>
        <h2 className="type-title m-0">{title}</h2>
        <p className="type-micro mb-3 mt-1 text-text-muted">{description}</p>
      </div>
      <div className="min-h-12 rounded-[10px] border border-border-subtle bg-surface-sunken p-3 flex flex-col justify-center">
        {children}
      </div>
    </section>
  );
}
