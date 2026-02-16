import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const supabasePublic = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

type HandlerRequest = {
  method?: string;
  headers?: {
    authorization?: string;
  };
  body?: {
    slug?: string;
    token?: string;
    author?: string;
    text?: string;
  };
};

type HandlerResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

const sanitizeText = (value: unknown, maxLength: number) =>
  (typeof value === 'string' ? value.trim() : '').slice(0, maxLength);

const resolveUserNickname = (user: {
  user_metadata?: {
    nickname?: unknown;
    name?: unknown;
    full_name?: unknown;
    preferred_username?: unknown;
  };
  email?: string | null;
}) => {
  const candidates = [
    user.user_metadata?.nickname,
    user.user_metadata?.name,
    user.user_metadata?.full_name,
    user.user_metadata?.preferred_username,
  ];

  for (const candidate of candidates) {
    const normalized = sanitizeText(candidate, 40);
    if (normalized) return normalized;
  }

  const emailLocalPart = sanitizeText(user.email?.split('@')[0], 40);
  return emailLocalPart || '회원';
};

type StoredComment = {
  author: string;
  text: string;
  author_user_id?: string;
  author_slug?: string;
  author_share_token?: string;
  created_at?: string;
};

const normalizeComments = (value: unknown) => {
  if (!Array.isArray(value)) return [] as StoredComment[];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const author = sanitizeText((item as { author?: unknown }).author, 40);
      const text = sanitizeText((item as { text?: unknown }).text, 280);
      if (!text) return null;
      const authorUserId = sanitizeText((item as { author_user_id?: unknown }).author_user_id, 64);
      const authorSlug = sanitizeText((item as { author_slug?: unknown }).author_slug, 120);
      const authorShareToken = sanitizeText((item as { author_share_token?: unknown }).author_share_token, 200);
      const createdAt = sanitizeText((item as { created_at?: unknown }).created_at, 64);
      return {
        author,
        text,
        author_user_id: authorUserId || undefined,
        author_slug: authorSlug || undefined,
        author_share_token: authorShareToken || undefined,
        created_at: createdAt || undefined,
      };
    })
    .filter((item): item is StoredComment => Boolean(item));
};

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const slug = sanitizeText(req.body?.slug, 120);
  const token = sanitizeText(req.body?.token, 200);
  const author = sanitizeText(req.body?.author, 40);
  const text = sanitizeText(req.body?.text, 280);

  if (!token) {
    return res.status(400).json({ error: 'token_required' });
  }

  if (!text) {
    return res.status(400).json({ error: '기록 내용을 입력해 주세요.' });
  }

  if (!supabaseUrl || !serviceRoleKey || !supabaseAnonKey) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const { data: petRow, error: queryError } = await supabase
    .from('pets')
    .select('id, slug, comments')
    .eq('share_token', token)
    .maybeSingle();

  if (queryError) {
    return res.status(500).json({ error: 'query_failed' });
  }

  if (!petRow) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (slug && petRow.slug !== slug) {
    return res.status(404).json({ error: 'not_found' });
  }

  const currentComments = normalizeComments(petRow.comments);

  const authHeader = req.headers?.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  let linkedAuthorUserId = '';
  let linkedAuthorSlug = '';
  let linkedAuthorShareToken = '';
  let effectiveAuthor = author || '익명';

  if (accessToken) {
    const { data: userData, error: userError } = await supabasePublic.auth.getUser(accessToken);
    if (!userError && userData.user) {
      linkedAuthorUserId = userData.user.id;
      effectiveAuthor = resolveUserNickname({
        user_metadata: userData.user.user_metadata as {
          nickname?: unknown;
          name?: unknown;
          full_name?: unknown;
          preferred_username?: unknown;
        },
        email: userData.user.email,
      });

      const { data: ownProfile } = await supabase
        .from('pets')
        .select('slug, share_token')
        .eq('creator_user_id', userData.user.id)
        .not('share_token', 'is', null)
        .neq('share_token', '')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      linkedAuthorSlug = sanitizeText(ownProfile?.slug, 120);
      linkedAuthorShareToken = sanitizeText(ownProfile?.share_token, 200);
    }
  }

  const nextComment: StoredComment = {
    author: effectiveAuthor,
    text,
    author_user_id: linkedAuthorUserId || undefined,
    author_slug: linkedAuthorSlug || undefined,
    author_share_token: linkedAuthorShareToken || undefined,
    created_at: new Date().toISOString(),
  };
  const nextComments = [...currentComments, nextComment].slice(-50);

  const { data: updatedRow, error: updateError } = await supabase
    .from('pets')
    .update({ comments: nextComments })
    .eq('id', petRow.id)
    .select('comments')
    .maybeSingle();

  if (updateError) {
    return res.status(500).json({ error: 'update_failed' });
  }

  return res.status(200).json({
    ok: true,
    comments: normalizeComments(updatedRow?.comments ?? nextComments),
  });
}
