import { useState } from "react";
import { Box, Copy, SlidersHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  Kbd,
  ModalShell,
  NumberScrubberField,
  PropertyGroup,
  PropertyRow,
  SegmentedControl,
  type SegmentedControlOption,
} from "@/ui";

const transformOptions = [
  { value: "translate", label: "Move" },
  { value: "rotate", label: "Rotate" },
  { value: "scale", label: "Scale" },
] as const satisfies readonly SegmentedControlOption<"translate" | "rotate" | "scale">[];

/** Internal visual contract for shared editor primitives. Open with ?view=ui-gallery. */
export function UiGallery() {
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">("translate");
  const [x, setX] = useState(128);
  const [rotation, setRotation] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <main className="min-h-full overflow-auto bg-surface-base p-5 text-text-primary sm:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <p className="type-label mb-1 uppercase tracking-[0.1em] text-signal-select">Playroom / internal</p>
            <h1 className="m-0 text-xl font-semibold tracking-[-0.025em]">UI gallery</h1>
            <p className="type-body mb-0 mt-1">Shared primitives and their intended editor density.</p>
          </div>
          <div className="flex items-center gap-1.5 type-micro"><span>Open with</span><Kbd>?view=ui-gallery</Kbd></div>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <GalleryCard title="Transform modes" description="Segmented choice for mutually exclusive editor modes.">
            <SegmentedControl value={mode} onValueChange={setMode} options={transformOptions} ariaLabel="Transform mode" />
            <p className="type-micro mt-3">Active mode: <span className="type-mono text-signal-select">{mode}</span></p>
          </GalleryCard>

          <GalleryCard title="Keyboard hints" description="Keep shortcuts compact and adjacent to the action they describe.">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary"><Copy size={13} /> Duplicate <Kbd>⌘D</Kbd></Button>
              <Kbd>Esc</Kbd><Kbd>Space</Kbd><Kbd>⌘K</Kbd>
            </div>
          </GalleryCard>

          <GalleryCard title="Inspector properties" description="Drag a label horizontally or enter a value directly.">
            <PropertyGroup title="Transform" className="border-0 py-0">
              <PropertyRow label="Position X" hint="World-space horizontal position.">
                <NumberScrubberField label="X" value={x} onValueChange={setX} unit="px" />
              </PropertyRow>
              <PropertyRow label="Rotation" hint="Clockwise angle in degrees.">
                <NumberScrubberField label="R" value={rotation} onValueChange={setRotation} unit="deg" step={5} />
              </PropertyRow>
            </PropertyGroup>
          </GalleryCard>

          <GalleryCard title="Modal anatomy" description="A single shell with a fixed title bar, scrolling content, and sticky actions.">
            <Button variant="secondary" onClick={() => setModalOpen(true)}><SlidersHorizontal size={13} /> Open modal</Button>
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
              <ModalShell
                className="w-[min(480px,calc(100vw-32px))]"
                title="Physics settings"
                description="Configure world gravity and collision behaviour."
                icon={<Box size={15} />}
                onClose={() => setModalOpen(false)}
                footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setModalOpen(false)}>Apply changes</Button></>}
              >
                <PropertyGroup title="World">
                  <PropertyRow label="Gravity X"><NumberScrubberField label="X" value={0} onValueChange={() => {}} unit="px/s²" /></PropertyRow>
                  <PropertyRow label="Gravity Y"><NumberScrubberField label="Y" value={980} onValueChange={() => {}} unit="px/s²" /></PropertyRow>
                </PropertyGroup>
                <p className="type-body">The body area scrolls independently when a modal has more content than the viewport.</p>
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
    <section className="rounded-[14px] border border-border-default bg-surface-raised p-4 shadow-sm">
      <h2 className="type-title m-0">{title}</h2>
      <p className="type-micro mb-4 mt-1">{description}</p>
      <div className="min-h-12 rounded-[10px] border border-border-subtle bg-surface-sunken p-3">{children}</div>
    </section>
  );
}
