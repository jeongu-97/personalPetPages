import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import PetProfileScene from '../components/PetProfileScene';
import { Skeleton } from '../components/ui/skeleton';
import { PetProfileData } from '../types/pet';
import { PetRecord, toPetProfile } from '../lib/petData';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

function PetProfileLoadingSkeleton() {
  const baseBg = '#e0e5ec';

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: baseBg }}>
      <div className="flex items-center justify-center w-full h-full">
        <div className="relative w-full max-w-md mx-auto z-20 h-full flex items-center" style={{ height: '96vh' }}>
          <div className="w-full transition-transform duration-150 ease-out">
            <div
              className="rounded-3xl mx-3"
              style={{
                background: baseBg,
                boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
                padding: 'clamp(4px, 0.4vh, 8px)',
                height: '94vh',
              }}
            >
              <div
                className="rounded-3xl overflow-hidden flex flex-col"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  height: '92vh',
                }}
              >
                <div className="overflow-hidden relative shrink-0" style={{ height: 'clamp(200px, 32vh, 280px)' }}>
                  <Skeleton
                    className="w-full h-full rounded-none"
                    style={{ backgroundColor: 'rgba(224, 229, 236, 0.95)' }}
                  />
                </div>
                <div
                  className="overflow-y-auto flex-1"
                  style={{
                    padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2.5vw, 24px)',
                  }}
                >
                  <div className="space-y-[clamp(8px,1.5vh,16px)]">
                    <div className="flex items-end justify-center gap-3">
                      <Skeleton className="h-8 w-28 rounded-xl" />
                      <Skeleton className="h-5 w-20 rounded-xl" />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={`info-skeleton-${index}`}
                          className="rounded-2xl"
                          style={{
                            background: baseBg,
                            boxShadow: 'inset 8px 8px 16px #b8bec5, inset -8px -8px 16px #ffffff',
                            padding: 'clamp(8px, 1.2vh, 16px)',
                          }}
                        >
                          <Skeleton className="h-3 w-12 rounded-lg mb-2" />
                          <Skeleton className="h-4 w-20 rounded-lg" />
                        </div>
                      ))}
                    </div>

                    <div
                      className="rounded-2xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        padding: 'clamp(10px, 1.5vh, 20px)',
                      }}
                    >
                      <Skeleton className="h-3 w-14 rounded-lg mb-2" />
                      <Skeleton className="h-4 w-full rounded-lg" />
                      <Skeleton className="h-4 w-5/6 rounded-lg mt-2" />
                    </div>

                    <div
                      className="rounded-2xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.5)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        padding: 'clamp(10px, 1.5vh, 20px)',
                      }}
                    >
                      <Skeleton className="h-3 w-20 rounded-lg mb-2" />
                      <Skeleton className="h-4 w-32 rounded-lg" />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.2vh, 12px)' }}>
                      <div
                        className="rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: '12px 12px 24px #b8bec5, -12px -12px 24px #ffffff',
                          padding: 'clamp(10px, 1.5vh, 16px)',
                        }}
                      >
                        <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                        <Skeleton className="h-4 w-20 rounded-lg" />
                      </div>
                      <div
                        className="rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: '12px 12px 24px #b8bec5, -12px -12px 24px #ffffff',
                          padding: 'clamp(10px, 1.5vh, 16px)',
                        }}
                      >
                        <Skeleton className="h-3 w-16 rounded-lg mb-2" />
                        <Skeleton className="h-4 w-20 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PetProfilePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [state, setState] = useState<LoadState>('loading');
  const [pet, setPet] = useState<PetProfileData | null>(null);

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

  if (state === 'ready' && pet) {
    return <PetProfileScene petData={pet} />;
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
