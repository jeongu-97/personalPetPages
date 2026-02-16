import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Session } from '@supabase/supabase-js';
import { Bone, Cake, Heart, House, LayoutGrid, LogIn, MapPin, Phone, ToyBrick, Weight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { PetRecord, toPetProfile } from '../lib/petData';
import { supabase } from '../lib/supabaseClient';
import { PetKind, PetProfileData } from '../types/pet';

type ViewState = 'idle' | 'loading' | 'ready' | 'empty' | 'error';
type DisplayPetKind = PetKind | 'unknown';
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

const normalizePetKind = (value: unknown): PetKind =>
  value === 'dog' || value === 'cat' || value === 'bird' || value === 'fish' ? value : '';

const petEmojiByKind: Record<DisplayPetKind, string> = {
  dog: '🐶',
  cat: '🐱',
  bird: '🐦',
  fish: '🐠',
  '': '🐾',
  unknown: '🐾',
};

const formatBirthDate = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '생일 미입력';

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) return `${matched[1]}.${matched[2]}.${matched[3]}`;

  return raw;
};

const ageFromBirthDate = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const birth = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let monthDiff =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) monthDiff -= 1;

  if (monthDiff < 0) return '';
  if (monthDiff < 24) return `${monthDiff}개월`;
  return `${Math.floor(monthDiff / 12)}살`;
};

const formatAge = (age: string, birthDate?: string) => {
  const numeric = age.replace(/\D+/g, '');
  if (!numeric) return ageFromBirthDate(birthDate) || '나이 미입력';
  if (/개월|월/.test(age)) return `${numeric}개월`;
  return `${numeric}살`;
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

function MiniProfileCard({ pet, href }: { pet: PetProfileData; href: string }) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const petKind = normalizePetKind(pet.petKind) || 'unknown';
  const petEmoji = petEmojiByKind[petKind];
  const baseBg = resolveCardBackground(pet.gender, pet.backgroundColor);
  const pointColor = resolveAccentColor(pet.gender, pet.accentColor);
  const genderColor =
    pet.gender === '암컷' ? '#ec4899' : pet.gender === '수컷' ? '#3b82f6' : '#9ca3af';

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xRel = (event.clientX - rect.left - rect.width / 2) / rect.width;
    const yRel = (event.clientY - rect.top - rect.height / 2) / rect.height;
    setRotation({
      x: Math.max(-8, Math.min(8, -yRel * 14)),
      y: Math.max(-8, Math.min(8, xRel * 14)),
    });
  };

  const handleLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  const cardShadow = `16px 16px 24px ${darkenHex(baseBg, 0.22)}, -12px -12px 24px ${lightenHex(
    baseBg,
    0.28
  )}`;
  const insetShadow = `inset 4px 4px 10px ${darkenHex(baseBg, 0.16)}, inset -4px -4px 10px ${lightenHex(
    baseBg,
    0.32
  )}`;

  return (
    <Link to={href} className="block">
      <div
        ref={wrapperRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        style={{
          transform: `perspective(900px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 120ms ease-out',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <article
          className="rounded-2xl overflow-hidden"
          style={{
            background: baseBg,
            boxShadow: cardShadow,
            border: '1.5px solid rgba(255,255,255,0.82)',
            aspectRatio: '10 / 19',
          }}
        >
          <div className="relative" style={{ height: '34%' }}>
            {pet.mainPhoto?.trim() ? (
              <ImageWithFallback src={pet.mainPhoto} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(160deg, #f7dff0 0%, #f2e9f8 52%, #ecf1fb 100%)' }}
              >
                <span style={{ fontSize: '36px', lineHeight: 1 }}>{petEmoji}</span>
              </div>
            )}
          </div>

          <div
            className="h-[66%] overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.76)',
              padding: '8px 8px 9px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div className="text-center">
              <div
                className="font-semibold leading-none flex items-center justify-center gap-1"
                style={{ fontSize: '13px', color: '#111827' }}
              >
                <span className="truncate max-w-[75%]">{pet.name || '이름 없음'}</span>
                <span style={{ color: genderColor }}>{pet.gender === '암컷' ? '♀' : pet.gender === '수컷' ? '♂' : '·'}</span>
              </div>
              <div className="text-gray-500 truncate mt-1" style={{ fontSize: '9px' }}>
                {pet.breed || '품종 미입력'}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1 text-gray-500" style={{ fontSize: '8px' }}>
                <Cake size={10} style={{ color: '#6b7280' }} />
                <span className="truncate max-w-[42%]">{formatBirthDate(pet.birthDate)}</span>
                <span>•</span>
                <span style={{ color: pointColor, fontWeight: 600 }}>{formatAge(pet.age, pet.birthDate)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: Weight, label: '체중', value: `${pet.weight || '미입력'}${pet.weight ? 'kg' : ''}` },
                { icon: MapPin, label: '위치', value: pet.location || '미입력' },
                { icon: Bone, label: '좋아하는 간식', value: pet.favoriteFood || '미입력' },
                { icon: ToyBrick, label: '좋아하는 장난감', value: pet.favoriteToy || '미입력' },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    background: baseBg,
                    boxShadow: insetShadow,
                    padding: '5px 6px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={10} style={{ color: pointColor }} />
                    <span className="text-gray-500 truncate" style={{ fontSize: '7px' }}>
                      {label}
                    </span>
                  </div>
                  <p className="text-gray-700 truncate mt-0.5" style={{ fontSize: '9px', fontWeight: 600 }}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div
              className="rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.75)',
                padding: '5px 6px',
              }}
            >
              <div className="flex items-center gap-1">
                <Heart size={10} style={{ color: '#ef4444', fill: '#ef4444' }} />
                <span className="text-gray-500" style={{ fontSize: '7px' }}>
                  성격
                </span>
              </div>
              <p className="text-gray-700 truncate mt-0.5" style={{ fontSize: '9px' }}>
                {pet.personality || '미입력'}
              </p>
            </div>

            <div
              className="rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.75)',
                padding: '5px 6px',
              }}
            >
              <div className="flex items-center gap-1">
                <Phone size={10} style={{ color: '#22c55e', fill: '#22c55e' }} />
                <span className="text-gray-500" style={{ fontSize: '7px' }}>
                  보호자 연락처
                </span>
              </div>
              <p className="text-gray-700 truncate mt-0.5" style={{ fontSize: '9px' }}>
                {pet.ownerContact || '미입력'}
              </p>
            </div>
          </div>
        </article>
      </div>
    </Link>
  );
}

export default function MyProfilesPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<ViewState>('idle');
  const [pets, setPets] = useState<PetProfileData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const autoLoginTriggeredRef = useRef(false);
  const neumoBg = '#faf9f2';
  const neumoShadow = '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff';
  const yellowShadow = '8px 8px 16px #d9c88f, -8px -8px 16px #fffdf3';
  const yellowShadowSoft = '6px 6px 12px #ddcc98, -6px -6px 12px #fffef5';

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsAuthChecked(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsAuthChecked(true);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAuthChecked || session || autoLoginTriggeredRef.current) return;
    autoLoginTriggeredRef.current = true;
    void handleLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecked, session]);

  useEffect(() => {
    if (!session) {
      setState('idle');
      setPets([]);
      return;
    }

    const load = async () => {
      setState('loading');
      setErrorMessage(null);

      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('creator_user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .returns<PetRecord[]>();

      if (error) {
        setErrorMessage(error.message || '목록을 불러오지 못했어요.');
        setState('error');
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const nextPets = rows.map(toPetProfile);
      setPets(nextPets);
      setState(nextPets.length ? 'ready' : 'empty');
    };

    void load();
  }, [session]);

  const handleLogin = async () => {
    if (typeof window === 'undefined') return;
    setErrorMessage(null);
    setIsLoggingIn(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/my-profiles`,
        scopes: 'profile_nickname profile_image',
        queryParams: {
          scope: 'profile_nickname profile_image',
        },
      },
    });

    if (error) {
      setErrorMessage(error.message || '로그인을 시작하지 못했어요.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6" style={{ background: neumoBg }}>
      <div className="max-w-[540px] mx-auto">
        <section style={{ marginBottom: '14px', display: 'grid', gap: '10px' }}>
          <div
            style={{
              background: neumoBg,
              boxShadow: yellowShadow,
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#1f2937',
            }}
          >
            <LayoutGrid size={18} />
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>내 프로필 목록</h1>
          </div>

          <Link
            to="/"
            style={{
              display: 'inline-flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              borderRadius: '16px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#4b5563',
              background: neumoBg,
              boxShadow: yellowShadowSoft,
              textDecoration: 'none',
            }}
          >
            <House size={16} />
            <span>홈으로</span>
          </Link>
        </section>

        {!session && (
          <div
            className="rounded-3xl text-center"
            style={{
              background: neumoBg,
              boxShadow: yellowShadowSoft,
              padding: '24px 18px',
            }}
          >
            <p className="text-gray-600 text-sm mb-4">목록 확인은 로그인 후 가능해요.</p>
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="inline-flex items-center justify-center gap-2 rounded-2xl text-gray-800 font-semibold"
              style={{
                minHeight: '44px',
                minWidth: '200px',
                padding: '0 18px',
                background: '#fee500',
                boxShadow: neumoShadow,
                opacity: isLoggingIn ? 0.7 : 1,
              }}
            >
              <LogIn size={16} />
              {isLoggingIn ? '로그인 이동 중...' : '카카오로 로그인'}
            </button>
            {errorMessage && <p className="text-red-500 text-xs mt-3">{errorMessage}</p>}
          </div>
        )}

        {session && state === 'loading' && (
          <div
            className="text-center text-gray-600 py-8 rounded-3xl"
            style={{ background: neumoBg, boxShadow: yellowShadowSoft }}
          >
            불러오는 중...
          </div>
        )}

        {session && state === 'error' && (
          <div
            className="text-center text-red-500 py-8 rounded-3xl"
            style={{ background: neumoBg, boxShadow: yellowShadowSoft }}
          >
            {errorMessage || '목록을 불러오지 못했어요.'}
          </div>
        )}

        {session && state === 'empty' && (
          <div
            className="text-center text-gray-600 py-8 rounded-3xl"
            style={{ background: neumoBg, boxShadow: yellowShadowSoft }}
          >
            아직 만든 프로필이 없어요.
          </div>
        )}

        {session && state === 'ready' && (
          <div className="grid grid-cols-2 gap-3">
            {pets.map((pet) => {
              const token = pet.shareToken?.trim() ?? '';
              const href = token
                ? `/${encodeURIComponent(pet.slug)}?token=${encodeURIComponent(token)}`
                : '';

              return href ? (
                <div
                  key={pet.id || pet.slug}
                  className="rounded-2xl"
                  style={{
                    overflow: 'hidden',
                    isolation: 'isolate',
                  }}
                >
                  <MiniProfileCard pet={pet} href={href} />
                </div>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
