import { useState, useCallback } from "react";
import {
  saveEncryptedKey,
  getEncryptedKey,
  deleteEncryptedKey,
  listEncryptedProviders,
  encryptApiKey,
  decryptApiKey,
} from "../lib/agent-keys.js";

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

  const addKey = useCallback(async (provider: string, apiKey: string, passphrase: string, model?: string, baseUrl?: string) => {
    const encrypted = await encryptApiKey(apiKey, passphrase);
    saveEncryptedKey(provider, encrypted, model, baseUrl);
    setKeys(listEncryptedProviders().map((p) => {
      const entry = getEncryptedKey(p);
      return { provider: p, model: entry?.model, baseUrl: entry?.baseUrl, connected: true };
    }));
  }, []);

  const removeKey = useCallback((provider: string) => {
    deleteEncryptedKey(provider);
    setKeys((prev) => prev.filter((k) => k.provider !== provider));
  }, []);

  const getKey = useCallback(async (provider: string, passphrase: string): Promise<string | null> => {
    const entry = getEncryptedKey(provider);
    if (!entry) return null;
    return decryptApiKey(entry.encryptedApiKey, passphrase);
  }, []);

  return { keys, addKey, removeKey, getKey };
}
