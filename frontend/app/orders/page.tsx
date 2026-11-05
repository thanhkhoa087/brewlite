'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

type OrderItem = {
  id: number;
  name: string;
  size: string;
  toppings: string;
  qty: number;
  lineTotal: number;
};

type Order = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export default function OrdersHistoryPage() {
  const token = useAuthStore((s) => s.token);
  const email = useAuthStore((s) => s.email);
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, [token]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Lỗi khi tải lịch sử đơn hàng');
      }
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetryPayment(orderId: number) {
    setPayingOrderId(orderId);
    setToast(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          method: 'WALLET',
          simulateFailure: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thanh toán thất bại');

      setToast({
        type: 'success',
        message: `Thanh toán lại cho đơn #${orderId} thành công! Trạng thái đã chuyển sang PAID.`,
      });
      fetchOrders();
    } catch (err) {
      setToast({
        type: 'error',
        message: (err as Error).message,
      });
    } finally {
      setPayingOrderId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Đã thanh toán (PAID)
          </span>
        );
      case 'PREPARING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            Đang pha chế (PREPARING)
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 ring-1 ring-inset ring-cyan-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-600" />
            Sẵn sàng nhận món (READY)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-800 ring-1 ring-inset ring-stone-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
            Hoàn tất (COMPLETED)
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            Chờ thanh toán (PENDING)
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Lỗi thanh toán (FAILED)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-3 py-1 text-xs font-bold text-stone-600">
            Đã hủy (CANCELLED)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center text-stone-500">
        <p className="text-sm font-semibold">☕ Đang tải lịch sử đơn hàng...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-5 sm:p-8">
      {/* Thanh điều hướng trên cùng */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline"
        >
          ← Quay lại menu chính
        </Link>
        <div className="flex items-center gap-3">
          {email && (
            <span className="text-xs text-stone-500 hidden sm:inline">
              Tài khoản: <strong className="text-stone-800">{email}</strong>
            </span>
          )}
          <Link
            href="/cart"
            className="inline-flex items-center gap-1 text-sm font-bold text-amber-900 hover:underline"
          >
            🛒 Giỏ hàng
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-stone-900">
          Lịch sử đơn hàng của tôi
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Theo dõi trạng thái các đơn đồ uống bạn đã đặt
        </p>
      </div>

      {/* Thông báo thao tác */}
      {toast && (
        <div
          className={`mb-5 flex items-start justify-between rounded-xl p-3.5 text-xs font-semibold border ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 font-bold text-stone-400 hover:text-stone-600"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 border border-rose-200">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <span className="text-4xl">📋</span>
          <h2 className="mt-4 text-xl font-bold text-stone-900">
            Bạn chưa có đơn hàng nào
          </h2>
          <p className="mt-2 text-sm text-stone-500 mb-6">
            Hãy khám phá các món nước thơm ngon tại BrewLite và đặt món ngay nhé!
          </p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-900 px-6 py-3 text-sm font-bold text-white shadow hover:bg-amber-800 transition"
          >
            ← Khám phá thực đơn
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <span className="text-base font-bold text-amber-900">
                    Đơn hàng #{o.id}
                  </span>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {new Date(o.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>{getStatusBadge(o.status)}</div>
              </div>

              {/* Danh sách món */}
              <div className="py-3 space-y-1.5">
                {o.items.map((i) => (
                  <div
                    key={i.id}
                    className="flex justify-between text-sm text-stone-700"
                  >
                    <span>
                      {i.name} ({i.size}) x{i.qty}
                      {i.toppings && (
                        <span className="text-xs text-stone-500">
                          {' '}
                          (+{i.toppings})
                        </span>
                      )}
                    </span>
                    <span className="font-medium text-stone-800">
                      {i.lineTotal.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                ))}
              </div>

              {/* Chân thẻ đơn */}
              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="font-bold text-stone-900 text-sm">
                  Tổng: <span className="text-amber-900 font-black text-base">{o.total.toLocaleString('vi-VN')} đ</span>
                </span>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/orders/${o.id}/confirmation`}
                    className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-1.5 text-xs font-bold text-stone-700 shadow-sm hover:bg-stone-100 transition"
                  >
                    Xem chi tiết
                  </Link>
                  {o.status === 'PAYMENT_FAILED' && (
                    <button
                      onClick={() => handleRetryPayment(o.id)}
                      disabled={payingOrderId === o.id}
                      className="rounded-xl bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-rose-800 transition active:scale-[0.99] disabled:opacity-50"
                    >
                      {payingOrderId === o.id ? 'Đang xử lý...' : 'Thanh toán lại'}
                    </button>
                  )}
                  {o.status === 'PENDING' && (
                    <button
                      onClick={() => handleRetryPayment(o.id)}
                      disabled={payingOrderId === o.id}
                      className="rounded-xl bg-amber-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800 transition active:scale-[0.99] disabled:opacity-50"
                    >
                      {payingOrderId === o.id ? 'Đang xử lý...' : 'Thanh toán ngay'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
