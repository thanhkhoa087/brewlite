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

  // Task 10: Khuyến mãi (Voucher)
  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discount: number;
    description: string;
  } | null>(null);
  const [voucherError, setVoucherError] = useState('');

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const discount = appliedVoucher ? appliedVoucher.discount : 0;
  const total = Math.max(0, subtotal - discount);

  function handleApplyVoucher(codeToApply?: string) {
    setVoucherError('');
    const code = (codeToApply || voucherInput).trim().toUpperCase();
    if (!code) {
      setVoucherError('Vui lòng nhập mã giảm giá');
      return;
    }

    if (code === 'GIAM10') {
      const disc = Math.min(Math.round((subtotal * 10) / 100), 30000);
      setAppliedVoucher({
        code: 'GIAM10',
        discount: disc,
        description: 'Giảm 10% (tối đa 30.000 đ)',
      });
      setVoucherInput('GIAM10');
    } else if (code === 'BREW20') {
      if (subtotal < 40000) {
        setVoucherError('Mã BREW20 chỉ áp dụng cho đơn từ 40.000 đ trở lên');
        return;
      }
      setAppliedVoucher({
        code: 'BREW20',
        discount: 20000,
        description: 'Giảm 20.000 đ',
      });
      setVoucherInput('BREW20');
    } else if (code === 'WELCOME') {
      setAppliedVoucher({
        code: 'WELCOME',
        discount: 15000,
        description: 'Giảm 15.000 đ thành viên mới',
      });
      setVoucherInput('WELCOME');
    } else {
      setVoucherError(`Mã "${code}" không hợp lệ hoặc đã hết hạn`);
    }
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherError('');
  }

  async function handleCheckout() {
    if (!token) {
      router.push('/login');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // Sinh Idempotency-Key để chống đặt trùng / trừ tiền 2 lần (Task 10 - Requirement 2)
      const idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Tạo đơn hàng (Trạng thái ban đầu: PENDING, áp dụng Voucher và Idempotency-Key)
      const orderRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            productId: i.productId,
            size: i.size,
            toppings: i.toppings,
            qty: i.qty,
          })),
          voucherCode: appliedVoucher?.code || undefined,
          idempotencyKey,
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

      // 2. Thực hiện thanh toán không tiền mặt (Task 8 & 10: Idempotent Payment)
      const payRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          orderId: orderData.id,
          method,
          simulateFailure,
          idempotencyKey,
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

      if (payData.status === 'PAID' || payData.success) {
        // Thành công: Xóa giỏ hàng và chuyển sang trang xác nhận đơn (Task 9)
        clearCart();
        router.push(`/orders/${orderData.id}/confirmation`);
      } else {
        // Thất bại: Đơn ở trạng thái PAYMENT_FAILED, giỏ hàng giữ nguyên
        setError(
          `Thanh toán không thành công! Đơn hàng #${orderData.id} chuyển sang trạng thái PAYMENT_FAILED. Bạn có thể thử thanh toán lại hoặc chọn phương thức khác.`,
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
      <main className="mx-auto max-w-md p-4 text-center">
        <header className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
          <Link href="/" className="text-sm font-bold text-amber-900 hover:text-amber-800 transition">
            ← Tiếp tục chọn món
          </Link>
          <span className="text-xs text-stone-500 font-medium">{email || 'Chưa đăng nhập'}</span>
        </header>

        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-800 mb-3">
            🛒
          </div>
          <p className="text-stone-700 font-bold">Giỏ hàng của bạn đang trống</p>
          <p className="mt-1 text-xs text-stone-400">Hãy dạo quanh menu và chọn cho mình ly cà phê yêu thích nhé!</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-amber-900 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-800 transition"
          >
            Xem Menu Ngay
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <header className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
        <Link href="/" className="text-sm font-bold text-amber-900 hover:text-amber-800 transition">
          ← Tiếp tục chọn món
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/orders" className="text-xs font-semibold text-stone-600 hover:text-amber-900 transition">
            Lịch sử đơn
          </Link>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">{email || 'Khách'}</span>
        </div>
      </header>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h1 className="text-lg font-black text-stone-900">Giỏ hàng của bạn</h1>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-stone-400 hover:text-rose-600 transition"
          >
            Xóa tất cả
          </button>
        </div>

        {/* Danh sách món */}
        <div className="divide-y divide-stone-100">
          {items.map((item) => (
            <div key={item.key} className="py-3 flex justify-between items-start gap-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-stone-900">{item.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Size {item.size}
                  {item.toppings.length > 0 && ` • +${item.toppings.join(', ')}`}
                </p>
                <p className="text-xs font-bold text-amber-900 mt-1">
                  {item.unitPrice.toLocaleString('vi-VN')} đ
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden bg-stone-50">
                  <button
                    onClick={() => setQty(item.key, item.qty - 1)}
                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 font-bold transition text-xs"
                  >
                    -
                  </button>
                  <span className="w-7 text-center text-xs font-bold text-stone-800">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => setQty(item.key, item.qty + 1)}
                    className="w-7 h-7 flex items-center justify-center text-stone-600 hover:bg-stone-200 font-bold transition text-xs"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => removeItem(item.key)}
                  className="text-stone-300 hover:text-rose-500 p-1 transition"
                  title="Xóa món"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Phần nhập mã giảm giá Voucher (Task 10) */}
        <div className="mt-4 border-t border-stone-100 pt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5 block">
            🎟️ Mã giảm giá / Voucher
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nhập GIAM10, BREW20..."
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-xs font-bold text-stone-900 uppercase focus:border-amber-900 focus:outline-none"
            />
            {appliedVoucher ? (
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
              >
                Hủy mã
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleApplyVoucher()}
                className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-bold text-white hover:bg-stone-900 transition"
              >
                Áp dụng
              </button>
            )}
          </div>

          {/* Gợi ý mã có sẵn */}
          {!appliedVoucher && (
            <div className="mt-2 flex flex-wrap gap-1.5 items-center text-xs text-stone-500">
              <span className="text-[11px]">Gợi ý:</span>
              <button
                type="button"
                onClick={() => handleApplyVoucher('GIAM10')}
                className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200 hover:bg-amber-100"
              >
                GIAM10 (-10%)
              </button>
              <button
                type="button"
                onClick={() => handleApplyVoucher('BREW20')}
                className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200 hover:bg-amber-100"
              >
                BREW20 (-20k)
              </button>
            </div>
          )}

          {appliedVoucher && (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 border border-emerald-200">
              <span className="font-semibold">✓ Đã áp dụng mã {appliedVoucher.code} ({appliedVoucher.description})</span>
              <span className="font-bold">-{appliedVoucher.discount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}

          {voucherError && (
            <p className="mt-1.5 text-xs font-semibold text-rose-600">{voucherError}</p>
          )}
        </div>

        {/* Tổng tiền và chi tiết giảm giá */}
        <div className="mt-5 rounded-xl bg-amber-50/80 p-4 border border-amber-200/80">
          <div className="flex justify-between items-center text-xs text-stone-600 mb-1">
            <span>Tạm tính ({items.reduce((s, i) => s + i.qty, 0)} món):</span>
            <span className="font-semibold">{subtotal.toLocaleString('vi-VN')} đ</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between items-center text-xs text-emerald-700 font-bold mb-1">
              <span>Giảm giá khuyến mãi:</span>
              <span>-{discount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
          <div className="border-t border-amber-200/60 pt-2 mt-2 flex justify-between items-center text-base font-bold text-stone-800">
            <span>Tổng thanh toán:</span>
            <span className="text-2xl font-black text-amber-900">
              {total.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        {/* Chọn phương thức thanh toán */}
        <div className="mt-5 border-t border-stone-200 pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 mb-2.5">
            Phương thức thanh toán không tiền mặt
          </h2>
          <div className="flex flex-col gap-2">
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
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
                <p className="text-xs font-bold text-stone-900">📱 Ví điện tử</p>
                <p className="text-[11px] text-stone-500">MoMo / ZaloPay / VNPay QR</p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
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
                <p className="text-xs font-bold text-stone-900">💳 Thẻ ngân hàng</p>
                <p className="text-[11px] text-stone-500">ATM Nội địa / Visa / Mastercard</p>
              </div>
            </label>
          </div>

          {/* Checkbox mô phỏng thanh toán lỗi */}
          <label className="mt-3 flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-500 hover:text-stone-800">
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
          className="mt-5 w-full rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99] disabled:opacity-50"
        >
          {submitting
            ? 'Đang xử lý đơn & thanh toán...'
            : `Xác nhận thanh toán • ${total.toLocaleString('vi-VN')} đ`}
        </button>
      </div>
    </main>
  );
}
