import { useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';
import {
  ArrowLeft,
  Bird,
  CalendarDays,
  Cat,
  Check,
  ChevronRight,
  Dog,
  Fish,
  Upload,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { createLocalPetDraftId, saveLocalPetDraft } from '../lib/localPetDraft';
import { PetRecord, toPetRecord } from '../lib/petData';
import { PROFILE_SURVEY_DRAFT_KEY } from '../lib/profileSurveyDraft';
import { supabase } from '../lib/supabaseClient';
import { emptyPetProfile, PetKind, PetProfileData } from '../types/pet';

type PetGender = '' | '수컷' | '암컷';

type SurveyForm = {
  name: string;
  petKind: PetKind;
  breed: string;
  birthDate: string;
  gender: PetGender;
  weight: string;
  location: string;
  ownerContact: string;
  mainPhoto: string;
  mainPhotoFileName: string;
  personality: string;
  favoriteFood: string;
  favoriteToy: string;
};

const TOTAL_STEPS = 12;

const initialSurveyForm: SurveyForm = {
  name: '',
  petKind: '',
  breed: '',
  birthDate: '',
  gender: '',
  weight: '',
  location: '',
  ownerContact: '',
  mainPhoto: '',
  mainPhotoFileName: '',
  personality: '',
  favoriteFood: '',
  favoriteToy: '',
};

const kindOptions: Array<{ value: PetKind; label: string; Icon: typeof Dog }> = [
  { value: 'dog', label: '강아지', Icon: Dog },
  { value: 'cat', label: '고양이', Icon: Cat },
  { value: 'bird', label: '새', Icon: Bird },
  { value: 'fish', label: '물고기', Icon: Fish },
];

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const randomSlugSuffix = () => Math.random().toString(36).slice(2, 6);

const generateToken = () => {
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('file_read_failed'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('file_read_failed'));
    reader.readAsDataURL(file);
  });

const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

const extensionFromMime = (mime: string) => {
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('gif')) return 'gif';
  return 'jpg';
};

const MAX_DRAFT_IMAGE_DATA_URL_LENGTH = 900_000;

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image_load_failed'));
    image.src = source;
  });

const compressImageForDraft = async (file: File) => {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxEdge = Math.max(image.width, image.height);
    let scale = maxEdge > 1280 ? 1280 / maxEdge : 1;
    let quality = 0.84;
    let output = '';

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) break;

      context.drawImage(image, 0, 0, width, height);
      output = canvas.toDataURL('image/jpeg', quality);
      if (output.length <= MAX_DRAFT_IMAGE_DATA_URL_LENGTH) {
        return output;
      }

      if (quality > 0.52) {
        quality = Math.max(0.5, quality - 0.1);
      } else {
        scale *= 0.84;
      }
    }

    return output;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const normalizeNumeric = (value: string) => value.replace(/\D+/g, '');

const normalizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integer, ...rest] = cleaned.split('.');
  if (!rest.length) return integer;
  const decimals = rest.join('');
  return `${integer}.${decimals}`;
};

const readString = (value: unknown) => (typeof value === 'string' ? value : '');
const toPetKind = (value: unknown): PetKind =>
  value === 'dog' || value === 'cat' || value === 'bird' || value === 'fish' ? value : '';

const inferKind = (breed: string): PetKind => {
  const text = breed.toLowerCase();
  if (text.includes('강아지') || text.includes('dog')) return 'dog';
  if (text.includes('고양이') || text.includes('cat')) return 'cat';
  if (text.includes('새') || text.includes('bird')) return 'bird';
  if (text.includes('물고기') || text.includes('fish')) return 'fish';
  return '';
};

const kindLabel = (kind: PetKind) => {
  if (kind === 'dog') return '강아지';
  if (kind === 'cat') return '고양이';
  if (kind === 'bird') return '새';
  if (kind === 'fish') return '물고기';
  return '';
};

const ageFromBirthDate = (birthDate: string) => {
  if (!birthDate) return '';

  const birth = new Date(`${birthDate}T00:00:00`);
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

const textFieldStyle: CSSProperties = {
  width: '100%',
  borderRadius: '18px',
  border: '2px solid #b8bcc3',
  background: '#f2f3f5',
  boxShadow: 'inset 2px 2px 3px rgba(255, 255, 255, 0.9), inset -1px -1px 2px rgba(129, 136, 146, 0.35)',
  padding: '15px 16px',
  color: '#374151',
  outline: 'none',
  fontSize: '16px',
};

const chooseCardStyle: CSSProperties = {
  borderRadius: '18px',
  border: '1.5px solid #d3d7de',
  background: '#f7f8fa',
  minHeight: '126px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

export default function ProfileSurveyPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const birthDateInputRef = useRef<HTMLInputElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<SurveyForm>(initialSurveyForm);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadPhotoIfNeeded = async (mainPhoto: string, slug: string) => {
    const source = mainPhoto.trim();
    if (!source) return '';
    if (/^https?:\/\//i.test(source)) return source;

    if (source.startsWith('data:')) {
      const blob = await dataUrlToBlob(source);
      const ext = extensionFromMime(blob.type);
      const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${slug}/${fileId}.${ext}`;
      const { error } = await supabase.storage.from('pet-photos').upload(path, blob, {
        upsert: true,
        contentType: blob.type || undefined,
      });
      if (error) {
        throw new Error(error.message || 'photo_upload_failed');
      }
      const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
      return data.publicUrl;
    }

    return '';
  };

  const isLastStep = stepIndex === TOTAL_STEPS - 1;
  const petName = form.name.trim() || '아이';

  const isCurrentStepComplete = () => {
    if (stepIndex === 0) return Boolean(form.name.trim());
    if (stepIndex === 1) return Boolean(form.petKind);
    if (stepIndex === 2) return Boolean(form.breed.trim());
    if (stepIndex === 3) return Boolean(form.birthDate);
    if (stepIndex === 4) return Boolean(form.gender);
    if (stepIndex === 5) return Boolean(form.weight.trim());
    if (stepIndex === 6) return Boolean(form.location.trim());
    if (stepIndex === 7) return Boolean(form.ownerContact.trim());
    if (stepIndex === 8) return true;
    if (stepIndex === 9) return Boolean(form.personality.trim());
    if (stepIndex === 10) return Boolean(form.favoriteFood.trim());
    return Boolean(form.favoriteToy.trim());
  };

  const isNextDisabled = !isCurrentStepComplete() || isSubmitting;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(PROFILE_SURVEY_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<PetProfileData>;
      if (!draft || typeof draft !== 'object') return;

      setForm({
        ...initialSurveyForm,
        name: readString(draft.name),
        petKind: toPetKind(draft.petKind) || inferKind(readString(draft.breed)),
        breed: readString(draft.breed),
        birthDate: readString(draft.birthDate),
        gender: draft.gender === '수컷' || draft.gender === '암컷' ? draft.gender : '',
        weight: readString(draft.weight),
        location: readString(draft.location),
        ownerContact: readString(draft.ownerContact),
        mainPhoto: readString(draft.mainPhoto),
        mainPhotoFileName: '',
        personality: readString(draft.personality),
        favoriteFood: readString(draft.favoriteFood),
        favoriteToy: readString(draft.favoriteToy),
      });
    } catch {
      window.localStorage.removeItem(PROFILE_SURVEY_DRAFT_KEY);
    }
  }, []);

  const currentTitle = (() => {
    if (stepIndex === 0) return '반려동물 이름이\n무엇인가요?';
    if (stepIndex === 1) return '어떤 종류의\n반려동물인가요?';
    if (stepIndex === 2) return '품종이 무엇인가요?';
    if (stepIndex === 3) return '생일이 언제인가요?';
    if (stepIndex === 4) return '성별을 알려주세요';
    if (stepIndex === 5) return `${petName}(이)의\n몸무게는 얼마인가요?`;
    if (stepIndex === 6) return `${petName}(이)가\n주로 있는 위치는 어디인가요?`;
    if (stepIndex === 7) return '보호자 연락처를\n알려주세요';
    if (stepIndex === 8) return '사진을 올려주세요';
    if (stepIndex === 9) return `${petName}(이)는\n어떤 성격인가요?`;
    if (stepIndex === 10) return `${petName}(이)가\n좋아하는 간식은요?`;
    return `${petName}(이)가\n좋아하는 장난감은요?`;
  })();

  const currentSubtitle = (() => {
    if (stepIndex === 0) return '우리 아이를 부르는 이름을 알려주세요';
    if (stepIndex === 1) return `${petName}(이)는요?`;
    if (stepIndex === 2) return '정확하지 않아도 괜찮아요';
    if (stepIndex === 3) return '대략적인 날짜도 좋아요';
    if (stepIndex === 4) return `${petName}(이)는?`;
    if (stepIndex === 5) return 'kg 단위로 입력해 주세요 (예: 4.2)';
    if (stepIndex === 6) return '도시/지역명만 간단히 적어도 좋아요';
    if (stepIndex === 7) return '잃어버렸을 때 연락 가능한 번호';
    if (stepIndex === 8) return '가장 마음에 드는 사진으로';
    if (stepIndex === 9) return '특징을 자유롭게 적어주세요';
    if (stepIndex === 10) return '예: 닭가슴살, 북어, 트릿';
    return '예: 공놀이, 삑삑이, 낚싯대';
  })();

  const goBack = () => {
    if (stepIndex === 0) {
      navigate('/');
      return;
    }
    setMessage(null);
    setStepIndex((prev) => prev - 1);
  };

  const validateStep = () => {
    if (stepIndex === 0 && !form.name.trim()) return '이름을 입력해 주세요.';
    if (stepIndex === 1 && !form.petKind) return '반려동물 종류를 선택해 주세요.';
    if (stepIndex === 2 && !form.breed.trim()) return '품종을 입력해 주세요.';
    if (stepIndex === 3 && !form.birthDate) return '생일을 입력해 주세요.';
    if (stepIndex === 4 && !form.gender) return '성별을 선택해 주세요.';
    if (stepIndex === 5 && !form.weight.trim()) return '몸무게를 입력해 주세요.';
    if (stepIndex === 6 && !form.location.trim()) return '위치를 입력해 주세요.';
    if (stepIndex === 7 && !form.ownerContact.trim()) return '보호자 연락처를 입력해 주세요.';
    if (stepIndex === 9 && !form.personality.trim()) return '성격을 입력해 주세요.';
    if (stepIndex === 10 && !form.favoriteFood.trim()) return '좋아하는 간식을 입력해 주세요.';
    if (stepIndex === 11 && !form.favoriteToy.trim()) return '좋아하는 장난감을 입력해 주세요.';
    return null;
  };

  const buildPayload = (): PetProfileData => {
    const kind = kindLabel(form.petKind);
    const breed = form.breed.trim() || kind;
    const generatedSlug = normalizeSlug(form.name);
    const fallbackSlug = `pet-${Date.now().toString(36).slice(-6)}`;
    const autoFunFacts = buildDefaultFunFacts({
      name: form.name.trim(),
      favoriteToy: form.favoriteToy.trim(),
      personality: form.personality.trim(),
      birthDate: form.birthDate,
    });

    return {
      ...emptyPetProfile,
      slug: generatedSlug || fallbackSlug,
      shareToken: '',
      petKind: form.petKind,
      name: form.name.trim(),
      birthDate: form.birthDate,
      breed,
      age: ageFromBirthDate(form.birthDate),
      weight: normalizeDecimal(form.weight),
      gender: form.gender,
      location: form.location.trim(),
      favoriteFood: form.favoriteFood.trim(),
      favoriteToy: form.favoriteToy.trim(),
      funFacts: autoFunFacts,
      personality: form.personality.trim(),
      ownerContact: normalizeNumeric(form.ownerContact),
      mainPhoto: form.mainPhoto,
    };
  };

  const saveDraftAndContinue = () => {
    const payload = buildPayload();
    const draftId = createLocalPetDraftId();
    saveLocalPetDraft({
      id: draftId,
      pet: payload,
      updatedAt: new Date().toISOString(),
    });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PROFILE_SURVEY_DRAFT_KEY);
    }
    navigate(`/draft/${encodeURIComponent(draftId)}`, { replace: true });
  };

  const createProfileAndContinue = async () => {
    const basePayload = buildPayload();
    const baseSlug = normalizeSlug(basePayload.slug || basePayload.name || 'pet');

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlugSuffix()}`;
      const shareToken = generateToken();
      const mainPhoto = await uploadPhotoIfNeeded(basePayload.mainPhoto ?? '', slug);
      const payload: PetProfileData = {
        ...basePayload,
        slug,
        shareToken,
        mainPhoto,
      };

      const { data, error } = await supabase
        .from('pets')
        .insert(toPetRecord(payload))
        .select()
        .maybeSingle<PetRecord>();

      if (!error && data) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(PROFILE_SURVEY_DRAFT_KEY);
        }
        navigate(
          `/${encodeURIComponent(data.slug)}?token=${encodeURIComponent(data.share_token ?? shareToken)}&created=1`,
          { replace: true }
        );
        return;
      }

      if (error?.code === '23505') {
        continue;
      }

      throw new Error(error?.message || 'insert_failed');
    }

    throw new Error('slug_conflict');
  };

  const handleNext = async () => {
    if (isNextDisabled) return;

    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }

    setMessage(null);

    if (isLastStep) {
      setIsSubmitting(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw new Error(error.message || 'session_check_failed');
        }

        if (data.session) {
          await createProfileAndContinue();
        } else {
          saveDraftAndContinue();
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'slug_conflict') {
          setMessage('프로필 주소 생성에 실패했어요. 이름을 조금 바꿔서 다시 시도해 주세요.');
        } else if (error instanceof Error) {
          setMessage(error.message || '저장에 실패했어요. 다시 시도해 주세요.');
        } else {
          setMessage('저장에 실패했어요. 다시 시도해 주세요.');
        }
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl =
        file.size > 420_000
          ? await compressImageForDraft(file)
          : await fileToDataUrl(file);

      if (!dataUrl || dataUrl.length > 2_200_000) {
        setMessage('사진 용량이 커서 저장할 수 없어요. 더 작은 사진으로 시도해 주세요.');
        return;
      }

      setForm((prev) => ({
        ...prev,
        mainPhoto: dataUrl,
        mainPhotoFileName: file.name,
      }));
      setMessage(null);
    } catch {
      setMessage('사진을 읽지 못했어요. 다시 선택해 주세요.');
    }
  };

  const openBirthDatePicker = () => {
    const input = birthDateInputRef.current;
    if (!input) return;

    input.focus();
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }

    input.click();
  };

  const renderStepField = () => {
    if (stepIndex === 0) {
      return (
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="예: 초코, 봉구, 냥이"
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 1) {
      return (
        <div className="grid grid-cols-2 gap-3">
          {kindOptions.map(({ value, label, Icon }) => {
            const selected = form.petKind === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, petKind: value }))}
                style={{
                  ...chooseCardStyle,
                  border: selected ? '2px solid #e0b767' : chooseCardStyle.border,
                  boxShadow: selected ? '0 0 0 2px rgba(239, 197, 116, 0.28)' : 'none',
                }}
              >
                <Icon size={40} color={selected ? '#d2a24f' : '#9aa1ac'} strokeWidth={2} />
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (stepIndex === 2) {
      return (
        <input
          value={form.breed}
          onChange={(event) => setForm((prev) => ({ ...prev, breed: event.target.value }))}
          placeholder="예: 골든 리트리버, 코리안 숏헤어"
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 3) {
      return (
        <div
          style={{
            ...textFieldStyle,
            border: 'none',
            boxShadow: 'none',
            background: '#f1f3f5',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <input
            ref={birthDateInputRef}
            type="date"
            value={form.birthDate}
            onChange={(event) => setForm((prev) => ({ ...prev, birthDate: event.target.value }))}
            style={{
              flex: 1,
              background: 'transparent',
              outline: 'none',
              color: '#374151',
            }}
          />
          <button
            type="button"
            onClick={openBirthDatePicker}
            aria-label="생일 달력 열기"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              color: '#6b7280',
            }}
          >
            <CalendarDays size={18} color="#6b7280" />
          </button>
        </div>
      );
    }

    if (stepIndex === 4) {
      const genderCards: Array<{ value: PetGender; emoji: string; label: string }> = [
        { value: '수컷', emoji: '💙', label: '남아' },
        { value: '암컷', emoji: '💗', label: '여아' },
      ];

      return (
        <div className="grid grid-cols-2 gap-3">
          {genderCards.map(({ value, emoji, label }) => {
            const selected = form.gender === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, gender: value }))}
                style={{
                  ...chooseCardStyle,
                  border: selected ? '2px solid #e0b767' : chooseCardStyle.border,
                  boxShadow: selected ? '0 0 0 2px rgba(239, 197, 116, 0.28)' : 'none',
                }}
              >
                <span style={{ fontSize: '28px' }}>{emoji}</span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>{label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (stepIndex === 5) {
      return (
        <input
          value={form.weight}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, weight: normalizeDecimal(event.target.value) }))
          }
          inputMode="decimal"
          placeholder="예: 4.2"
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 6) {
      return (
        <input
          value={form.location}
          onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          placeholder="예: 부산광역시"
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 7) {
      return (
        <input
          value={form.ownerContact}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, ownerContact: normalizeNumeric(event.target.value) }))
          }
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="예: 01012345678"
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 8) {
      const hasPreview = Boolean(form.mainPhoto);
      return (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%',
              borderRadius: '20px',
              border: '2px dashed #d0d4db',
              background: '#f6f7f9',
              minHeight: '170px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {hasPreview ? (
              <>
                <img
                  src={form.mainPhoto}
                  alt="업로드 미리보기"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '8px 10px',
                    background: 'linear-gradient(to top, rgba(17,24,39,0.55), rgba(17,24,39,0))',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  {form.mainPhotoFileName || '다른 사진 선택하기'}
                </div>
              </>
            ) : (
              <>
                <Upload size={40} color="#9aa1ac" />
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>사진 업로드</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>
                  {form.mainPhotoFileName ? form.mainPhotoFileName : '탭하여 선택하기'}
                </span>
              </>
            )}
          </button>
          <p style={{ textAlign: 'center', marginTop: '11px', fontSize: '13px', color: '#6b7280' }}>
            나중에 추가할 수도 있어요
          </p>
        </>
      );
    }

    if (stepIndex === 9) {
      return (
        <textarea
          value={form.personality}
          onChange={(event) => setForm((prev) => ({ ...prev, personality: event.target.value }))}
          placeholder="예: 활발하고 사람을 좋아해요. 낯선 사람에게도 친근하게 다가가요."
          rows={5}
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 10) {
      return (
        <textarea
          value={form.favoriteFood}
          onChange={(event) => setForm((prev) => ({ ...prev, favoriteFood: event.target.value }))}
          placeholder="예: 닭가슴살, 북어 트릿, 고구마"
          rows={4}
          style={textFieldStyle}
        />
      );
    }

    if (stepIndex === 11) {
      return (
        <textarea
          value={form.favoriteToy}
          onChange={(event) => setForm((prev) => ({ ...prev, favoriteToy: event.target.value }))}
          placeholder="예: 공놀이, 삑삑이, 노즈워크 장난감"
          rows={4}
          style={textFieldStyle}
        />
      );
    }

    return null;
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(180deg, #fbfaf3 0%, #f4f3ee 48%, #edf2f7 100%)',
      }}
    >
      <main
        style={{
          width: '100%',
          maxWidth: '540px',
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '14px 16px 16px',
        }}
      >
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center justify-center self-start"
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '999px',
            color: '#111827',
          }}
          aria-label="이전 단계"
        >
          <ArrowLeft size={20} />
        </button>

        <div
          style={{
            marginTop: '9px',
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            alignItems: 'center',
            columnGap: '10px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${TOTAL_STEPS}, minmax(0, 1fr))`,
              gap: '5px',
            }}
          >
            {Array.from({ length: TOTAL_STEPS }).map((_, index) => {
              const active = index <= stepIndex;
              return (
                <div
                  key={index}
                  style={{
                    height: '6px',
                    borderRadius: '999px',
                    background: active
                      ? 'linear-gradient(90deg, #f3cf7b 0%, #eab76a 100%)'
                      : '#d8dce2',
                    boxShadow: active
                      ? 'inset 0 1px 1px rgba(255, 255, 255, 0.55)'
                      : 'inset 0 1px 0 rgba(255, 255, 255, 0.7)',
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontSize: '17px', color: '#4b5563', minWidth: '44px', textAlign: 'right' }}>
            {stepIndex + 1} / {TOTAL_STEPS}
          </span>
        </div>

        <section style={{ marginTop: '60px', textAlign: 'center' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              lineHeight: 1.22,
              color: '#111827',
              fontWeight: 800,
              whiteSpace: 'pre-line',
            }}
          >
            {currentTitle}
          </h1>
          <p style={{ margin: '9px 0 0', fontSize: '15px', color: '#4b5563' }}>{currentSubtitle}</p>
        </section>

        <section key={stepIndex} style={{ marginTop: '24px' }}>
          {renderStepField()}
        </section>

        {message && (
          <p style={{ marginTop: '10px', color: '#ef4444', fontSize: '14px' }} role="alert">
            {message}
          </p>
        )}

        <div style={{ marginTop: 'auto', paddingTop: '26px' }}>
          <button
            type="button"
            onClick={handleNext}
            disabled={isNextDisabled}
            style={{
              width: '100%',
              height: '56px',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#5f4124',
              background: 'linear-gradient(90deg, #f4d88f 0%, #edc17a 100%)',
              boxShadow: '8px 8px 16px #d9c793, -8px -8px 16px #fff9ea',
              opacity: isNextDisabled ? 0.45 : 1,
              cursor: isNextDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? '등록 중...' : isLastStep ? '완료' : '다음'}
            {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </main>
    </div>
  );
}
