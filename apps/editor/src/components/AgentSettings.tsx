import { useState } from "react";
import { X, Key, Check, Plus, Trash2 } from "lucide-react";
import { useAgentKeys, type AgentKeyEntry } from "../hooks/useAgentKeys.js";

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
  // Desktop Tauri stores secrets in OS keychain — no app passphrase required.
  const needsPassphrase = needsKey && !osKeychain;

  if (!open) return null;

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
    <div className="agent-settings-overlay" onClick={onClose}>
      <div className="agent-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="agent-settings-header">
          <Key size={16} />
          <span>AI Providers</span>
          <button type="button" className="agent-settings-close" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="agent-settings-body">
          <table className="agent-settings-table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => {
                const entry = getKeyStatus(p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.label}</td>
                    <td className="agent-settings-model">{entry?.model ?? p.defaultModel}</td>
                    <td>
                      {entry ? (
                        <span className="agent-settings-status connected">
                          {entry.storage === "keychain" ? "keychain" : "connected"}
                        </span>
                      ) : (
                        <span className="agent-settings-status">—</span>
                      )}
                    </td>
                    <td>
                      {entry ? (
                        <button
                          type="button"
                          className="agent-settings-action-btn remove"
                          onClick={() => void removeKey(p.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="agent-settings-action-btn add"
                          onClick={() => { setEditing(p.id); setModel(p.defaultModel); }}
                        >
                          <Plus size={12} /> Add
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {editing && (
            <div className="agent-settings-add-form">
              <h4>Connect {currentProvider?.label}</h4>
              {needsKey && (
                <div className="agent-settings-field">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                  />
                </div>
              )}
              <div className="agent-settings-field">
                <label>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={currentProvider?.defaultModel}
                />
              </div>
              {(!needsKey || editing === "openrouter" || editing === "openai") && (
                <div className="agent-settings-field">
                  <label>Base URL {needsKey && "(optional)"}</label>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={editing === "openrouter" ? "https://openrouter.ai/api/v1" : editing === "openai" ? "https://api.openai.com/v1" : "http://127.0.0.1:1234"}
                  />
                </div>
              )}
              {needsPassphrase && (
                <div className="agent-settings-field">
                  <label>Passphrase (to encrypt key locally)</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                  />
                </div>
              )}
              {needsKey && (
                <div className="agent-settings-field-hint">
                  {osKeychain
                    ? "Key is stored in the OS keychain (macOS Keychain / Windows Credential Manager). It never leaves your machine."
                    : "Key is encrypted and stored in this browser only. It never leaves your machine."}
                </div>
              )}
              <div className="agent-settings-form-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-connect"
                  onClick={handleSave}
                  disabled={needsKey ? (!apiKey || (needsPassphrase && !passphrase)) : false}
                >
                  <Check size={12} /> Connect
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="agent-settings-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-save" onClick={onClose}>Save</button>
        </div>
      </div>
    </div>
  );
}
