'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cartStore';

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

const SIZES = [
  { label: 'S', extra: 0 },
  { label: 'M', extra: 5000 },
  { label: 'L', extra: 10000 },
];

const TOPPINGS = [
  { label: 'Trân châu', extra: 5000 },
  { label: 'Kem', extra: 5000 },
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [size, setSize] = useState('S');
  const [toppings, setToppings] = useState<string[]>([]);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Không tìm thấy sản phẩm');
        return res.json();
      })
      .then((data) => setProduct(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleTopping(label: string) {
    setToppings((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  }
  function handleAdd() {
	if (!product) return;
	addItem({
		productId: product.id,
		name: product.name,
		size,
		toppings,
		unitPrice,
	});
	router.push('/cart');
  }

  if (loading) return <p className="p-8">Đang tải...</p>;
  if (error || !product) return <p className="p-8 text-red-600">{error}</p>;

  const sizeExtra = SIZES.find((s) => s.label === size)!.extra;
  const toppingExtra = TOPPINGS.filter((t) => toppings.includes(t.label)).reduce(
    (sum, t) => sum + t.extra,
    0,
  );
  const unitPrice = product.price + sizeExtra + toppingExtra;

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="text-sm text-gray-500">
        ← Quay lại menu
      </Link>
      <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
      <p className="mb-6 text-gray-500">
        Giá gốc: {product.price.toLocaleString('vi-VN')}đ
      </p>

      <h2 className="mb-2 font-semibold">Size</h2>
      <div className="mb-6 flex gap-2">
        {SIZES.map((s) => (
          <button
            key={s.label}
            onClick={() => setSize(s.label)}
            className={`rounded border px-4 py-2 ${
              size === s.label ? 'bg-black text-white' : ''
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <h2 className="mb-2 font-semibold">Topping</h2>
      <div className="mb-6 flex flex-col gap-2">
        {TOPPINGS.map((t) => (
          <label key={t.label} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={toppings.includes(t.label)}
              onChange={() => toggleTopping(t.label)}
            />
            {t.label} (+{t.extra.toLocaleString('vi-VN')}đ)
          </label>
        ))}
      </div>

      <p className="mb-4 text-xl font-bold">
        Thành tiền: {unitPrice.toLocaleString('vi-VN')}đ
      </p>
      <button onClick={handleAdd} className="w-full rounded bg-black py-3 text-white">
        Thêm vào giỏ
      </button>
    </main>
  );
}