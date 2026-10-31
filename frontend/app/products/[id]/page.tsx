'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cartStore';

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg' },
  { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg' },
  { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg' },
  { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg' },
];

const SIZES = [
  { label: 'S', extra: 0, desc: 'Tiêu chuẩn (350ml)' },
  { label: 'M', extra: 5000, desc: 'Vừa (+5.000đ / 500ml)' },
  { label: 'L', extra: 10000, desc: 'Lớn (+10.000đ / 700ml)' },
];

const TOPPINGS = [
  { label: 'Trân châu', extra: 5000 },
  { label: 'Kem', extra: 5000 },
];

function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const initial = DEFAULT_PRODUCTS.find((p) => String(p.id) === String(id)) || null;

  const [product, setProduct] = useState<Product | null>(initial);
  const [size, setSize] = useState('S');
  const [toppings, setToppings] = useState<string[]>([]);
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (!id) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Không tìm thấy sản phẩm');
        return res.json();
      })
      .then((data) => {
        if (data && data.id) setProduct(data);
      })
      .catch((err) => {
        console.warn('Dùng dữ liệu chi tiết có sẵn:', err.message);
      });
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

  if (!product) {
    return (
      <main className="mx-auto max-w-md p-8 text-center bg-white rounded-2xl border border-stone-200 mt-8 shadow-sm">
        <p className="text-red-600 font-semibold mb-4">Không tìm thấy sản phẩm</p>
        <Link href="/" className="inline-block rounded-lg bg-stone-900 px-5 py-2 text-white font-medium">
          ← Quay lại menu
        </Link>
      </main>
    );
  }

  const sizeExtra = SIZES.find((s) => s.label === size)!.extra;
  const toppingExtra = TOPPINGS.filter((t) => toppings.includes(t.label)).reduce(
    (sum, t) => sum + t.extra,
    0,
  );
  const unitPrice = product.price + sizeExtra + toppingExtra;

  return (
    <main className="mx-auto max-w-md p-5 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline mb-4">
        ← Quay lại menu chính
      </Link>

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {/* Ảnh món nước */}
        <div className="relative h-60 w-full overflow-hidden bg-stone-100">
          <img
            src={product.imageUrl || '/images/ca-phe-sua.jpg'}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="p-6">
          <div className="flex items-baseline justify-between">
            <h1 className="text-2xl font-black text-stone-900">{product.name}</h1>
            <span className="text-sm font-semibold text-stone-500">
              Gốc: {product.price.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Tùy chỉnh ly nước theo đúng khẩu vị của bạn
          </p>

          {/* Chọn Size */}
          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
              1. Chọn kích cỡ (Size)
            </h2>
            <div className="flex flex-col gap-2">
              {SIZES.map((s) => (
                <label
                  key={s.label}
                  onClick={() => setSize(s.label)}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                    size === s.label
                      ? 'border-amber-900 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-900/20'
                      : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      size === s.label ? 'bg-amber-900 text-white' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {s.label}
                    </span>
                    <span className="text-sm">{s.desc}</span>
                  </div>
                  <input
                    type="radio"
                    name="size"
                    checked={size === s.label}
                    onChange={() => setSize(s.label)}
                    className="accent-amber-900"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Chọn Topping */}
          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
              2. Chọn Topping thêm
            </h2>
            <div className="flex flex-col gap-2">
              {TOPPINGS.map((t) => (
                <label
                  key={t.label}
                  className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition ${
                    toppings.includes(t.label)
                      ? 'border-amber-900 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-900/20'
                      : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className="text-sm">
                    {t.label} (+{t.extra.toLocaleString('vi-VN')} đ)
                  </span>
                  <input
                    type="checkbox"
                    checked={toppings.includes(t.label)}
                    onChange={() => toggleTopping(t.label)}
                    className="h-4 w-4 rounded accent-amber-900"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Tổng tiền & Nút thêm vào giỏ */}
          <div className="mt-8 rounded-xl bg-stone-50 p-4 border border-stone-200">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-semibold text-stone-600">Thành tiền tạm tính:</span>
              <span className="text-2xl font-black text-amber-900 shrink-0">
                {unitPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="mt-4 w-full rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99]"
          >
            Thêm vào giỏ hàng
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-stone-600">Đang tải chi tiết...</p>}>
      <ProductDetailContent />
    </Suspense>
  );
}
