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
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (!id) return;

    let isMounted = true;

    const fetchOrder = async (isInitial = false) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Không tìm thấy thông tin đơn hàng');
        }
        const data = await res.json();
        if (isMounted) {
          setOrder(data);
          setError('');
          setLastUpdated(new Date());
        }
      } catch (err: any) {
        if (isMounted && isInitial) {
          setError(err.message);
        }
      } finally {
        if (isMounted && isInitial) {
          setLoading(false);
        }
      }
    };

    fetchOrder(true);

    // Chuẩn nghiệp vụ: Tự động đồng bộ trạng thái đơn hàng thời gian thực mỗi 3 giây
    const interval = setInterval(() => {
      fetchOrder(false);
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [id, token, router]);

  const handleCancelOrder = async () => {
    if (!order || !token) return;
    if (!confirm(`Bạn có chắc chắn muốn hủy đơn hàng #${order.id}?`)) return;
    setCancelling(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Hủy đơn hàng thất bại');
      setOrder(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!order || !token) return;
    setRetrying(true);
    try {
      const retryKey = `retry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'idempotency-key': retryKey,
        },
        body: JSON.stringify({
          orderId: order.id,
          method: 'WALLET',
          simulateFailure: false,
          idempotencyKey: retryKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Thanh toán thất bại');
      if (data.status === 'PAID' || data.success) {
        if (data.order) {
          setOrder(data.order);
        } else {
          const ordRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (ordRes.ok) {
            setOrder(await ordRes.json());
          }
        }
      } else {
        alert('Thanh toán chưa thành công, vui lòng thử lại.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRetrying(false);
    }
  };

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

  return (
    <main className="mx-auto max-w-md p-4">
      {/* Header trạng thái */}
      <div className="text-center py-6">
        {isSuccessFlow ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-3xl font-black shadow-sm ring-8 ring-emerald-50">
              ✓
            </div>
            <h1 className="mt-4 text-2xl font-black text-stone-900">
              Thanh toán thành công!
            </h1>
            <p className="text-sm font-bold text-amber-900 mt-2">
              Cảm ơn bạn đã sử dụng dịch vụ BrewLite!
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Đơn hàng #{order.id} của bạn đã được ghi nhận và gửi đến quầy pha chế.
            </p>
          </>
        ) : order.status === 'CANCELLED' ? (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-200 text-stone-700 text-3xl font-black shadow-sm">
              ✕
            </div>
            <h1 className="mt-4 text-2xl font-black text-stone-900">
              Đơn hàng đã được hủy
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Đơn hàng #{order.id} đã hủy thành công. Sản phẩm đã được hoàn trả lại vào kho.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-700 text-3xl font-black shadow-sm ring-8 ring-rose-50">
              ✕
            </div>
            <h1 className="mt-4 text-2xl font-black text-rose-700">
              Thanh toán thất bại
            </h1>
            <p className="text-sm text-stone-600 mt-2">
              Giao dịch thanh toán cho đơn hàng #{order.id} chưa thành công.
            </p>
          </>
        )}
      </div>

      {/* Sơ đồ tiến trình Order State Machine */}
      {isSuccessFlow && (
        <div className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-600 mb-3 text-center">
            Quy trình phục vụ (Order State Machine)
          </p>
          <div className="relative px-2">
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

          <div className="mt-4 border-t border-stone-100 pt-3">
            <div className="flex items-center justify-between text-[11px] text-stone-500 mb-2">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="relative flex h-2 w-2">
                  {['PAID', 'PREPARING', 'READY'].includes(order.status) && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      order.status === 'COMPLETED' ? 'bg-stone-400' : 'bg-emerald-500'
                    }`}
                  ></span>
                </span>
                {order.status === 'COMPLETED'
                  ? 'Đã hoàn tất đơn'
                  : 'Cập nhật trực tiếp từ quầy pha chế'}
              </span>
              <span className="text-stone-400">
                {lastUpdated.toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border text-xs leading-relaxed ${
                order.status === 'PAID'
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                  : order.status === 'PREPARING'
                    ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                    : order.status === 'READY'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                      : 'bg-stone-50 border-stone-200 text-stone-700'
              }`}
            >
              {order.status === 'PAID' && (
                <p className="flex items-start gap-2">
                  <span className="text-base">⏳</span>
                  <span>
                    <strong>Đã tiếp nhận đơn:</strong> Đơn hàng đã ghi nhận vào hàng đợi của Barista. Vui lòng thư giãn tại bàn.
                  </span>
                </p>
              )}
              {order.status === 'PREPARING' && (
                <p className="flex items-start gap-2">
                  <span className="text-base">☕</span>
                  <span>
                    <strong>Đang pha chế:</strong> Barista đang thực hiện thức uống của bạn theo đúng công thức chuẩn vị.
                  </span>
                </p>
              )}
              {order.status === 'READY' && (
                <p className="flex items-start gap-2">
                  <span className="text-base">🔔</span>
                  <span>
                    <strong>Đồ uống đã sẵn sàng!</strong> Mời bạn đến quầy xuất trình mã đơn{' '}
                    <strong>#{order.id}</strong> để nhận món.
                  </span>
                </p>
              )}
              {order.status === 'COMPLETED' && (
                <p className="flex items-start gap-2">
                  <span className="text-base">🎉</span>
                  <span>
                    <strong>Đã nhận món thành công:</strong> Cảm ơn bạn đã lựa chọn BrewLite. Chúc bạn một ngày tràn đầy năng lượng!
                  </span>
                </p>
              )}
            </div>
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

        {typeof order.discount === 'number' && order.discount > 0 ? (
          <div className="flex justify-between items-center pt-2 text-xs text-emerald-700 font-bold">
            <span>Giảm giá ({order.voucherCode || 'Voucher'}):</span>
            <span>-{order.discount.toLocaleString('vi-VN')} đ</span>
          </div>
        ) : null}

        <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
          <span className="font-bold text-stone-900">Tổng thanh toán:</span>
          <span className="text-2xl font-black text-amber-900">
            {order.total.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Thông báo quầy / Hướng dẫn */}
      {isSuccessFlow ? (
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 border border-amber-200 text-center">
          <p className="font-bold text-amber-950 text-sm">
            ☕ Cảm ơn bạn đã sử dụng dịch vụ BrewLite!
          </p>
          <p className="text-xs text-amber-900/80 mt-1">
            Mời quý khách tới quầy nhận đồ uống khi hiển thị mã #{order.id}
          </p>
        </div>
      ) : order.status === 'CANCELLED' ? (
        <div className="mt-5 rounded-2xl bg-stone-100 p-4 border border-stone-300 text-center">
          <p className="font-bold text-stone-800 text-sm">
            🚫 Đơn hàng này đã được hủy. Nếu bạn đã thanh toán, hệ thống sẽ hoàn tiền cho bạn theo quy định.
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl bg-rose-50 p-4 border border-rose-200 text-center">
          <p className="font-bold text-rose-900 text-sm">
            ⚠️ Thanh toán không thành công
          </p>
          <p className="text-xs text-rose-700 mt-1">
            Giao dịch thanh toán chưa hoàn tất. Bạn có thể kiểm tra lại thông tin đơn hàng.
          </p>
        </div>
      )}

      {/* Nút thanh toán lại nhanh nếu thanh toán thất bại */}
      {order.status === 'PAYMENT_FAILED' && (
        <div className="mt-4">
          <button
            onClick={handleRetryPayment}
            disabled={retrying || cancelling}
            className="w-full text-center rounded-xl bg-rose-700 py-3.5 text-sm font-bold text-white shadow-md hover:bg-rose-800 transition active:scale-[0.99] disabled:opacity-50"
          >
            {retrying ? 'Đang thực hiện thanh toán lại...' : '💳 Thử thanh toán lại ngay'}
          </button>
        </div>
      )}

      {/* Nút hủy đơn nếu trạng thái cho phép */}
      {['PENDING', 'PAYMENT_FAILED', 'PAID'].includes(order.status) && (
        <div className="mt-3">
          <button
            onClick={handleCancelOrder}
            disabled={cancelling || retrying}
            className="w-full text-center rounded-xl border border-rose-300 bg-rose-50/80 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-[0.99] disabled:opacity-50"
          >
            {cancelling ? 'Đang xử lý hủy đơn...' : '✕ Hủy đơn hàng này'}
          </button>
        </div>
      )}

      {/* Nút điều hướng theo yêu cầu */}
      <div className="mt-6 flex flex-col gap-3">
        {isSuccessFlow ? (
          <>
            <Link
              href="/"
              className="w-full text-center rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99]"
            >
              ← Quay về menu chính
            </Link>
            <Link
              href="/orders"
              className="w-full text-center rounded-xl border border-stone-200 bg-white py-3.5 font-bold text-stone-800 shadow-sm hover:bg-stone-50 transition active:scale-[0.99]"
            >
              📋 Lịch sử đơn hàng
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/orders"
              className="w-full text-center rounded-xl bg-amber-900 py-3.5 font-bold text-white shadow-md hover:bg-amber-800 transition active:scale-[0.99]"
            >
              📋 Lịch sử đơn hàng
            </Link>
            <Link
              href="/"
              className="w-full text-center rounded-xl border border-stone-200 bg-white py-3.5 font-bold text-stone-800 shadow-sm hover:bg-stone-50 transition active:scale-[0.99]"
            >
              ← Quay về menu chính
            </Link>
          </>
        )}
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
