import { useState } from "react";
import {
  Key,
  Check,
  Plus,
  Trash2,
  Pencil,
  Loader,
  Unplug,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { PROVIDER_ICONS } from "./ProviderIcons.js";
import { useAgentKeys, type AgentKeyEntry } from "../hooks/useAgentKeys.js";
import { getApiUrl } from "../lib/api.js";
import { getSessionSecret } from "../lib/agent-keys.js";
import { Button, IconButton, Input, Badge, cn } from "@/ui";
import styles from "./AgentSettings.module.css";

export type ProviderCatalogItem = {
  id: string;
  label: string;
  defaultModel: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  hint: string;
  color: string;
  bg: string;
};

export const PROVIDERS: ProviderCatalogItem[] = [
  { id: "anthropic", label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5", requiresKey: true, defaultBaseUrl: "https://api.anthropic.com", hint: "Best at long tool loops for scene building.", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o", requiresKey: true, defaultBaseUrl: "https://api.openai.com/v1", hint: "GPT-4o and GPT-5. Uses the Chat Completions API.", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  { id: "xai", label: "xAI Grok", defaultModel: "grok-4", requiresKey: true, defaultBaseUrl: "https://api.x.ai/v1", hint: "OpenAI-compatible API. Create a key at console.x.ai.", color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  { id: "google", label: "Google AI", defaultModel: "gemini-2.0-flash", requiresKey: true, defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", hint: "Gemini via the OpenAI-compatible endpoint.", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "anthropic/claude-sonnet-4.5", requiresKey: true, defaultBaseUrl: "https://openrouter.ai/api/v1", hint: "One key for many models. Set the model id from OpenRouter.", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  { id: "ollama", label: "Ollama (local)", defaultModel: "llama3.1:8b", requiresKey: false, defaultBaseUrl: "http://localhost:11434", hint: "Run ollama serve. No API key.", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  { id: "lmstudio", label: "LM Studio (local)", defaultModel: "local-model", requiresKey: false, defaultBaseUrl: "http://127.0.0.1:1234", hint: "Start the local server in LM Studio. No API key.", color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
];

export type ProvidersPanelProps = {
  embedded?: boolean;
  onOpenSettings?: () => void;
  className?: string;
};

export function ProvidersPanel({ embedded = false, onOpenSettings, className }: ProvidersPanelProps) {
  const { keys, addKey, removeKey, osKeychain } = useAgentKeys();

  // Provider editing state
  const [editing, setEditing] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  const currentProviderCatalog = PROVIDERS.find((p) => p.id === editing);
  const needsKey = currentProviderCatalog?.requiresKey ?? true;
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

  function cancelEdit() {
    setEditing(null);
    setApiKey("");
    setPassphrase("");
    setModel("");
    setBaseUrl("");
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

    cancelEdit();
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-transparent", className)}>
      {embedded && (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-white/[0.06] px-3">
          <div className="flex items-center gap-2 text-[11px] text-[rgba(245,245,247,0.75)]">
            <Key size={13} className="text-accent" />
            <span className="font-semibold tracking-[-0.01em]">AI Providers & Keyring</span>
            <Badge variant={keys.length > 0 ? "green" : "muted"} className="font-mono text-[9px]">
              {keys.length} connected
            </Badge>
            <span className="hidden items-center gap-1 text-[10px] text-text-muted md:inline-flex">
              {osKeychain ? (
                <>
                  <ShieldCheck size={11} className="text-accent-green" /> OS Keychain
                </>
              ) : (
                <>
                  <Lock size={11} className="text-text-muted" /> Browser Encrypted
                </>
              )}
            </span>
          </div>
          {onOpenSettings && (
            <Button size="sm" variant="ghost" onClick={onOpenSettings} className="text-[11px]">
              <Sparkles size={12} className="mr-1 inline text-accent-purple" /> Full Settings
            </Button>
          )}
        </div>
      )}

      <div className={cn("min-h-0 flex-1 overflow-auto p-4", embedded && "max-w-4xl mx-auto w-full")}>
        <div className="space-y-2">
          {!embedded && (
            <p className={styles["agent-settings-section-desc"]}>
              Connect at least one provider. Keys stay on this machine
              {osKeychain ? " (OS keychain)" : " (encrypted in the browser)"}.
            </p>
          )}
          <div className="space-y-1.5">
            {PROVIDERS.map((p) => {
              const entry = getKeyStatus(p.id);
              const isEditing = editing === p.id;
              return (
                <div key={p.id}>
                  <div
                    className={cn(styles["provider-card"], entry && styles.connected, isEditing && styles.editing)}
                    style={isEditing ? { borderRadius: "12px 12px 0 0" } : undefined}
                  >
                    <div
                      className={styles["provider-card-avatar"]}
                      style={{ background: p.bg, color: p.color }}
                    >
                      {PROVIDER_ICONS[p.id]
                        ? PROVIDER_ICONS[p.id]({ size: 18 })
                        : p.label[0]}
                    </div>
                    <div className={styles["provider-card-info"]}>
                      <div className={styles["provider-card-name"]}>{p.label}</div>
                      <div className={styles["provider-card-hint"]}>
                        {entry ? (
                          <span className="font-mono text-[10px] text-text-muted">{entry.model ?? p.defaultModel}</span>
                        ) : (
                          p.hint
                        )}
                      </div>
                    </div>
                    <div className={styles["provider-card-actions"]}>
                      {entry ? (
                        <>
                          <Badge variant="green" className="mr-1">
                            {entry.storage === "keychain" ? "keychain" : "connected"}
                          </Badge>
                          <IconButton
                            size="sm"
                            title={isEditing ? "Collapse" : "Edit"}
                            onClick={() => (isEditing ? cancelEdit() : startEdit(p.id, entry))}
                          >
                            {isEditing ? <ChevronUp size={12} /> : <Pencil size={12} />}
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
                          variant={isEditing ? "ghost" : "solid"}
                          onClick={() => (isEditing ? cancelEdit() : startEdit(p.id))}
                        >
                          {isEditing ? <ChevronUp size={12} /> : <Plus size={12} />}
                          {isEditing ? "Cancel" : "Add"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className={styles["provider-card-form"]}>
                      {needsKey && (
                        <label className={styles["provider-card-form-label"]}>
                          <span>
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
                      <label className={styles["provider-card-form-label"]}>
                        <span>Model</span>
                        <Input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder={currentProviderCatalog?.defaultModel}
                        />
                      </label>
                      <label className={styles["provider-card-form-label"]}>
                        <span>Base URL</span>
                        <Input
                          type="text"
                          value={baseUrl}
                          onChange={(e) => setBaseUrl(e.target.value)}
                          placeholder={currentProviderCatalog?.defaultBaseUrl}
                        />
                      </label>
                      {needsPassphrase && (
                        <label className={styles["provider-card-form-label"]}>
                          <span>Passphrase</span>
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
                          {testResult.ok ? "✓ Connection successful." : `✕ Failed: ${testResult.reason ?? "unknown"}`}
                        </p>
                      )}
                      {needsKey && (
                        <p className="m-0 text-[10px] leading-relaxed text-text-muted">
                          {osKeychain
                            ? "Key is stored in the OS keychain. It never leaves your machine."
                            : "Key is encrypted and stored in this browser only."}
                        </p>
                      )}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button variant="ghost" size="md" onClick={cancelEdit}>
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
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
