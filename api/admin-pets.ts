import { randomBytes } from 'crypto';
import { requireAdmin } from '../server/adminAuth';

type HandlerRequest = {
  method?: string;
  headers?: {
    authorization?: string;
  };
  query?: {
    id?: string;
    slug?: string;
  };
  body?: {
    id?: unknown;
    slug?: unknown;
    pet?: unknown;
  };
};

type HandlerResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

type PetInput = {
  id?: unknown;
  creator_user_id?: unknown;
  slug?: unknown;
  share_token?: unknown;
  pet_kind?: unknown;
  background_color?: unknown;
  accent_color?: unknown;
  name?: unknown;
  birth_date?: unknown;
  breed?: unknown;
  age?: unknown;
  weight?: unknown;
  gender?: unknown;
  location?: unknown;
  favorite_food?: unknown;
  favorite_toy?: unknown;
  fun_facts?: unknown;
  comments?: unknown;
  personality?: unknown;
  owner_contact?: unknown;
  main_photo_url?: unknown;
};

type CommentInput = {
  author?: unknown;
  text?: unknown;
  author_user_id?: unknown;
  author_slug?: unknown;
  author_share_token?: unknown;
  created_at?: unknown;
};

const sanitizeText = (value: unknown, maxLength: number) =>
  (typeof value === 'string' ? value.trim() : '').slice(0, maxLength);

const sanitizeSlug = (value: unknown) =>
  sanitizeText(value, 120)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const sanitizePetKind = (value: unknown) =>
  value === 'dog' || value === 'cat' || value === 'bird' || value === 'fish' ? value : '';

const sanitizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeText(item, 140))
    .filter((item) => item.length > 0);
};

const sanitizeComments = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const comment = item as CommentInput;
      const text = sanitizeText(comment.text, 280);
      if (!text) return null;

      return {
        author: sanitizeText(comment.author, 40),
        text,
        author_user_id: sanitizeText(comment.author_user_id, 64) || undefined,
        author_slug: sanitizeText(comment.author_slug, 120) || undefined,
        author_share_token: sanitizeText(comment.author_share_token, 200) || undefined,
        created_at: sanitizeText(comment.created_at, 64) || undefined,
      };
    })
    .filter(Boolean);
};

const buildPetPayload = (value: unknown) => {
  const pet = value && typeof value === 'object' ? (value as PetInput) : {};
  const shareToken = sanitizeText(pet.share_token, 200) || randomBytes(16).toString('hex');

  return {
    id: sanitizeText(pet.id, 64) || undefined,
    creator_user_id: sanitizeText(pet.creator_user_id, 64) || undefined,
    slug: sanitizeSlug(pet.slug),
    share_token: shareToken,
    pet_kind: sanitizePetKind(pet.pet_kind),
    background_color: sanitizeText(pet.background_color, 32),
    accent_color: sanitizeText(pet.accent_color, 32),
    name: sanitizeText(pet.name, 80),
    birth_date: sanitizeText(pet.birth_date, 20),
    breed: sanitizeText(pet.breed, 80),
    age: sanitizeText(pet.age, 30),
    weight: sanitizeText(pet.weight, 20),
    gender: sanitizeText(pet.gender, 20),
    location: sanitizeText(pet.location, 80),
    favorite_food: sanitizeText(pet.favorite_food, 120),
    favorite_toy: sanitizeText(pet.favorite_toy, 120),
    fun_facts: sanitizeStringArray(pet.fun_facts),
    comments: sanitizeComments(pet.comments),
    personality: sanitizeText(pet.personality, 500),
    owner_contact: sanitizeText(pet.owner_contact, 200),
    main_photo_url: sanitizeText(pet.main_photo_url, 500),
  };
};

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  try {
    const adminAuth = await requireAdmin(req);
    if (!adminAuth.ok) {
      return res.status(adminAuth.status).json({ error: adminAuth.error });
    }

    const { supabase } = adminAuth;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        return res.status(500).json({ error: `프로필 목록을 불러오지 못했어요: ${error.message}` });
      }

      return res.status(200).json({ pets: data ?? [] });
    }

    if (req.method === 'POST') {
      const pet = buildPetPayload(req.body?.pet);
      if (!pet.slug) {
        return res.status(400).json({ error: '프로필 주소를 입력해 주세요.' });
      }

      const { data: existing, error: existingError } = await supabase
        .from('pets')
        .select('id')
        .eq('slug', pet.slug)
        .maybeSingle();

      if (existingError) {
        return res.status(500).json({ error: `프로필 주소 확인에 실패했어요: ${existingError.message}` });
      }

      if (existing?.id && existing.id !== pet.id) {
        return res.status(409).json({ error: '이미 사용 중인 프로필 주소입니다.' });
      }

      const { data, error } = await supabase
        .from('pets')
        .upsert(pet, { onConflict: 'slug' })
        .select()
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: `저장에 실패했어요: ${error.message}` });
      }

      return res.status(200).json({ pet: data });
    }

    if (req.method === 'DELETE') {
      const targetId = sanitizeText(req.query?.id ?? req.body?.id, 64);
      const targetSlug = sanitizeSlug(req.query?.slug ?? req.body?.slug);

      if (!targetId && !targetSlug) {
        return res.status(400).json({ error: '삭제할 프로필 정보가 필요해요.' });
      }

      const deleteQuery = targetId
        ? supabase.from('pets').delete().eq('id', targetId)
        : supabase.from('pets').delete().eq('slug', targetSlug);

      const { error } = await deleteQuery;
      if (error) {
        return res.status(500).json({ error: `삭제에 실패했어요: ${error.message}` });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: '허용되지 않은 요청 방식이에요.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 서버 오류';
    return res.status(500).json({ error: `admin-pets handler 오류: ${message}` });
  }
}
