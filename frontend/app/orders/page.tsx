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
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);

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

      alert(`Thanh toán đơn #${orderId} thành công!`);
      fetchOrders();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPayingOrderId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
            PAID (Đã thanh toán)
          </span>
        );
      case 'PENDING':
        return (
          <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
            PENDING (Chờ thanh toán)
          </span>
        );
      case 'PAYMENT_FAILED':
        return (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            PAYMENT_FAILED (Lỗi thanh toán)
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center text-gray-600">
        Đang tải lịch sử đơn hàng...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-500 hover:underline">
            ← Quay lại menu
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">
            Lịch sử đơn hàng của tôi
          </h1>
        </div>
        <Link
          href="/cart"
          className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
        >
          Xem giỏ hàng
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {orders.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-gray-500">
          <p className="mb-4">Bạn chưa có đơn hàng nào.</p>
          <Link
            href="/"
            className="inline-block rounded bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Đặt món ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <span className="text-base font-bold text-amber-900">
                    Đơn hàng #{o.id}
                  </span>
                  <p className="text-xs text-gray-500">
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
                    className="flex justify-between text-sm text-gray-700"
                  >
                    <span>
                      {i.name} ({i.size}) x{i.qty}
                      {i.toppings && (
                        <span className="text-xs text-gray-400">
                          {' '}
                          (+{i.toppings})
                        </span>
                      )}
                    </span>
                    <span>{i.lineTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                ))}
              </div>

              {/* Chân thẻ đơn */}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold text-gray-900">
                  Tổng: {o.total.toLocaleString('vi-VN')} đ
                </span>

                <div className="flex gap-2">
                  <Link
                    href={`/orders/${o.id}/confirmation`}
                    className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Xem chi tiết
                  </Link>
                  {o.status !== 'PAID' && (
                    <button
                      onClick={() => handleRetryPayment(o.id)}
                      disabled={payingOrderId === o.id}
                      className="rounded bg-black px-3 py-1 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                    >
                      {payingOrderId === o.id ? 'Đang trả...' : 'Thanh toán lại'}
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
