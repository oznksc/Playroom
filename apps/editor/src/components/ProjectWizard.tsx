import { useEffect, useState } from "react";
import { Sparkles, ChevronRight, LayoutTemplate } from "lucide-react";
import { getApiUrl } from "../lib/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  Button,
  EmptyState,
  Badge,
  cn,
} from "@/ui";

export type SkillOption = {
  id: string;
  name: string;
  description: string;
  entityCount: number;
};

type ProjectWizardProps = {
  open: boolean;
  onClose: () => void;
  onApplied: (sceneFile: string) => void;
  onStatus?: (message: string) => void;
};

export function ProjectWizard({ open, onClose, onApplied, onStatus }: ProjectWizardProps) {
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch(getApiUrl("/api/skills"))
      .then((r) => r.json())
      .then((data: { skills?: SkillOption[] }) => {
        if (!cancelled) setSkills(data.skills ?? []);
      })
      .catch(() => {
        if (!cancelled) onStatus?.("Failed to load skill templates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, onStatus]);

  async function apply(skill: SkillOption) {
    setApplying(skill.id);
    try {
      const res = await fetch(getApiUrl("/api/skills/apply"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ skillId: skill.id }),
      });
      const body = (await res.json()) as { ok?: boolean; filename?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Apply failed");
      onStatus?.(`Applied ${skill.name} → ${body.filename}`);
      onApplied(body.filename ?? "main.scene.json");
      onClose();
    } catch (e) {
      onStatus?.(e instanceof Error ? e.message : "Apply skill failed");
    } finally {
      setApplying(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(480px,calc(100vw-32px))]">
        <DialogHeader>
          <Sparkles size={14} className="text-accent" />
          <DialogTitle className="text-[12px]">New scene from template</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <DialogDescription>
            Pick a genre template. A new scene is created with entities, colliders, and input bindings.
          </DialogDescription>
          <div className="flex max-h-[360px] flex-col gap-1.5 overflow-auto">
            {loading ? (
              <p className="py-8 text-center text-[11px] text-text-muted">Loading templates…</p>
            ) : skills.length === 0 ? (
              <EmptyState
                icon={<LayoutTemplate size={16} />}
                title="No templates"
                description="Skill templates were not found for this project."
              />
            ) : (
              skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  disabled={applying !== null}
                  onClick={() => apply(skill)}
                  className={cn(
                    "group flex w-full items-start gap-3 rounded-md border border-border-default bg-bg-base p-3 text-left transition-colors",
                    "hover:border-accent/40 hover:bg-bg-hover",
                    applying === skill.id && "border-accent/50 bg-accent-muted"
                  )}
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border-default bg-bg-elevated text-accent">
                    <LayoutTemplate size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-text-primary">{skill.name}</span>
                      <Badge variant="muted">{skill.entityCount} entities</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-text-muted">{skill.description}</p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="mt-1 shrink-0 text-text-muted group-hover:text-accent"
                  />
                </button>
              ))
            )}
          </div>
          {applying && (
            <p className="text-center text-[10px] text-accent">Applying template…</p>
          )}
          <div className="flex justify-end pt-1">
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
