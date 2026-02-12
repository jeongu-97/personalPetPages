import { useEffect, useRef, useState } from 'react';
import { Heart, Calendar, Weight, Ruler, MapPin, Phone, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { PetProfileData } from '../types/pet';

interface ParallaxProps {
  mouseX: number;
  mouseY: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeNumeric = (value: string) => value.replace(/\D+/g, '');
const normalizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integer, ...rest] = cleaned.split('.');
  if (!rest.length) return integer;
  const decimals = rest.join('');
  return `${integer}.${decimals}`;
};
const formatAge = (value: string) => {
  const numeric = normalizeNumeric(value);
  if (!numeric) return '';
  if (/개월|월/.test(value)) return `${numeric}개월`;
  if (/살|년/.test(value)) return `${numeric}살`;
  return `${numeric}살`;
};
const formatWeight = (value: string) => {
  const numeric = normalizeDecimal(value);
  return numeric ? `${numeric}kg` : '';
};
const splitPersonalityAndHealth = (value: string) => {
  const marker = '건강 정보:';
  const markerIndex = value.indexOf(marker);

  if (markerIndex < 0) {
    return {
      personality: value.trim(),
      health: '',
    };
  }

  return {
    personality: value.slice(0, markerIndex).trim(),
    health: value.slice(markerIndex + marker.length).trim(),
  };
};

const summarizeFact = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const [firstLine] = trimmed.split('\n');
  const [firstSentence] = firstLine.split(/[.!?]/);
  return firstSentence.trim() || firstLine.trim();
};

function BackgroundLayer({ mouseX, mouseY }: ParallaxProps) {
  const windowCenterX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
  const windowCenterY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

  const backgroundMovementMultiplier = 0.02;
  const transformX = (mouseX - windowCenterX) * backgroundMovementMultiplier;
  const transformY = (mouseY - windowCenterY) * backgroundMovementMultiplier;

  return (
    <div
      className="absolute inset-0 w-full h-full z-0 transition-transform duration-500 ease-out"
      style={{
        transform: `translate(${transformX}px, ${transformY}px) scale(1.1)`,
        transformOrigin: 'center center',
      }}
    />
  );
}

function PetProfileCard({
  mouseX,
  mouseY,
  pet,
}: ParallaxProps & { pet: PetProfileData }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const ignoreNextClickRef = useRef(false);
  const flipTimerRef = useRef<number | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);
  const isFemale = pet.gender === '암컷';
  const baseBg = isFemale ? '#f7e5ef' : '#e0e5ec';
  const shadows = isFemale
    ? {
        outer: '20px 20px 40px #d3b3c2, -20px -20px 40px #fff6fa',
        inset: 'inset 8px 8px 16px #dbc1ce, inset -8px -8px 16px #fff8fb',
        small: '12px 12px 24px #dbc1ce, -12px -12px 24px #fff8fb',
        button: '8px 8px 16px #dbc1ce, -8px -8px 16px #fff8fb',
        glass: '0 8px 32px rgba(176, 114, 140, 0.12)',
      }
    : {
        outer: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
        inset: 'inset 8px 8px 16px #b8bec5, inset -8px -8px 16px #ffffff',
        small: '12px 12px 24px #b8bec5, -12px -12px 24px #ffffff',
        button: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
        glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
      };
  const ageLabel = formatAge(pet.age);
  const weightLabel = formatWeight(pet.weight);
  const { personality, health } = splitPersonalityAndHealth(pet.personality || '');
  const quickFactsRaw = [
    pet.favoriteToy ? `${pet.name}을(를) 처음 만나면 ${pet.favoriteToy} 준비해 보세요.` : '',
    pet.favoriteFood ? `${pet.favoriteFood} 간식을 주면 금방 친해질 수 있어요.` : '',
    personality ? summarizeFact(personality) : '',
    ageLabel ? `${pet.name}의 나이는 ${ageLabel}이에요.` : '',
  ].filter(Boolean);
  const quickFacts = quickFactsRaw.length ? quickFactsRaw : [`${pet.name}의 이야기를 채워주세요.`];

  const calculateRotation = () => {
    if (!cardRef.current) return { x: 0, y: 0 };

    const rect = cardRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const cardCenterX = rect.left + rect.width / 2;
    const windowCenterY = windowHeight / 2;

    const xRel = (mouseX - cardCenterX) / rect.width;
    const yRel = (mouseY - windowCenterY) / windowHeight;

    // Flip animation also rotates on Y, so keep hover away from Y axis to prevent backface flicker.
    const yAngle = 0;
    const xAngle = Math.max(-12, Math.min(12, -yRel * 12));

    return { x: xAngle, y: yAngle };
  };

  const rotation = calculateRotation();
  const lockedTilt = isFlipped || isFlipAnimating;
  const tiltX = lockedTilt ? 0 : rotation.x;
  const tiltY = lockedTilt ? 0 : rotation.y;

  useEffect(() => {
    return () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, []);

  const handleToggleFlip = () => {
    if (isFlipAnimating) return;
    setIsFlipAnimating(true);
    setIsFlipped((prev) => !prev);
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = window.setTimeout(() => {
      setIsFlipAnimating(false);
      flipTimerRef.current = null;
    }, 540);
  };

  const handleCardClick = () => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }
    handleToggleFlip();
  };

  const handleTouchStart = (event: any) => {
    const touch = event.changedTouches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: any) => {
    const touch = event.changedTouches?.[0];
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!touch || !start) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) + 16) {
      // Prevent the synthetic click that follows touch swipe.
      ignoreNextClickRef.current = true;
      event.preventDefault();
      handleToggleFlip();
    }
  };

  const handleCardKeyDown = (event: any) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggleFlip();
    }
  };

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-md mx-auto z-20 h-full flex items-center"
      style={{ maxHeight: '96vh' }}
    >
      <div
        className="w-full transition-transform duration-150 ease-out"
        style={{
          transform: `perspective(1000px) translateZ(30px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="rounded-3xl mx-3"
          style={{
            background: baseBg,
            boxShadow: shadows.outer,
            padding: 'clamp(4px, 0.4vh, 8px)',
            maxHeight: '94vh',
          }}
        >
          <div
            className="rounded-3xl overflow-hidden relative"
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            aria-label="프로필 카드 앞뒤 전환"
            aria-pressed={isFlipped}
            style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              maxHeight: '92vh',
              height: 'min(92vh, 820px)',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              cursor: 'pointer',
              willChange: 'transform',
              isolation: 'isolate',
              touchAction: 'pan-y',
              perspective: '1200px',
              WebkitPerspective: '1200px',
            }}
          >
            <div
              className="absolute inset-0 flex flex-col"
              style={{
                transform: isFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
                transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease',
                opacity: isFlipped ? 0 : 1,
                visibility: isFlipped ? 'hidden' : 'visible',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                willChange: 'transform',
                background: 'rgba(255, 255, 255, 0.78)',
                pointerEvents: isFlipped ? 'none' : 'auto',
              }}
            >
              <div className="overflow-hidden relative shrink-0" style={{ height: 'clamp(200px, 32vh, 280px)' }}>
                <ImageWithFallback src={pet.mainPhoto} alt={pet.name} className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
                  }}
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
                    <h1 className="mb-1" style={{ fontSize: 'clamp(24px, 4vh, 36px)' }}>
                      {pet.name}
                    </h1>
                    <p className="text-gray-600" style={{ fontSize: 'clamp(14px, 2.2vh, 20px)' }}>
                      {pet.breed}
                    </p>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
                    {[
                      { icon: Calendar, label: '나이', value: ageLabel },
                      { icon: Weight, label: '체중', value: weightLabel },
                      { icon: Ruler, label: '성별', value: pet.gender },
                      { icon: MapPin, label: '위치', value: pet.location },
                    ].map(({ icon: Icon, label, value }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2 text-gray-700 rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: shadows.inset,
                          padding: 'clamp(8px, 1.2vh, 16px)',
                        }}
                      >
                        <Icon
                          className="text-purple-500 shrink-0"
                          style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                        />
                        <div className="min-w-0">
                          <div className="text-gray-500" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                            {label}
                          </div>
                          <div className="font-medium truncate" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                            {value || '-'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="rounded-2xl"
                    style={{
                      background: baseBg,
                      boxShadow: shadows.small,
                      padding: 'clamp(10px, 1.5vh, 16px)',
                    }}
                  >
                    <div className="text-gray-500 mb-1" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                      카드 안내
                    </div>
                    <p className="leading-relaxed text-gray-700" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                      카드를 탭하거나 좌우로 스와이프하면 뒷면 정보를 볼 수 있어요.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 flex flex-col"
              style={{
                transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(180deg)',
                transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease',
                opacity: isFlipped ? 1 : 0,
                visibility: isFlipped ? 'visible' : 'hidden',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                willChange: 'transform',
                background: 'rgba(255, 255, 255, 0.78)',
                pointerEvents: isFlipped ? 'auto' : 'none',
              }}
            >
              <div
                className="shrink-0"
                style={{
                  padding: 'clamp(12px, 2vh, 20px) clamp(16px, 2.5vw, 24px) 0',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star
                      className="text-yellow-400"
                      style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                    />
                    <h2 style={{ fontSize: 'clamp(18px, 3vh, 26px)' }}>Fun Facts</h2>
                  </div>
                  <span className="text-gray-500" style={{ fontSize: 'clamp(10px, 1.6vh, 13px)' }}>
                    카드 뒷면
                  </span>
                </div>
              </div>

              <div
                className="overflow-y-auto flex-1"
                style={{
                  padding: 'clamp(10px, 1.8vh, 20px) clamp(16px, 2.5vw, 24px) clamp(14px, 2vh, 24px)',
                }}
              >
                <div className="space-y-[clamp(8px,1.3vh,14px)]">
                  <div
                    className="rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: shadows.glass,
                      padding: 'clamp(10px, 1.5vh, 20px)',
                    }}
                  >
                    <div className="flex items-start gap-2 text-gray-700">
                      <Heart
                        className="text-red-500 mt-0.5 shrink-0"
                        style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                      />
                      <div className="min-w-0">
                        <div className="text-gray-500 mb-1" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                          성격
                        </div>
                        <p className="leading-relaxed" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                          {personality || '작성된 성격 정보가 없어요.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.2vh, 12px)' }}>
                    {[
                      { label: '좋아하는 간식', value: pet.favoriteFood },
                      { label: '좋아하는 장난감', value: pet.favoriteToy },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-2xl"
                        style={{
                          background: baseBg,
                          boxShadow: shadows.small,
                          padding: 'clamp(10px, 1.5vh, 16px)',
                        }}
                      >
                        <div className="text-gray-500 mb-1" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                          {label}
                        </div>
                        <div className="font-medium text-gray-800" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                          {value || '-'}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    className="rounded-2xl"
                    style={{
                      background: 'rgba(255, 248, 230, 0.8)',
                      border: '1.5px solid rgba(230, 179, 73, 0.6)',
                      boxShadow: '0 6px 16px rgba(214, 177, 103, 0.22)',
                      padding: 'clamp(10px, 1.5vh, 18px)',
                    }}
                  >
                    <div className="text-yellow-700 mb-1 font-medium" style={{ fontSize: 'clamp(10px, 1.6vh, 13px)' }}>
                      건강 정보
                    </div>
                    <p className="text-yellow-800" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                      {health || '작성된 건강 정보가 없어요.'}
                    </p>
                  </div>

                  <div
                    className="rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: shadows.glass,
                      padding: 'clamp(10px, 1.5vh, 20px)',
                    }}
                  >
                    <div className="flex items-start gap-2 text-gray-700">
                      <Phone
                        className="text-green-500 mt-0.5 shrink-0"
                        style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
                      />
                      <div className="min-w-0">
                        <div className="text-gray-500 mb-1" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                          보호자 연락처
                        </div>
                        <p style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>{pet.ownerContact || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-2xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.58)',
                      backdropFilter: 'blur(10px)',
                      border: '2px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: shadows.glass,
                      padding: 'clamp(10px, 1.5vh, 18px)',
                    }}
                  >
                    <div className="text-gray-700 font-medium mb-2" style={{ fontSize: 'clamp(10px, 1.6vh, 13px)' }}>
                      이 친구를 위한 메모
                    </div>
                    <ul className="space-y-1.5">
                      {quickFacts.map((fact, idx) => (
                        <li
                          key={`${fact}-${idx}`}
                          className="flex items-start gap-2 text-gray-700"
                          style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                        >
                          <span className="text-purple-500 mt-[2px]">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <p className="text-center text-gray-500" style={{ fontSize: 'clamp(10px, 1.6vh, 12px)' }}>
                    카드를 다시 탭하거나 스와이프하면 앞면으로 돌아가요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomCursor({ x, y, isVisible }: { x: number; y: number; isVisible: boolean }) {
  return (
    <div
      className="absolute pointer-events-none z-50 transition-opacity duration-150"
      style={{
        left: x - 12,
        top: y - 12,
        opacity: isVisible ? 1 : 0,
      }}
    >
      <div className="w-6 h-6 bg-yellow-400 rounded-full" />
    </div>
  );
}

export default function PetProfileScene({ petData }: { petData: PetProfileData }) {
  const [mousePosition, setMousePosition] = useState({ x: 300, y: 400 });
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isMobileInput, setIsMobileInput] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const [motionPermissionDenied, setMotionPermissionDenied] = useState(false);
  const [isMotionEnabled, setIsMotionEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const motionBaselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const isFemale = petData.gender === '암컷';
  const baseBg = isFemale ? '#f7e5ef' : '#e0e5ec';
  const buttonShadow = isFemale
    ? '8px 8px 16px #dbc1ce, -8px -8px 16px #fff8fb'
    : '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    setIsMobileInput(hasCoarsePointer);
  }, []);

  useEffect(() => {
    if (!isMobileInput) return;
    const supportsOrientation =
      typeof window !== 'undefined' && typeof window.DeviceOrientationEvent !== 'undefined';

    if (!supportsOrientation) {
      setNeedsMotionPermission(false);
      setIsMotionEnabled(false);
      return;
    }

    const needsPermission =
      typeof window !== 'undefined' &&
      typeof (window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<PermissionState> })
        ?.requestPermission === 'function';

    if (needsPermission) {
      setNeedsMotionPermission(true);
      setIsMotionEnabled(false);
    } else {
      setNeedsMotionPermission(false);
      setIsMotionEnabled(true);
    }
  }, [isMobileInput]);

  useEffect(() => {
    if (isMobileInput) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          setMousePosition({ x, y });
          setIsMouseInside(true);
        }
      }
    };

    const handleMouseLeave = () => {
      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 300;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
      setMousePosition({ x: centerX, y: centerY });
      setIsMouseInside(false);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [isMobileInput]);

  useEffect(() => {
    if (!isMobileInput || !isMotionEnabled) return;
    motionBaselineRef.current = null;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      const gamma = event.gamma;
      if (beta === null || gamma === null) return;

      if (!motionBaselineRef.current) {
        motionBaselineRef.current = { beta, gamma };
      }

      const adjustedBeta = beta - motionBaselineRef.current.beta;
      const adjustedGamma = gamma - motionBaselineRef.current.gamma;

      const container = containerRef.current;
      const rect = container?.getBoundingClientRect();
      const width = rect?.width ?? window.innerWidth;
      const height = rect?.height ?? window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      const maxTiltX = 22;
      const maxTiltY = 16;
      const xTilt = clamp(adjustedGamma / maxTiltX, -1, 1);
      const yTilt = clamp(adjustedBeta / maxTiltY, -1, 1);

      const offsetX = xTilt * width * 0.35;
      const offsetY = -yTilt * height * 0.5;

      setMousePosition({ x: centerX + offsetX, y: centerY + offsetY });
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isMobileInput, isMotionEnabled]);

  const handleEnableMotion = async () => {
    try {
      const requestPermission = (window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      })?.requestPermission;

      if (!requestPermission) {
        setNeedsMotionPermission(false);
        setIsMotionEnabled(true);
        return;
      }

      const result = await requestPermission();
      if (result === 'granted') {
        setNeedsMotionPermission(false);
        setMotionPermissionDenied(false);
        setIsMotionEnabled(true);
      } else {
        setMotionPermissionDenied(true);
        setIsMotionEnabled(false);
      }
    } catch {
      setMotionPermissionDenied(true);
      setIsMotionEnabled(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
      style={{ cursor: 'none', background: baseBg }}
    >
      {isMobileInput && needsMotionPermission && (
        <div className="absolute top-4 right-4 z-50">
          <button
            type="button"
            onClick={handleEnableMotion}
            className="px-4 py-2 rounded-full text-sm font-medium text-gray-700"
            style={{
              background: baseBg,
              boxShadow: buttonShadow,
              border: '1px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            {motionPermissionDenied ? '모션 권한 필요' : '모션 허용'}
          </button>
        </div>
      )}
      <div className="flex items-center justify-center w-full h-full">
        <BackgroundLayer mouseX={mousePosition.x} mouseY={mousePosition.y} />
        <PetProfileCard mouseX={mousePosition.x} mouseY={mousePosition.y} pet={petData} />
        {!isMobileInput && (
          <CustomCursor x={mousePosition.x} y={mousePosition.y} isVisible={isMouseInside} />
        )}
      </div>
    </div>
  );
}
