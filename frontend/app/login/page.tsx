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
    <main className="mx-auto max-w-md p-5 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline mb-4">
        ← Quay lại menu chính
      </Link>

      <div className="rounded-2xl border border-stone-200 bg-white p-7 shadow-sm">
        <div className="text-center mb-6">
          <span className="text-3xl">☕</span>
          <h1 className="mt-2 text-2xl font-black text-stone-900">
            {mode === 'login' ? 'Đăng nhập BrewLite' : 'Tạo tài khoản mới'}
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            {mode === 'login'
              ? 'Đăng nhập để đặt món và theo dõi trạng thái đơn hàng'
              : 'Đăng ký nhanh chóng chỉ với email và mật khẩu'}
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              placeholder="tenban@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-900 focus:outline-none focus:ring-1 focus:ring-amber-900"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99] disabled:opacity-50"
        >
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập ngay' : 'Đăng ký tài khoản'}
        </button>

        <div className="mt-5 text-center border-t border-stone-100 pt-4">
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-xs font-bold text-amber-900 hover:underline"
          >
            {mode === 'login'
              ? 'Chưa có tài khoản? Bấm để Đăng ký'
              : 'Đã có tài khoản? Bấm để Đăng nhập'}
          </button>
        </div>
      </div>
    </main>
  );
}
