import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import PetProfileLoadingSkeleton from '../components/PetProfileLoadingSkeleton';
import PetProfileScene from '../components/PetProfileScene';
import { PetProfileData } from '../types/pet';
import { PetRecord, toPetProfile } from '../lib/petData';
import { getPetOwnerClaims, removePetOwnerClaim } from '../lib/petOwnerClaim';
import { supabase } from '../lib/supabaseClient';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

export default function PetProfilePage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [pet, setPet] = useState<PetProfileData | null>(null);
  const [isCreationGuideOpen, setIsCreationGuideOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isStartingLogin, setIsStartingLogin] = useState(false);
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
      setIsStartingLogin(true);
      const nextSearchParams = new URLSearchParams(location.search);
      nextSearchParams.set('post_login', 'edit');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}${location.pathname}?${nextSearchParams.toString()}`,
        },
      });

      if (error) {
        setIsStartingLogin(false);
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
    setIsCreationGuideOpen(true);
  }, [state, isCreatedFromSurvey]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isCreationGuideOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCreationGuideOpen]);

  const closeCreationGuide = () => {
    setIsCreationGuideOpen(false);
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
  };

  if (state === 'ready' && pet) {
    const editLink = `/edit/${encodeURIComponent(pet.slug)}${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    return (
      <>
        <PetProfileScene petData={pet} editLink={editLink} onEditRequest={handleEditRequest} />
        {isCreationGuideOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              background: 'rgba(17, 24, 39, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={closeCreationGuide}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-md rounded-3xl"
              style={{
                background: '#f2f3f5',
                border: '1.5px solid #d3d7de',
                boxShadow: '20px 20px 40px #c2c8d1, -20px -20px 40px #ffffff',
                padding: '22px',
              }}
            >
              <h2 className="text-gray-800 font-semibold" style={{ fontSize: '22px' }}>
                프로필이 생성됐어요
              </h2>
              <div
                className="mt-3 rounded-2xl"
                style={{
                  border: '2px solid #b8bcc3',
                  background: '#f2f3f5',
                  boxShadow:
                    'inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -1px -1px 2px rgba(129, 136, 146, 0.35)',
                  padding: '12px 14px',
                }}
              >
                <p className="text-gray-600" style={{ fontSize: '15px', lineHeight: 1.5 }}>
                  지금 링크는 바로 공유할 수 있어요. 수정은 로그인 후 이 프로필에서 바로 가능합니다.
                </p>
                <p className="text-gray-500 mt-1.5" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                  지금 만든 브라우저에서 로그인하면 자동으로 편집 권한이 연결돼요.
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleEditRequest}
                  disabled={isStartingLogin}
                  className="inline-flex items-center justify-center rounded-2xl px-4 text-base font-semibold"
                  style={{
                    minHeight: '56px',
                    color: '#5f4124',
                    background: 'linear-gradient(90deg, #f4d88f 0%, #edc17a 100%)',
                    boxShadow: '8px 8px 16px #d9c793, -8px -8px 16px #fff9ea',
                    opacity: isStartingLogin ? 0.7 : 1,
                  }}
                >
                  {isStartingLogin ? '카카오 로그인 이동 중...' : '로그인하고 편집하기'}
                </button>
                <button
                  type="button"
                  onClick={closeCreationGuide}
                  className="inline-flex items-center justify-center rounded-2xl px-4 text-base font-semibold text-gray-700"
                  style={{
                    minHeight: '52px',
                    background: '#f2f3f5',
                    border: '1.5px solid #d3d7de',
                    boxShadow: '8px 8px 16px #c2c8d1, -8px -8px 16px #ffffff',
                  }}
                >
                  프로필 보기
                </button>
              </div>
            </div>
          </div>
        )}
      </>
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
