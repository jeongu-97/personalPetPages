import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Share2, Sparkles } from 'lucide-react';

const previewImage =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80';
const previewProfileUrl =
  'https://personal-pet-pages.vercel.app/ida2?token=5df6c359f2cbf15babc67882eebc57f7';

const featureCards = [
  {
    title: '사진으로 간편하게',
    desc: '아이 사진만 있으면 멋진 프로필 완성',
    icon: Camera,
    color: 'linear-gradient(135deg, #c8adff 0%, #a98cf8 100%)',
  },
  {
    title: '우리 아이만의 특별함',
    desc: '성격, 건강, 좋아하는 것 모두 기록',
    icon: Sparkles,
    color: 'linear-gradient(135deg, #ffb3d5 0%, #ff89be 100%)',
  },
  {
    title: '쉽게 공유하기',
    desc: '가족, 친구들과 우리 아이 소개',
    icon: Share2,
    color: 'linear-gradient(135deg, #a9ceff 0%, #7eaef8 100%)',
  },
];

export default function HomePage() {
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const neumoBg = '#faf9f2';
  const neumoShadow = '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff';
  const neumoShadowSoft = '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff';
  const yellowShadow = '8px 8px 16px #d9c88f, -8px -8px 16px #fffdf3';
  const yellowShadowSoft = '6px 6px 12px #ddcc98, -6px -6px 12px #fffef5';

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isPreviewModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPreviewModalOpen]);

  useEffect(() => {
    if (!isPreviewModalOpen || typeof window === 'undefined') return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPreviewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isPreviewModalOpen]);

  const togglePreviewModal = () => {
    setIsPreviewModalOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen" style={{ background: neumoBg }}>
      <main
        style={{
          margin: '0 auto',
          width: '100%',
          maxWidth: '540px',
          padding: '10px 14px 16px',
        }}
      >
        <section style={{ textAlign: 'center' }}>
          <div
            style={{
              margin: '0 auto 2px',
              width: 'min(96%, 520px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              boxShadow: 'none',
              borderRadius: 0,
              padding: 0,
            }}
          >
            <img
              src="/main-logo.png"
              alt="메인 로고"
              style={{
                width: '100%',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
          <p style={{ margin: 0, fontSize: '17px', color: '#4b5563' }}>
            우리 아이만의 특별한 프로필을 만들어보세요
          </p>
        </section>

        <section style={{ marginTop: '20px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '20px', fontWeight: 600, color: '#374151' }}>
            이런 프로필이 만들어져요
          </p>
          <div
            style={{
              borderRadius: '18px',
              padding: '10px',
              background: neumoBg,
              boxShadow: yellowShadow,
            }}
          >
            <button
              type="button"
              onClick={togglePreviewModal}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                width: '100%',
                display: 'block',
                cursor: 'pointer',
              }}
              aria-expanded={isPreviewModalOpen}
              aria-label="프로필 전체보기 열기 또는 닫기"
            >
              <img
                src={previewImage}
                alt="프로필 미리보기"
                style={{ height: '155px', width: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  pointerEvents: 'none',
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(255,255,255,0.95), rgba(255,255,255,0.5), transparent)',
                }}
              />
              <p
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: '9px',
                  textAlign: 'center',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: '#4b5563',
                }}
              >
                {isPreviewModalOpen ? '탭하여 전체보기 닫기' : '탭하여 전체보기'}
              </p>
            </button>
          </div>
        </section>

        <section
          style={{
            marginTop: '16px',
            display: 'grid',
            gap: '10px',
          }}
        >
          {featureCards.map(({ title, desc, icon: Icon, color }) => (
            <article
              key={title}
              style={{
                borderRadius: '18px',
                padding: '14px 16px',
                background: neumoBg,
                boxShadow: yellowShadowSoft,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    height: '38px',
                    width: '38px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827', lineHeight: 1.25 }}>
                    {title}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: '16px', color: '#4b5563', lineHeight: 1.3 }}>
                    {desc}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section style={{ marginTop: '18px' }}>
          <Link
            to="/start"
            className="glossy-cta"
            style={{
              display: 'inline-flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '18px',
              padding: '14px 18px',
              fontSize: '19px',
              fontWeight: 700,
              color: '#5f4124',
              background: 'linear-gradient(90deg, #f4d88f 0%, #edc17a 100%)',
              boxShadow: '8px 8px 16px #d8c190, -8px -8px 16px #fff8e8',
            }}
          >
            <span>프로필 만들기 시작하기</span>
          </Link>
          <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '15px', color: '#6b7280' }}>
            무료로 시작하고 언제든 수정 가능해요
          </p>
        </section>
      </main>

      {isPreviewModalOpen && (
        <div
          onClick={togglePreviewModal}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              togglePreviewModal();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(17, 24, 39, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
          }}
          aria-label="모달 닫기"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="프로필 전체보기 미리보기"
            style={{
              position: 'relative',
              width: 'min(96vw, 980px)',
              height: 'min(92vh, 860px)',
              borderRadius: '20px',
              overflow: 'hidden',
              background: '#f8fafc',
              boxShadow: '0 22px 50px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.6)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <button
              type="button"
              onClick={togglePreviewModal}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 1,
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 8px 20px rgba(15, 23, 42, 0.2)',
              }}
            >
              닫기
            </button>
            <div style={{ flex: 1, minHeight: 0 }}>
              <iframe
                title="프로필 전체보기"
                src={previewProfileUrl}
                style={{ width: '100%', height: '100%', border: '0', display: 'block' }}
                loading="lazy"
              />
            </div>
            <div
              style={{
                padding: '10px 12px 12px',
                background: '#f8fafc',
                borderTop: '1px solid #e5e7eb',
              }}
            >
              <Link
                to="/start"
                onClick={() => setIsPreviewModalOpen(false)}
                className="glossy-cta"
                style={{
                  display: 'inline-flex',
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#5f4124',
                  background: 'linear-gradient(90deg, #f4d88f 0%, #edc17a 100%)',
                  boxShadow: '6px 6px 12px #d8c190, -6px -6px 12px #fff8e8',
                }}
              >
                <span>프로필 만들기 시작하기</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
