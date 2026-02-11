import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

export default async function handler(req: { query: { slug?: string; token?: string } }, res: { status: (code: number) => { json: (body: unknown) => void } }) {
  const { slug, token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token_required' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }

  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'query_failed' });
  }

  if (!data) {
    return res.status(404).json({ error: 'not_found' });
  }

  if (slug && typeof slug === 'string' && data.slug !== slug) {
    return res.status(404).json({ error: 'not_found' });
  }

  return res.status(200).json(data);
}
