import { PetComment, PetKind, PetProfileData } from '../types/pet';

export type PetRecord = {
  id: string;
  creator_user_id?: string | null;
  slug: string;
  share_token?: string | null;
  pet_kind?: string | null;
  background_color?: string | null;
  accent_color?: string | null;
  owner_claim_hash?: string | null;
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

const toPetKind = (value: unknown): PetKind =>
  value === 'dog' || value === 'cat' || value === 'bird' || value === 'fish' ? value : '';

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
      const authorUserId = typeof (item as { author_user_id?: unknown }).author_user_id === 'string'
        ? (item as { author_user_id: string }).author_user_id.trim()
        : '';
      const authorSlug = typeof (item as { author_slug?: unknown }).author_slug === 'string'
        ? (item as { author_slug: string }).author_slug.trim()
        : '';
      const authorShareToken = typeof (item as { author_share_token?: unknown }).author_share_token === 'string'
        ? (item as { author_share_token: string }).author_share_token.trim()
        : '';
      const createdAt = typeof (item as { created_at?: unknown }).created_at === 'string'
        ? (item as { created_at: string }).created_at.trim()
        : '';
      return {
        author,
        text,
        authorUserId: authorUserId || undefined,
        authorSlug: authorSlug || undefined,
        authorShareToken: authorShareToken || undefined,
        createdAt: createdAt || undefined,
      };
    })
    .filter((item): item is PetComment => Boolean(item));
};

export const toPetProfile = (record: PetRecord): PetProfileData => ({
  id: record.id,
  creatorUserId: record.creator_user_id ?? '',
  slug: record.slug,
  shareToken: record.share_token ?? '',
  petKind: toPetKind(record.pet_kind),
  backgroundColor: record.background_color ?? '',
  accentColor: record.accent_color ?? '',
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
  creator_user_id: pet.creatorUserId,
  slug: pet.slug,
  share_token: pet.shareToken,
  pet_kind: toPetKind(pet.petKind),
  background_color: typeof pet.backgroundColor === 'string' ? pet.backgroundColor : '',
  accent_color: typeof pet.accentColor === 'string' ? pet.accentColor : '',
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
  comments: pet.comments.map((comment) => ({
    author: comment.author,
    text: comment.text,
    author_user_id: comment.authorUserId,
    author_slug: comment.authorSlug,
    author_share_token: comment.authorShareToken,
    created_at: comment.createdAt,
  })),
  personality: pet.personality,
  owner_contact: pet.ownerContact,
  main_photo_url: pet.mainPhoto,
});
