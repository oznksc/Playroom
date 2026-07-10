import { useState } from "react";
import { Key, Check, Plus, Trash2 } from "lucide-react";
import { useAgentKeys, type AgentKeyEntry } from "../hooks/useAgentKeys.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Button,
  IconButton,
  Input,
  Badge,
} from "@/ui";

type AgentSettingsProps = {
  open: boolean;
  onClose: () => void;
};

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5", requiresKey: true },
  { id: "openrouter", label: "OpenRouter", defaultModel: "meta-llama/llama-3.3-70b-instruct", requiresKey: true },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o", requiresKey: true },
  { id: "google", label: "Google AI", defaultModel: "gemini-2.0-flash", requiresKey: true },
  { id: "ollama", label: "Ollama (local)", defaultModel: "llama3.1:8b", requiresKey: false },
  { id: "lmstudio", label: "LM Studio (local)", defaultModel: "local-model", requiresKey: false },
];

export function AgentSettings({ open, onClose }: AgentSettingsProps) {
  const { keys, addKey, removeKey, osKeychain } = useAgentKeys();
  const [editing, setEditing] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const currentProvider = PROVIDERS.find((p) => p.id === editing);
  const needsKey = currentProvider?.requiresKey ?? true;
  const needsPassphrase = needsKey && !osKeychain;

  function getKeyStatus(providerId: string): AgentKeyEntry | undefined {
    return keys.find((k) => k.provider === providerId);
  }

  async function handleSave() {
    if (!editing) return;
    if (needsKey && !apiKey) return;
    if (needsPassphrase && !passphrase) return;
    const pass = needsPassphrase ? passphrase : "local";
    const key = needsKey ? apiKey : "local";
    await addKey(editing, key, pass, model || undefined, baseUrl || undefined);

    localStorage.setItem("gamekit:agent:activeProvider", editing);
    if (model) {
      localStorage.setItem("gamekit:agent:activeModel", model);
    } else {
      localStorage.removeItem("gamekit:agent:activeModel");
    }

    setEditing(null);
    setApiKey("");
    setPassphrase("");
    setModel("");
    setBaseUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(560px,calc(100vw-32px))]">
        <DialogHeader>
          <Key size={14} className="text-accent" />
          <DialogTitle className="text-[12px]">AI Providers</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="overflow-hidden rounded-md border border-border-default">
            <table className="w-full border-collapse text-left text-[11px]">
              <thead className="bg-bg-base text-[9px] uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">Provider</th>
                  <th className="px-3 py-2 font-semibold">Model</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => {
                  const entry = getKeyStatus(p.id);
                  return (
                    <tr key={p.id} className="border-t border-border-default">
                      <td className="px-3 py-2 text-text-primary">{p.label}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-text-muted">
                        {entry?.model ?? p.defaultModel}
                      </td>
                      <td className="px-3 py-2">
                        {entry ? (
                          <Badge variant="green">
                            {entry.storage === "keychain" ? "keychain" : "connected"}
                          </Badge>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {entry ? (
                          <IconButton
                            size="sm"
                            variant="danger"
                            onClick={() => void removeKey(p.id)}
                            title="Remove"
                          >
                            <Trash2 size={12} />
                          </IconButton>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditing(p.id);
                              setModel(p.defaultModel);
                            }}
                          >
                            <Plus size={12} /> Add
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editing && (
            <div className="space-y-2 rounded-md border border-border-default bg-bg-base p-3">
              <h4 className="m-0 text-[11px] font-semibold text-text-primary">
                Connect {currentProvider?.label}
              </h4>
              {needsKey && (
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    API Key
                  </span>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </label>
              )}
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Model
                </span>
                <Input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={currentProvider?.defaultModel}
                />
              </label>
              {(!needsKey || editing === "openrouter" || editing === "openai") && (
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Base URL {needsKey && "(optional)"}
                  </span>
                  <Input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={
                      editing === "openrouter"
                        ? "https://openrouter.ai/api/v1"
                        : editing === "openai"
                          ? "https://api.openai.com/v1"
                          : "http://127.0.0.1:1234"
                    }
                  />
                </label>
              )}
              {needsPassphrase && (
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Passphrase
                  </span>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                  />
                </label>
              )}
              {needsKey && (
                <p className="m-0 text-[10px] leading-relaxed text-text-muted">
                  {osKeychain
                    ? "Key is stored in the OS keychain. It never leaves your machine."
                    : "Key is encrypted and stored in this browser only. It never leaves your machine."}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="md" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleSave()}
                  disabled={needsKey ? !apiKey || (needsPassphrase && !passphrase) : false}
                >
                  <Check size={12} /> Connect
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
