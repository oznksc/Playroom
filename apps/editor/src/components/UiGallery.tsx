import { useState } from "react";
import {
  Box,
  Copy,
  SlidersHorizontal,
  Play,
  Pause,
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
} from "lucide-react";
import {
  Button,
  IconButton,
  ButtonGroup,
  Switch,
  Dialog,
  Kbd,
  Badge,
  ModalShell,
  NumberScrubberField,
  PropertyGroup,
  PropertyRow,
  SegmentedControl,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type SegmentedControlOption,
} from "@/ui";

const transformOptions = [
  { value: "translate", label: "Move", icon: <Move size={12} /> },
  { value: "rotate", label: "Rotate", icon: <RotateCw size={12} /> },
  { value: "scale", label: "Scale", icon: <Maximize2 size={12} />, badge: "3D" },
] as const satisfies readonly SegmentedControlOption<"translate" | "rotate" | "scale">[];

/** Internal visual contract for shared editor primitives. Open with ?view=ui-gallery. */
export function UiGallery() {
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [activeTab, setActiveTab] = useState("entities");
  const [underlineTab, setUnderlineTab] = useState("general");
  const [x, setX] = useState(128);
  const [rotation, setRotation] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeIconButton, setActiveIconButton] = useState(false);

  return (
    <main className="min-h-full overflow-auto bg-surface-base p-5 text-text-primary sm:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <p className="type-label mb-1 uppercase tracking-[0.1em] text-signal-select">Playroom / Design System</p>
            <h1 className="m-0 text-xl font-semibold tracking-[-0.025em]">UI Component Gallery</h1>
            <p className="type-body mb-0 mt-1">Shared primitives, unified variant language, and dense IDE ergonomics.</p>
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

          {/* ── ICON BUTTONS ── */}
          <GalleryCard title="Icon Buttons" description="Compact action triggers with unified variants, active states, and sizes.">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <IconButton size="xs" variant="ghost" title="XS Ghost"><Settings size={11} /></IconButton>
                <IconButton size="sm" variant="secondary" title="SM Secondary"><Plus size={13} /></IconButton>
                <IconButton size="md" variant="solid" title="MD Solid"><Sparkles size={14} /></IconButton>
                <IconButton size="lg" variant="primary" title="LG Primary"><Play size={15} fill="currentColor" /></IconButton>
                <IconButton size="md" variant="danger" title="Danger"><Trash2 size={14} /></IconButton>
                <IconButton
                  size="md"
                  active={activeIconButton}
                  onClick={() => setActiveIconButton(!activeIconButton)}
                  title="Toggle active"
                >
                  <Check size={14} />
                </IconButton>
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

          {/* ── TABS (SEGMENTED & UNDERLINE) ── */}
          <GalleryCard title="Tab Navigation" description="Multi-style tab containers (Segmented vs Underline) cascading variants to triggers.">
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

          {/* ── SWITCH TOGGLES ── */}
          <GalleryCard title="Switch Toggles" description="Accessible boolean toggles with cyan / green signals, smooth micro-animation, and label integration.">
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
            </div>
          </GalleryCard>

          {/* ── KEYBOARD HINTS & BADGES ── */}
          <GalleryCard title="Keyboard Hints & Badges" description="Adjacent keyboard shortcut badges and status signals.">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary"><Copy size={13} /> Duplicate <Kbd>⌘D</Kbd></Button>
              <Kbd>Esc</Kbd>
              <Kbd>Space</Kbd>
              <Kbd>⌘K</Kbd>
              <Badge variant="accent">Cyan</Badge>
              <Badge variant="success">Active</Badge>
              <Badge variant="danger">Error</Badge>
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
