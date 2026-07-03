import { useState, useCallback, useEffect } from "react";
import {
  saveEncryptedKey,
  getEncryptedKey,
  deleteEncryptedKey,
  listEncryptedProviders,
  encryptApiKey,
  decryptApiKey,
} from "../lib/agent-keys.js";
import { getApiUrl } from "../lib/api.js";

export type AgentKeyEntry = {
  provider: string;
  model?: string;
  baseUrl?: string;
  connected: boolean;
};

export function useAgentKeys() {
  const [keys, setKeys] = useState<AgentKeyEntry[]>(() =>
    listEncryptedProviders().map((p) => {
      const entry = getEncryptedKey(p);
      return { provider: p, model: entry?.model, baseUrl: entry?.baseUrl, connected: true };
    }),
  );

  const refreshKeys = useCallback(() => {
    setKeys(listEncryptedProviders().map((p) => {
      const entry = getEncryptedKey(p);
      return { provider: p, model: entry?.model, baseUrl: entry?.baseUrl, connected: true };
    }));
  }, []);

  useEffect(() => {
    const handleSync = () => refreshKeys();
    window.addEventListener("gamekit:agent:keys-updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("gamekit:agent:keys-updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, [refreshKeys]);

  const addKey = useCallback(async (provider: string, apiKey: string, passphrase: string, model?: string, baseUrl?: string) => {
    const encrypted = await encryptApiKey(apiKey, passphrase);
    saveEncryptedKey(provider, encrypted, model, baseUrl);

    try {
      await fetch(getApiUrl("/api/agent/keys"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey, model, baseUrl }),
      });
    } catch (e) {
      console.error("Failed to sync key to backend:", e);
    }

    window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
  }, []);

  const removeKey = useCallback((provider: string) => {
    deleteEncryptedKey(provider);
    window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
  }, []);

  const getKey = useCallback(async (provider: string, passphrase: string): Promise<string | null> => {
    const entry = getEncryptedKey(provider);
    if (!entry) return null;
    return decryptApiKey(entry.encryptedApiKey, passphrase);
  }, []);

  return { keys, addKey, removeKey, getKey };
}
