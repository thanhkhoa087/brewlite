'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function post(path: string) {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
      throw new Error(msg || 'Có lỗi xảy ra');
    }
    return data;
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') await post('/auth/register');
      const data = await post('/auth/login');
      setAuth(data.accessToken, email);
      router.push('/cart');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <Link href="/" className="text-sm text-gray-500">
        ← Về menu
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">
        {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </h1>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mb-3 w-full rounded border p-2"
      />
      <input
        type="password"
        placeholder="Mật khẩu (tối thiểu 6 ký tự)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mb-3 w-full rounded border p-2"
      />

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded bg-black py-3 text-white disabled:opacity-50"
      >
        {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </button>

      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="mt-4 text-sm underline"
      >
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
    </main>
  );
}