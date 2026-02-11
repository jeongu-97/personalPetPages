import { Link } from 'react-router-dom';
import { Camera, Share2, Sparkles } from 'lucide-react';

const previewImage =
  'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80';

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
  const neumoBg = '#faf9f2';
  const neumoShadow = '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff';
  const neumoShadowSoft = '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff';
  const yellowShadow = '8px 8px 16px #d9c88f, -8px -8px 16px #fffdf3';
  const yellowShadowSoft = '6px 6px 12px #ddcc98, -6px -6px 12px #fffef5';

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
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
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
                탭하여 전체보기
              </p>
            </div>
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
            to="/admin"
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
    </div>
  );
}
