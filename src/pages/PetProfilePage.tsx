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
  const [session, setSession] = useState<Session | null>(null);
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

  if (state === 'ready' && pet) {
    const editLink = `/edit/${encodeURIComponent(pet.slug)}${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    return (
      <>
        <PetProfileScene petData={pet} editLink={editLink} onEditRequest={handleEditRequest} />
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
