import { useState, useCallback, useEffect } from "react";
import {
  listEncryptedProviders,
  getEncryptedKey,
  getKeyMeta,
  storeApiKey,
  removeApiKey,
  loadApiKey,
  usesOsKeychain,
} from "../lib/agent-keys.js";
import { getApiUrl } from "../lib/api.js";

export type AgentKeyEntry = {
  provider: string;
  model?: string;
  baseUrl?: string;
  connected: boolean;
  storage: "local" | "keychain";
};

function buildEntries(): AgentKeyEntry[] {
  return listEncryptedProviders().map((p) => {
    const meta = getKeyMeta(p);
    const legacy = getEncryptedKey(p);
    return {
      provider: p,
      model: meta?.model ?? legacy?.model,
      baseUrl: meta?.baseUrl ?? legacy?.baseUrl,
      connected: true,
      storage: meta?.storage ?? "local",
    };
  });
}

export function useAgentKeys() {
  const [keys, setKeys] = useState<AgentKeyEntry[]>(() => buildEntries());
  const osKeychain = usesOsKeychain();

  const refreshKeys = useCallback(() => {
    setKeys(buildEntries());
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

  // On Tauri startup, re-sync keychain secrets to the local editor CLI key store
  useEffect(() => {
    if (!osKeychain) return;
    let cancelled = false;
    (async () => {
      for (const entry of buildEntries()) {
        if (entry.storage !== "keychain") continue;
        try {
          const apiKey = await loadApiKey(entry.provider);
          if (!apiKey || cancelled) continue;
          await fetch(getApiUrl("/api/agent/keys"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: entry.provider,
              apiKey,
              model: entry.model,
              baseUrl: entry.baseUrl,
            }),
          });
        } catch {
          // server may not be up yet
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [osKeychain]);

  const addKey = useCallback(
    async (
      provider: string,
      apiKey: string,
      passphrase: string,
      model?: string,
      baseUrl?: string,
    ) => {
      await storeApiKey(provider, apiKey, passphrase, model, baseUrl);

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
    },
    [],
  );

  const removeKey = useCallback(async (provider: string) => {
    await removeApiKey(provider);
    window.dispatchEvent(new Event("gamekit:agent:keys-updated"));
  }, []);

  const getKey = useCallback(async (provider: string, passphrase: string): Promise<string | null> => {
    return loadApiKey(provider, passphrase);
  }, []);

  return { keys, addKey, removeKey, getKey, osKeychain };
}
