import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  AlignHorizontalSpaceAround,
  Atom,
  Ban,
  Box,
  Boxes,
  Clock,
  Eye,
  Flag,
  Gamepad2,
  History,
  Image,
  LayoutGrid,
  Map,
  Pencil,
  Play,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  Wand2,
  Wrench,
} from "lucide-react";
import type { AgentToolCallStatus } from "../lib/agent-schemas.js";
import { motionForStatus, resolveToolStage, type ToolStageKind } from "../lib/agent-tool-stage.js";
import styles from "./AgentToolGlyph.module.css";
import { cn } from "@/ui";

const KIND_ICON: Record<ToolStageKind, LucideIcon> = {
  read: Eye,
  write: Pencil,
  destructive: Trash2,
  search: ScanSearch,
  layout: AlignHorizontalSpaceAround,
  physics: Atom,
  simulate: Play,
  validate: ShieldCheck,
  asset: Image,
  recipe: Wand2,
  skill: Sparkles,
  scene: Map,
  entity: Box,
  gui: LayoutGrid,
  prefab: Boxes,
  snapshot: History,
  input: Gamepad2,
  rules: Flag,
  generic: Wrench,
};

type AgentToolGlyphProps = {
  tool: string;
  status: AgentToolCallStatus;
  size?: number;
};

export function AgentToolGlyph({ tool, status, size = 12 }: AgentToolGlyphProps) {
  const stage = resolveToolStage(tool);
  const motion = motionForStatus(stage, status);
  const Icon =
    status === "error"
      ? AlertCircle
      : status === "cancelled"
        ? Ban
        : status === "needs-approval"
          ? Clock
          : KIND_ICON[stage.kind];

  const tone =
    status === "ok"
      ? "text-accent-green"
      : status === "error"
        ? "text-error"
        : status === "running"
          ? "text-accent"
          : status === "needs-approval"
            ? "text-warning"
            : "text-text-muted";

  return (
    <span
      className={cn(
        styles["agent-tool-glyph"],
        "inline-flex shrink-0 items-center justify-center",
        tone
      )}
      data-kind={stage.kind}
      data-status={status}
      data-motion={motion}
      title={`${stage.label} · ${status}`}
    >
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}
