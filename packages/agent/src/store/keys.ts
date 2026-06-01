export type StoredKey = {
  provider: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

export interface KeyVault {
  saveKey(stored: StoredKey): Promise<void>;
  getKey(provider: string): Promise<StoredKey | null>;
  deleteKey(provider: string): Promise<void>;
  listProviders(): Promise<string[]>;
}
