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
  const clearCart = useCartStore((s) => s.clear);
  const router = useRouter();
  const token = useAuthStore((s) => s.token);

  const [method, setMethod] = useState<'WALLET' | 'CARD'>('WALLET');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  async function handleCheckout() {
    if (!token) {
      router.push('/login');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // 1. Tạo đơn hàng (Trạng thái ban đầu: PENDING)
      const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
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

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(
          Array.isArray(orderData.message)
            ? orderData.message.join(', ')
            : orderData.message || 'Lỗi khi tạo đơn hàng',
        );
      }

      // 2. Thực hiện thanh toán không tiền mặt (Task 8: Mock Payment)
      const payRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderData.id,
          method,
          simulateFailure,
        }),
      });

      const payData = await payRes.json();
      if (!payRes.ok) {
        throw new Error(
          Array.isArray(payData.message)
            ? payData.message.join(', ')
            : payData.message || 'Lỗi xử lý thanh toán',
        );
      }

      if (payData.status === 'PAID') {
        // Thành công: Xóa giỏ hàng và chuyển sang trang xác nhận đơn (Task 9)
        clearCart();
        router.push(`/orders/${orderData.id}/confirmation`);
      } else {
        // Thất bại: Đơn ở trạng thái PAYMENT_FAILED, giỏ hàng giữ nguyên
        setError(
          `Thanh toán không thành công! Đơn hàng #${orderData.id} chuyển sang trạng thái PAYMENT_FAILED. Giỏ hàng của bạn được giữ nguyên để thử lại.`,
        );
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <p className="mb-4 text-gray-600">Giỏ hàng của bạn đang trống.</p>
        <Link
          href="/"
          className="inline-block rounded bg-black px-6 py-2 text-white"
        >
          ← Xem menu món nước
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Thêm sản phẩm khác
      </Link>
      <h1 className="mb-6 mt-4 text-2xl font-bold">Giỏ hàng BrewLite</h1>

      <div className="flex flex-col gap-4">
        {items.map((i) => (
          <div key={i.key} className="rounded border p-4 shadow-sm">
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
              <p className="font-medium">
                {(i.unitPrice * i.qty).toLocaleString('vi-VN')}đ
              </p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => setQty(i.key, i.qty - 1)}
                className="rounded border px-3 py-1 hover:bg-gray-100"
              >
                −
              </button>
              <span className="font-semibold">{i.qty}</span>
              <button
                onClick={() => setQty(i.key, i.qty + 1)}
                className="rounded border px-3 py-1 hover:bg-gray-100"
              >
                +
              </button>
              <button
                onClick={() => removeItem(i.key)}
                className="ml-auto text-sm text-red-600 hover:underline"
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border bg-gray-50 p-4">
        <div className="flex justify-between text-lg font-bold">
          <span>Tổng tiền:</span>
          <span className="text-amber-800">
            {total.toLocaleString('vi-VN')}đ
          </span>
        </div>
      </div>

      {/* Phương thức thanh toán (Task 8) */}
      <div className="mt-6">
        <h2 className="mb-2 font-semibold">Phương thức thanh toán</h2>
        <div className="flex flex-col gap-2">
          <label className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="WALLET"
              checked={method === 'WALLET'}
              onChange={() => setMethod('WALLET')}
            />
            <div>
              <p className="font-medium">Ví điện tử</p>
              <p className="text-xs text-gray-500">MoMo / ZaloPay / VNPay</p>
            </div>
          </label>

          <label className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="CARD"
              checked={method === 'CARD'}
              onChange={() => setMethod('CARD')}
            />
            <div>
              <p className="font-medium">Thẻ ngân hàng</p>
              <p className="text-xs text-gray-500">Thẻ ATM nội địa / Visa / Mastercard</p>
            </div>
          </label>
        </div>

        {/* Checkbox mô phỏng thanh toán lỗi (tiêu chí test Task 8) */}
        <label className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />
          Mô phỏng thanh toán thất bại (để kiểm tra PAYMENT_FAILED)
        </label>
      </div>

      {error && (
        <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={submitting}
        className="mt-6 w-full rounded bg-amber-900 py-3 font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
      >
        {submitting ? 'Đang xử lý đơn & thanh toán...' : 'Xác nhận thanh toán'}
      </button>
    </main>
  );
}
