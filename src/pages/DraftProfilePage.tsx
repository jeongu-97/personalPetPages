import { useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
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

export default function DraftProfilePage() {
  const { draftId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [draftPet, setDraftPet] = useState<PetProfileData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const publishTriggeredRef = useRef(false);
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

  useEffect(() => {
    if (!shouldPublishAfterLogin || !session || !draftPet) return;
    if (publishTriggeredRef.current) return;
    publishTriggeredRef.current = true;
    publishDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPublishAfterLogin, session, draftPet]);

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

  return (
    <div className="min-h-screen">
      <PetProfileScene petData={draftPet} showEditMenu={false} />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: '18px',
          width: 'min(92vw, 520px)',
          zIndex: 70,
        }}
      >
        <div
          className="rounded-3xl"
          style={{
            background: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            padding: '12px',
          }}
        >
          <p className="text-center text-gray-600" style={{ fontSize: '13px', marginBottom: '8px' }}>
            현재 브라우저에 임시 저장된 상태예요. 로그인하면 프로필이 게시됩니다.
          </p>
          <button
            type="button"
            onClick={publishDraft}
            disabled={isPublishing}
            className="w-full rounded-2xl px-4 py-3 text-sm font-semibold"
            style={{
              color: '#3b2f00',
              background: '#FEE500',
              boxShadow: '8px 8px 16px rgba(148, 163, 184, 0.25), -8px -8px 16px rgba(255,255,255,0.55)',
              opacity: isPublishing ? 0.7 : 1,
              cursor: isPublishing ? 'not-allowed' : 'pointer',
            }}
          >
            {isPublishing ? '처리 중...' : session ? '프로필 게시하기' : '카카오 로그인 후 프로필 게시'}
          </button>
          {message && (
            <p className="text-center text-red-500 mt-2" style={{ fontSize: '13px' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
