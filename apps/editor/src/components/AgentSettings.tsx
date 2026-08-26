import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Check,
  Plus,
  Trash2,
  Pencil,
  Loader,
  Unplug,
  Zap,
  Shield,
  CheckCircle,
  ClipboardList,
  Sparkles,
  Globe,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { PROVIDER_ICONS } from "./ProviderIcons.js";
import { useAgentKeys, type AgentKeyEntry } from "../hooks/useAgentKeys.js";
import { getApiUrl } from "../lib/api.js";
import { getSessionSecret } from "../lib/agent-keys.js";
import type { ApprovalMode } from "../lib/approval-mode.js";
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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  CheckboxField,
} from "@/ui";

type AgentSettingsProps = {
  open: boolean;
  onClose: () => void;
};

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5", requiresKey: true, defaultBaseUrl: "https://api.anthropic.com", hint: "Best at long tool loops for scene building.", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-4o", requiresKey: true, defaultBaseUrl: "https://api.openai.com/v1", hint: "GPT-4o and GPT-5. Uses the Chat Completions API.", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
  { id: "xai", label: "xAI Grok", defaultModel: "grok-4", requiresKey: true, defaultBaseUrl: "https://api.x.ai/v1", hint: "OpenAI-compatible API. Create a key at console.x.ai.", color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  { id: "google", label: "Google AI", defaultModel: "gemini-2.0-flash", requiresKey: true, defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", hint: "Gemini via the OpenAI-compatible endpoint.", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
  { id: "openrouter", label: "OpenRouter", defaultModel: "anthropic/claude-sonnet-4.5", requiresKey: true, defaultBaseUrl: "https://openrouter.ai/api/v1", hint: "One key for many models. Set the model id from OpenRouter.", color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  { id: "ollama", label: "Ollama (local)", defaultModel: "llama3.1:8b", requiresKey: false, defaultBaseUrl: "http://localhost:11434", hint: "Run ollama serve. No API key.", color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
  { id: "lmstudio", label: "LM Studio (local)", defaultModel: "local-model", requiresKey: false, defaultBaseUrl: "http://127.0.0.1:1234", hint: "Start the local server in LM Studio. No API key.", color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
];

const APPROVAL_MODES: Array<{
  value: ApprovalMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  { value: "off", label: "Auto Approve", desc: "No confirmation needed", icon: <Zap size={14} className="text-yellow-400" /> },
  { value: "destructive-only", label: "Destructive Only", desc: "Only remove/delete operations", icon: <Shield size={14} className="text-cyan-400" /> },
  { value: "always", label: "Always Approve", desc: "Every tool call", icon: <CheckCircle size={14} className="text-green-400" /> },
  { value: "plan", label: "Plan + Approve", desc: "Plan first, then confirm", icon: <ClipboardList size={14} className="text-purple-400" /> },
];

const LANGUAGES = [
  { value: "auto", label: "Auto (match user)" },
  { value: "en", label: "English" },
  { value: "tr", label: "Turkish" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
];

export function AgentSettings({ open, onClose }: AgentSettingsProps) {
  const { keys, addKey, removeKey, osKeychain } = useAgentKeys();
  const [tab, setTab] = useState("providers");

  // Provider editing state
  const [editing, setEditing] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; reason?: string } | null>(null);

  // Model tab state
  const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem("gamekit:agent:activeProvider") || "");
  const [activeModel, setActiveModel] = useState(() => localStorage.getItem("gamekit:agent:activeModel") || "");
  const [temperature, setTemperature] = useState(() => parseFloat(localStorage.getItem("gamekit:agent:temperature") || "1"));
  const [maxTokens, setMaxTokens] = useState(() => parseInt(localStorage.getItem("gamekit:agent:maxTokens") || "4096", 10));
  const [topP, setTopP] = useState(() => parseFloat(localStorage.getItem("gamekit:agent:topP") || "1"));
  const [modelsList, setModelsList] = useState<string[]>([]);

  // Agent tab state
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(() => (localStorage.getItem("gamekit:agent:approvalMode") as ApprovalMode) || "destructive-only");
  const [planMode, setPlanMode] = useState(() => localStorage.getItem("gamekit:agent:planMode") === "1");
  const [maxTurns, setMaxTurns] = useState(() => parseInt(localStorage.getItem("gamekit:agent:maxTurns") || "25", 10));
  const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem("gamekit:agent:customInstructions") || "");
  const [responseLanguage, setResponseLanguage] = useState(() => localStorage.getItem("gamekit:agent:responseLanguage") || "auto");

  const resolvedProvider = activeProvider || (keys.length > 0 ? keys[0].provider : "anthropic");
  const currentProviderCatalog = PROVIDERS.find((p) => p.id === editing);
  const needsKey = currentProviderCatalog?.requiresKey ?? true;
  const needsPassphrase = needsKey && !osKeychain;
  const existing = editing ? keys.find((k) => k.provider === editing) : undefined;

  // Fetch models when provider changes
  useEffect(() => {
    let active = true;
    async function fetchModels() {
      try {
        const res = await fetch(getApiUrl(`/api/agent/models/${resolvedProvider}`));
        if (!res.ok) return;
        const data = (await res.json()) as { models?: string[] };
        if (active && data.models) {
          setModelsList(data.models);
        }
      } catch {
        // ignore
      }
    }
    fetchModels();
    return () => { active = false; };
  }, [resolvedProvider]);

  // Persist model settings
  const persistModelSetting = useCallback((key: string, value: string) => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
  }, []);

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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(680px,calc(100vw-32px))]">
        <DialogHeader>
          <Sparkles size={14} className="text-accent-purple" />
          <DialogTitle className="text-[12px]">Agent Settings</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-0">
          <Tabs value={tab} onValueChange={setTab} className="agent-settings-tabs">
            <div className="px-4 pt-3 pb-2">
              <TabsList>
                <TabsTrigger value="providers">
                  <Key size={11} className="mr-1 inline" /> Providers
                </TabsTrigger>
                <TabsTrigger value="model">
                  <Cpu size={11} className="mr-1 inline" /> Model
                </TabsTrigger>
                <TabsTrigger value="agent">
                  <Sparkles size={11} className="mr-1 inline" /> Agent
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ─── Providers Tab ─── */}
            <TabsContent value="providers" className="overflow-auto px-4 pb-4">
              <div className="space-y-1.5">
                <p className="agent-settings-section-desc">
                  Connect at least one provider. Keys stay on this machine
                  {osKeychain ? " (OS keychain)" : " (encrypted in the browser)"}.
                </p>
                <div className="space-y-1.5">
                  {PROVIDERS.map((p) => {
                    const entry = getKeyStatus(p.id);
                    const isEditing = editing === p.id;
                    return (
                      <div key={p.id}>
                        <div
                          className={`provider-card ${entry ? "connected" : ""} ${isEditing ? "editing" : ""}`}
                          style={isEditing ? { borderRadius: "12px 12px 0 0" } : undefined}
                        >
                          <div
                            className="provider-card-avatar"
                            style={{ background: p.bg, color: p.color }}
                          >
                            {PROVIDER_ICONS[p.id]
                              ? PROVIDER_ICONS[p.id]({ size: 18 })
                              : p.label[0]}
                          </div>
                          <div className="provider-card-info">
                            <div className="provider-card-name">{p.label}</div>
                            <div className="provider-card-hint">
                              {entry ? (
                                <span className="font-mono text-[10px] text-text-muted">{entry.model ?? p.defaultModel}</span>
                              ) : (
                                p.hint
                              )}
                            </div>
                          </div>
                          <div className="provider-card-actions">
                            {entry ? (
                              <>
                                <Badge variant="green" className="mr-1">
                                  {entry.storage === "keychain" ? "keychain" : "connected"}
                                </Badge>
                                <IconButton
                                  size="sm"
                                  title={isEditing ? "Collapse" : "Edit"}
                                  onClick={() => isEditing ? cancelEdit() : startEdit(p.id, entry)}
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
                                onClick={() => isEditing ? cancelEdit() : startEdit(p.id)}
                              >
                                {isEditing ? <ChevronUp size={12} /> : <Plus size={12} />}
                                {isEditing ? "Cancel" : "Add"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isEditing && (
                          <div className="provider-card-form">
                            {needsKey && (
                              <label className="provider-card-form-label">
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
                            <label className="provider-card-form-label">
                              <span>Model</span>
                              <Input
                                type="text"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                placeholder={currentProviderCatalog?.defaultModel}
                              />
                            </label>
                            <label className="provider-card-form-label">
                              <span>Base URL</span>
                              <Input
                                type="text"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                placeholder={currentProviderCatalog?.defaultBaseUrl}
                              />
                            </label>
                            {needsPassphrase && (
                              <label className="provider-card-form-label">
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
            </TabsContent>

            {/* ─── Model Tab ─── */}
            <TabsContent value="model" className="overflow-auto px-4 pb-4">
              <div className="space-y-4">
                {/* Active Provider */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Active Provider</h4>
                  <Select
                    value={resolvedProvider}
                    onChange={(e) => {
                      const newProv = e.target.value;
                      setActiveProvider(newProv);
                      persistModelSetting("gamekit:agent:activeProvider", newProv);
                      const entry = keys.find((k) => k.provider === newProv);
                      const catalog = PROVIDERS.find((p) => p.id === newProv);
                      const newModel = entry?.model || catalog?.defaultModel || "";
                      setActiveModel(newModel);
                      persistModelSetting("gamekit:agent:activeModel", newModel);
                    }}
                  >
                    {keys.length > 0 ? (
                      keys.map((k) => (
                        <option key={k.provider} value={k.provider}>
                          {PROVIDERS.find((p) => p.id === k.provider)?.label || k.provider}
                        </option>
                      ))
                    ) : (
                      PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))
                    )}
                  </Select>
                </div>

                {/* Model Selection */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Model</h4>
                  {modelsList.length > 0 ? (
                    <Select
                      value={activeModel || resolvedProvider && PROVIDERS.find((p) => p.id === resolvedProvider)?.defaultModel || ""}
                      onChange={(e) => {
                        setActiveModel(e.target.value);
                        persistModelSetting("gamekit:agent:activeModel", e.target.value);
                      }}
                    >
                      {modelsList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                      {activeModel && !modelsList.includes(activeModel) && (
                        <option value={activeModel}>{activeModel} (custom)</option>
                      )}
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      value={activeModel || PROVIDERS.find((p) => p.id === resolvedProvider)?.defaultModel || ""}
                      onChange={(e) => {
                        setActiveModel(e.target.value);
                        persistModelSetting("gamekit:agent:activeModel", e.target.value);
                      }}
                      placeholder="Enter model name"
                    />
                  )}
                  <p className="agent-settings-section-desc">
                    {modelsList.length > 0
                      ? `${modelsList.length} models available from ${PROVIDERS.find((p) => p.id === resolvedProvider)?.label ?? resolvedProvider}.`
                      : "Type a model name or connect a provider to see available models."}
                  </p>
                </div>

                <div className="agent-settings-divider" />

                {/* Temperature */}
                <div className="agent-range">
                  <div className="agent-range-header">
                    <span className="agent-range-label">Temperature</span>
                    <span className="agent-range-value">{temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTemperature(v);
                      persistModelSetting("gamekit:agent:temperature", v.toString());
                    }}
                  />
                  <p className="agent-settings-section-desc">
                    Lower values produce more focused output; higher values increase creativity.
                  </p>
                </div>

                {/* Max Tokens */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Max Output Tokens</h4>
                  <Input
                    type="number"
                    value={maxTokens.toString()}
                    onChange={(e) => {
                      const v = Math.max(256, Math.min(16384, parseInt(e.target.value, 10) || 4096));
                      setMaxTokens(v);
                      persistModelSetting("gamekit:agent:maxTokens", v.toString());
                    }}
                    placeholder="4096"
                  />
                  <p className="agent-settings-section-desc">
                    Maximum number of tokens in a single response (256 – 16,384).
                  </p>
                </div>

                {/* Top-p */}
                <div className="agent-range">
                  <div className="agent-range-header">
                    <span className="agent-range-label">Top-p (Nucleus Sampling)</span>
                    <span className="agent-range-value">{topP.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setTopP(v);
                      persistModelSetting("gamekit:agent:topP", v.toString());
                    }}
                  />
                  <p className="agent-settings-section-desc">
                    Controls diversity by limiting tokens to the top-p probability mass.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ─── Agent Tab ─── */}
            <TabsContent value="agent" className="overflow-auto px-4 pb-4">
              <div className="space-y-4">
                {/* Approval Mode */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Tool Approval Mode</h4>
                  <div className="radio-card-group">
                    {APPROVAL_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        className={`radio-card ${approvalMode === mode.value ? "active" : ""}`}
                        onClick={() => {
                          setApprovalMode(mode.value);
                          localStorage.setItem("gamekit:agent:approvalMode", mode.value);
                          window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
                        }}
                      >
                        <div className="radio-card-icon">{mode.icon}</div>
                        <div>
                          <div className="radio-card-label">{mode.label}</div>
                          <div className="radio-card-desc">{mode.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan First */}
                <div className="agent-settings-section">
                  <CheckboxField
                    label="Plan first — propose steps before executing tools"
                    checked={planMode}
                    onChange={(checked) => {
                      setPlanMode(checked);
                      localStorage.setItem("gamekit:agent:planMode", checked ? "1" : "0");
                      window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
                    }}
                  />
                </div>

                <div className="agent-settings-divider" />

                {/* Max Tool Turns */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Max Tool Turns</h4>
                  <Input
                    type="number"
                    value={maxTurns.toString()}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 25));
                      setMaxTurns(v);
                      localStorage.setItem("gamekit:agent:maxTurns", v.toString());
                    }}
                    placeholder="25"
                  />
                  <p className="agent-settings-section-desc">
                    Maximum number of tool call rounds per agent response (1 – 50).
                  </p>
                </div>

                {/* Response Language */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Response Language</h4>
                  <Select
                    value={responseLanguage}
                    onChange={(e) => {
                      setResponseLanguage(e.target.value);
                      localStorage.setItem("gamekit:agent:responseLanguage", e.target.value);
                    }}
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                  </Select>
                  <p className="agent-settings-section-desc">
                    Language for agent responses. "Auto" matches the language you write in.
                  </p>
                </div>

                <div className="agent-settings-divider" />

                {/* Custom Instructions */}
                <div className="agent-settings-section">
                  <h4 className="agent-settings-section-title">Custom Instructions</h4>
                  <textarea
                    className="agent-instructions-textarea"
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      localStorage.setItem("gamekit:agent:customInstructions", e.target.value);
                    }}
                    placeholder={"Add custom rules or context for the agent...\n\nExamples:\n- Always use pixel-art style sprites\n- Place all platforms at y=300\n- Prefer dark backgrounds"}
                    rows={4}
                  />
                  <p className="agent-settings-section-desc">
                    Additional instructions appended to the agent's system prompt. Use this for project-specific rules, style preferences, or recurring patterns.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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
