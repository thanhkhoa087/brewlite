'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useAuthStore } from '@/lib/authStore';

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

export default function MenuPage() {
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );
  const email = useAuthStore((s) => s.email);
  const logout = useAuthStore((s) => s.logout);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Lỗi tải danh mục món nước');
        return res.json();
      })
      .then((data) => setProducts(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-900 border-t-transparent"></div>
        <p className="mt-4 text-stone-600 font-medium">Đang tải menu đồ uống...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-12 text-center">
        <p className="text-red-600 font-semibold mb-3">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-amber-900 px-5 py-2 text-white font-medium hover:bg-amber-800"
        >
          Thử tải lại
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-8">
      {/* Top Navigation */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
              BrewLite
            </h1>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mt-1">
            Cà phê không dùng tiền mặt • Cashless Coffee
          </p>
        </div>

        <div className="flex items-center gap-3">
          {email ? (
            <div className="flex items-center gap-3 bg-stone-100 px-3 py-1.5 rounded-full text-stone-800 text-sm">
              <span className="font-medium text-stone-700">{email}</span>
              <span className="text-stone-300">|</span>
              <Link
                href="/orders"
                className="font-semibold text-amber-900 hover:underline"
              >
                Đơn hàng
              </Link>
              <span className="text-stone-300">|</span>
              <button
                onClick={logout}
                className="text-stone-500 hover:text-stone-800"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 shadow-sm"
            >
              Đăng nhập / Đăng ký
            </Link>
          )}

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full bg-amber-900 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-800 transition"
          >
            <span>🛒 Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Hero Banner nhỏ */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-900 to-stone-800 p-6 text-white shadow-md">
        <h2 className="text-xl font-bold">Thực đơn đặc biệt hôm nay</h2>
        <p className="mt-1 text-sm text-amber-100">
          Chọn món, tùy chọn size và topping yêu thích. Thanh toán chỉ trong 1 chạm!
        </p>
      </div>

      {/* Grid Danh mục món nước */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            {/* Ảnh sản phẩm */}
            <div className="relative h-44 w-full overflow-hidden bg-stone-100">
              <img
                src={p.imageUrl || '/images/ca-phe-sua.jpg'}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Thông tin món */}
            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-900 transition">
                  {p.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1">Đồ uống pha chế tươi</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                <span className="text-base font-black text-amber-900">
                  {p.price.toLocaleString('vi-VN')}đ
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors group-hover:bg-amber-900 group-hover:text-white">
                  Chọn size
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
