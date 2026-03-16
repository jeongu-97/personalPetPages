import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

type RequestLike = {
  headers?: {
    authorization?: string;
  };
};

type AdminAuthSuccess = {
  ok: true;
  supabase: ReturnType<typeof createClient>;
  user: {
    id: string;
    email: string;
  };
};

type AdminAuthFailure = {
  ok: false;
  status: number;
  error: string;
};

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

const parseList = (value: string | undefined, normalize: (item: string) => string) =>
  new Set(
    (value ?? '')
      .split(',')
      .map((item) => normalize(item.trim()))
      .filter((item) => item.length > 0)
  );

const normalizeEmail = (value: string) => value.toLowerCase();
const normalizeUserId = (value: string) => value.toLowerCase();

const getAccessToken = (authorizationHeader?: string) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return '';
  }
  return authorizationHeader.slice(7).trim();
};

const createServiceRoleClient = () =>
  createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

export const requireAdmin = async (req: RequestLike): Promise<AdminAuthResult> => {
  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, status: 500, error: '서버 환경변수 설정이 필요해요.' };
  }

  const allowedEmails = parseList(process.env.ADMIN_EMAILS, normalizeEmail);
  const allowedUserIds = parseList(process.env.ADMIN_USER_IDS, normalizeUserId);
  if (!allowedEmails.size && !allowedUserIds.size) {
    return { ok: false, status: 500, error: '관리자 계정 allowlist 환경설정이 필요해요.' };
  }

  const accessToken = getAccessToken(req.headers?.authorization);
  if (!accessToken) {
    return { ok: false, status: 401, error: '관리자 인증이 필요해요.' };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return { ok: false, status: 401, error: '관리자 인증이 만료됐어요. 다시 로그인해 주세요.' };
  }

  const normalizedUserId = normalizeUserId(data.user.id);
  const normalizedEmail = normalizeEmail(data.user.email ?? '');
  const isAllowed =
    allowedUserIds.has(normalizedUserId) ||
    (normalizedEmail.length > 0 && allowedEmails.has(normalizedEmail));

  if (!isAllowed) {
    return { ok: false, status: 403, error: '관리자 권한이 있는 계정으로만 접근할 수 있어요.' };
  }

  return {
    ok: true,
    supabase,
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
    },
  };
};
