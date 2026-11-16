'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';

type OrderItem = {
  id: number;
  name: string;
  size: string;
  toppings: string;
  qty: number;
  lineTotal: number;
};

type ActiveOrder = {
  id: number;
  status: 'PAID' | 'PREPARING' | 'READY';
  total: number;
  discount?: number;
  createdAt: string;
  items: OrderItem[];
  user?: { email: string };
};

// Hàm phát chuông thông báo đơn mới bằng Web Audio API
function playDingSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Không hỗ trợ âm thanh
  }
}

export default function BaristaKdsPage() {
  const token = useAuthStore((s) => s.token);
  const email = useAuthStore((s) => s.email);

  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PAID' | 'PREPARING' | 'READY'>('ALL');
  const prevCountRef = useRef<number>(0);

  const fetchQueue = async (silent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/barista/queue`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không thể tải hàng đợi pha chế');
      }

      const data: ActiveOrder[] = await res.json();

      // Phát âm thanh nếu có đơn hàng mới xuất hiện
      if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
        playDingSound();
      }
      prevCountRef.current = data.length;

      setOrders(data);
      setError('');
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setLastRefreshed(new Date());
    fetchQueue(false);

    // KDS Auto-poll: Cập nhật liên tục mỗi 3 giây
    const timer = setInterval(() => {
      fetchQueue(true);
    }, 3000);

    return () => clearInterval(timer);
  }, [token]);

  // Barista chuyển đổi trạng thái đơn hàng (PAID -> PREPARING -> READY -> COMPLETED)
  const handleUpdateStatus = async (orderId: number, nextStatus: string) => {
    if (!token) return;
    setUpdatingId(orderId);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
      }

      // Cập nhật giao diện tức thì (Optimistic)
      if (nextStatus === 'COMPLETED') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus as any } : o)),
        );
      }
    } catch (err: any) {
      alert(`[KDS Lỗi]: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const paidOrders = orders.filter((o) => o.status === 'PAID');
  const preparingOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const filteredOrders =
    activeFilter === 'ALL'
      ? orders
      : activeFilter === 'PAID'
        ? paidOrders
        : activeFilter === 'PREPARING'
          ? preparingOrders
          : readyOrders;

  const formatElapsed = (dateStr: string) => {
    const diffSec = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s trước`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin} phút trước`;
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans">
      {/* KDS Header Bar */}
      <header className="bg-stone-950 border-b border-stone-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white font-black text-xl shadow">
            ☕
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                BrewLite KDS
              </h1>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400 border border-amber-500/30">
                Kitchen Display System
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Màn hình điều phối quầy pha chế • Chuẩn nghiệp vụ F&B
            </p>
          </div>
        </div>

        {/* Status Pills & Auto-Refresh Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-lg border border-stone-800 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-stone-300 font-medium">Trực tiếp (3s)</span>
            <span className="text-stone-500">|</span>
            <span className="text-stone-400">
              {lastRefreshed ? lastRefreshed.toLocaleTimeString('vi-VN') : '--:--:--'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition"
            >
              ← Về Menu
            </Link>
            <Link
              href="/orders"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white transition"
            >
              Lịch sử đơn
            </Link>
          </div>
        </div>
      </header>

      {/* Control Banner & Column Filter Tabs */}
      <div className="bg-stone-950/60 border-b border-stone-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
            Bộ lọc hàng đợi:
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeFilter === 'ALL'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              Tất cả ({orders.length})
            </button>
            <button
              onClick={() => setActiveFilter('PAID')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeFilter === 'PAID'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              ⏳ Chờ pha ({paidOrders.length})
            </button>
            <button
              onClick={() => setActiveFilter('PREPARING')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeFilter === 'PREPARING'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              ☕ Đang pha ({preparingOrders.length})
            </button>
            <button
              onClick={() => setActiveFilter('READY')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                activeFilter === 'READY'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
              }`}
            >
              🔔 Chờ lấy ({readyOrders.length})
            </button>
          </div>
        </div>

        <div className="text-xs text-stone-400">
          Tài khoản Barista: <strong className="text-stone-200">{email || 'Chưa đăng nhập'}</strong>
        </div>
      </div>

      {/* Main KDS Board Content */}
      <main className="flex-1 p-6">
        {!token ? (
          <div className="mx-auto max-w-md rounded-2xl border border-stone-800 bg-stone-950 p-8 text-center my-12 shadow-xl">
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-bold text-white mb-2">
              Yêu cầu đăng nhập tài khoản Barista
            </h2>
            <p className="text-sm text-stone-400 mb-6">
              Vui lòng đăng nhập để truy cập hệ thống hiển thị và điều phối đơn hàng pha chế (KDS).
            </p>
            <Link
              href="/login"
              className="inline-block w-full rounded-xl bg-amber-600 py-3 font-bold text-white shadow hover:bg-amber-500 transition"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : loading && orders.length === 0 ? (
          <div className="text-center py-20 text-stone-500">
            <p className="text-base font-semibold animate-pulse">
              ☕ Đang kết nối và tải hàng đợi pha chế...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="mx-auto max-w-lg rounded-2xl border border-stone-800/80 bg-stone-950/70 p-12 text-center my-12 shadow-lg">
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Hiện không có đơn hàng nào trong hàng đợi
            </h2>
            <p className="text-sm text-stone-400 mb-6">
              Tất cả các món đã được giao hoàn tất hoặc đang chờ khách thanh toán.
            </p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-amber-500 transition"
            >
              + Đặt đơn mẫu mới để kiểm tra luồng KDS
            </Link>
          </div>
        ) : (
          /* Kanban Board 3 Cột: PAID -> PREPARING -> READY */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Cột 1: PAID (Chờ pha chế) */}
            {(activeFilter === 'ALL' || activeFilter === 'PAID') && (
              <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                    <h2 className="font-bold text-white text-base">
                      1. Chờ pha chế (PAID)
                    </h2>
                  </div>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-400 border border-amber-500/30">
                    {paidOrders.length} đơn
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  {paidOrders.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 italic">
                      Không có đơn chờ pha chế
                    </div>
                  ) : (
                    paidOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-amber-500/30 bg-stone-900 p-4 shadow transition hover:border-amber-500/60"
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <div>
                            <span className="text-xl font-black text-amber-400">
                              #{order.id}
                            </span>
                            <span className="ml-2 text-[11px] font-semibold text-stone-400">
                              {formatElapsed(order.createdAt)}
                            </span>
                          </div>
                          <span className="rounded bg-amber-950/80 border border-amber-800/60 text-amber-300 text-[10px] font-bold px-2 py-0.5 uppercase">
                            Đã thanh toán
                          </span>
                        </div>

                        {/* Danh sách món nước */}
                        <div className="space-y-2 mb-3 border-y border-stone-800 py-2.5">
                          {order.items.map((it) => (
                            <div key={it.id} className="text-sm">
                              <div className="flex justify-between font-bold text-white">
                                <span>
                                  {it.name}{' '}
                                  <span className="text-amber-400">({it.size})</span>
                                </span>
                                <span className="text-amber-300">x{it.qty}</span>
                              </div>
                              {it.toppings && (
                                <p className="text-xs text-stone-400 pl-2 border-l border-amber-500/40 mt-0.5">
                                  + Topping: {it.toppings}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Nút hành động Barista */}
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          disabled={updatingId === order.id}
                          className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                        >
                          {updatingId === order.id ? 'Đang chuyển...' : '☕ Bắt đầu pha chế (PREPARING)'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn hủy đơn #${order.id} (khách yêu cầu hủy)?`)) {
                              handleUpdateStatus(order.id, 'CANCELLED');
                            }
                          }}
                          disabled={updatingId === order.id}
                          className="mt-2 w-full text-center text-[11px] font-semibold text-rose-400/80 hover:text-rose-300 py-0.5 transition"
                        >
                          ✕ Hủy đơn này
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Cột 2: PREPARING (Đang pha chế) */}
            {(activeFilter === 'ALL' || activeFilter === 'PREPARING') && (
              <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse"></span>
                    <h2 className="font-bold text-white text-base">
                      2. Đang pha chế (PREPARING)
                    </h2>
                  </div>
                  <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-black text-blue-400 border border-blue-500/30">
                    {preparingOrders.length} đơn
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  {preparingOrders.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 italic">
                      Chưa có đơn đang thực hiện
                    </div>
                  ) : (
                    preparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-blue-500/40 bg-stone-900 p-4 shadow-lg ring-1 ring-blue-500/20"
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <div>
                            <span className="text-xl font-black text-blue-400">
                              #{order.id}
                            </span>
                            <span className="ml-2 text-[11px] font-semibold text-stone-400">
                              {formatElapsed(order.createdAt)}
                            </span>
                          </div>
                          <span className="rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 uppercase animate-pulse">
                            Đang pha
                          </span>
                        </div>

                        {/* Danh sách món nước */}
                        <div className="space-y-2 mb-3 border-y border-stone-800 py-2.5">
                          {order.items.map((it) => (
                            <div key={it.id} className="text-sm">
                              <div className="flex justify-between font-bold text-white">
                                <span>
                                  {it.name}{' '}
                                  <span className="text-blue-300">({it.size})</span>
                                </span>
                                <span className="text-blue-300">x{it.qty}</span>
                              </div>
                              {it.toppings && (
                                <p className="text-xs text-stone-400 pl-2 border-l border-blue-500/40 mt-0.5">
                                  + Topping: {it.toppings}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Nút hành động Barista */}
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'READY')}
                          disabled={updatingId === order.id}
                          className="w-full rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                        >
                          {updatingId === order.id ? 'Đang chuyển...' : '🔔 Pha xong → Gọi khách (READY)'}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn hủy đơn #${order.id} (hết nguyên liệu/sự cố)?`)) {
                              handleUpdateStatus(order.id, 'CANCELLED');
                            }
                          }}
                          disabled={updatingId === order.id}
                          className="mt-2 w-full text-center text-[11px] font-semibold text-rose-400/80 hover:text-rose-300 py-0.5 transition"
                        >
                          ✕ Hủy đơn (Hết nguyên liệu / Sự cố)
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Cột 3: READY (Chờ khách nhận món) */}
            {(activeFilter === 'ALL' || activeFilter === 'READY') && (
              <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4 flex flex-col min-h-[500px]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                    <h2 className="font-bold text-white text-base">
                      3. Chờ nhận món (READY)
                    </h2>
                  </div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-400 border border-emerald-500/30">
                    {readyOrders.length} đơn
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  {readyOrders.length === 0 ? (
                    <div className="py-12 text-center text-xs text-stone-500 italic">
                      Không có món đang chờ lấy
                    </div>
                  ) : (
                    readyOrders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-emerald-500/30 bg-stone-900 p-4 shadow transition hover:border-emerald-500/60"
                      >
                        <div className="flex justify-between items-start mb-2.5">
                          <div>
                            <span className="text-xl font-black text-emerald-400">
                              #{order.id}
                            </span>
                            <span className="ml-2 text-[11px] font-semibold text-stone-400">
                              {formatElapsed(order.createdAt)}
                            </span>
                          </div>
                          <span className="rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold px-2 py-0.5 uppercase">
                            Chờ giao
                          </span>
                        </div>

                        {/* Danh sách món nước */}
                        <div className="space-y-2 mb-3 border-y border-stone-800 py-2.5">
                          {order.items.map((it) => (
                            <div key={it.id} className="text-sm">
                              <div className="flex justify-between font-bold text-white">
                                <span>
                                  {it.name}{' '}
                                  <span className="text-emerald-300">({it.size})</span>
                                </span>
                                <span className="text-emerald-300">x{it.qty}</span>
                              </div>
                              {it.toppings && (
                                <p className="text-xs text-stone-400 pl-2 border-l border-emerald-500/40 mt-0.5">
                                  + Topping: {it.toppings}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Nút hành động Barista */}
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                          disabled={updatingId === order.id}
                          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                        >
                          {updatingId === order.id ? 'Đang cập nhật...' : '✅ Đã giao cho khách (COMPLETED)'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
