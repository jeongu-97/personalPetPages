import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, Cake, Weight, MapPin, Phone, Bone, ToyBrick, Share2, Download, Star, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { PetComment, PetKind, PetProfileData } from '../types/pet';

interface ParallaxProps {
  mouseX: number;
  mouseY: number;
}

type SceneMode = 'view' | 'edit';
type CommentSubmitPayload = { author: string; text: string };
type CommentSubmitResult = { ok: boolean; message?: string };

type PetProfileSceneProps = {
  petData: PetProfileData;
  mode?: SceneMode;
  onPetChange?: (nextPet: PetProfileData) => void;
  editLink?: string;
  onEditRequest?: () => void;
  onOpenActionButtons?: () => void;
  showEditMenu?: boolean;
  onShareRequest?: () => void;
  onCommentRequest?: () => void;
  onCommentSubmit?: (payload: CommentSubmitPayload) => Promise<CommentSubmitResult | void> | CommentSubmitResult | void;
  onCommentAuthorClick?: (comment: PetComment) => void;
  onSaveRequest?: () => void;
  isSaving?: boolean;
  hideOwnerContact?: boolean;
  viewerDisplayName?: string;
  onPhotoUploadRequest?: (file: File) => Promise<void> | void;
  isUploadingPhoto?: boolean;
  showCardShareSaveButtons?: boolean;
  externalSaveImageTrigger?: number;
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
  onOpenActionButtons,
  showEditMenu = true,
  onShareRequest,
  onCommentRequest,
  onCommentSubmit,
  onCommentAuthorClick,
  onSaveRequest,
  isSaving = false,
  hideOwnerContact = false,
  viewerDisplayName,
  onPhotoUploadRequest,
  isUploadingPhoto = false,
  showCardShareSaveButtons = true,
  externalSaveImageTrigger = 0,
}: ParallaxProps & {
  pet: PetProfileData;
  mode: SceneMode;
  onPetChange?: (nextPet: PetProfileData) => void;
  editLink?: string;
  onEditRequest?: () => void;
  onOpenActionButtons?: () => void;
  showEditMenu?: boolean;
  onShareRequest?: () => void;
  onCommentRequest?: () => void;
  onCommentSubmit?: (payload: CommentSubmitPayload) => Promise<CommentSubmitResult | void> | CommentSubmitResult | void;
  onCommentAuthorClick?: (comment: PetComment) => void;
  onSaveRequest?: () => void;
  isSaving?: boolean;
  hideOwnerContact?: boolean;
  viewerDisplayName?: string;
  onPhotoUploadRequest?: (file: File) => Promise<void> | void;
  isUploadingPhoto?: boolean;
  showCardShareSaveButtons?: boolean;
  externalSaveImageTrigger?: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frontCaptureRef = useRef<HTMLDivElement>(null);
  const externalSaveHandledRef = useRef<number>(0);
  const isSavingImageRef = useRef(false);
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
  const [isCommentComposerOpen, setIsCommentComposerOpen] = useState(false);
  const [commentAuthorInput, setCommentAuthorInput] = useState('');
  const [commentTextInput, setCommentTextInput] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);
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

  const handleDeleteCommentAt = (index: number) => {
    const nextComments = pet.comments.filter((_, currentIndex) => currentIndex !== index);
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

  const defaultPublicComment: PetComment = {
    author: '펫프로필',
    text: `귀여운 ${pet.name || '친구'}, 반가워요!`,
  };
  const publicComments = pet.comments.length ? pet.comments : [defaultPublicComment];

  const handleOpenCommentComposer = (event: any) => {
    stopCardFlipFromChild(event);
    if (onCommentSubmit) {
      setCommentSubmitError(null);
      setIsCommentComposerOpen((prev) => !prev);
      return;
    }
    onCommentRequest?.();
  };

  const handleSubmitComment = async (event: any) => {
    stopCardFlipFromChild(event);
    if (!onCommentSubmit || isSubmittingComment) return;

    const text = commentTextInput.trim();
    const author = (viewerDisplayName || commentAuthorInput.trim()).trim();
    if (!text) {
      setCommentSubmitError('기록 내용을 입력해 주세요.');
      return;
    }

    setCommentSubmitError(null);
    setIsSubmittingComment(true);
    try {
      const result = await onCommentSubmit({ author, text });
      if (result && typeof result === 'object' && 'ok' in result && !result.ok) {
        setCommentSubmitError(result.message || '기록 등록에 실패했어요.');
        return;
      }
      if (!viewerDisplayName) {
        setCommentAuthorInput('');
      }
      setCommentTextInput('');
      setIsCommentComposerOpen(false);
    } catch {
      setCommentSubmitError('기록 등록에 실패했어요.');
    } finally {
      setIsSubmittingComment(false);
    }
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

  const openActionButtonsFromMenu = (event: any) => {
    stopCardFlipFromChild(event);
    setIsEditMenuOpen(false);
    if (onOpenActionButtons) {
      onOpenActionButtons();
      return;
    }
    if (onShareRequest) {
      onShareRequest();
    }
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
          boxShadow: isEditMenuOpen ? '0 10px 18px rgba(15, 23, 42, 0.14)' : 'none',
          padding: '4px',
          opacity: isEditMenuOpen ? 1 : 0,
          transform: isEditMenuOpen ? 'translateY(0) scale(1)' : 'translateY(-8px) scale(0.96)',
          transformOrigin: 'top right',
          transition: 'opacity 180ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease',
          pointerEvents: isEditMenuOpen ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          role="menuitem"
          onClick={openActionButtonsFromMenu}
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
          공유하기
        </button>
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
    </div>
    ) : null
  );

  const hasUnsupportedColorFunction = (value: string) => /oklch|oklab/i.test(value);
  const stripUnsupportedColorDeclarations = (cssText: string) =>
    cssText.replace(/[^;{}]*?(?:oklch|oklab)\([^;{}]*\)[^;{}]*;?/gi, '');

  const cloneNodeWithComputedStyles = (sourceRoot: HTMLElement) => {
    const clonedRoot = sourceRoot.cloneNode(true) as HTMLElement;
    const sourceElements = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>('*'))];
    const clonedElements = [clonedRoot, ...Array.from(clonedRoot.querySelectorAll<HTMLElement>('*'))];

    sourceElements.forEach((sourceElement, index) => {
      const clonedElement = clonedElements[index];
      if (!clonedElement) return;

      const computedStyle = window.getComputedStyle(sourceElement);
      const cssText = Array.from(computedStyle)
        .filter((property) => !property.startsWith('--'))
        .filter((property) => property !== 'backdrop-filter' && property !== '-webkit-backdrop-filter')
        .map((property) => {
          const rawValue = computedStyle.getPropertyValue(property);
          if (!rawValue) return '';
          if (hasUnsupportedColorFunction(rawValue)) return '';
          return `${property}:${rawValue};`;
        })
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

  const loadHtml2Canvas = async () => {
    if (typeof window === 'undefined') {
      throw new Error('html2canvas_unavailable');
    }

    const existing = (window as any).html2canvas;
    if (typeof existing === 'function') {
      return existing as (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    }

    const loadingPromise = (window as any).__html2canvasLoadingPromise as Promise<
      (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>
    > | undefined;
    if (loadingPromise) return loadingPromise;

    const promise = new Promise<
      (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement>
    >((resolve, reject) => {
      const script = window.document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      script.async = true;
      script.onload = () => {
        const loaded = (window as any).html2canvas;
        if (typeof loaded === 'function') {
          resolve(loaded);
          return;
        }
        reject(new Error('html2canvas_load_invalid'));
      };
      script.onerror = () => reject(new Error('html2canvas_load_failed'));
      window.document.head.appendChild(script);
    });

    (window as any).__html2canvasLoadingPromise = promise;

    try {
      return await promise;
    } finally {
      delete (window as any).__html2canvasLoadingPromise;
    }
  };

  const downloadCanvasAsPng = async (canvas: HTMLCanvasElement, fileName: string) => {
    await new Promise<void>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('canvas_blob_failed'));
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(blobUrl);
        resolve();
      }, 'image/png');
    });
  };

  const downloadBlobAsFile = (blob: Blob, fileName: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const inlineImagesAsDataUrl = async (root: HTMLElement) => {
    const images = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    const transparentPixel =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    const setSafeFallbackImage = (imageElement: HTMLImageElement) => {
      imageElement.setAttribute('src', transparentPixel);
      imageElement.removeAttribute('crossorigin');
    };

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
          if (!response.ok) {
            setSafeFallbackImage(imageElement);
            return;
          }
          const blob = await response.blob();
          const dataUrl = await toDataUrl(blob);
          imageElement.setAttribute('src', dataUrl);
          imageElement.removeAttribute('crossorigin');
        } catch {
          // If conversion fails (usually CORS), fallback to a safe inline pixel
          // to avoid tainting canvas and breaking PNG export.
          setSafeFallbackImage(imageElement);
        }
      }),
    );
  };

  const createCaptureWrapper = async (targetElement: HTMLElement) => {
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

    return { width, height, wrapper };
  };

  const downloadFrontCardViaServer = async (targetElement: HTMLElement, fileName: string) => {
    const { width, height, wrapper } = await createCaptureWrapper(targetElement);
    const html = new XMLSerializer().serializeToString(wrapper);

    const response = await fetch('/api/card-image', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        html,
        width,
        height,
        fileName,
      }),
    });

    if (!response.ok) {
      let reason = `http_${response.status}`;
      try {
        const body = await response.json();
        if (body && typeof body.error === 'string') {
          reason = body.error;
        }
      } catch {
        // noop
      }
      throw new Error(`server_capture_failed:${reason}`);
    }

    const imageBlob = await response.blob();
    if (!imageBlob || imageBlob.size < 200) {
      throw new Error('server_capture_empty_blob');
    }

    downloadBlobAsFile(imageBlob, fileName);
  };

  const canUseServerPageCapture = () => {
    if (typeof window === 'undefined') return false;
    if (mode !== 'view') return false;
    const pathname = window.location.pathname || '';
    if (pathname.startsWith('/draft/')) return false;
    if (pathname.startsWith('/edit/')) return false;
    return true;
  };

  const downloadFrontCardViaServerPage = async (fileName: string) => {
    if (typeof window === 'undefined') {
      throw new Error('server_page_capture_unavailable');
    }

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('capture', '1');
    const sourcePath = `${currentUrl.pathname}${currentUrl.search}`;

    const response = await fetch('/api/card-image', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sourcePath,
        selector: '[data-capture-card-front="true"]',
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        fileName,
      }),
    });

    if (!response.ok) {
      let reason = `http_${response.status}`;
      try {
        const body = await response.json();
        if (body && typeof body.error === 'string') {
          reason = body.error;
        }
      } catch {
        // noop
      }
      throw new Error(`server_page_capture_failed:${reason}`);
    }

    const imageBlob = await response.blob();
    if (!imageBlob || imageBlob.size < 200) {
      throw new Error('server_page_capture_empty_blob');
    }

    downloadBlobAsFile(imageBlob, fileName);
  };

  const downloadFrontCardAsPng = async (targetElement: HTMLElement, fileName: string) => {
    const { width, height, wrapper } = await createCaptureWrapper(targetElement);

    const serializedCard = new XMLSerializer().serializeToString(wrapper);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject x="0" y="0" width="100%" height="100%">${serializedCard}</foreignObject>
      </svg>
    `;
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

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

              downloadBlobAsFile(blob, fileName);
              finalize(() => resolve());
            }, 'image/png');
          } catch {
            finalize(() => reject(new Error('canvas_draw_failed')));
          }
        };
        image.onerror = () => finalize(() => reject(new Error('svg_render_failed')));
        image.src = svgUrl;
      });
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  };

  const downloadFrontCardWithHtml2Canvas = async (targetElement: HTMLElement, fileName: string) => {
    const html2canvas = await loadHtml2Canvas();
    const width = targetElement.offsetWidth || Math.ceil(targetElement.getBoundingClientRect().width);
    const height = targetElement.offsetHeight || Math.ceil(targetElement.getBoundingClientRect().height);

    const captureNode = cloneNodeWithComputedStyles(targetElement);
    captureNode.style.width = `${width}px`;
    captureNode.style.height = `${height}px`;
    captureNode.style.maxHeight = 'none';
    captureNode.style.transform = 'none';
    captureNode.style.margin = '0';
    captureNode.style.position = 'relative';
    captureNode.style.inset = 'auto';

    const mount = window.document.createElement('div');
    mount.style.position = 'fixed';
    mount.style.left = '-100000px';
    mount.style.top = '0';
    mount.style.width = `${width}px`;
    mount.style.height = `${height}px`;
    mount.style.overflow = 'hidden';
    mount.style.pointerEvents = 'none';
    mount.style.opacity = '0';
    mount.appendChild(captureNode);
    window.document.body.appendChild(mount);

    const canvas = await html2canvas(captureNode, {
      backgroundColor: null,
      useCORS: true,
      allowTaint: false,
      scale: Math.max(2, Math.min(3, window.devicePixelRatio || 1)),
      logging: false,
      onclone: (doc: Document) => {
        doc.querySelectorAll('link[rel="stylesheet"]').forEach((linkEl) => {
          linkEl.remove();
        });
        doc.querySelectorAll('style').forEach((styleEl) => {
          if (!styleEl.textContent) return;
          styleEl.textContent = stripUnsupportedColorDeclarations(styleEl.textContent);
        });
        doc.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
          const inlineStyle = el.getAttribute('style');
          if (!inlineStyle || !hasUnsupportedColorFunction(inlineStyle)) return;
          const safeStyle = inlineStyle
            .split(';')
            .map((declaration) => declaration.trim())
            .filter(Boolean)
            .filter((declaration) => !hasUnsupportedColorFunction(declaration))
            .join('; ');
          if (safeStyle) {
            el.setAttribute('style', safeStyle);
          } else {
            el.removeAttribute('style');
          }
        });
      },
    });
    try {
      await downloadCanvasAsPng(canvas, fileName);
    } finally {
      mount.remove();
    }
  };

  const saveImageFromCard = useCallback(async () => {
    if (typeof window === 'undefined' || isSavingImageRef.current) return;

    const targetElement = frontCaptureRef.current;
    if (!targetElement) return;

    const downloadName = `${(pet.slug || pet.name || 'pet').trim()}-profile-card.png`;
    isSavingImageRef.current = true;
    setIsSavingImage(true);
    try {
      if (canUseServerPageCapture()) {
        try {
          await downloadFrontCardViaServerPage(downloadName);
          return;
        } catch (pageCaptureError) {
          const pageCaptureCode =
            pageCaptureError instanceof Error ? pageCaptureError.message : 'unknown_error';
          console.error('[PetProfileScene] image_save_server_page_failed', pageCaptureCode, pageCaptureError);
        }
      }

      try {
        await downloadFrontCardViaServer(targetElement, downloadName);
        return;
      } catch (serverError) {
        const serverCode = serverError instanceof Error ? serverError.message : 'unknown_error';
        console.error('[PetProfileScene] image_save_server_failed', serverCode, serverError);
      }

      try {
        await downloadFrontCardAsPng(targetElement, downloadName);
        return;
      } catch (error) {
        const code = error instanceof Error ? error.message : 'unknown_error';
        console.error('[PetProfileScene] image_save_failed', code, error);
        try {
          await downloadFrontCardWithHtml2Canvas(targetElement, downloadName);
          return;
        } catch (fallbackError) {
          const fallbackCode =
            fallbackError instanceof Error ? fallbackError.message : 'html2canvas_unknown_error';
          console.error('[PetProfileScene] image_save_html2canvas_failed', fallbackCode, fallbackError);
        }
      }
      window.alert(
        '이미지 저장에 실패했어요.\n잠시 후 다시 시도해 주세요.'
      );
    } finally {
      isSavingImageRef.current = false;
      setIsSavingImage(false);
    }
  }, [mode, pet.slug, pet.name]);

  useEffect(() => {
    if (!externalSaveImageTrigger) return;
    if (externalSaveHandledRef.current === externalSaveImageTrigger) return;
    externalSaveHandledRef.current = externalSaveImageTrigger;
    void saveImageFromCard();
  }, [externalSaveImageTrigger, saveImageFromCard]);

  const handleSaveImage = async (event: any) => {
    stopCardFlipFromChild(event);
    await saveImageFromCard();
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
                className="mt-0.5 shrink-0"
                style={{
                  width: 'clamp(16px, 2.5vh, 20px)',
                  height: 'clamp(16px, 2.5vh, 20px)',
                  color: '#ef4444',
                  fill: '#ef4444',
                }}
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
                className="mt-0.5 shrink-0"
                style={{
                  width: 'clamp(16px, 2.5vh, 20px)',
                  height: 'clamp(16px, 2.5vh, 20px)',
                  color: '#22c55e',
                  fill: '#22c55e',
                }}
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
                  {isEditMode
                    ? pet.ownerContact || '연락처 입력'
                    : hideOwnerContact
                      ? '비공개'
                      : pet.ownerContact}
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
              className="shrink-0"
              style={{
                width: 'clamp(16px, 2.5vh, 20px)',
                height: 'clamp(16px, 2.5vh, 20px)',
                color: '#6b7280',
                fill: '#6b7280',
              }}
            />
            <p className="font-semibold" style={{ fontSize: 'clamp(16px, 2.4vh, 22px)' }}>
              기록
            </p>
          </div>

          {isEditMode ? (
            <>
              {pet.comments.length > 0 ? (
                <div className="space-y-2">
                  {pet.comments.map((comment, index) => (
                    <div
                      key={`edit-comment-${index}`}
                      onPointerDown={stopCardFlipFromChild}
                      onPointerUp={stopCardFlipFromChild}
                      onPointerCancel={stopCardFlipFromChild}
                      style={{
                        borderRadius: '10px',
                        border: '1px solid rgba(148, 163, 184, 0.35)',
                        background: 'rgba(255, 255, 255, 0.65)',
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '8px',
                      }}
                    >
                      <p
                        className="text-gray-700 leading-relaxed"
                        style={{
                          fontSize: 'clamp(11px, 1.8vh, 14px)',
                          whiteSpace: 'pre-wrap',
                          flex: 1,
                        }}
                      >
                        {comment.author ? `${comment.author}: ${comment.text}` : comment.text}
                      </p>
                      <button
                        type="button"
                        onClick={(event) => {
                          stopCardFlipFromChild(event);
                          handleDeleteCommentAt(index);
                        }}
                        style={{
                          minWidth: '44px',
                          height: '28px',
                          borderRadius: '8px',
                          border: '1px solid rgba(239, 68, 68, 0.45)',
                          background: 'rgba(254, 226, 226, 0.85)',
                          color: '#dc2626',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-gray-500"
                  style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}
                >
                  삭제할 기록이 없어요.
                </p>
              )}
            </>
          ) : (
            <>
              {publicComments.map((comment, index) => (
                <div key={`comment-row-${index}`} className="flex items-start gap-2 leading-relaxed">
                  <span className="shrink-0 mt-[0.15em]" style={{ color: '#6b7280' }}>
                    •
                  </span>
                  <p className="text-gray-700" style={{ fontSize: 'clamp(11px, 1.8vh, 14px)' }}>
                    {comment.author ? (
                      <>
                        {comment.authorSlug && comment.authorShareToken && onCommentAuthorClick ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              stopCardFlipFromChild(event);
                              onCommentAuthorClick(comment);
                            }}
                            style={{
                              color: pointColor,
                              textDecoration: 'underline',
                              textUnderlineOffset: '2px',
                              fontWeight: 600,
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              cursor: 'pointer',
                            }}
                          >
                            {comment.author}
                          </button>
                        ) : (
                          <span style={{ fontWeight: 600 }}>{comment.author}</span>
                        )}
                        <span>: {comment.text}</span>
                      </>
                    ) : (
                      comment.text
                    )}
                  </p>
                </div>
              ))}

              <button
                type="button"
                onPointerDown={stopCardFlipFromChild}
                onPointerUp={stopCardFlipFromChild}
                onPointerCancel={stopCardFlipFromChild}
                onClick={handleOpenCommentComposer}
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
                  style={{
                    width: 'clamp(15px, 2.2vh, 18px)',
                    height: 'clamp(15px, 2.2vh, 18px)',
                    fill: '#ffffff',
                  }}
                />
                <span>기록 남기기</span>
              </button>

              {onCommentSubmit && isCommentComposerOpen && (
                <div
                  onPointerDown={stopCardFlipFromChild}
                  onPointerUp={stopCardFlipFromChild}
                  onPointerCancel={stopCardFlipFromChild}
                  onClick={stopCardFlipFromChild}
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    borderRadius: '14px',
                    background: 'rgba(255, 255, 255, 0.64)',
                    border: '1px solid rgba(148, 163, 184, 0.4)',
                  }}
                >
                  {viewerDisplayName ? (
                    <div
                      style={{
                        borderRadius: '10px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '8px 10px',
                        fontSize: '12px',
                        color: '#374151',
                      }}
                    >
                      <span className="text-gray-500">작성자</span>
                      <span style={{ marginLeft: '6px', fontWeight: 600 }}>{viewerDisplayName}</span>
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={commentAuthorInput}
                      onChange={(event) => setCommentAuthorInput(event.target.value)}
                      onClick={stopCardFlipFromChild}
                      placeholder="이름(선택)"
                      className="w-full"
                      style={{
                        height: '34px',
                        borderRadius: '10px',
                        border: '1px solid rgba(148, 163, 184, 0.4)',
                        background: 'rgba(255, 255, 255, 0.9)',
                        padding: '0 10px',
                        fontSize: '12px',
                        color: '#374151',
                      }}
                    />
                  )}
                  <textarea
                    value={commentTextInput}
                    onChange={(event) => setCommentTextInput(event.target.value)}
                    onClick={stopCardFlipFromChild}
                    placeholder="기록 내용을 입력해 주세요."
                    className="w-full mt-2"
                    style={{
                      minHeight: '72px',
                      borderRadius: '10px',
                      border: '1px solid rgba(148, 163, 184, 0.4)',
                      background: 'rgba(255, 255, 255, 0.9)',
                      padding: '8px 10px',
                      fontSize: '12px',
                      lineHeight: 1.45,
                      color: '#374151',
                      resize: 'vertical',
                    }}
                  />
                  {commentSubmitError && (
                    <p
                      style={{
                        marginTop: '6px',
                        fontSize: '12px',
                        color: '#dc2626',
                      }}
                    >
                      {commentSubmitError}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        stopCardFlipFromChild(event);
                        setIsCommentComposerOpen(false);
                        setCommentSubmitError(null);
                      }}
                      disabled={isSubmittingComment}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(148, 163, 184, 0.5)',
                        background: 'rgba(255, 255, 255, 0.8)',
                        color: '#4b5563',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={isSubmittingComment || !commentTextInput.trim()}
                      style={{
                        height: '34px',
                        padding: '0 12px',
                        borderRadius: '10px',
                        border: 'none',
                        background: commentGradient,
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        opacity: isSubmittingComment || !commentTextInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {isSubmittingComment ? '등록 중...' : '등록'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {!isEditMode && showCardShareSaveButtons && (
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
              if (isEditMode) return;
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
              cursor: isEditMode ? 'default' : 'pointer',
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl"
              ref={frontCaptureRef}
              data-capture-card-front="true"
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
  onOpenActionButtons,
  showEditMenu = true,
  onShareRequest,
  onCommentRequest,
  onCommentSubmit,
  onCommentAuthorClick,
  onSaveRequest,
  isSaving = false,
  hideOwnerContact = false,
  viewerDisplayName,
  onPhotoUploadRequest,
  isUploadingPhoto = false,
  showCardShareSaveButtons = true,
  externalSaveImageTrigger = 0,
}: PetProfileSceneProps) {
  const [mousePosition, setMousePosition] = useState({ x: 300, y: 400 });
  const [isMouseInside, setIsMouseInside] = useState(false);
  const [isMobileInput, setIsMobileInput] = useState(false);
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false);
  const [motionPermissionDenied, setMotionPermissionDenied] = useState(false);
  const [isMotionEnabled, setIsMotionEnabled] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const motionBaselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const isEditMode = mode === 'edit';
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
      style={{ cursor: isEditMode ? 'default' : 'none', background: baseBg }}
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
      <div className="flex items-center justify-center w-full h-full">
        <BackgroundLayer mouseX={mousePosition.x} mouseY={mousePosition.y} />
        <PetProfileCard
          mouseX={mousePosition.x}
          mouseY={mousePosition.y}
          pet={petData}
          mode={mode}
          onPetChange={onPetChange}
          editLink={editLink}
          onEditRequest={onEditRequest}
          onOpenActionButtons={onOpenActionButtons}
          showEditMenu={showEditMenu}
          onShareRequest={onShareRequest}
          onCommentRequest={onCommentRequest}
          onCommentSubmit={onCommentSubmit}
          onCommentAuthorClick={onCommentAuthorClick}
          onSaveRequest={onSaveRequest}
          isSaving={isSaving}
          hideOwnerContact={hideOwnerContact}
          viewerDisplayName={viewerDisplayName}
          onPhotoUploadRequest={onPhotoUploadRequest}
          isUploadingPhoto={isUploadingPhoto}
          showCardShareSaveButtons={showCardShareSaveButtons}
          externalSaveImageTrigger={externalSaveImageTrigger}
        />
        {!isMobileInput && !isEditMode && (
          <CustomCursor x={mousePosition.x} y={mousePosition.y} isVisible={isMouseInside} />
        )}
      </div>
    </div>
  );
}
