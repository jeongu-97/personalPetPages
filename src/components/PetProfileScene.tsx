import { useEffect, useRef, useState } from 'react';
import { Heart, Cake, Weight, MapPin, Phone, Bone, ToyBrick, Share2, Download, Star, MessageCircle } from 'lucide-react';
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
const formatBirthDate = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '생일 미입력';

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) return `${matched[1]}.${matched[2]}.${matched[3]}`;

  return raw;
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
  const frontCaptureRef = useRef<HTMLDivElement>(null);
  const pointerStartRef = useRef<{
    x: number;
    y: number;
    id: number;
    time: number;
  } | null>(null);
  const swipeTriggeredRef = useRef(false);
  const wheelLockRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const isFemale = pet.gender === '암컷';
  const baseBg = isFemale ? '#f7e5ef' : '#e0e5ec';
  const shadows = isFemale
    ? {
        outer: '20px 20px 40px #d3b3c2, -20px -20px 40px #fff6fa',
        inset: 'inset 8px 8px 16px #d9b7cb, inset -8px -8px 16px #fff8fb',
        small: '12px 12px 24px #dbc1ce, -12px -12px 24px #fff8fb',
        button: '8px 8px 16px #dbc1ce, -8px -8px 16px #fff8fb',
        glass: '0 8px 32px rgba(176, 114, 140, 0.12)',
      }
    : {
        outer: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
        inset: 'inset 8px 8px 16px #afbdd4, inset -8px -8px 16px #ffffff',
        small: '12px 12px 24px #b8bec5, -12px -12px 24px #ffffff',
        button: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
        glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
      };
  const swappedInsetButtonShadow = isFemale
    ? 'inset 8px 8px 16px #fff8fb, inset -8px -8px 16px #d9b7cb'
    : 'inset 8px 8px 16px #ffffff, inset -8px -8px 16px #afbdd4';

  const calculateRotation = () => {
    if (!cardRef.current) return { x: 0, y: 0 };

    const rect = cardRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    const cardCenterX = rect.left + rect.width / 2;
    const windowCenterY = windowHeight / 2;

    const xRel = (mouseX - cardCenterX) / rect.width;
    const yRel = (mouseY - windowCenterY) / windowHeight;

    const yAngle = xRel * 15;
    const xAngle = Math.max(-15, Math.min(15, -yRel * 15));

    return { x: xAngle, y: yAngle };
  };

  const rotation = calculateRotation();
  const swipeDistanceThreshold = 18;
  const tapMaxDistance = 8;
  const tapMaxDuration = 280;

  useEffect(() => {
    return () => {
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }
      if (wheelLockRef.current !== null) {
        window.clearTimeout(wheelLockRef.current);
      }
    };
  }, []);

  const handleToggleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setIsFlipped((prev) => !prev);
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
    }
    flipTimerRef.current = window.setTimeout(() => {
      setIsFlipping(false);
      flipTimerRef.current = null;
    }, 520);
  };

  const handlePointerDown = (event: any) => {
    // 왼쪽 버튼/터치만 처리
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isFlipping) return;
    pointerStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      id: event.pointerId,
      time: event.timeStamp,
    };
    swipeTriggeredRef.current = false;
  };

  const handlePointerMove = (event: any) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId || swipeTriggeredRef.current) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (
      Math.abs(deltaX) >= swipeDistanceThreshold &&
      Math.abs(deltaX) > Math.abs(deltaY) + 6 &&
      !isFlipping
    ) {
      swipeTriggeredRef.current = true;
      handleToggleFlip();
    }
  };

  const handlePointerUp = (event: any) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const duration = event.timeStamp - start.time;

    if (!swipeTriggeredRef.current && Math.abs(deltaX) <= tapMaxDistance && Math.abs(deltaY) <= tapMaxDistance && duration <= tapMaxDuration) {
      handleToggleFlip();
      suppressClickRef.current = true;
    }

    pointerStartRef.current = null;
    swipeTriggeredRef.current = false;
  };

  const handlePointerCancel = (event: any) => {
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStartRef.current = null;
    swipeTriggeredRef.current = false;
  };

  const handleWheel = (event: any) => {
    if (isFlipping || wheelLockRef.current !== null) return;
    const absX = Math.abs(event.deltaX);
    const absY = Math.abs(event.deltaY);

    if (absX > absY + 2 && absX > 18) {
      event.preventDefault();
      handleToggleFlip();
      wheelLockRef.current = window.setTimeout(() => {
        wheelLockRef.current = null;
      }, 260);
    }
  };

  const handleCardClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isFlipping) return;
    handleToggleFlip();
  };

  const stopCardFlipFromChild = (event: any) => {
    event.stopPropagation();
  };

  const handleShareProfile = async (event: any) => {
    stopCardFlipFromChild(event);
    if (typeof window === 'undefined') return;
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${pet.name || '반려동물'} 프로필`,
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

  const cloneNodeWithComputedStyles = (sourceRoot: HTMLElement) => {
    const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement;
    const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>('*'))];
    const clonedElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))];

    sourceElements.forEach((sourceElement, index) => {
      const clonedElement = clonedElements[index];
      if (!clonedElement) return;

      const computedStyle = window.getComputedStyle(sourceElement);
      const cssText = Array.from(computedStyle)
        .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
        .join('');
      clonedElement.style.cssText = cssText;
    });

    return clonedRoot;
  };

  const toDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('image_data_url_failed'));
      };
      reader.onerror = () => reject(reader.error ?? new Error('image_data_url_failed'));
      reader.readAsDataURL(blob);
    });

  const inlineImagesAsDataUrl = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    await Promise.all(
      images.map(async (imageElement) => {
        const source = imageElement.getAttribute('src');
        if (!source || source.startsWith('data:')) return;

        try {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), 5000);
          let response: Response;
          try {
            response = await fetch(source, { mode: 'cors', signal: controller.signal });
          } finally {
            window.clearTimeout(timeoutId);
          }
          if (!response.ok) return;
          const blob = await response.blob();
          const dataUrl = await toDataUrl(blob);
          imageElement.setAttribute('src', dataUrl);
          imageElement.removeAttribute('crossorigin');
        } catch {
          // keep original source
        }
      }),
    );
  };

  const downloadFrontCardAsPng = async (targetElement: HTMLElement, fileName: string) => {
    const width = targetElement.offsetWidth || Math.ceil(targetElement.getBoundingClientRect().width);
    const height = targetElement.offsetHeight || Math.ceil(targetElement.getBoundingClientRect().height);
    const borderRadius = window.getComputedStyle(targetElement).borderRadius;

    const clonedCard = cloneNodeWithComputedStyles(targetElement);
    clonedCard.style.width = `${width}px`;
    clonedCard.style.height = `${height}px`;
    clonedCard.style.maxHeight = 'none';
    clonedCard.style.margin = '0';
    clonedCard.style.transform = 'none';
    clonedCard.style.position = 'relative';
    clonedCard.style.inset = 'auto';
    clonedCard.style.left = '0';
    clonedCard.style.top = '0';
    clonedCard.style.right = 'auto';
    clonedCard.style.bottom = 'auto';
    clonedCard.style.overflow = 'hidden';
    clonedCard.style.boxSizing = 'border-box';
    clonedCard.style.borderRadius = borderRadius;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    wrapper.style.position = 'relative';
    wrapper.style.width = `${width}px`;
    wrapper.style.height = `${height}px`;
    wrapper.style.margin = '0';
    wrapper.style.padding = '0';
    wrapper.style.background = 'transparent';
    wrapper.style.overflow = 'hidden';
    wrapper.style.borderRadius = borderRadius;
    wrapper.appendChild(clonedCard);

    await inlineImagesAsDataUrl(wrapper);

    const serializedCard = new XMLSerializer().serializeToString(wrapper);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="100%" height="100%">${serializedCard}</foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadBlob = (blob: Blob, name: string) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    };

    try {
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        let settled = false;
        const finalize = (callback: () => void) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(loadTimeoutId);
          callback();
        };
        const loadTimeoutId = window.setTimeout(() => {
          finalize(() => reject(new Error('svg_render_timeout')));
        }, 8000);

        image.onload = () => {
          try {
            const scale = Math.max(2, Math.min(3, window.devicePixelRatio || 1));
            const canvas = window.document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);

            const context = canvas.getContext('2d');
            if (!context) {
              finalize(() => reject(new Error('canvas_context_failed')));
              return;
            }

            context.scale(scale, scale);
            context.drawImage(image, 0, 0, width, height);

            const blobTimeoutId = window.setTimeout(() => {
              finalize(() => reject(new Error('canvas_blob_timeout')));
            }, 4000);

            canvas.toBlob((blob) => {
              window.clearTimeout(blobTimeoutId);
              if (!blob) {
                finalize(() => reject(new Error('canvas_blob_failed')));
                return;
              }

              downloadBlob(blob, fileName);
              finalize(() => resolve());
            }, 'image/png');
          } catch {
            finalize(() => reject(new Error('canvas_draw_failed')));
          }
        };
        image.onerror = () => finalize(() => reject(new Error('svg_render_failed')));
        image.src = svgUrl;
      });
    } catch {
      const svgFileName = fileName.replace(/\.png$/i, '.svg');
      downloadBlob(svgBlob, svgFileName);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const handleSaveImage = async (event: any) => {
    stopCardFlipFromChild(event);
    if (typeof window === 'undefined' || isSavingImage) return;

    const targetElement = frontCaptureRef.current;
    if (!targetElement) return;

    const downloadName = `${(pet.slug || pet.name || 'pet').trim()}-profile-card.png`;
    setIsSavingImage(true);
    try {
      await downloadFrontCardAsPng(targetElement, downloadName);
    } catch {
      window.alert('이미지 저장에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsSavingImage(false);
    }
  };

  const frontCardContent = (
    <>
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
          <div className="flex items-end justify-center gap-2">
            <h1 className="leading-[0.9]" style={{ fontSize: 'clamp(24px, 4vh, 36px)' }}>
              {pet.name}
            </h1>
            <span
              className="font-semibold leading-none"
              style={{
                fontSize: 'clamp(18px, 3vh, 26px)',
                color: pet.gender === '암컷' ? '#ec4899' : pet.gender === '수컷' ? '#3b82f6' : '#9ca3af',
              }}
            >
              {pet.gender === '암컷' ? '♀' : pet.gender === '수컷' ? '♂' : '·'}
            </span>
          </div>

          <p className="text-center text-gray-600 leading-none -mt-4" style={{ fontSize: 'clamp(13px, 2vh, 18px)' }}>
            {pet.breed || '품종 미입력'}
          </p>

          <div className="flex items-center justify-center gap-2 text-gray-600" style={{ fontSize: 'clamp(12px, 1.8vh, 16px)' }}>
            <Cake
              className="shrink-0 text-gray-500"
              style={{ width: 'clamp(14px, 2.1vh, 18px)', height: 'clamp(14px, 2.1vh, 18px)' }}
            />
            <span>{formatBirthDate(pet.birthDate)}</span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold" style={{ color: '#a855f7' }}>
              {formatAge(pet.age) || '나이 미입력'}
            </span>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
            {[
              { icon: Weight, label: '체중', value: formatWeight(pet.weight) || '미입력' },
              { icon: MapPin, label: '위치', value: pet.location || '미입력' },
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
                    {value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.2vh, 12px)' }}>
            {[
              { icon: Bone, label: '좋아하는 간식', value: pet.favoriteFood || '미입력' },
              { icon: ToyBrick, label: '좋아하는 장난감', value: pet.favoriteToy || '미입력' },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-gray-700 rounded-2xl"
                style={{
                  background: baseBg,
                  boxShadow: shadows.inset,
                  padding: 'clamp(10px, 1.5vh, 16px)',
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
                    {value}
                  </div>
                </div>
              </div>
            ))}
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
              <Heart
                className="text-red-500 mt-0.5 shrink-0"
                style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
              />
              <div className="min-w-0">
                <div className="text-gray-500 mb-1" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                  성격
                </div>
                <p className="leading-relaxed" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                  {pet.personality}
                </p>
              </div>
            </div>
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
                <p style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>{pet.ownerContact}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const backCardContent = (
    <div className="overflow-y-auto flex-1 flex flex-col">
      <div className="overflow-hidden relative shrink-0" style={{ height: 'clamp(200px, 32vh, 280px)' }}>
        <ImageWithFallback
          src={pet.mainPhoto}
          alt={pet.name}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
      </div>

      <div
        className="space-y-[clamp(8px,1.5vh,16px)]"
        style={{ padding: 'clamp(12px, 2vh, 24px) clamp(18px, 3vw, 30px)' }}
      >
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
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <Star
              className="shrink-0"
              style={{
                width: 'clamp(16px, 2.5vh, 20px)',
                height: 'clamp(16px, 2.5vh, 20px)',
                fill: '#facc15',
                stroke: '#facc15',
              }}
            />
            <p className="font-semibold" style={{ fontSize: 'clamp(16px, 2.4vh, 22px)' }}>
              Fun Facts
            </p>
          </div>
          {(pet.funFacts.length
            ? pet.funFacts.map((text, index) => ({
                color: ['#8b5cf6', '#ec4899', '#3b82f6'][index % 3],
                text,
              }))
            : [
                {
                  color: '#8b5cf6',
                  text: `${pet.name || '우리 아이'}(가)를 처음 만난다면 ${(pet.favoriteToy || '애착 장난감').trim()}(을)를 준비해보세요!`,
                },
                {
                  color: '#ec4899',
                  text: (pet.personality.split('\n').find((line) => line.trim().length > 0) || '애교가 많아요').trim(),
                },
                {
                  color: '#3b82f6',
                  text:
                    formatBirthDate(pet.birthDate) === '생일 미입력'
                      ? '생일 정보는 아직 입력되지 않았어요.'
                      : `생일을 축하해주고 싶다면 ${formatBirthDate(pet.birthDate)}을 기억해주세요!`,
                },
              ]).map(({ color, text }, index) => (
            <div key={`fact-row-${index}`} className="flex items-start gap-2 leading-relaxed">
              <span className="shrink-0 mt-[0.15em]" style={{ color }}>
                •
              </span>
              <p className="text-gray-700" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                {text}
              </p>
            </div>
          ))}
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
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <MessageCircle
              className="shrink-0 text-gray-600"
              style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
            />
            <p className="font-semibold" style={{ fontSize: 'clamp(16px, 2.4vh, 22px)' }}>
              댓글
            </p>
          </div>

          {[
            ...(pet.comments.length
              ? pet.comments.map((comment) =>
                  comment.author ? `${comment.author}: ${comment.text}` : comment.text
                )
              : [
                  `이웃집 보호자: 너무 귀여워요! 우리 아이랑 친구 했으면 좋겠어요 🥰`,
                  `강아지 러버: ${pet.name || '아이'} 생일 축하해요~ 🎉🎂`,
                  `반려인 모임: ${pet.personality?.split('\n')[0]?.trim() || '사랑스러운 성격'}이라 더 매력적이네요!`,
                ]),
          ].map((text, index) => (
            <div key={`comment-row-${index}`} className="flex items-start gap-2 leading-relaxed">
              <span className="shrink-0 mt-[0.15em]" style={{ color: '#6b7280' }}>
                •
              </span>
              <p className="text-gray-700" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                {text}
              </p>
            </div>
          ))}

          <button
            type="button"
            onPointerDown={stopCardFlipFromChild}
            onPointerUp={stopCardFlipFromChild}
            onPointerCancel={stopCardFlipFromChild}
            onClick={stopCardFlipFromChild}
            className="w-full rounded-2xl text-white"
            style={{
              marginTop: 'clamp(10px, 1.5vh, 16px)',
              background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
              boxShadow: '0 8px 18px rgba(168, 85, 247, 0.25)',
              padding: 'clamp(10px, 1.4vh, 14px)',
              minHeight: 'clamp(42px, 6.2vh, 52px)',
              fontSize: 'clamp(13px, 2vh, 16px)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              columnGap: '8px',
            }}
          >
            <MessageCircle
              className="shrink-0"
              style={{ width: 'clamp(15px, 2.2vh, 18px)', height: 'clamp(15px, 2.2vh, 18px)' }}
            />
            <span>댓글 작성</span>
          </button>
        </div>

        <button
          type="button"
          onPointerDown={stopCardFlipFromChild}
          onPointerUp={stopCardFlipFromChild}
          onPointerCancel={stopCardFlipFromChild}
          onClick={handleShareProfile}
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
            className="text-purple-500 shrink-0"
            style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
          />
          <span>프로필 공유하기</span>
        </button>

        <button
          type="button"
          disabled={isSavingImage}
          onPointerDown={stopCardFlipFromChild}
          onPointerUp={stopCardFlipFromChild}
          onPointerCancel={stopCardFlipFromChild}
          onClick={handleSaveImage}
          className="w-full rounded-2xl text-gray-700"
          style={{
            background: baseBg,
            boxShadow: swappedInsetButtonShadow,
            padding: 'clamp(10px, 1.5vh, 16px)',
            minHeight: 'clamp(46px, 6.8vh, 56px)',
            fontSize: 'clamp(13px, 2vh, 16px)',
            fontWeight: 600,
            opacity: isSavingImage ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            columnGap: '8px',
          }}
        >
          <Download
            className="text-purple-500 shrink-0"
            style={{ width: 'clamp(16px, 2.5vh, 20px)', height: 'clamp(16px, 2.5vh, 20px)' }}
          />
          <span>{isSavingImage ? '이미지 생성 중...' : '이미지로 저장'}</span>
        </button>

        <p className="text-center text-gray-500 font-medium" style={{ fontSize: 'clamp(10px, 1.6vh, 12px)' }}>
          탭 또는 좌우 스와이프로 앞면으로 돌아오세요.
        </p>
      </div>
    </div>
  );

  return (
    <div
      ref={cardRef}
      className="relative w-full max-w-md mx-auto z-20 h-full flex items-center"
      style={{ maxHeight: '96vh' }}
    >
      <div
        className="w-full transition-transform duration-150 ease-out"
        style={{
          transform: `perspective(1000px) translateZ(30px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
          transformStyle: 'preserve-3d',
          perspective: '1200px',
          WebkitPerspective: '1200px',
        }}
      >
        <div
          className="relative rounded-3xl mx-3"
          role="button"
          tabIndex={0}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onWheel={handleWheel}
          onClick={handleCardClick}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleToggleFlip();
            }
          }}
          style={{
            position: 'relative',
            maxHeight: '94vh',
            height: 'min(92vh, 820px)',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            willChange: 'transform',
            touchAction: 'pan-y',
            userSelect: 'none',
            cursor: 'pointer',
          }}
        >
          <div
            className="absolute inset-0 rounded-3xl"
            ref={frontCaptureRef}
            style={{
              background: baseBg,
              boxShadow: shadows.outer,
              border: '2px solid rgba(255, 255, 255, 0.8)',
              padding: 'clamp(4px, 0.4vh, 8px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(0deg)',
            }}
          >
            <div
              className="rounded-3xl overflow-hidden relative h-full flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <div
                className="absolute inset-0 flex flex-col"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                }}
              >
                {frontCardContent}
              </div>
            </div>
          </div>
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: baseBg,
              boxShadow: shadows.outer,
              border: '2px solid rgba(255, 255, 255, 0.8)',
              padding: 'clamp(4px, 0.4vh, 8px)',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div
              className="rounded-3xl overflow-hidden relative h-full flex flex-col"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
              }}
            >
              <div
                className="absolute inset-0 flex flex-col"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                }}
              >
                {backCardContent}
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
