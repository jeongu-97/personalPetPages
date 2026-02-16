import { useEffect, useMemo, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { PlusCircle, Share2, Download } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PetProfileScene from '../components/PetProfileScene';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { getLocalPetDraft, removeLocalPetDraft } from '../lib/localPetDraft';
import { PetRecord, toPetRecord } from '../lib/petData';
import { supabase } from '../lib/supabaseClient';
import { PetProfileData } from '../types/pet';

type LoadState = 'loading' | 'ready' | 'not_found';
const MIN_CTA_PANEL_WHEEL_DELTA = 24;
const MIN_CTA_PANEL_SWIPE_DELTA = 56;

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
  const [isNewProfileButtonVisible, setIsNewProfileButtonVisible] = useState(false);
  const [saveImageTrigger, setSaveImageTrigger] = useState(0);
  const publishTriggeredRef = useRef(false);
  const ctaTouchStartRef = useRef<{ x: number; y: number } | null>(null);
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
          queryParams: {
            scope: 'profile_nickname profile_image',
          },
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

  const handleProtectedAction = () => {
    setMessage(null);
    void publishDraft();
  };

  useEffect(() => {
    if (!shouldPublishAfterLogin || !session || !draftPet) return;
    if (publishTriggeredRef.current) return;
    publishTriggeredRef.current = true;
    publishDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldPublishAfterLogin, session, draftPet]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < MIN_CTA_PANEL_WHEEL_DELTA) return;
      setIsNewProfileButtonVisible(event.deltaY < 0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      ctaTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const start = ctaTouchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = start.y - touch.clientY;
      if (
        Math.abs(deltaY) < MIN_CTA_PANEL_SWIPE_DELTA ||
        Math.abs(deltaY) <= Math.abs(deltaX) + 16
      ) {
        return;
      }

      setIsNewProfileButtonVisible(deltaY > 0);
      ctaTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      ctaTouchStartRef.current = null;
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

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

  return (
    <div className="min-h-screen">
      <PetProfileScene
        petData={draftPet}
        onOpenActionButtons={() => setIsNewProfileButtonVisible(true)}
        showCardShareSaveButtons={false}
        externalSaveImageTrigger={saveImageTrigger}
        onShareRequest={handleProtectedAction}
        onCommentRequest={handleProtectedAction}
        onEditRequest={handleProtectedAction}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          transform: isNewProfileButtonVisible
            ? 'translate(-50%, 0)'
            : 'translate(-50%, calc(100% + 24px))',
          bottom: '18px',
          width: 'min(92vw, 520px)',
          zIndex: 74,
          opacity: isNewProfileButtonVisible ? 1 : 0,
          transition: 'transform 260ms ease, opacity 200ms ease',
          pointerEvents: isNewProfileButtonVisible ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col" style={{ rowGap: '10px' }}>
          <button
            type="button"
            onClick={handleProtectedAction}
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
            <Share2
              aria-hidden="true"
              style={{
                width: 'clamp(16px, 2.5vh, 20px)',
                height: 'clamp(16px, 2.5vh, 20px)',
                color: pointColor,
              }}
            />
            <span>프로필 공유하기</span>
          </button>

          <button
            type="button"
            onClick={() => setSaveImageTrigger((prev) => prev + 1)}
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
            <Download
              aria-hidden="true"
              style={{
                width: 'clamp(16px, 2.5vh, 20px)',
                height: 'clamp(16px, 2.5vh, 20px)',
                color: pointColor,
              }}
            />
            <span>이미지로 저장</span>
          </button>

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
        </div>
      </div>
      {message && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            bottom: isNewProfileButtonVisible ? '220px' : '88px',
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
    </div>
  );
}
