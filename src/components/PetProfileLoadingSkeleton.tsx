import { ReactNode } from 'react';
import { Skeleton } from './ui/skeleton';

interface PetProfileLoadingSkeletonProps {
  overlay?: ReactNode;
}

export default function PetProfileLoadingSkeleton({ overlay }: PetProfileLoadingSkeletonProps) {
  const baseBg = '#f7f9fc';
  const skeletonBg = '#eef2f7';

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: baseBg }}>
      <div className="flex items-center justify-center w-full h-full">
        <div className="relative w-full max-w-md mx-auto z-20 h-full flex items-center" style={{ height: '96vh' }}>
          <div className="w-full transition-transform duration-150 ease-out">
            <div
              className="rounded-3xl mx-3"
              style={{
                background: baseBg,
                boxShadow: '20px 20px 40px #d9dfe9, -20px -20px 40px #ffffff',
                padding: 'clamp(4px, 0.4vh, 8px)',
                height: '94vh',
              }}
            >
              <div
                className="rounded-3xl overflow-hidden flex flex-col relative"
                style={{
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(20px)',
                  border: '2px solid rgba(255, 255, 255, 0.95)',
                  height: '92vh',
                }}
              >
                <div className="overflow-hidden relative shrink-0" style={{ height: 'clamp(200px, 32vh, 280px)' }}>
                  <Skeleton className="w-full h-full rounded-none" style={{ backgroundColor: skeletonBg }} />
                </div>
                <div
                  className="overflow-y-auto flex-1"
                  style={{
                    padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2.5vw, 24px)',
                  }}
                >
                  <div className="space-y-[clamp(8px,1.5vh,16px)]">
                    <div className="flex items-end justify-center gap-3">
                      <Skeleton className="h-8 w-28 rounded-xl" style={{ backgroundColor: skeletonBg }} />
                      <Skeleton className="h-5 w-20 rounded-xl" style={{ backgroundColor: skeletonBg }} />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={`info-skeleton-${index}`}
                          className="rounded-2xl"
                          style={{
                            background: baseBg,
                            boxShadow: 'inset 8px 8px 16px #dde3ec, inset -8px -8px 16px #ffffff',
                            padding: 'clamp(8px, 1.2vh, 16px)',
                          }}
                        >
                          <Skeleton className="h-3 w-12 rounded-lg mb-2" style={{ backgroundColor: skeletonBg }} />
                          <Skeleton className="h-4 w-20 rounded-lg" style={{ backgroundColor: skeletonBg }} />
                        </div>
                      ))}
                    </div>

                    <div
                      className="rounded-2xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 8px 32px rgba(180, 188, 200, 0.18)',
                        padding: 'clamp(10px, 1.5vh, 20px)',
                      }}
                    >
                      <Skeleton className="h-3 w-14 rounded-lg mb-2" style={{ backgroundColor: skeletonBg }} />
                      <Skeleton className="h-4 w-full rounded-lg" style={{ backgroundColor: skeletonBg }} />
                      <Skeleton className="h-4 w-5/6 rounded-lg mt-2" style={{ backgroundColor: skeletonBg }} />
                    </div>

                    <div
                      className="rounded-2xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(10px)',
                        border: '2px solid rgba(255, 255, 255, 0.9)',
                        boxShadow: '0 8px 32px rgba(180, 188, 200, 0.18)',
                        padding: 'clamp(10px, 1.5vh, 20px)',
                      }}
                    >
                      <Skeleton className="h-3 w-20 rounded-lg mb-2" style={{ backgroundColor: skeletonBg }} />
                      <Skeleton className="h-4 w-32 rounded-lg" style={{ backgroundColor: skeletonBg }} />
                    </div>

                    <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.2vh, 12px)' }}>
                      <div
                        className="rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: '12px 12px 24px #dde3ec, -12px -12px 24px #ffffff',
                          padding: 'clamp(10px, 1.5vh, 16px)',
                        }}
                      >
                        <Skeleton className="h-3 w-16 rounded-lg mb-2" style={{ backgroundColor: skeletonBg }} />
                        <Skeleton className="h-4 w-20 rounded-lg" style={{ backgroundColor: skeletonBg }} />
                      </div>
                      <div
                        className="rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: '12px 12px 24px #dde3ec, -12px -12px 24px #ffffff',
                          padding: 'clamp(10px, 1.5vh, 16px)',
                        }}
                      >
                        <Skeleton className="h-3 w-16 rounded-lg mb-2" style={{ backgroundColor: skeletonBg }} />
                        <Skeleton className="h-4 w-20 rounded-lg" style={{ backgroundColor: skeletonBg }} />
                      </div>
                    </div>
                  </div>
                </div>
                {overlay && (
                  <div className="absolute inset-0 z-10">
                    {overlay}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
