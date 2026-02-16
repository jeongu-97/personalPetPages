import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type HandlerRequest = {
  method?: string;
  query?: {
    exclude_slug?: string;
  };
};

type HandlerResponse = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

const sanitizeSlug = (value: unknown) =>
  (typeof value === 'string' ? value.trim().toLowerCase() : '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 120);

export default async function handler(req: HandlerRequest, res: HandlerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const excludeSlug = sanitizeSlug(req.query?.exclude_slug);

  let countQuery = supabase
    .from('pets')
    .select('id', { count: 'exact', head: true })
    .not('share_token', 'is', null)
    .neq('share_token', '');

  if (excludeSlug) {
    countQuery = countQuery.neq('slug', excludeSlug);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return res.status(500).json({ error: 'count_failed' });
  }

  if (!count || count < 1) {
    return res.status(404).json({ error: 'no_profile_available' });
  }

  const randomIndex = Math.floor(Math.random() * count);

  let rowQuery = supabase
    .from('pets')
    .select('slug, share_token')
    .not('share_token', 'is', null)
    .neq('share_token', '')
    .order('updated_at', { ascending: false })
    .range(randomIndex, randomIndex);

  if (excludeSlug) {
    rowQuery = rowQuery.neq('slug', excludeSlug);
  }

  const { data, error } = await rowQuery;

  if (error) {
    return res.status(500).json({ error: 'query_failed' });
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.slug || !row?.share_token) {
    return res.status(404).json({ error: 'no_profile_available' });
  }

  return res.status(200).json({
    slug: row.slug,
    token: row.share_token,
  });
}
