import { PetComment, PetProfileData } from '../types/pet';

export type PetRecord = {
  id: string;
  slug: string;
  share_token?: string | null;
  name: string;
  birth_date?: string | null;
  breed: string;
  age: string;
  weight: string;
  gender: string;
  location: string;
  favorite_food: string;
  favorite_toy: string;
  fun_facts?: unknown;
  comments?: unknown;
  personality: string;
  owner_contact?: string | null;
  main_photo_url: string;
  updated_at?: string;
};

export type PetRecordInput = Omit<PetRecord, 'id' | 'updated_at'> & {
  id?: string;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
};

const toCommentArray = (value: unknown): PetComment[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const author = typeof (item as { author?: unknown }).author === 'string'
        ? (item as { author: string }).author.trim()
        : '';
      const text = typeof (item as { text?: unknown }).text === 'string'
        ? (item as { text: string }).text.trim()
        : '';
      if (!text) return null;
      return { author, text };
    })
    .filter((item): item is PetComment => Boolean(item));
};

export const toPetProfile = (record: PetRecord): PetProfileData => ({
  id: record.id,
  slug: record.slug,
  shareToken: record.share_token ?? '',
  name: record.name,
  birthDate: record.birth_date ?? '',
  breed: record.breed,
  age: record.age,
  weight: record.weight,
  gender: record.gender,
  location: record.location,
  favoriteFood: record.favorite_food,
  favoriteToy: record.favorite_toy,
  funFacts: toStringArray(record.fun_facts),
  comments: toCommentArray(record.comments),
  personality: record.personality,
  ownerContact: record.owner_contact ?? '',
  mainPhoto: record.main_photo_url,
});

export const toPetRecord = (pet: PetProfileData): PetRecordInput => ({
  id: pet.id,
  slug: pet.slug,
  share_token: pet.shareToken,
  name: pet.name,
  birth_date: pet.birthDate ?? '',
  breed: pet.breed,
  age: pet.age,
  weight: pet.weight,
  gender: pet.gender,
  location: pet.location,
  favorite_food: pet.favoriteFood,
  favorite_toy: pet.favoriteToy,
  fun_facts: pet.funFacts,
  comments: pet.comments,
  personality: pet.personality,
  owner_contact: pet.ownerContact,
  main_photo_url: pet.mainPhoto,
});
