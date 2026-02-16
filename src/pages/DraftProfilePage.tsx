import { useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { MessageCircle, PlusCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PetProfileScene from '../components/PetProfileScene';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { getLocalPetDraft, removeLocalPetDraft } from '../lib/localPetDraft';
import { PetRecord, toPetRecord } from '../lib/petData';
import { supabase } from '../lib/supabaseClient';
import { PetProfileData } from '../types/pet';

type LoadState = 'loading' | 'ready' | 'not_found';

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const generateToken = () => {
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const randomSlugSuffix = () => Math.random().toString(36).slice(2, 6);

const ageFromBirthDate = (birthDate?: string) => {
  const raw = (birthDate ?? '').trim();
  if (!raw) return '';

  const birth = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let monthDiff =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) {
    monthDiff -= 1;
  }

  if (monthDiff < 0) return '';
  if (monthDiff < 24) return `${monthDiff}개월`;
  return `${Math.floor(monthDiff / 12)}살`;
};

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const extensionFromMime = (mime: string) => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
};

const isValidHexColor = (value?: string) =>
  typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

const resolveCardBackground = (gender: string, backgroundColor?: string) => {
  if (isValidHexColor(backgroundColor)) return backgroundColor.trim();
  return gender === '암컷' ? '#f7e5ef' : '#e0e5ec';
};

const resolveAccentColor = (gender: string, accentColor?: string) => {
  if (isValidHexColor(accentColor)) return accentColor.trim();
  if (gender === '암컷') return '#ec4899';
  if (gender === '수컷') return '#3b82f6';
  return '#a855f7';
};

type Rgb = { r: number; g: number; b: number };

const hexToRgb = (hex: string): Rgb => {
  const raw = hex.replace('#', '').trim();
  const normalized =
    raw.length === 3
      ? raw
          .split('')
          .map((ch) => `${ch}${ch}`)
          .join('')
      : raw;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const rgbToHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;

const mixHex = (hex: string, target: Rgb, ratio: number) => {
  const base = hexToRgb(hex);
  const t = Math.max(0, Math.min(1, ratio));
  return rgbToHex({
    r: base.r + (target.r - base.r) * t,
    g: base.g + (target.g - base.g) * t,
    b: base.b + (target.b - base.b) * t,
  });
};

const lightenHex = (hex: string, ratio: number) => mixHex(hex, { r: 255, g: 255, b: 255 }, ratio);
const darkenHex = (hex: string, ratio: number) => mixHex(hex, { r: 0, g: 0, b: 0 }, ratio);

export default function DraftProfilePage() {
  const { draftId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [draftPet, setDraftPet] = useState<PetProfileData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginIntentLabel, setLoginIntentLabel] = useState('편집');
  const publishTriggeredRef = useRef(false);
  const autoModalOpenedRef = useRef(false);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const shouldPublishAfterLogin = searchParams.get('post_login') === 'publish';

  useEffect(() => {
    if (!draftId) {
      setState('not_found');
      return;
    }
    const draft = getLocalPetDraft(draftId);
    if (!draft) {
      setState('not_found');
      return;
    }
    setDraftPet(draft.pet);
    setState('ready');
  }, [draftId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const uploadPhotoIfNeeded = async (mainPhoto: string, slug: string) => {
    const source = mainPhoto.trim();
    if (!source) return '';
    if (/^https?:\/\//i.test(source)) return source;

    if (source.startsWith('data:')) {
      const blob = await dataUrlToBlob(source);
      const ext = extensionFromMime(blob.type);
      const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${slug}/${fileId}.${ext}`;
      const { error } = await supabase.storage.from('pet-photos').upload(path, blob, {
        upsert: true,
        contentType: blob.type || undefined,
      });
      if (error) {
        throw new Error(error.message || 'photo_upload_failed');
      }
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
      return data.publicUrl;
    }

    return '';
  };

  const publishDraft = async () => {
    if (!draftPet || !draftId || isPublishing) return;
    setMessage(null);

    if (!session) {
      if (typeof window === 'undefined') return;
      setIsPublishing(true);
      const nextParams = new URLSearchParams(location.search);
      nextParams.set('post_login', 'publish');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/draft/${encodeURIComponent(
            draftId
          )}?${nextParams.toString()}`,
          scopes: 'profile_nickname profile_image',
        },
      });
      if (error) {
        setMessage(error.message || '로그인을 시작하지 못했어요.');
        setIsPublishing(false);
      }
      return;
    }

    setIsPublishing(true);
    try {
      const basePayload: PetProfileData = {
        ...draftPet,
        age: ageFromBirthDate(draftPet.birthDate) || draftPet.age,
        funFacts: draftPet.funFacts.length ? draftPet.funFacts : buildDefaultFunFacts(draftPet),
      };
      const baseSlug = normalizeSlug(basePayload.slug || basePayload.name || 'pet');

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlugSuffix()}`;
        const shareToken = generateToken();
        const mainPhoto = await uploadPhotoIfNeeded(basePayload.mainPhoto ?? '', slug);
        const payload: PetProfileData = {
          ...basePayload,
          slug,
          shareToken,
          mainPhoto,
        };

        const { data, error } = await supabase
          .from('pets')
          .insert(toPetRecord(payload))
          .select()
          .maybeSingle<PetRecord>();

        if (!error && data) {
          removeLocalPetDraft(draftId);
          navigate(
            `/${encodeURIComponent(data.slug)}?token=${encodeURIComponent(
              data.share_token ?? shareToken
            )}&created=1`,
            { replace: true },
          );
          return;
        }

        if (error?.code === '23505') {
          continue;
        }

        throw new Error(error?.message || 'insert_failed');
      }

      throw new Error('slug_conflict');
    } catch (error) {
      if (error instanceof Error && error.message === 'slug_conflict') {
        setMessage('프로필 주소 생성에 실패했어요. 이름을 조금 바꿔서 다시 시도해 주세요.');
      } else if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage('프로필 게시에 실패했어요.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  const openLoginModal = (intent: 'share' | 'comment' | 'edit') => {
    setMessage(null);
    setIsLoginModalOpen(true);
    if (intent === 'share') {
      setLoginIntentLabel('프로필 공유');
      return;
    }
    if (intent === 'comment') {
      setLoginIntentLabel('댓글 작성');
      return;
    }
    setLoginIntentLabel('편집');
  };

  useEffect(() => {
    if (!shouldPublishAfterLogin || !session || !draftPet) return;
    if (publishTriggeredRef.current) return;
    publishTriggeredRef.current = true;
    publishDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPublishAfterLogin, session, draftPet]);

  useEffect(() => {
    if (state !== 'ready' || !draftPet) return;
    if (shouldPublishAfterLogin) return;
    if (autoModalOpenedRef.current) return;
    autoModalOpenedRef.current = true;
    setLoginIntentLabel('편집');
    setIsLoginModalOpen(true);
  }, [state, draftPet, shouldPublishAfterLogin]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center text-gray-600">
        불러오는 중...
      </div>
    );
  }

  if (state !== 'ready' || !draftPet) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center px-6">
        <div
          className="rounded-3xl max-w-md w-full text-center"
          style={{
            background: '#e0e5ec',
            boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
            padding: '32px',
          }}
        >
          <p className="text-gray-600 mb-4">임시 프로필을 찾지 못했어요.</p>
          <Link to="/start" className="text-gray-700 font-medium">
            설문 다시 시작
          </Link>
        </div>
      </div>
    );
  }

  const baseBg = resolveCardBackground(draftPet.gender, draftPet.backgroundColor);
  const pointColor = resolveAccentColor(draftPet.gender, draftPet.accentColor);
  const swappedInsetButtonShadow = `inset 8px 8px 16px ${lightenHex(
    baseBg,
    0.38
  )}, inset -8px -8px 16px ${darkenHex(baseBg, 0.22)}`;
  const newProfileButton = (
    <button
      type="button"
      onClick={() => navigate('/start')}
      className="w-full rounded-2xl text-gray-700"
      style={{
        background: baseBg,
        boxShadow: swappedInsetButtonShadow,
        padding: 'clamp(10px, 1.5vh, 16px)',
        minHeight: 'clamp(46px, 6.8vh, 56px)',
        fontSize: 'clamp(13px, 2vh, 16px)',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        columnGap: '8px',
      }}
    >
      <PlusCircle
        aria-hidden="true"
        style={{
          width: 'clamp(16px, 2.5vh, 20px)',
          height: 'clamp(16px, 2.5vh, 20px)',
          color: pointColor,
        }}
      />
      <span>새 프로필 만들기</span>
    </button>
  );

  return (
    <div className="min-h-screen">
      <PetProfileScene
        petData={draftPet}
        bottomAction={newProfileButton}
        bottomActionMode="floating-on-scroll"
        onShareRequest={() => openLoginModal('share')}
        onCommentRequest={() => openLoginModal('comment')}
        onEditRequest={() => openLoginModal('edit')}
      />
      {message && !isLoginModalOpen && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: '88px',
            zIndex: 75,
            maxWidth: '88vw',
            background: 'rgba(239, 68, 68, 0.92)',
            color: '#fff',
            borderRadius: '12px',
            padding: '10px 14px',
            fontSize: '13px',
          }}
        >
          {message}
        </div>
      )}
      {isLoginModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(17, 24, 39, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-3xl"
            style={{
              position: 'relative',
              background: '#f2f3f5',
              border: '1.5px solid #d3d7de',
              boxShadow: '20px 20px 40px #c2c8d1, -20px -20px 40px #ffffff',
              padding: '22px',
            }}
          >
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              aria-label="닫기"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '28px',
                height: '28px',
                borderRadius: '999px',
                border: '1px solid #d3d7de',
                background: '#f2f3f5',
                color: '#4b5563',
                fontSize: '16px',
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              ×
            </button>
            <h2 className="text-gray-800 font-semibold" style={{ fontSize: '21px' }}>
              카카오 로그인하고 프로필 완성하기
            </h2>
            <p className="text-gray-600 mt-2" style={{ fontSize: '14px', lineHeight: 1.5 }}>
              {loginIntentLabel} 기능을 사용하려면 카카오 로그인 후 프로필을 먼저 게시해야 해요.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={publishDraft}
                disabled={isPublishing}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold"
                style={{
                  color: '#2f2a00',
                  background: '#FEE500',
                  border: '1px solid #e5cc00',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 14px rgba(0, 0, 0, 0.08)',
                  opacity: isPublishing ? 0.7 : 1,
                  cursor: isPublishing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isPublishing ? (
                  '처리 중...'
                ) : (
                  <>
                    <MessageCircle size={16} style={{ fill: '#111', stroke: '#111' }} />
                    <span>{session ? '프로필 게시하기' : '카카오톡으로 간편로그인'}</span>
                  </>
                )}
              </button>
            </div>
            {message && (
              <p className="text-center text-red-500 mt-3" style={{ fontSize: '13px' }}>
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
