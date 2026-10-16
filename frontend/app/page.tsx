'use client';

import { useEffect, useState } from 'react';

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

export default function MenuPage() {
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

  if (loading) return <p className="p-8">Đang tải menu...</p>;
  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (products.length === 0) return <p className="p-8">Chưa có sản phẩm nào.</p>;

  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-3xl font-bold">BrewLite</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="rounded-lg border p-4">
            <div className="mb-3 flex h-32 items-center justify-center rounded bg-gray-100 text-gray-400">
              Ảnh
            </div>
            <h2 className="font-semibold">{p.name}</h2>
            <p>{p.price.toLocaleString('vi-VN')}đ</p>
          </div>
        ))}
      </div>
    </main>
  );
}