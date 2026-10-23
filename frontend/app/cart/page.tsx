'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const router = useRouter();
const token = useAuthStore((s) => s.token);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState('');

async function handleCheckout() {
  if (!token) {
    router.push('/login');
    return;
  }
  setError('');
  setSubmitting(true);
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          productId: i.productId,
          size: i.size,
          toppings: i.toppings,
          qty: i.qty,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        Array.isArray(data.message) ? data.message.join(', ') : data.message,
      );
    }
    alert(`Đã tạo đơn #${data.id} (${data.status}). Thanh toán sẽ làm ở Task 8.`);
  } catch (err) {
    setError((err as Error).message);
  } finally {
    setSubmitting(false);
  }
}

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-md p-8">
        <p className="mb-4">Giỏ hàng trống.</p>
        <Link href="/" className="underline">
          ← Về menu
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="text-sm text-gray-500">
        ← Thêm sản phẩm khác
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">Giỏ hàng</h1>

      <div className="flex flex-col gap-4">
        {items.map((i) => (
          <div key={i.key} className="rounded border p-4">
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">
                  {i.name} ({i.size})
                </p>
                {i.toppings.length > 0 && (
                  <p className="text-sm text-gray-500">
                    + {i.toppings.join(', ')}
                  </p>
                )}
              </div>
              <p>{(i.unitPrice * i.qty).toLocaleString('vi-VN')}đ</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setQty(i.key, i.qty - 1)}
                className="rounded border px-3"
              >
                −
              </button>
              <span>{i.qty}</span>
              <button
                onClick={() => setQty(i.key, i.qty + 1)}
                className="rounded border px-3"
              >
                +
              </button>
              <button
                onClick={() => removeItem(i.key)}
                className="ml-auto text-sm text-red-600"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xl font-bold">
        Tổng: {total.toLocaleString('vi-VN')}đ
      </p>
     {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
<button
  onClick={handleCheckout}
  disabled={submitting}
  className="mt-4 w-full rounded bg-black py-3 text-white disabled:opacity-50"
>
  {submitting ? 'Đang xử lý...' : 'Thanh toán'}
</button>
    </main>
  );
}