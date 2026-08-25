import { useState } from "react";
import { Key, Check, Plus, Trash2, Pencil, Loader, Unplug } from "lucide-react";
import { useAgentKeys, type AgentKeyEntry } from "../hooks/useAgentKeys.js";
import { getApiUrl } from "../lib/api.js";
import { getSessionSecret } from "../lib/agent-keys.js";
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
  { id: "anthropic", label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5", requiresKey: true, defaultBaseUrl: "https://api.anthropic.com" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o", requiresKey: true, defaultBaseUrl: "https://api.openai.com/v1" },
  { id: "xai", label: "xAI Grok", defaultModel: "grok-4", requiresKey: true, defaultBaseUrl: "https://api.x.ai/v1" },
  { id: "google", label: "Google AI", defaultModel: "gemini-2.0-flash", requiresKey: true, defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "anthropic/claude-sonnet-4.5", requiresKey: true, defaultBaseUrl: "https://openrouter.ai/api/v1" },
  { id: "ollama", label: "Ollama (local)", defaultModel: "llama3.1:8b", requiresKey: false, defaultBaseUrl: "http://localhost:11434" },
  { id: "lmstudio", label: "LM Studio (local)", defaultModel: "local-model", requiresKey: false, defaultBaseUrl: "http://127.0.0.1:1234" },
];

export function AgentSettings({ open, onClose }: AgentSettingsProps) {
  const { keys, addKey, removeKey, osKeychain } = useAgentKeys();
  const [editing, setEditing] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  const currentProvider = PROVIDERS.find((p) => p.id === editing);
  const needsKey = currentProvider?.requiresKey ?? true;
  const needsPassphrase = needsKey && !osKeychain;
  const existing = editing ? keys.find((k) => k.provider === editing) : undefined;

  function getKeyStatus(providerId: string): AgentKeyEntry | undefined {
    return keys.find((k) => k.provider === providerId);
  }

  function startEdit(providerId: string, entry?: AgentKeyEntry) {
    const catalog = PROVIDERS.find((p) => p.id === providerId);
    setEditing(providerId);
    setApiKey("");
    setPassphrase("");
    setModel(entry?.model || catalog?.defaultModel || "");
    setBaseUrl(entry?.baseUrl || catalog?.defaultBaseUrl || "");
    setTestResult(null);
  }

  async function handleTest() {
    if (!editing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(getApiUrl("/api/agent/validate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: editing,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };
      setTestResult({ ok: data.ok === true, reason: data.reason });
    } catch (e) {
      setTestResult({ ok: false, reason: e instanceof Error ? e.message : "Validate failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    if (needsKey && !apiKey && !existing && !getSessionSecret(editing)) return;
    if (needsPassphrase && !passphrase && !existing && !getSessionSecret(editing)) return;
    const pass = needsPassphrase ? passphrase || "local" : "local";
    const key = needsKey ? apiKey || getSessionSecret(editing) || "" : "local";
    if (needsKey && !key) {
      localStorage.setItem("gamekit:agent:activeProvider", editing);
      if (model) localStorage.setItem("gamekit:agent:activeModel", model);
      setEditing(null);
      return;
    }
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
    setTestResult(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(620px,calc(100vw-32px))]">
        <DialogHeader>
          <Key size={14} className="text-accent" />
          <DialogTitle className="text-[12px]">AI Providers</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <p className="m-0 text-[11px] leading-relaxed text-text-secondary">
            Connect at least one provider. Keys stay on this machine
            {osKeychain ? " (OS keychain)" : " (encrypted in the browser)"}. The editor sends the key with each chat so a CLI restart does not drop the session.
          </p>
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
                        <div className="flex items-center gap-1">
                          {entry ? (
                            <>
                              <IconButton
                                size="sm"
                                title="Edit"
                                onClick={() => startEdit(p.id, entry)}
                              >
                                <Pencil size={12} />
                              </IconButton>
                              <IconButton
                                size="sm"
                                variant="danger"
                                onClick={() => void removeKey(p.id)}
                                title="Remove"
                              >
                                <Trash2 size={12} />
                              </IconButton>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => startEdit(p.id)}
                            >
                              <Plus size={12} /> Add
                            </Button>
                          )}
                        </div>
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
                {existing ? "Update" : "Connect"} {currentProvider?.label}
              </h4>
              {needsKey && (
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    API Key {existing && !apiKey ? "(leave blank to keep)" : ""}
                  </span>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={existing ? "••••••••" : "sk-..."}
                    autoComplete="off"
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
              <label className="block space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                  Base URL
                </span>
                <Input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={currentProvider?.defaultBaseUrl}
                />
              </label>
              {needsPassphrase && (
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    Passphrase
                  </span>
                  <Input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Encrypts the key in this browser"
                  />
                </label>
              )}
              {testResult && (
                <p className={`m-0 text-[10px] ${testResult.ok ? "text-accent-green" : "text-error"}`}>
                  {testResult.ok ? "Connection ok." : `Failed: ${testResult.reason ?? "unknown"}`}
                </p>
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
                <Button variant="secondary" size="md" onClick={() => void handleTest()} disabled={testing}>
                  {testing ? <Loader size={12} className="animate-spin" /> : <Unplug size={12} />} Test
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void handleSave()}
                  disabled={needsKey && !existing ? !apiKey || (needsPassphrase && !passphrase) : false}
                >
                  <Check size={12} /> {existing ? "Save" : "Connect"}
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
