import { useEffect, useState } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { getApiUrl } from "../lib/api.js";

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

  if (!open) return null;

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
    <div className="wizard-overlay" onClick={onClose}>
      <div className="wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <Sparkles size={14} />
          <span>New scene from template</span>
          <button type="button" className="wizard-close" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>
        <p className="wizard-intro">
          Pick a genre template. A new scene is created with entities, colliders, and input bindings.
        </p>
        <div className="wizard-list">
          {loading ? (
            <p className="wizard-empty">Loading templates…</p>
          ) : skills.length === 0 ? (
            <p className="wizard-empty">No skill templates found.</p>
          ) : (
            skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                className="wizard-skill"
                disabled={!!applying}
                onClick={() => void apply(skill)}
              >
                <span className="wizard-skill-main">
                  <span className="wizard-skill-name">{skill.name}</span>
                  <span className="wizard-skill-desc">{skill.description}</span>
                  <span className="wizard-skill-meta">
                    {skill.id} · {skill.entityCount} entities
                  </span>
                </span>
                <ChevronRight size={14} />
              </button>
            ))
          )}
        </div>
        {applying && <div className="wizard-status">Applying {applying}…</div>}
      </div>
    </div>
  );
}
