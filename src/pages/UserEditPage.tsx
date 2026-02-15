import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PetProfileLoadingSkeleton from '../components/PetProfileLoadingSkeleton';
import PetProfileScene from '../components/PetProfileScene';
import { buildDefaultFunFacts } from '../lib/funFacts';
import { PetRecord, toPetProfile, toPetRecord } from '../lib/petData';
import { supabase } from '../lib/supabaseClient';
import { PetProfileData } from '../types/pet';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';
const isValidHexColor = (value?: string) =>
  typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());

const ageFromBirthDate = (birthDate?: string) => {
  const raw = (birthDate ?? '').trim();
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

export default function UserEditPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>('loading');
  const [pet, setPet] = useState<PetProfileData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(null);
  const token = useMemo(() => new URLSearchParams(location.search).get('token') ?? '', [location.search]);
  const returnToProfileView = () => {
    const targetSlug = pet?.slug || slug;
    if (!targetSlug) {
      navigate('/', { replace: true });
      return;
    }
    navigate(`/${encodeURIComponent(targetSlug)}${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
      replace: true,
    });
  };

  useEffect(() => {
    if (!slug || !token) {
      setState('not_found');
      return;
    }

    const load = async () => {
      setState('loading');
      try {
        const response = await fetch(
          `/api/pet?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`
        );
        if (!response.ok) {
          setState(response.status === 404 ? 'not_found' : 'error');
          return;
        }
        const data = (await response.json()) as PetRecord;
        setPet(toPetProfile(data));
        setState('ready');
      } catch {
        setState('error');
      }
    };

    load();
  }, [slug, token]);

  const handleSave = async () => {
    if (!pet) return;
    setIsSaving(true);
    setErrorModalMessage(null);

    const payload: PetProfileData = {
      ...pet,
      age: ageFromBirthDate(pet.birthDate) || pet.age,
      funFacts: pet.funFacts.length ? pet.funFacts : buildDefaultFunFacts(pet),
    };

    const updatePayload = toPetRecord(payload) as ReturnType<typeof toPetRecord> & { id?: string };
    delete updatePayload.id;

    const { data, error } = await supabase
      .from('pets')
      .update(updatePayload)
      .eq('slug', payload.slug)
      .eq('share_token', token)
      .select()
      .returns<PetRecord[]>();

    if (error) {
      setErrorModalMessage(error.message || '저장에 실패했어요.');
      setIsSaving(false);
      return;
    }

    const updatedRecord = Array.isArray(data) ? data[0] : null;
    if (!updatedRecord) {
      setErrorModalMessage('저장 권한이 없거나 프로필을 찾지 못했어요.');
      setIsSaving(false);
      return;
    }

    setPet(toPetProfile(updatedRecord));
    setIsSaving(false);
    navigate(`/${encodeURIComponent(updatedRecord.slug)}?token=${encodeURIComponent(updatedRecord.share_token ?? token)}`, {
      replace: true,
    });
  };

  const handlePhotoUpload = async (file: File) => {
    if (!pet) return;
    setErrorModalMessage(null);
    setIsUploadingPhoto(true);

    const ext = file.name.split('.').pop() || 'jpg';
    const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const path = `${pet.slug}/${fileId}.${ext}`;

    const { error } = await supabase.storage.from('pet-photos').upload(path, file, {
      upsert: true,
    });

    if (error) {
      setErrorModalMessage(error.message || '사진 업로드에 실패했어요.');
      setIsUploadingPhoto(false);
      return;
    }

    const { data } = supabase.storage.from('pet-photos').getPublicUrl(path);
    setPet((prev) => (prev ? { ...prev, mainPhoto: data.publicUrl } : prev));
    setIsUploadingPhoto(false);
  };

  if (state === 'loading') {
    return <PetProfileLoadingSkeleton />;
  }

  if (state !== 'ready' || !pet) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center px-6">
        <div
          className="rounded-3xl max-w-md w-full text-center"
          style={{
            background: '#e0e5ec',
            boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
            padding: '32px',
          }}
        >
          <p className="text-gray-600 mb-4">
            {state === 'not_found' ? '유효한 편집 링크가 아니에요.' : '편집 데이터를 불러오지 못했어요.'}
          </p>
          <Link to="/" className="text-gray-700 font-medium">
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: isValidHexColor(pet.backgroundColor) ? pet.backgroundColor : pet.gender === '암컷' ? '#f7e5ef' : '#e0e5ec' }}
    >
      <PetProfileScene
        petData={pet}
        mode="edit"
        onSaveRequest={handleSave}
        isSaving={isSaving || isUploadingPhoto}
        onPhotoUploadRequest={handlePhotoUpload}
        isUploadingPhoto={isUploadingPhoto}
        onPetChange={(next) => {
          setPet(next);
          setErrorModalMessage(null);
        }}
      />
      {errorModalMessage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(17, 24, 39, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-3xl"
            style={{
              background: '#f2f3f5',
              border: '1.5px solid #d3d7de',
              boxShadow: '20px 20px 40px #c2c8d1, -20px -20px 40px #ffffff',
              padding: '20px',
            }}
          >
            <h2 className="text-gray-800 font-semibold" style={{ fontSize: '20px' }}>
              저장 실패
            </h2>
            <p
              className="text-red-600 mt-2"
              style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}
            >
              {errorModalMessage}
            </p>
            <button
              type="button"
              onClick={returnToProfileView}
              className="mt-4 w-full rounded-2xl text-sm font-semibold text-gray-700"
              style={{
                minHeight: '44px',
                background: '#f2f3f5',
                border: '1.5px solid #d3d7de',
                boxShadow: '8px 8px 16px #c2c8d1, -8px -8px 16px #ffffff',
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
