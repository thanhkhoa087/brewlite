'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/lib/cartStore';

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
      <div className="mb-6 flex items-center justify-between">
		<h1 className="text-3xl font-bold">BrewLite</h1>
		<Link href="/cart" className="rounded border px-4 py-2">
			Giỏ hàng ({cartCount})
		</Link>
	  </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((p) => (
			<Link
				key={p.id}
				href={`/products/${p.id}`}
				className="rounded-lg border p-4 hover:shadow"
			>
				<div className="mb-3 flex h-32 items-center justify-center rounded bg-gray-100 text-gray-400">
					Ảnh
				</div>
				<h2 className="font-semibold">{p.name}</h2>
				<p>{p.price.toLocaleString('vi-VN')}đ</p>
			</Link>
		))}
      </div>
    </main>
  );
}