import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import { supabase } from '../lib/supabaseClient';
import { PetProfileData, emptyPetProfile } from '../types/pet';
import { PetRecord, toPetProfile, toPetRecord } from '../lib/petData';

const normalizeSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

const generateToken = () => {
  if (typeof crypto === 'undefined' || !('getRandomValues' in crypto)) {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const normalizeNumeric = (value: string) => value.replace(/\D+/g, '');

const normalizeDecimal = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const [integer, ...rest] = cleaned.split('.');
  if (!rest.length) return integer;
  const decimals = rest.join('');
  return `${integer}.${decimals}`;
};

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [pets, setPets] = useState<PetProfileData[]>([]);
  const [form, setForm] = useState<PetProfileData>(emptyPetProfile);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string | null>(null);
  const [savedSlug, setSavedSlug] = useState('');
  const [savedShareToken, setSavedShareToken] = useState('');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months'>('years');
  const [isDeleting, setIsDeleting] = useState(false);

  const hasSupabaseEnv = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    []
  );

  const shareLink =
    savedSlug && savedShareToken && typeof window !== 'undefined'
      ? `${window.location.origin}/${savedSlug}?token=${savedShareToken}`
      : '';

  const statusClass =
    status && /주소|실패|못했|필요|로그인/.test(status) ? 'text-red-500' : 'text-gray-600';

  useEffect(() => {
    if (!hasSupabaseEnv) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [hasSupabaseEnv]);

  useEffect(() => {
    if (!session) return;
    const loadPets = async () => {
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('updated_at', { ascending: false })
        .returns<PetRecord[]>();

      if (error) {
        setStatus('데이터를 불러오지 못했어요.');
        return;
      }

      setPets((data ?? []).map(toPetProfile));
    };

    loadPets();
  }, [session]);

  useEffect(() => {
    if (!shareLink) {
      setQrDataUrl(null);
      setQrStatus(null);
      return;
    }

    let isMounted = true;
    setQrStatus('QR 생성 중...');
    QRCode.toDataURL(shareLink, { width: 240, margin: 1 })
      .then((url) => {
        if (!isMounted) return;
        setQrDataUrl(url);
        setQrStatus(null);
      })
      .catch(() => {
        if (!isMounted) return;
        setQrStatus('QR 생성에 실패했어요.');
        setQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [shareLink]);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setAuthMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthMessage(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleSelectPet = (pet: PetProfileData) => {
    const isMonths = /개월|월/.test(pet.age);
    setForm({
      ...pet,
      age: normalizeNumeric(pet.age),
      weight: normalizeDecimal(pet.weight),
    });
    setStatus(null);
    setSavedSlug(pet.slug);
    setSavedShareToken(pet.shareToken);
    setAgeUnit(isMonths ? 'months' : 'years');
  };

  const handleNewPet = () => {
    setForm(emptyPetProfile);
    setStatus(null);
    setSavedSlug('');
    setSavedShareToken('');
    setAgeUnit('years');
  };

  const handleReset = () => {
    setForm(emptyPetProfile);
    setStatus(null);
    setQrStatus(null);
    setQrDataUrl(null);
    setSavedSlug('');
    setSavedShareToken('');
    setAgeUnit('years');
  };

  const handleDeleteCurrent = async () => {
    const targetId = form.id;
    const targetSlug = savedSlug || normalizeSlug(form.slug);
    if (!targetId && !targetSlug) {
      setStatus('삭제할 프로필을 먼저 선택해 주세요.');
      return;
    }

    const petLabel = form.name || targetSlug;
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`'${petLabel}' 프로필을 삭제할까요?`);
      if (!confirmed) return;
    }

    setIsDeleting(true);
    setStatus(null);

    const { error } = await (targetId
      ? supabase.from('pets').delete().eq('id', targetId)
      : supabase.from('pets').delete().eq('slug', targetSlug));

    if (error) {
      setStatus('삭제에 실패했어요.');
      setIsDeleting(false);
      return;
    }

    setPets((prev) => prev.filter((item) => (targetId ? item.id !== targetId : item.slug !== targetSlug)));
    setForm(emptyPetProfile);
    setSavedSlug('');
    setSavedShareToken('');
    setAgeUnit('years');
    setQrDataUrl(null);
    setQrStatus(null);

    setStatus('삭제 완료');
    setIsDeleting(false);
  };

  const handleSave = async () => {
    const sanitizedSlug = normalizeSlug(form.slug);
    const isAddressChangedOnExisting = Boolean(form.id && savedSlug && sanitizedSlug !== savedSlug);
    if (!sanitizedSlug) {
      setStatus('프로필 주소를 입력해 주세요.');
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from('pets')
      .select('id')
      .eq('slug', sanitizedSlug)
      .maybeSingle();

    if (existingError) {
      setStatus('프로필 주소 확인에 실패했어요.');
      return;
    }

    if (existing?.id && existing.id !== form.id) {
      setStatus('이미 사용 중인 프로필 주소입니다.');
      return;
    }

    setIsSaving(true);
    setStatus(null);

    const normalizedAge = normalizeNumeric(form.age);
    const payload: PetProfileData = {
      ...form,
      slug: sanitizedSlug,
      age: normalizedAge ? `${normalizedAge}${ageUnit === 'months' ? '개월' : '살'}` : '',
      weight: normalizeDecimal(form.weight),
      shareToken: form.shareToken || generateToken(),
    };

    const { data, error } = await supabase
      .from('pets')
      .upsert(toPetRecord(payload), { onConflict: 'slug' })
      .select()
      .maybeSingle<PetRecord>();

    if (error) {
      if (isAddressChangedOnExisting) {
        setStatus('프로필 주소는 저장 후 수정할 수 없어요. 기존 주소로 저장해 주세요.');
      } else {
        setStatus('저장에 실패했어요.');
      }
      setIsSaving(false);
      return;
    }

    if (data) {
      const next = toPetProfile(data);
      setForm(next);
      setSavedSlug(next.slug);
      setSavedShareToken(next.shareToken);
      setPets((prev) => {
        const exists = prev.find((item) => item.slug === next.slug);
        if (exists) {
          return prev.map((item) => (item.slug === next.slug ? next : item));
        }
        return [next, ...prev];
      });
      setStatus('저장 완료');
    } else {
      setSavedSlug(payload.slug);
      setSavedShareToken(payload.shareToken);
    }

    setIsSaving(false);
  };

  const handleRegenerateToken = () => {
    setForm((prev) => ({ ...prev, shareToken: generateToken() }));
    setStatus('공유 링크를 새로 생성했어요. 저장을 눌러 적용하세요.');
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${form.slug || 'pet'}-qr.png`;
    link.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!session) {
      setStatus('로그인 후 업로드할 수 있어요.');
      return;
    }

    const safeSlug = normalizeSlug(form.slug || 'pet');
    const ext = file.name.split('.').pop() || 'jpg';
    const fileId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
    const filePath = `${safeSlug}/${fileId}.${ext}`;

    setIsUploading(true);
    setStatus(null);

    const { error } = await supabase.storage.from('pet-photos').upload(filePath, file, {
      upsert: true,
    });

    if (error) {
      setStatus('업로드에 실패했어요.');
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from('pet-photos').getPublicUrl(filePath);
    setForm((prev) => ({ ...prev, mainPhoto: data.publicUrl }));
    setStatus('업로드 완료');
    setIsUploading(false);
  };

  if (!hasSupabaseEnv) {
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
          <p className="text-gray-600">
            Supabase 환경변수가 필요합니다. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#e0e5ec] flex items-center justify-center px-6">
        <div
          className="rounded-3xl max-w-md w-full"
          style={{
            background: '#e0e5ec',
            boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
            padding: '32px',
          }}
        >
          <h1 className="text-center mb-4" style={{ fontSize: '24px' }}>
            관리자 로그인
          </h1>
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="이메일"
              className="rounded-2xl px-4 py-3 bg-gray-100"
              type="email"
              required
            />
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호"
              className="rounded-2xl px-4 py-3 bg-gray-100"
              type="password"
              required
            />
            <button
              type="submit"
              className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
              style={{
                background: '#e0e5ec',
                boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
              }}
            >
              로그인
            </button>
          </form>
          {authMessage && <p className="text-center text-red-500 mt-3">{authMessage}</p>}
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <>
      <button
        type="button"
        onClick={handleNewPet}
        className="w-full inline-flex items-center justify-center rounded-2xl px-10 py-3 text-base font-medium text-gray-700 min-w-[200px]"
        style={{
          background: '#e7f0ff',
          boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
        }}
      >
        새 프로필
      </button>

      <div className="flex flex-col gap-2">
        {pets.map((pet) => (
          <div
            key={pet.slug}
            className="rounded-2xl px-3 py-2"
            style={{
              background: '#e0e5ec',
              boxShadow: '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => handleSelectPet(pet)}
              className="text-center"
              style={{ minWidth: 0, width: '100%' }}
            >
              <div className="font-medium truncate">{pet.name || pet.slug}</div>
              <div className="text-gray-500 text-sm truncate">/{pet.slug}</div>
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#e0e5ec]">
      <header className="border-b border-white/60">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '24px' }}>관리자</h1>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px]"
            style={{
              background: '#ffe6e6',
              boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
            }}
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="w-full md:w-72 flex flex-col gap-3">
            {sidebarContent}
          </aside>

          <div className="flex-1 min-w-0">
            <div
              className="rounded-3xl"
              style={{
                background: '#e0e5ec',
                boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
                padding: '32px',
              }}
            >
              <div className="grid" style={{ rowGap: '20px' }}>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">공유 링크</label>
                  <input value={shareLink} readOnly className="rounded-2xl px-4 py-3 bg-gray-100" />
                  <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    disabled={!shareLink}
                    className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px] w-full sm:w-auto"
                    style={{
                      background: '#fff1da',
                      boxShadow: '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff',
                      opacity: shareLink ? 1 : 0.6,
                    }}
                  >
                    링크 재발급
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={!qrDataUrl}
                    className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px] w-full sm:w-auto"
                    style={{
                      background: '#e9f6ff',
                      boxShadow: '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff',
                      opacity: qrDataUrl ? 1 : 0.6,
                    }}
                  >
                    QR 다운로드
                  </button>
                  <a
                    href={shareLink || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center justify-center text-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px] w-full sm:w-auto ${
                      shareLink ? 'pointer-events-auto' : 'pointer-events-none opacity-60'
                    }`}
                    style={{
                      background: '#f0fff4',
                      boxShadow: '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff',
                      color: '#374151',
                    }}
                  >
                    링크 열기
                  </a>
                </div>
                  <p className="text-gray-500 text-sm">저장 버튼을 눌러야 링크가 적용됩니다.</p>
                  {qrStatus && <p className="text-gray-500 text-sm">{qrStatus}</p>}
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="공유 링크 QR"
                      className="rounded-2xl bg-white p-3 w-[240px]"
                    />
                  )}
                </div>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">프로필 주소</label>
                  <input
                    value={form.slug}
                    onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="영문과 숫자만 입력해 주세요.(예: bori)"
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">이름</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">품종</label>
                  <input
                    value={form.breed}
                    onChange={(event) => setForm((prev) => ({ ...prev, breed: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              <div className="grid gap-2 grid-cols-2">
                <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">나이</label>
                  <div className="flex items-center gap-1 min-w-0">
                    <input
                      value={form.age}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, age: normalizeNumeric(event.target.value) }))
                      }
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="숫자만 입력"
                      className="w-0 flex-1 min-w-0 rounded-2xl px-2 py-2.5 bg-gray-100 text-sm"
                    />
                    <select
                      value={ageUnit}
                      onChange={(event) =>
                        setAgeUnit(event.target.value === 'months' ? 'months' : 'years')
                      }
                      className="w-14 shrink-0 rounded-2xl px-1 py-2.5 bg-gray-100 text-xs"
                    >
                      <option value="years">살</option>
                      <option value="months">개월</option>
                    </select>
                  </div>
                </div>
                <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">몸무게</label>
                  <input
                    value={form.weight}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, weight: normalizeDecimal(event.target.value) }))
                    }
                    inputMode="numeric"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="예: 4.2"
                    className="w-full min-w-0 rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid gap-2 grid-cols-2">
                <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">성별</label>
                  <select
                      value={form.gender}
                      onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                      className="w-full min-w-0 rounded-2xl px-4 py-3 bg-gray-100"
                    >
                      <option value="">선택</option>
                      <option value="암컷">암컷</option>
                      <option value="수컷">수컷</option>
                    </select>
                  </div>
                  <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                    <label className="text-gray-600">위치</label>
                    <input
                      value={form.location}
                      onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                      className="w-full min-w-0 rounded-2xl px-4 py-3 bg-gray-100"
                    />
                  </div>
                </div>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">성격</label>
                  <textarea
                    value={form.personality}
                    onChange={(event) => setForm((prev) => ({ ...prev, personality: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                    rows={3}
                  />
                </div>
                <div className="grid" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">보호자 연락처</label>
                  <input
                    value={form.ownerContact}
                    onChange={(event) => setForm((prev) => ({ ...prev, ownerContact: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              <div className="grid gap-2 grid-cols-2">
                <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">좋아하는 간식</label>
                    <input
                      value={form.favoriteFood}
                      onChange={(event) => setForm((prev) => ({ ...prev, favoriteFood: event.target.value }))}
                      className="w-full min-w-0 rounded-2xl px-4 py-3 bg-gray-100"
                    />
                </div>
                <div className="grid min-w-0" style={{ rowGap: '4px' }}>
                  <label className="text-gray-600">좋아하는 장난감</label>
                  <input
                    value={form.favoriteToy}
                    onChange={(event) => setForm((prev) => ({ ...prev, favoriteToy: event.target.value }))}
                    className="w-full min-w-0 rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid" style={{ rowGap: '4px', marginBottom: '28px' }}>
                  <div className="flex items-center gap-2">
                    <label className="text-gray-600">사진 업로드</label>
                    <span className="text-gray-500 text-sm">(권장: 5MB 이하)</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px] w-full sm:w-auto"
                    style={{
                      background: '#e6f7ed',
                      boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
                      opacity: isSaving ? 0.6 : 1,
                    }}
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-gray-700 min-w-[200px] w-full sm:w-auto"
                    style={{
                      background: '#f5f0ff',
                      boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
                    }}
                  >
                    초기화
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm md:ml-auto">
                  {isUploading && <span className="text-gray-500">업로드 중...</span>}
                  {status && <span className={statusClass}>{status}</span>}
                </div>
              </div>
              <div className="flex justify-end" style={{ marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleDeleteCurrent}
                  disabled={isDeleting || (!form.id && !savedSlug)}
                  className="inline-flex items-center justify-center rounded-2xl px-12 py-3 text-base font-medium text-red-700 min-w-[200px] w-full sm:w-auto"
                  style={{
                    background: '#ffe8e8',
                    boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
                    opacity: isDeleting || (!form.id && !savedSlug) ? 0.6 : 1,
                  }}
                >
                  {isDeleting ? '삭제 중...' : '선택 프로필 삭제'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
