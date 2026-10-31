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
  const email = useAuthStore((s) => s.email);

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
          `Thanh toán không thành công! Đơn hàng #${orderData.id} chuyển sang trạng thái PAYMENT_FAILED. Giỏ hàng được giữ nguyên để bạn thử lại.`,
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
      <main className="mx-auto max-w-md p-10 text-center">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <span className="text-4xl">🛒</span>
          <h2 className="mt-4 text-xl font-bold text-stone-900">Giỏ hàng đang trống</h2>
          <p className="mt-2 text-sm text-stone-500 mb-6">
            Hãy khám phá các món nước thơm ngon tại quầy BrewLite ngay nhé!
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-900 px-6 py-3 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99]"
          >
            ← Khám phá thực đơn
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-5 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline">
          ← Thêm sản phẩm khác
        </Link>
        {email ? (
          <span className="text-xs text-stone-500">
            Tài khoản: <strong className="text-stone-800">{email}</strong>
          </span>
        ) : (
          <Link href="/login" className="text-xs font-bold text-amber-900 hover:underline">
            Đăng nhập
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-stone-900 mb-6">Giỏ hàng của bạn</h1>

        {/* Danh sách món */}
        <div className="flex flex-col gap-3">
          {items.map((i) => (
            <div key={i.key} className="rounded-xl border border-stone-200 bg-stone-50/50 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-stone-900 text-base">
                    {i.name} ({i.size})
                  </p>
                  {i.toppings.length > 0 && (
                    <p className="text-xs text-stone-500 mt-0.5">
                      + Topping: {i.toppings.join(', ')}
                    </p>
                  )}
                </div>
                <p className="font-extrabold text-amber-900 text-sm">
                  {(i.unitPrice * i.qty).toLocaleString('vi-VN')} đ
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-stone-200/60 pt-2.5">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(i.key, i.qty - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-100"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold text-stone-900 text-sm">
                    {i.qty}
                  </span>
                  <button
                    onClick={() => setQty(i.key, i.qty + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-300 bg-white font-bold text-stone-700 hover:bg-stone-100"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(i.key)}
                  className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline"
                >
                  Xóa món
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Tổng tiền */}
        <div className="mt-6 rounded-xl bg-amber-50 p-4 border border-amber-200">
          <div className="flex justify-between items-center text-base font-bold text-stone-800">
            <span>Tổng tiền:</span>
            <span className="text-2xl font-black text-amber-900">
              {total.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Chọn phương thức thanh toán */}
        <div className="mt-6 border-t border-stone-200 pt-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-stone-700 mb-3">
            Phương thức thanh toán không tiền mặt
          </h2>
          <div className="flex flex-col gap-2.5">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                method === 'WALLET'
                  ? 'border-amber-900 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-900/20'
                  : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="WALLET"
                checked={method === 'WALLET'}
                onChange={() => setMethod('WALLET')}
                className="accent-amber-900"
              />
              <div>
                <p className="text-sm font-bold text-stone-900">📱 Ví điện tử</p>
                <p className="text-xs text-stone-500">MoMo / ZaloPay / VNPay QR</p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition ${
                method === 'CARD'
                  ? 'border-amber-900 bg-amber-50/70 text-amber-950 font-bold ring-2 ring-amber-900/20'
                  : 'border-stone-200 bg-white text-stone-800 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="CARD"
                checked={method === 'CARD'}
                onChange={() => setMethod('CARD')}
                className="accent-amber-900"
              />
              <div>
                <p className="text-sm font-bold text-stone-900">💳 Thẻ ngân hàng</p>
                <p className="text-xs text-stone-500">ATM Nội địa / Visa / Mastercard</p>
              </div>
            </label>
          </div>

          {/* Checkbox mô phỏng thanh toán lỗi */}
          <label className="mt-4 flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-800">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(e) => setSimulateFailure(e.target.checked)}
              className="rounded accent-amber-900"
            />
            Mô phỏng thanh toán thất bại (để kiểm tra PAYMENT_FAILED)
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-700 border border-red-200">
            <p>{error}</p>
            <div className="mt-2 pt-2 border-t border-red-200/60">
              <Link href="/orders" className="font-bold text-amber-900 hover:underline">
                → Đi đến lịch sử đơn hàng để xem chi tiết hoặc thanh toán lại
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={submitting}
          className="mt-6 w-full rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? 'Đang xử lý đơn & thanh toán...' : `Xác nhận thanh toán • ${total.toLocaleString('vi-VN')} đ`}
        </button>
      </div>
    </main>
  );
}
