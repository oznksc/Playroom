const SALT_KEY = "gamekit:agent:salt";
const KEYS_PREFIX = "gamekit:agent:keys:";
const META_KEY = "gamekit:agent:key-meta:v1";

export type KeyMeta = {
  model?: string;
  baseUrl?: string;
  /** Where the secret lives: web encrypted blob vs OS keychain */
  storage: "local" | "keychain";
};

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__)
  );
}

function getSalt(): ArrayBuffer {
  let saltB64 = localStorage.getItem(SALT_KEY);
  if (saltB64) {
    const raw = atob(saltB64);
    const buf = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
    return buf;
  }
  const buf = new ArrayBuffer(16);
  const view = new Uint8Array(buf);
  crypto.getRandomValues(view);
  localStorage.setItem(SALT_KEY, btoa(String.fromCharCode(...view)));
  return buf;
}

async function deriveKey(passphrase: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

export async function encryptApiKey(apiKey: string, passphrase: string): Promise<string> {
  const salt = getSalt();
  const key = await deriveKey(passphrase, salt);

  const iv = new ArrayBuffer(12);
  crypto.getRandomValues(new Uint8Array(iv));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(apiKey),
  );

  const packed = new Uint8Array(12 + ciphertext.byteLength);
  packed.set(new Uint8Array(iv), 0);
  packed.set(new Uint8Array(ciphertext), 12);

  return toBase64(packed.buffer);
}

export async function decryptApiKey(encryptedB64: string, passphrase: string): Promise<string | null> {
  try {
    const salt = getSalt();
    const key = await deriveKey(passphrase, salt);
    const packed = new Uint8Array(fromBase64(encryptedB64));

    const iv = packed.slice(0, 12).buffer;
    const ciphertext = packed.slice(12).buffer;

    const plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );

    return new TextDecoder().decode(plainBuffer);
  } catch {
    return null;
  }
}

function readMeta(): Record<string, KeyMeta> {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) ?? "{}") as Record<string, KeyMeta>;
  } catch {
    return {};
  }
}

function writeMeta(meta: Record<string, KeyMeta>): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

/** Legacy localStorage encrypted blob store */
export function saveEncryptedKey(
  provider: string,
  encryptedApiKey: string,
  model?: string,
  baseUrl?: string,
): void {
  const keys = JSON.parse(localStorage.getItem(KEYS_PREFIX + "v1") ?? "{}");
  keys[provider] = { encryptedApiKey, model, baseUrl };
  localStorage.setItem(KEYS_PREFIX + "v1", JSON.stringify(keys));

  const meta = readMeta();
  meta[provider] = { model, baseUrl, storage: "local" };
  writeMeta(meta);
}

export function getEncryptedKey(
  provider: string,
): { encryptedApiKey: string; model?: string; baseUrl?: string } | null {
  const keys = JSON.parse(localStorage.getItem(KEYS_PREFIX + "v1") ?? "{}");
  return keys[provider] ?? null;
}

export function deleteEncryptedKey(provider: string): void {
  const keys = JSON.parse(localStorage.getItem(KEYS_PREFIX + "v1") ?? "{}");
  delete keys[provider];
  localStorage.setItem(KEYS_PREFIX + "v1", JSON.stringify(keys));
  const meta = readMeta();
  delete meta[provider];
  writeMeta(meta);
}

export function listEncryptedProviders(): string[] {
  const meta = readMeta();
  const fromMeta = Object.keys(meta);
  if (fromMeta.length > 0) return fromMeta;
  const keys = JSON.parse(localStorage.getItem(KEYS_PREFIX + "v1") ?? "{}");
  return Object.keys(keys);
}

export function getKeyMeta(provider: string): KeyMeta | null {
  return readMeta()[provider] ?? null;
}

export function usesOsKeychain(): boolean {
  return isTauri();
}

/** Persist API key: OS keychain on Tauri, encrypted localStorage on web. */
export async function storeApiKey(
  provider: string,
  apiKey: string,
  passphrase: string,
  model?: string,
  baseUrl?: string,
): Promise<"keychain" | "local"> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("secret_set", { account: provider, secret: apiKey });
    const meta = readMeta();
    meta[provider] = { model, baseUrl, storage: "keychain" };
    writeMeta(meta);
    // Remove any legacy encrypted local copy
    const keys = JSON.parse(localStorage.getItem(KEYS_PREFIX + "v1") ?? "{}");
    if (keys[provider]) {
      delete keys[provider];
      localStorage.setItem(KEYS_PREFIX + "v1", JSON.stringify(keys));
    }
    return "keychain";
  }

  const encrypted = await encryptApiKey(apiKey, passphrase);
  saveEncryptedKey(provider, encrypted, model, baseUrl);
  return "local";
}

export async function loadApiKey(provider: string, passphrase?: string): Promise<string | null> {
  const meta = getKeyMeta(provider);
  if (isTauri() && (!meta || meta.storage === "keychain")) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const secret = await invoke<string | null>("secret_get", { account: provider });
      if (secret) return secret;
    } catch {
      // fall through to local
    }
  }

  const entry = getEncryptedKey(provider);
  if (!entry) return null;
  if (!passphrase) return null;
  return decryptApiKey(entry.encryptedApiKey, passphrase);
}

export async function removeApiKey(provider: string): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("secret_delete", { account: provider });
    } catch {
      // ignore
    }
  }
  deleteEncryptedKey(provider);
}
