'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

type OrderItem = {
  id: number;
  name: string;
  size: string;
  toppings: string;
  qty: number;
  lineTotal: number;
};

type OrderDetail = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

function ConfirmationContent() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!id) return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Không tìm thấy thông tin đơn hàng');
        }
        return res.json();
      })
      .then((data) => setOrder(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, token, router]);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Đã thanh toán (PAID)
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
      <main className="mx-auto max-w-md p-8 text-center text-stone-500">
        <p className="text-sm font-semibold">☕ Đang tải thông tin đơn hàng...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-rose-600 font-semibold mb-4">{error || 'Không tìm thấy đơn hàng'}</p>
          <Link
            href="/"
            className="inline-block rounded-xl bg-amber-900 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-800 transition"
          >
            ← Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  const isPaid = order.status === 'PAID';

  return (
    <main className="mx-auto max-w-md p-5 sm:p-8">
      {/* Thanh điều hướng */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-900 hover:underline"
        >
          ← Xem tất cả đơn hàng
        </Link>
        <Link
          href="/"
          className="text-xs font-semibold text-stone-500 hover:text-amber-900"
        >
          Về menu chính
        </Link>
      </div>

      {/* Biểu tượng trạng thái */}
      <div className="text-center my-6">
        {isPaid ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-3xl font-black shadow-sm">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-black text-stone-900">
              Đặt hàng thành công!
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Cảm ơn quý khách đã mua sắm tại BrewLite
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-3xl font-black shadow-sm">
              ✕
            </div>
            <h1 className="mt-4 text-2xl font-black text-stone-900">
              Thanh toán chưa hoàn tất
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Đơn hàng chưa được thanh toán thành công ({order.status})
            </p>
          </>
        )}
      </div>

      {/* Chi tiết đơn */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm space-y-3.5">
        <div className="flex justify-between items-center pb-2.5 border-b border-stone-100">
          <span className="text-stone-500 font-medium text-sm">Mã đơn hàng:</span>
          <span className="text-lg font-black text-amber-900">#{order.id}</span>
        </div>

        <div className="flex justify-between items-center pb-2.5 border-b border-stone-100">
          <span className="text-stone-500 font-medium text-sm">Trạng thái:</span>
          <div>{getStatusBadge(order.status)}</div>
        </div>

        <div className="flex justify-between items-center pb-2.5 border-b border-stone-100">
          <span className="text-stone-500 font-medium text-sm">Thời gian đặt:</span>
          <span className="text-sm font-semibold text-stone-800">
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Danh sách món */}
        <div className="pt-2">
          <p className="font-bold text-xs uppercase tracking-wider text-stone-700 mb-2.5">
            Món nước đã chọn:
          </p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-bold text-stone-900">
                    {item.name} ({item.size}) <span className="text-stone-500 font-normal">x{item.qty}</span>
                  </p>
                  {item.toppings && (
                    <p className="text-xs text-stone-500">+ Topping: {item.toppings}</p>
                  )}
                </div>
                <span className="font-semibold text-stone-800">
                  {item.lineTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
          <span className="font-bold text-stone-900">Tổng thanh toán:</span>
          <span className="text-2xl font-black text-amber-900">
            {order.total.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Thông báo quầy / Hướng dẫn */}
      {isPaid ? (
        <div className="mt-5 rounded-xl bg-amber-50 p-4 border border-amber-200 text-center">
          <p className="font-bold text-amber-950 text-sm">
            ☕ Mời quý khách tới quầy nhận đồ uống khi hiển thị mã #{order.id}
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-xl bg-rose-50 p-4 border border-rose-200 text-center">
          <p className="font-bold text-rose-900 text-sm">
            ⚠️ Đơn hàng chưa hoàn tất thanh toán. Vui lòng thử thanh toán lại trong Lịch sử đơn hàng.
          </p>
        </div>
      )}

      {/* Nút điều hướng */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/orders"
          className="w-full text-center rounded-xl border border-stone-200 bg-white py-3.5 font-bold text-stone-800 shadow-sm hover:bg-stone-50 transition active:scale-[0.99]"
        >
          Xem lịch sử đơn hàng
        </Link>
        <Link
          href="/"
          className="w-full text-center rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99]"
        >
          ← Tiếp tục khám phá menu
        </Link>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md p-8 text-center text-stone-500">
          <p className="text-sm font-semibold">☕ Đang tải thông tin đơn hàng...</p>
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
