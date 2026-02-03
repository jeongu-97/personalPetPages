import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
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

  const hasSupabaseEnv = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    []
  );

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
    setForm(pet);
    setStatus(null);
  };

  const handleNewPet = () => {
    setForm(emptyPetProfile);
    setStatus(null);
  };

  const handleSave = async () => {
    const sanitizedSlug = normalizeSlug(form.slug);
    if (!sanitizedSlug) {
      setStatus('슬러그를 입력해 주세요.');
      return;
    }

    setIsSaving(true);
    setStatus(null);

    const payload: PetProfileData = { ...form, slug: sanitizedSlug };
    const { data, error } = await supabase
      .from('pets')
      .upsert(toPetRecord(payload), { onConflict: 'slug' })
      .select()
      .maybeSingle<PetRecord>();

    if (error) {
      setStatus('저장에 실패했어요.');
      setIsSaving(false);
      return;
    }

    if (data) {
      const next = toPetProfile(data);
      setForm(next);
      setPets((prev) => {
        const exists = prev.find((item) => item.slug === next.slug);
        if (exists) {
          return prev.map((item) => (item.slug === next.slug ? next : item));
        }
        return [next, ...prev];
      });
      setStatus('저장 완료');
    }

    setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-[#e0e5ec] px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 style={{ fontSize: '24px' }}>관리자</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-2xl px-4 py-2 text-sm font-medium text-gray-700"
            style={{
              background: '#e0e5ec',
              boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
            }}
          >
            로그아웃
          </button>
        </div>

        <div className="grid gap-6" style={{ gridTemplateColumns: '280px 1fr' }}>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleNewPet}
              className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
              style={{
                background: '#e0e5ec',
                boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
              }}
            >
              새 프로필
            </button>

            <div className="flex flex-col gap-2">
              {pets.map((pet) => (
                <button
                  key={pet.slug}
                  type="button"
                  onClick={() => handleSelectPet(pet)}
                  className="rounded-2xl px-3 py-2 text-left"
                  style={{
                    background: '#e0e5ec',
                    boxShadow: '6px 6px 12px #b8bec5, -6px -6px 12px #ffffff',
                  }}
                >
                  <div className="font-medium">{pet.name || pet.slug}</div>
                  <div className="text-gray-500 text-sm">/{pet.slug}</div>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-3xl"
            style={{
              background: '#e0e5ec',
              boxShadow: '20px 20px 40px #a3b1c6, -20px -20px 40px #ffffff',
              padding: '32px',
            }}
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-gray-600">슬러그</label>
                <input
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="예: bori"
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">이름</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">견종</label>
                <input
                  value={form.breed}
                  onChange={(event) => setForm((prev) => ({ ...prev, breed: event.target.value }))}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                />
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="grid gap-2">
                  <label className="text-gray-600">나이</label>
                  <input
                    value={form.age}
                    onChange={(event) => setForm((prev) => ({ ...prev, age: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-gray-600">몸무게</label>
                  <input
                    value={form.weight}
                    onChange={(event) => setForm((prev) => ({ ...prev, weight: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="grid gap-2">
                  <label className="text-gray-600">성별</label>
                  <input
                    value={form.gender}
                    onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-gray-600">위치</label>
                  <input
                    value={form.location}
                    onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">성격</label>
                <textarea
                  value={form.personality}
                  onChange={(event) => setForm((prev) => ({ ...prev, personality: event.target.value }))}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">건강 메모</label>
                <textarea
                  value={form.healthNotes}
                  onChange={(event) => setForm((prev) => ({ ...prev, healthNotes: event.target.value }))}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                  rows={2}
                />
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="grid gap-2">
                  <label className="text-gray-600">좋아하는 간식</label>
                  <input
                    value={form.favoriteFood}
                    onChange={(event) => setForm((prev) => ({ ...prev, favoriteFood: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-gray-600">좋아하는 장난감</label>
                  <input
                    value={form.favoriteToy}
                    onChange={(event) => setForm((prev) => ({ ...prev, favoriteToy: event.target.value }))}
                    className="rounded-2xl px-4 py-3 bg-gray-100"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">대표 사진 URL</label>
                <input
                  value={form.mainPhoto}
                  onChange={(event) => setForm((prev) => ({ ...prev, mainPhoto: event.target.value }))}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-gray-600">사진 업로드</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="rounded-2xl px-4 py-3 bg-gray-100"
                />
                <p className="text-gray-500 text-sm">
                  업로드 후 자동으로 URL이 채워집니다. 권장: 2~5MB 이하.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
                style={{
                  background: '#e0e5ec',
                  boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
                  opacity: isSaving ? 0.6 : 1,
                }}
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
              {isUploading && <span className="text-gray-500 text-sm">업로드 중...</span>}
              {status && <span className="text-gray-600 text-sm">{status}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
