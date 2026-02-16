import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Download, PlusCircle, Share2 } from 'lucide-react';
import PetProfileLoadingSkeleton from '../components/PetProfileLoadingSkeleton';
import PetProfileScene from '../components/PetProfileScene';
import { PetComment, PetProfileData } from '../types/pet';
import { PetRecord, toPetProfile } from '../lib/petData';
import { getPetOwnerClaims, removePetOwnerClaim } from '../lib/petOwnerClaim';
import { supabase } from '../lib/supabaseClient';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';
type Rgb = { r: number; g: number; b: number };

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

export default function PetProfilePage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [pet, setPet] = useState<PetProfileData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isActionButtonsVisible, setIsActionButtonsVisible] = useState(false);
  const [saveImageTrigger, setSaveImageTrigger] = useState(0);
  const actionTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const searchParams = new URLSearchParams(location.search);
  const isCreatedFromSurvey = searchParams.get('created') === '1';
  const token = searchParams.get('token') ?? '';

  useEffect(() => {
    if (!slug) return;

    const search = new URLSearchParams(location.search);
    const token = search.get('token');
    if (!token) {
      setState('not_found');
      return;
    }

    const load = async () => {
      setState('loading');
      try {
        const response = await fetch(
          `/api/pet?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`
        );
        if (!response.ok) {
          setState(response.status === 404 ? 'not_found' : 'error');
          return;
        }
        const data = (await response.json()) as PetRecord;
        setPet(toPetProfile(data));
        setState('ready');
      } catch {
        setState('error');
      }
    };

    load();
  }, [slug, location.search]);

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

  const claimOwnershipForCurrentSlug = async (targetSlug: string) => {
    const claim = getPetOwnerClaims().find((item) => item.slug === targetSlug);
    if (!claim) return;

    const { data, error } = await supabase.rpc('claim_pet_ownership', {
      p_slug: claim.slug,
      p_claim_token: claim.token,
    });

    if (!error && data === true) {
      removePetOwnerClaim(claim.slug);
    }
  };

  const goToEditPage = (targetSlug: string, targetToken: string) => {
    navigate(`/edit/${encodeURIComponent(targetSlug)}?token=${encodeURIComponent(targetToken)}`);
  };

  const handleEditRequest = async () => {
    if (!slug || !token) return;
    if (typeof window === 'undefined') return;

    if (!session) {
      const nextSearchParams = new URLSearchParams(location.search);
      nextSearchParams.set('post_login', 'edit');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}${location.pathname}?${nextSearchParams.toString()}`,
          scopes: 'profile_nickname profile_image',
          queryParams: {
            scope: 'profile_nickname profile_image',
          },
        },
      });

      if (error) {
        return;
      }
      return;
    }

    await claimOwnershipForCurrentSlug(slug);
    goToEditPage(slug, token);
  };

  useEffect(() => {
    if (!session || !slug || !token) return;
    if (searchParams.get('post_login') !== 'edit') return;

    const proceed = async () => {
      await claimOwnershipForCurrentSlug(slug);
      goToEditPage(slug, token);
    };

    proceed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, slug, token, location.search]);

  useEffect(() => {
    if (!(state === 'ready' && isCreatedFromSurvey)) return;
    const params = new URLSearchParams(location.search);
    params.delete('created');
    const search = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
      },
      { replace: true },
    );
  }, [state, isCreatedFromSurvey, location.pathname, location.search, navigate]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 6) return;
      setIsActionButtonsVisible(event.deltaY < 0);
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      actionTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (event: TouchEvent) => {
      const start = actionTouchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = start.y - touch.clientY;
      if (Math.abs(deltaY) < 20 || Math.abs(deltaY) <= Math.abs(deltaX) + 8) return;

      setIsActionButtonsVisible(deltaY > 0);
      actionTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      actionTouchStartRef.current = null;
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

  const handleShareProfile = async () => {
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${pet?.name || '반려동물'} 프로필`,
          url: shareUrl,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        return;
      }
    } catch {
      return;
    }

    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCommentSubmit = async ({ author, text }: { author: string; text: string }) => {
    if (!pet || !token) {
      return { ok: false, message: '유효한 공유 토큰이 없어요.' };
    }

    try {
      const response = await fetch('/api/pet-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug: pet.slug,
          token,
          author,
          text,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { comments?: unknown; error?: string }
        | null;

      if (!response.ok) {
        return { ok: false, message: payload?.error || '기록 등록에 실패했어요.' };
      }

      if (payload?.comments !== undefined) {
        const nextComments = toCommentArray(payload.comments);
        setPet((prev) => (prev ? { ...prev, comments: nextComments } : prev));
      }

      return { ok: true };
    } catch {
      return { ok: false, message: '네트워크 오류로 기록 등록에 실패했어요.' };
    }
  };

  if (state === 'ready' && pet) {
    const editLink = `/edit/${encodeURIComponent(pet.slug)}${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    const baseBg = resolveCardBackground(pet.gender, pet.backgroundColor);
    const pointColor = resolveAccentColor(pet.gender, pet.accentColor);
    const swappedInsetButtonShadow = `inset 8px 8px 16px ${lightenHex(
      baseBg,
      0.38
    )}, inset -8px -8px 16px ${darkenHex(baseBg, 0.22)}`;

    return (
      <div className="min-h-screen">
        <PetProfileScene
          petData={pet}
          editLink={editLink}
          onEditRequest={handleEditRequest}
          onOpenActionButtons={() => setIsActionButtonsVisible(true)}
          onCommentSubmit={handleCommentSubmit}
          showCardShareSaveButtons={false}
          externalSaveImageTrigger={saveImageTrigger}
        />
        <div
          style={{
            position: 'fixed',
            left: '50%',
            transform: isActionButtonsVisible
              ? 'translate(-50%, 0)'
              : 'translate(-50%, calc(100% + 24px))',
            bottom: '18px',
            width: 'min(92vw, 520px)',
            zIndex: 74,
            opacity: isActionButtonsVisible ? 1 : 0,
            transition: 'transform 260ms ease, opacity 200ms ease',
            pointerEvents: isActionButtonsVisible ? 'auto' : 'none',
          }}
        >
          <div className="flex flex-col" style={{ rowGap: '10px' }}>
            <button
              type="button"
              onClick={() => void handleShareProfile()}
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
      </div>
    );
  }

  if (state === 'loading') {
    return <PetProfileLoadingSkeleton />;
  }

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
        {state === 'error' && (
          <>
            <p className="text-gray-600 mb-4">데이터를 불러오지 못했어요.</p>
            <Link to="/" className="text-gray-700 font-medium">
              홈으로 이동
            </Link>
          </>
        )}
        {state === 'not_found' && (
          <>
            <p className="text-gray-600 mb-4">유효한 링크가 아니에요.</p>
            <Link to="/" className="text-gray-700 font-medium">
              홈으로 이동
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
