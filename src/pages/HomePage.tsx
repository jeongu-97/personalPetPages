import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [slug, setSlug] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = slug.trim();
    if (!trimmed) return;
    navigate(`/${trimmed}`);
  };

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
        <h1 className="text-center mb-1" style={{ fontSize: '28px' }}>
          개인 펫 페이지
        </h1>
        <p className="text-center text-gray-600 mb-6">
          링크에 사용자 슬러그를 입력해서 바로 이동하세요.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder="예: bori"
            className="rounded-2xl px-4 py-3 bg-gray-100"
          />
          <button
            type="submit"
            className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
            style={{
              background: '#e0e5ec',
              boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
            }}
          >
            페이지로 이동
          </button>
        </form>

        <div className="text-center text-gray-500 mt-5">
          관리자라면 <Link to="/admin" className="font-medium">/admin</Link>에서 관리할 수 있어요.
        </div>
      </div>
    </div>
  );
}
