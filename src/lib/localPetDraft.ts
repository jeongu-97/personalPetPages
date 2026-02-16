import { PetProfileData } from '../types/pet';

export type LocalPetDraft = {
  id: string;
  pet: PetProfileData;
  updatedAt: string;
};

const LOCAL_PET_DRAFTS_KEY = 'local_pet_profile_drafts_v1';

const isBrowser = () => typeof window !== 'undefined';

const safeParseDrafts = (): LocalPetDraft[] => {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LOCAL_PET_DRAFTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const id =
          typeof (item as { id?: unknown }).id === 'string'
            ? (item as { id: string }).id.trim()
            : '';
        const updatedAt =
          typeof (item as { updatedAt?: unknown }).updatedAt === 'string'
            ? (item as { updatedAt: string }).updatedAt
            : '';
        const pet = (item as { pet?: unknown }).pet;
        if (!id || !pet || typeof pet !== 'object') return null;
        return { id, updatedAt, pet: pet as PetProfileData };
      })
      .filter((item): item is LocalPetDraft => Boolean(item));
  } catch {
    return [];
  }
};

const writeDrafts = (drafts: LocalPetDraft[]) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_PET_DRAFTS_KEY, JSON.stringify(drafts));
};

const isQuotaExceededError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');

export const createLocalPetDraftId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const saveLocalPetDraft = (draft: LocalPetDraft) => {
  const drafts = safeParseDrafts()
    .filter((item) => item.id !== draft.id)
    .sort((a, b) => {
      const aTime = Date.parse(a.updatedAt);
      const bTime = Date.parse(b.updatedAt);
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return -1;
      if (Number.isNaN(bTime)) return 1;
      return aTime - bTime;
    });
  drafts.push(draft);

  while (true) {
    try {
      writeDrafts(drafts);
      return;
    } catch (error) {
      if (!isQuotaExceededError(error)) throw error;
      const removableIndex = drafts.findIndex((item) => item.id !== draft.id);
      if (removableIndex === -1) {
        throw error;
      }
      drafts.splice(removableIndex, 1);
    }
  }
};

export const getLocalPetDraft = (id: string): LocalPetDraft | null => {
  const targetId = id.trim();
  if (!targetId) return null;
  return safeParseDrafts().find((item) => item.id === targetId) ?? null;
};

export const removeLocalPetDraft = (id: string) => {
  const targetId = id.trim();
  if (!targetId) return;
  const next = safeParseDrafts().filter((item) => item.id !== targetId);
  writeDrafts(next);
};
