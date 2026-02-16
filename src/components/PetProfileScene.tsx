import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Heart, Cake, Weight, MapPin, Phone, Bone, ToyBrick, Share2, Download, Star, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { PetKind, PetProfileData } from '../types/pet';

interface ParallaxProps {
  mouseX: number;
  mouseY: number;
}

type SceneMode = 'view' | 'edit';

type PetProfileSceneProps = {
  petData: PetProfileData;
  mode?: SceneMode;
  onPetChange?: (nextPet: PetProfileData) => void;
  editLink?: string;
  onEditRequest?: () => void;
  showEditMenu?: boolean;
  bottomReservedHeight?: number;
  bottomAction?: ReactNode;
  onShareRequest?: () => void;
  onCommentRequest?: () => void;
  onSaveRequest?: () => void;
  isSaving?: boolean;
  onPhotoUploadRequest?: (file: File) => Promise<void> | void;
  isUploadingPhoto?: boolean;
  bottomActionMode?: 'inline' | 'floating-on-scroll';
};

type DisplayPetKind = PetKind | 'unknown';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeNumeric = (value: string) => value.replace(/\D+/g, '');
const normalizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integer, ...rest] = cleaned.split('.');
  if (!rest.length) return integer;
  const decimals = rest.join('');
  return `${integer}.${decimals}`;
};
const ageFromBirthDate = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const birth = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let monthDiff =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) {
    monthDiff -= 1;
  }

  if (monthDiff < 0) return '';
  if (monthDiff < 24) return `${monthDiff}개월`;
  return `${Math.floor(monthDiff / 12)}살`;
};
const formatAge = (value: string, birthDate?: string) => {
  const numeric = normalizeNumeric(value);
  if (!numeric) return ageFromBirthDate(birthDate);
  if (/개월|월/.test(value)) return `${numeric}개월`;
  if (/살|년/.test(value)) return `${numeric}살`;
  return `${numeric}살`;
};
const formatBirthDate = (value?: string) => {
  const raw = (value ?? '').trim();
  if (!raw) return '생일 미입력';

  const normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
  const matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matched) return `${matched[1]}.${matched[2]}.${matched[3]}`;

  return raw;
};

const normalizePetKind = (value: unknown): PetKind =>
  value === 'dog' || value === 'cat' || value === 'bird' || value === 'fish' ? value : '';

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

type Rgb = { r: number; g: number; b: number };

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
const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const createNeumorphismPalette = (baseColor: string) => {
  const darkStrong = darkenHex(baseColor, 0.28);
  const dark = darkenHex(baseColor, 0.22);
  const darkSoft = darkenHex(baseColor, 0.16);
  const lightStrong = lightenHex(baseColor, 0.46);
  const light = lightenHex(baseColor, 0.38);
  const lightSoft = lightenHex(baseColor, 0.28);

  return {
    outer: `20px 20px 40px ${darkStrong}, -20px -20px 40px ${lightStrong}`,
    inset: `inset 8px 8px 16px ${dark}, inset -8px -8px 16px ${light}`,
    small: `12px 12px 24px ${darkSoft}, -12px -12px 24px ${lightSoft}`,
    button: `8px 8px 16px ${darkSoft}, -8px -8px 16px ${lightSoft}`,
    swappedInsetButton: `inset 8px 8px 16px ${light}, inset -8px -8px 16px ${dark}`,
    glass: `0 8px 32px ${withAlpha(darkenHex(baseColor, 0.45), 0.16)}`,
  };
};

const petEmojiByKind: Record<DisplayPetKind, string> = {
  dog: '🐶',
  cat: '🐱',
  bird: '🐦',
  fish: '🐠',
  '': '🐾',
  unknown: '🐾',
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
  mode,
  onPetChange,
  editLink,
  onEditRequest,
  showEditMenu = true,
  onShareRequest,
  onCommentRequest,
  onSaveRequest,
  isSaving = false,
  onPhotoUploadRequest,
  isUploadingPhoto = false,
  alignTop = false,
  viewportBottomReserve = 0,
}: ParallaxProps & {
  pet: PetProfileData;
  mode: SceneMode;
  onPetChange?: (nextPet: PetProfileData) => void;
  editLink?: string;
  onEditRequest?: () => void;
  showEditMenu?: boolean;
  onShareRequest?: () => void;
  onCommentRequest?: () => void;
  onSaveRequest?: () => void;
  isSaving?: boolean;
  onPhotoUploadRequest?: (file: File) => Promise<void> | void;
  isUploadingPhoto?: boolean;
  alignTop?: boolean;
  viewportBottomReserve?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frontCaptureRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const bgColorInputRef = useRef<HTMLInputElement | null>(null);
  const accentColorInputRef = useRef<HTMLInputElement | null>(null);
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
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const isEditMode = mode === 'edit';
  const hasMainPhoto = Boolean(pet.mainPhoto?.trim());
  const petKind = normalizePetKind(pet.petKind) || 'unknown';
  const petEmoji = petEmojiByKind[petKind];
  const baseBg = resolveCardBackground(pet.gender, pet.backgroundColor);
  const pointColor = resolveAccentColor(pet.gender, pet.accentColor);
  const genderMarkColor =
    pet.gender === '암컷' ? '#ec4899' : pet.gender === '수컷' ? '#3b82f6' : '#9ca3af';
  const fallbackFunFacts = buildDefaultFunFacts(pet);
  const displayFunFacts = pet.funFacts.length ? pet.funFacts : fallbackFunFacts;
  const shadows = createNeumorphismPalette(baseBg);
  const swappedInsetButtonShadow = shadows.swappedInsetButton;
  const funFactColors = [pointColor, lightenHex(pointColor, 0.22), darkenHex(pointColor, 0.12)];
  const commentGradient = `linear-gradient(90deg, ${darkenHex(pointColor, 0.1)} 0%, ${lightenHex(
    pointColor,
    0.1
  )} 100%)`;

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

  const patchPet = (patch: Partial<PetProfileData>) => {
    if (!onPetChange) return;
    onPetChange({ ...pet, ...patch });
  };

  const normalizeBirthDateInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return '';
    const normalized = raw.replace(/\./g, '-').replace(/\//g, '-');
    const matched = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!matched) return raw;
    return `${matched[1]}-${matched[2].padStart(2, '0')}-${matched[3].padStart(2, '0')}`;
  };

  const commitSingleLineField = (field: keyof PetProfileData) => (event: any) => {
    const rawValue = (event.currentTarget.textContent ?? '').replace(/\n+/g, ' ').trim();
    const nextValue =
      field === 'weight' ? normalizeDecimal(rawValue) : rawValue;
    patchPet({ [field]: nextValue } as Partial<PetProfileData>);
  };

  const commitBirthDateField = (event: any) => {
    const nextBirthDate = normalizeBirthDateInput((event.currentTarget.textContent ?? '').replace(/\n+/g, ' '));
    patchPet({
      birthDate: nextBirthDate,
      age: ageFromBirthDate(nextBirthDate),
    });
  };

  const commitMultiLineField = (field: keyof PetProfileData) => (event: any) => {
    const nextValue = (event.currentTarget.textContent ?? '').trim();
    patchPet({ [field]: nextValue } as Partial<PetProfileData>);
  };

  const commitFunFacts = (event: any) => {
    const raw = (event.currentTarget.textContent ?? '').trim();
    const nextFacts = raw
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    patchPet({ funFacts: nextFacts });
  };

  const commitComments = (event: any) => {
    const raw = (event.currentTarget.textContent ?? '').trim();
    const rows = raw
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
    const nextComments = rows.map((row: string) => {
      const separator = row.indexOf(':');
      if (separator > 0) {
        return {
          author: row.slice(0, separator).trim(),
          text: row.slice(separator + 1).trim(),
        };
      }
      return { author: '', text: row };
    });
    patchPet({ comments: nextComments });
  };

  const handleSingleLineEditableKeyDown = (event: any) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.currentTarget.blur();
  };

  const handleToggleGender = (event: any) => {
    if (!isEditMode) return;
    stopCardFlipFromChild(event);
    patchPet({ gender: pet.gender === '암컷' ? '수컷' : '암컷' });
  };

  const handlePhotoFileChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file || !onPhotoUploadRequest) return;
    try {
      await onPhotoUploadRequest(file);
    } finally {
      event.target.value = '';
    }
  };

  const handleBackgroundColorChange = (event: any) => {
    const nextColor = event.target.value;
    if (!isEditMode) return;
    if (!isValidHexColor(nextColor)) return;
    patchPet({ backgroundColor: nextColor });
    event.target.value = '';
  };

  const handleAccentColorChange = (event: any) => {
    const nextColor = event.target.value;
    if (!isEditMode) return;
    if (!isValidHexColor(nextColor)) return;
    patchPet({ accentColor: nextColor });
    event.target.value = '';
  };

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

  useEffect(() => {
    if (!isEditMenuOpen || typeof document === 'undefined') return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-edit-menu-root="true"]')) return;
      setIsEditMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEditMenuOpen]);

  const handleToggleFlip = () => {
    if (isFlipping) return;
    setIsEditMenuOpen(false);
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
    if (isEditMode) return;
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
    if (isEditMode) return;
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
    if (isEditMode) return;
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
    if (isEditMode) return;
    const start = pointerStartRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerStartRef.current = null;
    swipeTriggeredRef.current = false;
  };

  const handleWheel = (event: any) => {
    if (isEditMode) return;
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
    if (isEditMode) return;
    if (isEditMenuOpen) {
      setIsEditMenuOpen(false);
      return;
    }
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
    if (onShareRequest) {
      onShareRequest();
      return;
    }
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

  const toggleEditMenu = (event: any) => {
    stopCardFlipFromChild(event);
    setIsEditMenuOpen((prev) => !prev);
  };

  const goToEditPage = (event: any) => {
    stopCardFlipFromChild(event);
    setIsEditMenuOpen(false);
    if (onEditRequest) {
      onEditRequest();
      return;
    }
    if (typeof window === 'undefined') return;
    if (editLink) {
      window.location.href = editLink;
      return;
    }
    const token = new URLSearchParams(window.location.search).get('token');
    const fallbackLink = `/edit/${encodeURIComponent(pet.slug)}${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    window.location.href = fallbackLink;
  };

  const renderTopLeftControls = () =>
    isEditMode ? (
      <>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoFileChange}
          style={{ display: 'none' }}
        />
        <input
          ref={bgColorInputRef}
          type="color"
          defaultValue={isValidHexColor(pet.backgroundColor) ? pet.backgroundColor : '#e0e5ec'}
          onChange={handleBackgroundColorChange}
          style={{ display: 'none' }}
        />
        <input
          ref={accentColorInputRef}
          type="color"
          defaultValue={pointColor}
          onChange={handleAccentColorChange}
          style={{ display: 'none' }}
        />
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '8px',
            zIndex: 25,
            display: 'flex',
            gap: '4px',
          }}
        >
        <button
          type="button"
          onPointerDown={stopCardFlipFromChild}
          onPointerUp={stopCardFlipFromChild}
          onPointerCancel={stopCardFlipFromChild}
          onClick={(event) => {
            stopCardFlipFromChild(event);
            bgColorInputRef.current?.click();
          }}
          aria-label="배경색 변경"
          style={{
            minWidth: '70px',
            height: '30px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(10px) saturate(140%)',
            WebkitBackdropFilter: 'blur(10px) saturate(140%)',
            border: '1px solid rgba(15, 23, 42, 0.28)',
            boxShadow: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          배경색
        </button>
        <button
          type="button"
          onPointerDown={stopCardFlipFromChild}
          onPointerUp={stopCardFlipFromChild}
          onPointerCancel={stopCardFlipFromChild}
          onClick={(event) => {
            stopCardFlipFromChild(event);
            accentColorInputRef.current?.click();
          }}
          aria-label="포인트색 변경"
          style={{
            minWidth: '78px',
            height: '30px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(10px) saturate(140%)',
            WebkitBackdropFilter: 'blur(10px) saturate(140%)',
            border: '1px solid rgba(15, 23, 42, 0.28)',
            boxShadow: 'none',
            fontSize: '13px',
            fontWeight: 600,
            color: '#111827',
            cursor: 'pointer',
          }}
        >
          포인트색
        </button>
        </div>
        <div
          style={{
            position: 'absolute',
            left: '12px',
            bottom: '12px',
            zIndex: 25,
          }}
        >
          <button
            type="button"
            onPointerDown={stopCardFlipFromChild}
            onPointerUp={stopCardFlipFromChild}
            onPointerCancel={stopCardFlipFromChild}
            onClick={(event) => {
              stopCardFlipFromChild(event);
              photoInputRef.current?.click();
            }}
            disabled={!onPhotoUploadRequest || isUploadingPhoto}
            aria-label="사진 업로드"
            style={{
              minWidth: '84px',
              height: '30px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.22)',
              backdropFilter: 'blur(10px) saturate(140%)',
              WebkitBackdropFilter: 'blur(10px) saturate(140%)',
              border: '1px solid rgba(15, 23, 42, 0.28)',
              boxShadow: 'none',
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              opacity: !onPhotoUploadRequest || isUploadingPhoto ? 0.55 : 1,
              cursor: !onPhotoUploadRequest || isUploadingPhoto ? 'not-allowed' : 'pointer',
            }}
          >
            {isUploadingPhoto ? '업로드중' : '사진 변경'}
          </button>
        </div>
      </>
    ) : null;

  const renderTopRightControl = () => (
    isEditMode ? (
    <button
      type="button"
      onPointerDown={stopCardFlipFromChild}
      onPointerUp={stopCardFlipFromChild}
      onPointerCancel={stopCardFlipFromChild}
      onClick={(event) => {
        stopCardFlipFromChild(event);
        onSaveRequest?.();
      }}
      disabled={!onSaveRequest || isSaving}
      aria-label="변경사항 저장"
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 25,
        minWidth: '92px',
        height: '30px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.22)',
        backdropFilter: 'blur(10px) saturate(140%)',
        WebkitBackdropFilter: 'blur(10px) saturate(140%)',
        border: '1px solid rgba(15, 23, 42, 0.28)',
        boxShadow: 'none',
        fontSize: '13px',
        fontWeight: 600,
        color: '#111827',
        opacity: !onSaveRequest || isSaving ? 0.55 : 1,
        cursor: !onSaveRequest || isSaving ? 'not-allowed' : 'pointer',
      }}
    >
      {isSaving ? '저장중...' : '저장'}
    </button>
    ) : showEditMenu ? (
    <div
      data-edit-menu-root="true"
      style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 25,
      }}
    >
      <button
        type="button"
        onPointerDown={stopCardFlipFromChild}
        onPointerUp={stopCardFlipFromChild}
        onPointerCancel={stopCardFlipFromChild}
        onClick={toggleEditMenu}
        aria-label="프로필 편집 메뉴 열기"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 'auto',
          height: 'auto',
          padding: 0,
          lineHeight: 0,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" shapeRendering="geometricPrecision">
          <circle cx="10" cy="4" r="2" fill="#ffffff" stroke="#111827" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx="10" cy="10" r="2" fill="#ffffff" stroke="#111827" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx="10" cy="16" r="2" fill="#ffffff" stroke="#111827" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
      </button>
      {isEditMenuOpen && (
        <div
          role="menu"
          onPointerDown={stopCardFlipFromChild}
          onPointerUp={stopCardFlipFromChild}
          onPointerCancel={stopCardFlipFromChild}
          onClick={stopCardFlipFromChild}
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '92px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(10px) saturate(140%)',
            WebkitBackdropFilter: 'blur(10px) saturate(140%)',
            border: '1px solid rgba(15, 23, 42, 0.28)',
            boxShadow: 'none',
            padding: '4px',
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={goToEditPage}
            className="w-full"
            style={{
              borderRadius: '7px',
              height: '30px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            편집하기
          </button>
        </div>
      )}
    </div>
    ) : null
  );

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
        {hasMainPhoto ? (
          <ImageWithFallback src={pet.mainPhoto} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(160deg, #f7dff0 0%, #f2e9f8 52%, #ecf1fb 100%)',
            }}
          >
            <span style={{ fontSize: 'clamp(80px, 15vh, 130px)', lineHeight: 1 }}>{petEmoji}</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        {renderTopLeftControls()}
        {renderTopRightControl()}
      </div>

      <div
        className="overflow-y-auto flex-1"
        style={{
          padding: 'clamp(12px, 2vh, 24px) clamp(16px, 2.5vw, 24px)',
        }}
      >
        <div className="space-y-[clamp(8px,1.5vh,16px)]">
          <div className="flex items-end justify-center gap-2">
            <h1
              className="leading-[0.9]"
              contentEditable={isEditMode}
              suppressContentEditableWarning
              onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
              onBlur={isEditMode ? commitSingleLineField('name') : undefined}
              onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
              style={{
                fontSize: 'clamp(24px, 4vh, 36px)',
                outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.45)' : 'none',
                borderRadius: isEditMode ? '8px' : '0',
                padding: isEditMode ? '2px 6px' : '0',
                cursor: isEditMode ? 'text' : 'inherit',
                minWidth: isEditMode ? '40px' : 'auto',
                textAlign: 'center',
              }}
            >
              {pet.name || (isEditMode ? '이름 입력' : '')}
            </h1>
            {isEditMode ? (
              <button
                type="button"
                onPointerDown={stopCardFlipFromChild}
                onPointerUp={stopCardFlipFromChild}
                onPointerCancel={stopCardFlipFromChild}
                onClick={handleToggleGender}
                aria-label="성별 전환"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 'clamp(18px, 3vh, 26px)',
                  color: genderMarkColor,
                  cursor: 'pointer',
                }}
              >
                {pet.gender === '암컷' ? '♀' : pet.gender === '수컷' ? '♂' : '·'}
              </button>
            ) : (
              <span
                className="font-semibold leading-none"
                style={{
                  fontSize: 'clamp(18px, 3vh, 26px)',
                  color: genderMarkColor,
                }}
              >
                {pet.gender === '암컷' ? '♀' : pet.gender === '수컷' ? '♂' : '·'}
              </span>
            )}
          </div>

          <p
            className="text-center text-gray-600 leading-none -mt-4"
            contentEditable={isEditMode}
            suppressContentEditableWarning
            onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
            onBlur={isEditMode ? commitSingleLineField('breed') : undefined}
            onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
            style={{
              fontSize: 'clamp(13px, 2vh, 18px)',
              outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
              borderRadius: isEditMode ? '8px' : '0',
              padding: isEditMode ? '2px 6px' : '0',
              cursor: isEditMode ? 'text' : 'inherit',
            }}
          >
            {pet.breed || '품종 미입력'}
          </p>

          <div className="flex items-center justify-center gap-2 text-gray-600" style={{ fontSize: 'clamp(12px, 1.8vh, 16px)' }}>
            <Cake
              className="shrink-0 text-gray-500"
              style={{ width: 'clamp(14px, 2.1vh, 18px)', height: 'clamp(14px, 2.1vh, 18px)' }}
            />
            <span
              contentEditable={isEditMode}
              suppressContentEditableWarning
              onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
              onBlur={isEditMode ? commitBirthDateField : undefined}
              onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
              style={{
                outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
                borderRadius: isEditMode ? '8px' : '0',
                padding: isEditMode ? '1px 6px' : '0',
                cursor: isEditMode ? 'text' : 'inherit',
              }}
            >
              {formatBirthDate(pet.birthDate)}
            </span>
            <span className="text-gray-300">•</span>
            <span className="font-semibold" style={{ color: pointColor }}>
              {formatAge(pet.age, pet.birthDate) || '나이 미입력'}
            </span>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 'clamp(8px, 1.5vh, 16px)' }}>
            <div
              className="flex items-center gap-2 text-gray-700 rounded-2xl"
              style={{
                background: baseBg,
                boxShadow: shadows.inset,
                padding: 'clamp(8px, 1.2vh, 16px)',
              }}
            >
              <Weight
                className="shrink-0"
                style={{
                  width: 'clamp(16px, 2.5vh, 20px)',
                  height: 'clamp(16px, 2.5vh, 20px)',
                  color: pointColor,
                }}
              />
              <div className="min-w-0">
                <div className="text-gray-500" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                  체중
                </div>
                <div className="font-medium" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                  {isEditMode ? (
                    <input
                      value={normalizeDecimal(pet.weight)}
                      onPointerDown={stopCardFlipFromChild}
                      onChange={(event) => patchPet({ weight: normalizeDecimal(event.target.value) })}
                      inputMode="decimal"
                      pattern="[0-9]*[.]?[0-9]*"
                      placeholder="0"
                      style={{
                        width: '52px',
                        border: 'none',
                        borderBottom: '1px dashed rgba(107, 114, 128, 0.45)',
                        outline: 'none',
                        background: 'transparent',
                        padding: '0 2px',
                        marginRight: '2px',
                        textAlign: 'left',
                      }}
                    />
                  ) : (
                    <span>{normalizeDecimal(pet.weight) || '미입력'}</span>
                  )}
                  {(normalizeDecimal(pet.weight) || isEditMode) && <span>kg</span>}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-2 text-gray-700 rounded-2xl"
              style={{
                background: baseBg,
                boxShadow: shadows.inset,
                padding: 'clamp(8px, 1.2vh, 16px)',
              }}
            >
              <MapPin
                className="shrink-0"
                style={{
                  width: 'clamp(16px, 2.5vh, 20px)',
                  height: 'clamp(16px, 2.5vh, 20px)',
                  color: pointColor,
                }}
              />
              <div className="min-w-0">
                <div className="text-gray-500" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                  위치
                </div>
                <div
                  className="font-medium truncate"
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
                  onBlur={isEditMode ? commitSingleLineField('location') : undefined}
                  onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
                  style={{
                    fontSize: 'clamp(11px, 1.8vh, 14px)',
                    outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
                    borderRadius: isEditMode ? '6px' : '0',
                    padding: isEditMode ? '1px 4px' : '0',
                    cursor: isEditMode ? 'text' : 'inherit',
                  }}
                >
                  {pet.location || '미입력'}
                </div>
              </div>
            </div>
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
                  className="shrink-0"
                  style={{
                    width: 'clamp(16px, 2.5vh, 20px)',
                    height: 'clamp(16px, 2.5vh, 20px)',
                    color: pointColor,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-gray-500" style={{ fontSize: 'clamp(9px, 1.4vh, 12px)' }}>
                    {label}
                  </div>
                  <div
                    className="font-medium truncate"
                    contentEditable={isEditMode}
                    suppressContentEditableWarning
                    onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
                    onBlur={isEditMode ? commitSingleLineField(label === '좋아하는 간식' ? 'favoriteFood' : 'favoriteToy') : undefined}
                    onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
                    style={{
                      fontSize: 'clamp(11px, 1.8vh, 14px)',
                      outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
                      borderRadius: isEditMode ? '6px' : '0',
                      padding: isEditMode ? '1px 4px' : '0',
                      cursor: isEditMode ? 'text' : 'inherit',
                    }}
                  >
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
                <p
                  className="leading-relaxed"
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
                  onBlur={isEditMode ? commitMultiLineField('personality') : undefined}
                  style={{
                    fontSize: 'clamp(11px, 1.8vh, 14px)',
                    whiteSpace: 'pre-wrap',
                    outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
                    borderRadius: isEditMode ? '8px' : '0',
                    padding: isEditMode ? '3px 6px' : '0',
                    cursor: isEditMode ? 'text' : 'inherit',
                  }}
                >
                  {pet.personality || (isEditMode ? '성격 입력' : '')}
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
                <p
                  contentEditable={isEditMode}
                  suppressContentEditableWarning
                  onPointerDown={isEditMode ? stopCardFlipFromChild : undefined}
                  onBlur={isEditMode ? commitSingleLineField('ownerContact') : undefined}
                  onKeyDown={isEditMode ? handleSingleLineEditableKeyDown : undefined}
                  style={{
                    fontSize: 'clamp(11px, 1.8vh, 14px)',
                    outline: isEditMode ? '1px dashed rgba(107, 114, 128, 0.35)' : 'none',
                    borderRadius: isEditMode ? '6px' : '0',
                    padding: isEditMode ? '2px 4px' : '0',
                    cursor: isEditMode ? 'text' : 'inherit',
                  }}
                >
                  {pet.ownerContact || (isEditMode ? '연락처 입력' : '')}
                </p>
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
        {hasMainPhoto ? (
          <ImageWithFallback
            src={pet.mainPhoto}
            alt={pet.name}
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(160deg, #f7dff0 0%, #f2e9f8 52%, #ecf1fb 100%)',
            }}
          >
            <span style={{ fontSize: 'clamp(80px, 15vh, 130px)', lineHeight: 1 }}>{petEmoji}</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
          }}
        />
        {renderTopLeftControls()}
        {renderTopRightControl()}
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
          {isEditMode ? (
            <p
              className="text-gray-700 leading-relaxed"
              contentEditable
              suppressContentEditableWarning
              onPointerDown={stopCardFlipFromChild}
              onBlur={commitFunFacts}
              style={{
                fontSize: 'clamp(11px, 1.8vh, 14px)',
                whiteSpace: 'pre-wrap',
                outline: '1px dashed rgba(107, 114, 128, 0.35)',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'text',
                minHeight: '72px',
              }}
            >
              {displayFunFacts.join('\n')}
            </p>
          ) : (
            (displayFunFacts
              ? displayFunFacts.map((text, index) => ({
                  color: funFactColors[index % funFactColors.length],
                  text,
                }))
              : []).map(({ color, text }, index) => (
              <div key={`fact-row-${index}`} className="flex items-start gap-2 leading-relaxed">
                <span className="shrink-0 mt-[0.15em]" style={{ color }}>
                  •
                </span>
                <p className="text-gray-700" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                  {text}
                </p>
              </div>
            ))
          )}
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

          {isEditMode ? (
            <p
              className="text-gray-700 leading-relaxed"
              contentEditable
              suppressContentEditableWarning
              onPointerDown={stopCardFlipFromChild}
              onBlur={commitComments}
              style={{
                fontSize: 'clamp(11px, 1.8vh, 14px)',
                whiteSpace: 'pre-wrap',
                outline: '1px dashed rgba(107, 114, 128, 0.35)',
                borderRadius: '8px',
                padding: '6px 8px',
                cursor: 'text',
                minHeight: '88px',
              }}
            >
              {(
                pet.comments.length
                  ? pet.comments.map((comment) =>
                      comment.author ? `${comment.author}: ${comment.text}` : comment.text
                    )
                  : ['댓글을 입력해 주세요.']
              ).join('\n')}
            </p>
          ) : (
            <>
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
                onClick={(event) => {
                  stopCardFlipFromChild(event);
                  onCommentRequest?.();
                }}
                className="w-full rounded-2xl text-white"
                style={{
                  marginTop: 'clamp(10px, 1.5vh, 16px)',
                  background: commentGradient,
                  boxShadow: `0 8px 18px ${withAlpha(pointColor, 0.26)}`,
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
            </>
          )}
        </div>
        {!isEditMode && (
          <>
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
                className="shrink-0"
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
                className="shrink-0"
                style={{
                  width: 'clamp(16px, 2.5vh, 20px)',
                  height: 'clamp(16px, 2.5vh, 20px)',
                  color: pointColor,
                }}
              />
              <span>{isSavingImage ? '이미지 생성 중...' : '이미지로 저장'}</span>
            </button>

            <p className="text-center text-gray-500 font-medium" style={{ fontSize: 'clamp(10px, 1.6vh, 12px)' }}>
              탭 또는 좌우 스와이프로 앞면으로 돌아오세요.
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        className={`relative w-full max-w-md mx-auto z-20 h-full flex ${alignTop ? 'items-start pt-2' : 'items-center'}`}
        style={{ maxHeight: '100%' }}
      >
        <div
          className="w-full h-full transition-transform duration-150 ease-out"
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
              if (isEditMode) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggleFlip();
              }
            }}
            style={{
              position: 'relative',
              maxHeight:
                viewportBottomReserve > 0
                  ? `calc(100dvh - ${viewportBottomReserve}px)`
                  : '96dvh',
              height:
                viewportBottomReserve > 0
                  ? `min(calc(100dvh - ${viewportBottomReserve}px), 820px)`
                  : 'min(92dvh, 820px)',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
              transformOrigin: 'center center',
              transformStyle: 'preserve-3d',
              WebkitTransformStyle: 'preserve-3d',
              willChange: 'transform',
              touchAction: 'pan-y',
              userSelect: 'none',
              cursor: isEditMode ? 'default' : 'pointer',
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
        {isEditMode && (
          <>
            <button
              type="button"
              onPointerDown={stopCardFlipFromChild}
              onPointerUp={stopCardFlipFromChild}
              onPointerCancel={stopCardFlipFromChild}
              onClick={(event) => {
                stopCardFlipFromChild(event);
                setIsFlipped(false);
              }}
              aria-label="앞면 보기"
              style={{
                position: 'absolute',
                left: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                background: 'rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: '#374151',
                fontSize: '22px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
              }}
            >
              ‹
            </button>
            <button
              type="button"
              onPointerDown={stopCardFlipFromChild}
              onPointerUp={stopCardFlipFromChild}
              onPointerCancel={stopCardFlipFromChild}
              onClick={(event) => {
                stopCardFlipFromChild(event);
                setIsFlipped(true);
              }}
              aria-label="뒷면 보기"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '38px',
                height: '38px',
                borderRadius: '999px',
                border: '1px solid rgba(255, 255, 255, 0.7)',
                background: 'rgba(255, 255, 255, 0.35)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                color: '#374151',
                fontSize: '22px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 40,
              }}
            >
              ›
            </button>
          </>
        )}
      </div>
    </>
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

export default function PetProfileScene({
  petData,
  mode = 'view',
  onPetChange,
  editLink,
  onEditRequest,
  showEditMenu = true,
  bottomReservedHeight = 0,
  bottomAction,
  onShareRequest,
  onCommentRequest,
  onSaveRequest,
  isSaving = false,
  onPhotoUploadRequest,
  isUploadingPhoto = false,
  bottomActionMode = 'inline',
}: PetProfileSceneProps) {
  const [mousePosition, setMousePosition] = useState({ x: 300, y: 400 });
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isMobileInput, setIsMobileInput] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const [motionPermissionDenied, setMotionPermissionDenied] = useState(false);
  const [isMotionEnabled, setIsMotionEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const motionBaselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isEditMode = mode === 'edit';
  const hasBottomAction = Boolean(bottomAction);
  const isFloatingBottomAction = hasBottomAction && bottomActionMode === 'floating-on-scroll';
  const [isBottomActionVisible, setIsBottomActionVisible] = useState(false);
  const baseBg = resolveCardBackground(petData.gender, petData.backgroundColor);
  const buttonShadow = createNeumorphismPalette(baseBg).button;

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
    if (isMobileInput || isEditMode) return;
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
  }, [isMobileInput, isEditMode]);

  useEffect(() => {
    if (!isMobileInput || !isMotionEnabled || isEditMode) return;
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
  }, [isMobileInput, isMotionEnabled, isEditMode]);

  useEffect(() => {
    if (!isFloatingBottomAction) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 6) return;
      if (event.deltaY < 0) {
        setIsBottomActionVisible(true);
      } else {
        setIsBottomActionVisible(false);
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = () => {
      touchStartRef.current = null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = start.y - touch.clientY;
      if (Math.abs(deltaY) < 20 || Math.abs(deltaY) <= Math.abs(deltaX) + 8) return;

      setIsBottomActionVisible(deltaY > 0);
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
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
  }, [isFloatingBottomAction]);

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
      className="relative w-full h-screen overflow-hidden flex flex-col"
      style={{
        cursor: isEditMode ? 'default' : 'none',
        background: baseBg,
        boxSizing: 'border-box',
      }}
    >
      {!isEditMode && isMobileInput && needsMotionPermission && (
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
      <BackgroundLayer mouseX={mousePosition.x} mouseY={mousePosition.y} />
      <div
        className={`relative flex-1 min-h-0 flex justify-center w-full ${
          isFloatingBottomAction ? 'items-center pt-3 pb-3' : hasBottomAction ? 'items-start pt-4' : 'items-center'
        }`}
      >
        <PetProfileCard
          mouseX={mousePosition.x}
          mouseY={mousePosition.y}
          pet={petData}
          mode={mode}
          onPetChange={onPetChange}
          editLink={editLink}
          onEditRequest={onEditRequest}
          showEditMenu={showEditMenu}
          onShareRequest={onShareRequest}
          onCommentRequest={onCommentRequest}
          onSaveRequest={onSaveRequest}
          isSaving={isSaving}
          onPhotoUploadRequest={onPhotoUploadRequest}
          isUploadingPhoto={isUploadingPhoto}
          alignTop={hasBottomAction && !isFloatingBottomAction}
          viewportBottomReserve={isFloatingBottomAction ? 138 : 0}
        />
        {!isMobileInput && !isEditMode && (
          <CustomCursor x={mousePosition.x} y={mousePosition.y} isVisible={isMouseInside} />
        )}
      </div>
      {bottomAction && !isFloatingBottomAction && (
        <div
          className="relative z-40 w-full flex justify-center"
          style={{
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingTop: '16px',
            paddingBottom: `${Math.max(14, bottomReservedHeight)}px`,
          }}
        >
          <div style={{ width: 'min(92vw, 520px)' }}>{bottomAction}</div>
        </div>
      )}
      {bottomAction && isFloatingBottomAction && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center px-4"
          style={{ paddingBottom: `calc(${Math.max(14, bottomReservedHeight)}px + env(safe-area-inset-bottom))` }}
        >
          <div
            className="pointer-events-auto transition-all duration-300 ease-out"
            style={{
              width: 'min(92vw, 520px)',
              transform: isBottomActionVisible ? 'translateY(0)' : 'translateY(calc(100% + 18px))',
              opacity: isBottomActionVisible ? 1 : 0,
            }}
          >
            {bottomAction}
          </div>
        </div>
      )}
    </div>
  );
}
