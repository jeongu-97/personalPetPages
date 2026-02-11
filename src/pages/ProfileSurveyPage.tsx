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
import { PROFILE_SURVEY_DRAFT_KEY } from '../lib/profileSurveyDraft';
import { emptyPetProfile, PetProfileData } from '../types/pet';

type PetKind = '' | 'dog' | 'cat' | 'bird' | 'fish';
type PetGender = '' | '수컷' | '암컷';

type SurveyForm = {
  name: string;
  petKind: PetKind;
  breed: string;
  birthDate: string;
  gender: PetGender;
  mainPhoto: string;
  mainPhotoFileName: string;
  personality: string;
  favoriteNotes: string;
  healthInfo: string;
};

const TOTAL_STEPS = 9;

const initialSurveyForm: SurveyForm = {
  name: '',
  petKind: '',
  breed: '',
  birthDate: '',
  gender: '',
  mainPhoto: '',
  mainPhotoFileName: '',
  personality: '',
  favoriteNotes: '',
  healthInfo: '',
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
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<SurveyForm>(initialSurveyForm);
  const [message, setMessage] = useState<string | null>(null);

  const isLastStep = stepIndex === TOTAL_STEPS - 1;
  const petName = form.name.trim() || '아이';

  const isCurrentStepComplete = () => {
    if (stepIndex === 0) return Boolean(form.name.trim());
    if (stepIndex === 1) return Boolean(form.petKind);
    if (stepIndex === 2) return Boolean(form.breed.trim());
    if (stepIndex === 3) return Boolean(form.birthDate);
    if (stepIndex === 4) return Boolean(form.gender);
    if (stepIndex === 5) return true;
    if (stepIndex === 6) return Boolean(form.personality.trim());
    if (stepIndex === 7) return Boolean(form.favoriteNotes.trim());
    return Boolean(form.healthInfo.trim());
  };

  const isNextDisabled = !isCurrentStepComplete();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const raw = window.localStorage.getItem(PROFILE_SURVEY_DRAFT_KEY);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw) as Partial<PetProfileData>;
      if (!draft || typeof draft !== 'object') return;

      const sourcePersonality = typeof draft.personality === 'string' ? draft.personality : '';
      const healthMarker = '\n\n건강 정보: ';
      const markerIndex = sourcePersonality.indexOf(healthMarker);
      const personality =
        markerIndex >= 0 ? sourcePersonality.slice(0, markerIndex).trim() : sourcePersonality;
      const healthInfo =
        markerIndex >= 0 ? sourcePersonality.slice(markerIndex + healthMarker.length).trim() : '';

      setForm({
        ...initialSurveyForm,
        name: draft.name ?? '',
        petKind: inferKind(draft.breed ?? ''),
        breed: draft.breed ?? '',
        gender: draft.gender === '수컷' || draft.gender === '암컷' ? draft.gender : '',
        mainPhoto: draft.mainPhoto ?? '',
        personality,
        favoriteNotes: draft.favoriteFood ?? '',
        healthInfo,
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
    if (stepIndex === 5) return '사진을 올려주세요';
    if (stepIndex === 6) return `${petName}(가)는\n어떤 성격인가요?`;
    if (stepIndex === 7) return `${petName}(가)가\n좋아하는 것은요?`;
    return '건강 정보를 알려주세요';
  })();

  const currentSubtitle = (() => {
    if (stepIndex === 0) return '우리 아이를 부르는 이름을 알려주세요';
    if (stepIndex === 1) return `${petName}(가)는요?`;
    if (stepIndex === 2) return '정확하지 않아도 괜찮아요';
    if (stepIndex === 3) return '대략적인 날짜도 좋아요';
    if (stepIndex === 4) return `${petName}(가)는?`;
    if (stepIndex === 5) return '가장 마음에 드는 사진으로';
    if (stepIndex === 6) return '특징을 자유롭게 적어주세요';
    if (stepIndex === 7) return '간식, 장난감 등을 자유롭게 적어주세요';
    return '알레르기, 특이사항 등';
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
    if (stepIndex === 6 && !form.personality.trim()) return '성격을 입력해 주세요.';
    if (stepIndex === 7 && !form.favoriteNotes.trim()) return '좋아하는 것을 입력해 주세요.';
    if (stepIndex === 8 && !form.healthInfo.trim()) return '건강 정보를 입력해 주세요.';
    return null;
  };

  const buildPayload = (): PetProfileData => {
    const kind = kindLabel(form.petKind);
    const breed = form.breed.trim() || kind;
    const generatedSlug = normalizeSlug(form.name);
    const fallbackSlug = `pet-${Date.now().toString(36).slice(-6)}`;
    const personality = form.personality.trim();
    const health = form.healthInfo.trim();

    return {
      ...emptyPetProfile,
      slug: generatedSlug || fallbackSlug,
      name: form.name.trim(),
      breed,
      age: ageFromBirthDate(form.birthDate),
      gender: form.gender,
      favoriteFood: form.favoriteNotes.trim(),
      personality: health ? `${personality}${personality ? '\n\n' : ''}건강 정보: ${health}` : personality,
      mainPhoto: form.mainPhoto,
    };
  };

  const handleNext = () => {
    if (isNextDisabled) return;

    const error = validateStep();
    if (error) {
      setMessage(error);
      return;
    }

    setMessage(null);

    if (isLastStep) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PROFILE_SURVEY_DRAFT_KEY, JSON.stringify(buildPayload()));
      }
      navigate('/admin');
      return;
    }

    setStepIndex((prev) => prev + 1);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      mainPhoto: objectUrl,
      mainPhotoFileName: file.name,
    }));
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
          <CalendarDays size={18} color="#6b7280" />
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
            }}
          >
            <Upload size={40} color="#9aa1ac" />
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#111827' }}>사진 업로드</span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {form.mainPhotoFileName ? form.mainPhotoFileName : '탭하여 선택하기'}
            </span>
          </button>
          <p style={{ textAlign: 'center', marginTop: '11px', fontSize: '13px', color: '#6b7280' }}>
            나중에 추가할 수도 있어요
          </p>
        </>
      );
    }

    if (stepIndex === 6) {
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

    if (stepIndex === 7) {
      return (
        <textarea
          value={form.favoriteNotes}
          onChange={(event) => setForm((prev) => ({ ...prev, favoriteNotes: event.target.value }))}
          placeholder="예: 닭가슴살 간식, 삑삑이 장난감"
          rows={4}
          style={textFieldStyle}
        />
      );
    }

    return (
      <textarea
        value={form.healthInfo}
        onChange={(event) => setForm((prev) => ({ ...prev, healthInfo: event.target.value }))}
        placeholder="예: 닭고기 알레르기가 있어요. 슬개골 탈구 수술 받았어요."
        rows={5}
        style={textFieldStyle}
      />
    );
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
              gridTemplateColumns: 'repeat(9, minmax(0, 1fr))',
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

        <section style={{ marginTop: '24px' }}>{renderStepField()}</section>

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
            {isLastStep ? '완료' : '다음'}
            {isLastStep ? <Check size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>
      </main>
    </div>
  );
}
