import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PetProfileScene from '../components/PetProfileScene';
import { supabase } from '../lib/supabaseClient';
import { PetProfileData } from '../types/pet';
import { PetRecord, toPetProfile } from '../lib/petData';

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

export default function PetProfilePage() {
  const { slug } = useParams();
  const [state, setState] = useState<LoadState>('loading');
  const [pet, setPet] = useState<PetProfileData | null>(null);

  useEffect(() => {
    if (!slug) return;

    const load = async () => {
      setState('loading');
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('slug', slug)
        .maybeSingle<PetRecord>();

      if (error) {
        setState('error');
        return;
      }

      if (!data) {
        setState('not_found');
        return;
      }

      setPet(toPetProfile(data));
      setState('ready');
    };

    load();
  }, [slug]);

  if (state === 'ready' && pet) {
    return <PetProfileScene petData={pet} />;
  }

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
        {state === 'loading' && <p className="text-gray-600">불러오는 중...</p>}
        {state === 'error' && (
          <>
            <p className="text-gray-600 mb-4">데이터를 불러오지 못했어요.</p>
            <Link to="/" className="text-gray-700 font-medium">
              홈으로 이동
            </Link>
          </>
        )}
        {state === 'not_found' && (
          <>
            <p className="text-gray-600 mb-4">해당 슬러그를 찾을 수 없어요.</p>
            <Link to="/" className="text-gray-700 font-medium">
              홈으로 이동
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
