'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cartStore';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const removeItem = useCartStore((s) => s.removeItem);

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
      <button className="mt-4 w-full rounded bg-black py-3 text-white">
        Thanh toán
      </button>
    </main>
  );
}