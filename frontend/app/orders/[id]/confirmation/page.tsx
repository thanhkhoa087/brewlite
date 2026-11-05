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
  discount?: number;
  voucherCode?: string;
  createdAt: string;
  items: OrderItem[];
};

function ConfirmationContent() {
  const { id } = useParams<{ id: string }>();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
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

  // Task 10: Chuyển đổi trạng thái mô phỏng Barista/Admin
  async function handleAdvanceStatus(nextStatus: string) {
    if (!token || !order) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Lỗi khi cập nhật trạng thái');
      }
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdatingStatus(false);
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

  const isSuccessFlow = ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status);

  // Tiến trình luồng Order State Machine
  const steps = [
    { key: 'PENDING', label: 'Tạo đơn' },
    { key: 'PAID', label: 'Thanh toán' },
    { key: 'PREPARING', label: 'Pha chế' },
    { key: 'READY', label: 'Sẵn sàng' },
    { key: 'COMPLETED', label: 'Nhận món' },
  ];
  const stepIdx = steps.findIndex((s) => s.key === order.status);

  return (
    <main className="mx-auto max-w-md p-4">
      {/* Header trạng thái */}
      <div className="text-center py-6">
        {isSuccessFlow ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-3xl font-black shadow-sm">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-black text-stone-900">
              {order.status === 'COMPLETED' ? 'Đơn hàng hoàn tất!' : 'Đặt hàng thành công!'}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Cảm ơn bạn đã sử dụng phương thức thanh toán không tiền mặt BrewLite.
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

      {/* Sơ đồ tiến trình Order State Machine (Task 10) */}
      {isSuccessFlow && (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3 text-center">
            Quy trình phục vụ (Order State Machine)
          </p>
          <div className="relative px-2">
            {/* Thanh nối tiến trình giữa các bước */}
            <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-1 bg-stone-200 z-0 rounded-full" />
            <div
              className="absolute left-6 top-3.5 -translate-y-1/2 h-1 bg-emerald-600 z-0 rounded-full transition-all duration-500"
              style={{
                width:
                  order.status === 'COMPLETED'
                    ? 'calc(100% - 3rem)'
                    : order.status === 'READY'
                      ? '72%'
                      : order.status === 'PREPARING'
                        ? '48%'
                        : order.status === 'PAID'
                          ? '25%'
                          : '0%',
              }}
            />

            <div className="flex items-center justify-between relative z-10">
              {steps.map((st, i) => {
                const isDone =
                  i === 0 ||
                  (i === 1 && ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status)) ||
                  (i === 2 && ['READY', 'COMPLETED'].includes(order.status)) ||
                  (i === 3 && order.status === 'COMPLETED') ||
                  (i === 4 && order.status === 'COMPLETED');

                const isActive =
                  !isDone &&
                  ((i === 1 && order.status === 'PENDING') ||
                    (i === 2 && (order.status === 'PAID' || order.status === 'PREPARING')) ||
                    (i === 3 && order.status === 'READY'));

                return (
                  <div key={st.key} className="flex flex-col items-center">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition shadow-sm ${
                        isDone
                          ? 'bg-emerald-600 text-white'
                          : isActive
                            ? i === 2 && order.status === 'PREPARING'
                              ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                              : i === 3
                                ? 'bg-cyan-600 text-white ring-4 ring-cyan-100'
                                : 'bg-amber-900 text-white ring-4 ring-amber-100'
                            : 'bg-stone-200 text-stone-500'
                      }`}
                    >
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-semibold ${
                        isDone
                          ? 'text-emerald-700 font-bold'
                          : isActive
                            ? 'text-amber-900 font-bold'
                            : 'text-stone-400'
                      }`}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nút mô phỏng Barista chuyển trạng thái cho buổi Demo */}
          <div className="mt-4 border-t border-stone-100 pt-3 flex flex-wrap gap-2 justify-center">
            {order.status === 'PAID' && (
              <button
                onClick={() => handleAdvanceStatus('PREPARING')}
                disabled={updatingStatus}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                ☕ Barista bắt đầu pha chế (→ PREPARING)
              </button>
            )}
            {order.status === 'PREPARING' && (
              <button
                onClick={() => handleAdvanceStatus('READY')}
                disabled={updatingStatus}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-700 transition"
              >
                🔔 Pha xong, mời nhận món (→ READY)
              </button>
            )}
            {order.status === 'READY' && (
              <button
                onClick={() => handleAdvanceStatus('COMPLETED')}
                disabled={updatingStatus}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                🎉 Khách đã lấy nước (→ COMPLETED)
              </button>
            )}
          </div>
        </div>
      )}

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

        {order.discount && order.discount > 0 && (
          <div className="flex justify-between items-center pt-2 text-xs text-emerald-700 font-bold">
            <span>Giảm giá ({order.voucherCode || 'Voucher'}):</span>
            <span>-{order.discount.toLocaleString('vi-VN')} đ</span>
          </div>
        )}

        <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
          <span className="font-bold text-stone-900">Tổng thanh toán:</span>
          <span className="text-2xl font-black text-amber-900">
            {order.total.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Thông báo quầy / Hướng dẫn */}
      {isSuccessFlow ? (
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
