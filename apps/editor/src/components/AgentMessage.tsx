import { Bot, User } from "lucide-react";
import type { AgentMessage as AgentMessageType } from "../lib/agent-schemas.js";

type AgentMessageProps = {
  message: AgentMessageType;
};

export function AgentMessage({ message }: AgentMessageProps) {
  if (message.role === "system") {
    return (
      <div className="agent-msg agent-msg-system">
        <span className="agent-msg-content">{message.content}</span>
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="agent-msg agent-msg-user">
        <div className="agent-msg-avatar">
          <User size={14} />
        </div>
        <div className="agent-msg-body">
          <span className="agent-msg-content">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-msg agent-msg-agent">
      <div className="agent-msg-avatar agent-msg-avatar-agent">
        <Bot size={14} />
      </div>
      <div className="agent-msg-body">
        <span className="agent-msg-content">{message.content}</span>
      </div>
    </div>
  );
}
