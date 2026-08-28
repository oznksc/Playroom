import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Zap,
  Shield,
  CheckCircle,
  ClipboardList,
  Sparkles,
  Cpu,
} from "lucide-react";
import { useAgentKeys } from "../hooks/useAgentKeys.js";
import { getApiUrl } from "../lib/api.js";
import type { ApprovalMode } from "../lib/approval-mode.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  CheckboxField,
  cn,
} from "@/ui";
import { ProvidersPanel, PROVIDERS } from "./ProvidersPanel.js";
import styles from "./AgentSettings.module.css";

type AgentSettingsProps = {
  open: boolean;
  onClose: () => void;
};

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
  const { keys } = useAgentKeys();
  const [tab, setTab] = useState("providers");

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(680px,calc(100vw-32px))]">
        <DialogHeader>
          <Sparkles size={14} className="text-accent-purple" />
          <DialogTitle className="text-[12px]">Agent Settings</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-0">
          <Tabs value={tab} onValueChange={setTab} className={styles["agent-settings-tabs"]}>
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
              <ProvidersPanel />
            </TabsContent>

            {/* ─── Model Tab ─── */}
            <TabsContent value="model" className="overflow-auto px-4 pb-4">
              <div className="space-y-4">
                {/* Active Provider */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Active Provider</h4>
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
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Model</h4>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    {modelsList.length > 0
                      ? `${modelsList.length} models available from ${PROVIDERS.find((p) => p.id === resolvedProvider)?.label ?? resolvedProvider}.`
                      : "Type a model name or connect a provider to see available models."}
                  </p>
                </div>

                <div className={styles["agent-settings-divider"]} />

                {/* Temperature */}
                <div className={styles["agent-range"]}>
                  <div className={styles["agent-range-header"]}>
                    <span className={styles["agent-range-label"]}>Temperature</span>
                    <span className={styles["agent-range-value"]}>{temperature.toFixed(2)}</span>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    Lower values produce more focused output; higher values increase creativity.
                  </p>
                </div>

                {/* Max Tokens */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Max Output Tokens</h4>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    Maximum number of tokens in a single response (256 – 16,384).
                  </p>
                </div>

                {/* Top-p */}
                <div className={styles["agent-range"]}>
                  <div className={styles["agent-range-header"]}>
                    <span className={styles["agent-range-label"]}>Top-p (Nucleus Sampling)</span>
                    <span className={styles["agent-range-value"]}>{topP.toFixed(2)}</span>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    Controls diversity by limiting tokens to the top-p probability mass.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* ─── Agent Tab ─── */}
            <TabsContent value="agent" className="overflow-auto px-4 pb-4">
              <div className="space-y-4">
                {/* Approval Mode */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Tool Approval Mode</h4>
                  <div className={styles["radio-card-group"]}>
                    {APPROVAL_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        className={cn(styles["radio-card"], approvalMode === mode.value && styles.active)}
                        onClick={() => {
                          setApprovalMode(mode.value);
                          localStorage.setItem("gamekit:agent:approvalMode", mode.value);
                          window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
                        }}
                      >
                        <div className={styles["radio-card-icon"]}>{mode.icon}</div>
                        <div>
                          <div className={styles["radio-card-label"]}>{mode.label}</div>
                          <div className={styles["radio-card-desc"]}>{mode.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plan First */}
                <div className={styles["agent-settings-section"]}>
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

                <div className={styles["agent-settings-divider"]} />

                {/* Max Tool Turns */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Max Tool Turns</h4>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    Maximum number of tool call rounds per agent response (1 – 50).
                  </p>
                </div>

                {/* Response Language */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Response Language</h4>
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
                  <p className={styles["agent-settings-section-desc"]}>
                    Language for agent responses. "Auto" matches the language you write in.
                  </p>
                </div>

                <div className={styles["agent-settings-divider"]} />

                {/* Custom Instructions */}
                <div className={styles["agent-settings-section"]}>
                  <h4 className={styles["agent-settings-section-title"]}>Custom Instructions</h4>
                  <textarea
                    className={styles["agent-instructions-textarea"]}
                    value={customInstructions}
                    onChange={(e) => {
                      setCustomInstructions(e.target.value);
                      localStorage.setItem("gamekit:agent:customInstructions", e.target.value);
                    }}
                    placeholder={"Add custom rules or context for the agent...\n\nExamples:\n- Always use pixel-art style sprites\n- Place all platforms at y=300\n- Prefer dark backgrounds"}
                    rows={4}
                  />
                  <p className={styles["agent-settings-section-desc"]}>
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
