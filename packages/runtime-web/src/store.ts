import type { GameSavePayload } from "@gamekit/schema";

const STORAGE_PREFIX = "playroom_save_";

function getStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export async function saveGame(slotName: string, payload: GameSavePayload): Promise<void> {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(`${STORAGE_PREFIX}${slotName}`, JSON.stringify(payload));
}

export async function loadGame(slotName: string): Promise<GameSavePayload | null> {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(`${STORAGE_PREFIX}${slotName}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameSavePayload;
  } catch {
    return null;
  }
}

export async function deleteSave(slotName: string): Promise<void> {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(`${STORAGE_PREFIX}${slotName}`);
}

export type SaveSlotMeta = {
  slotName: string;
  levelsUnlocked: number;
  totalLevels: number;
  currentScene: string | null;
};

export async function listSaveSlots(): Promise<SaveSlotMeta[]> {
  const storage = getStorage();
  if (!storage) return [];
  const slots: SaveSlotMeta[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const slotName = key.slice(STORAGE_PREFIX.length);
    try {
      const payload = JSON.parse(storage.getItem(key)!) as GameSavePayload;
      slots.push({
        slotName,
        levelsUnlocked: payload.levels.filter((l) => l.unlocked).length,
        totalLevels: payload.levels.length,
        currentScene: payload.currentSceneId,
      });
    } catch {}
  }
  return slots;
}
