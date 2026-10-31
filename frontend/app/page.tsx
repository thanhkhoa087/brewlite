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
        if (!res.ok) throw new Error('Lỗi tải menu');
        return res.json();
      })
      .then((data) => setProducts(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8 text-center text-gray-600">Đang tải menu...</p>;
  if (error) return <p className="p-8 text-center text-red-600">{error}</p>;
  if (products.length === 0) return <p className="p-8 text-center">Chưa có sản phẩm nào.</p>;

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-amber-950">BrewLite</h1>
          <p className="text-xs text-amber-800">Cà phê không tiền mặt</p>
        </div>
        <div className="flex items-center gap-3">
          {email ? (
            <>
              <span className="text-sm text-gray-600 hidden sm:inline">{email}</span>
              <Link href="/orders" className="text-sm text-amber-900 font-medium hover:underline">
                Đơn hàng
              </Link>
              <button onClick={logout} className="text-sm text-gray-500 hover:underline">
                Đăng xuất
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm font-medium text-amber-900 hover:underline">
              Đăng nhập
            </Link>
          )}
          <Link
            href="/cart"
            className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-800"
          >
            Giỏ hàng ({cartCount})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-3 flex h-32 items-center justify-center rounded bg-amber-50 text-amber-900 text-3xl font-bold">
              ☕
            </div>
            <h2 className="font-semibold text-gray-900">{p.name}</h2>
            <p className="mt-1 text-sm font-bold text-amber-800">
              {p.price.toLocaleString('vi-VN')}đ
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
