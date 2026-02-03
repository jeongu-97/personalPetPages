import { Link } from 'react-router-dom';

export default function NotFoundPage() {
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
        <h1 className="mb-2" style={{ fontSize: '26px' }}>
          페이지를 찾을 수 없어요
        </h1>
        <p className="text-gray-600 mb-6">슬러그가 맞는지 확인해 주세요.</p>
        <Link
          to="/"
          className="inline-block rounded-2xl px-4 py-3 text-sm font-medium text-gray-700"
          style={{
            background: '#e0e5ec',
            boxShadow: '8px 8px 16px #b8bec5, -8px -8px 16px #ffffff',
          }}
        >
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
