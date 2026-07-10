import { Bot, User } from "lucide-react";
import type { AgentMessage as AgentMessageType } from "../lib/agent-schemas.js";
import { cn } from "@/ui";

type AgentMessageProps = {
  message: AgentMessageType;
};

export function AgentMessage({ message }: AgentMessageProps) {
  if (message.role === "system") {
    return (
      <div className="mb-2 rounded-md border border-border-default bg-bg-base/60 px-2.5 py-1.5 text-center text-[10px] text-text-muted">
        {message.content}
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={cn("mb-2.5 flex gap-2", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md border",
          isUser
            ? "border-border-default bg-bg-elevated text-text-secondary"
            : "border-accent-purple/40 bg-accent-purple/15 text-accent-purple"
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-md border px-2.5 py-1.5 text-[12px] leading-relaxed",
          isUser
            ? "border-border-default bg-bg-elevated text-text-primary"
            : "border-border-default bg-bg-base text-text-secondary"
        )}
      >
        <span className="whitespace-pre-wrap break-words">{message.content}</span>
      </div>
    </div>
  );
}
