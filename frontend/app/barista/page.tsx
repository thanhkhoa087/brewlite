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

type BaristaAccount = {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  createdAt: string;
};

type SystemUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  role: 'CUSTOMER' | 'BARISTA' | 'ADMIN';
  loyaltyPoints?: number;
  createdAt: string;
};

type RawIngredient = {
  id: number;
  name: string;
  unit: string;
  stock: number;
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
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  // View state: 'KDS' (Màn hình quầy) hoặc 'MANAGE_BARISTAS' (Quản lý Barista dành cho Quản lý)
  const [activeView, setActiveView] = useState<'KDS' | 'MANAGE_BARISTAS'>('KDS');

  // KDS State
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PAID' | 'PREPARING' | 'READY'>('ALL');
  const prevCountRef = useRef<number>(0);

  // Modal Kho nguyên liệu thô (Ingredient-based Stock)
  const [showStockModal, setShowStockModal] = useState(false);
  const [rawIngredients, setRawIngredients] = useState<RawIngredient[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [editingIngredientId, setEditingIngredientId] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<number>(0);
  const [savingIngredientId, setSavingIngredientId] = useState<number | null>(null);
  const [stockMessage, setStockMessage] = useState<string | null>(null);

  // Form đăng nhập Barista
  const [loginEmail, setLoginEmail] = useState('barista@brewlite.vn');
  const [loginPassword, setLoginPassword] = useState('123456');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // State Quản lý Barista & Toàn bộ Users (Admin only)
  const [baristas, setBaristas] = useState<BaristaAccount[]>([]);
  const [loadingBaristas, setLoadingBaristas] = useState(false);
  const [allUsers, setAllUsers] = useState<SystemUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'CUSTOMER' | 'BARISTA' | 'ADMIN'>('ALL');
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [newBaristaName, setNewBaristaName] = useState('');
  const [newBaristaEmail, setNewBaristaEmail] = useState('');
  const [newBaristaPassword, setNewBaristaPassword] = useState('');
  const [newBaristaPhone, setNewBaristaPhone] = useState('');
  const [creatingBarista, setCreatingBarista] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [manageMessage, setManageMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isBaristaOrAdmin = role === 'BARISTA' || role === 'ADMIN';

  // 1. Tải danh sách đơn hàng cho Barista
  const fetchQueue = async (silent = false) => {
    if (!token || !isBaristaOrAdmin) {
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

  // 2. Tải danh sách tài khoản Barista (Quản lý)
  const fetchBaristas = async () => {
    if (!token || role !== 'ADMIN') return;
    setLoadingBaristas(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/baristas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Không thể tải danh sách Barista');
      }
      const data = await res.json();
      setBaristas(data);
    } catch (err: any) {
      setManageMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingBaristas(false);
    }
  };

  // 3. Tải khối lượng nguyên liệu thô (Ingredient-based Stock)
  const fetchRawIngredients = async () => {
    setLoadingStock(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/ingredients/stock`);
      if (res.ok) {
        const data = await res.json();
        setRawIngredients(data);
      }
    } catch (err) {
      console.warn('Lỗi tải nguyên liệu thô:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  // 4. Tải danh sách toàn bộ người dùng trong hệ thống
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users`);
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách người dùng:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (token && isBaristaOrAdmin) {
      setLastRefreshed(new Date());
      fetchQueue(false);
      fetchRawIngredients();

      const timer = setInterval(() => {
        fetchQueue(true);
      }, 3000);

      return () => clearInterval(timer);
    }
  }, [token, role]);

  useEffect(() => {
    if (token && role === 'ADMIN' && activeView === 'MANAGE_BARISTAS') {
      fetchBaristas();
      fetchAllUsers();
    }
  }, [token, role, activeView]);

  // Xử lý Đăng nhập Barista
  const handleBaristaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Sai email hoặc mật khẩu');
      }

      if (data.user?.role !== 'BARISTA' && data.user?.role !== 'ADMIN') {
        throw new Error(
          'Truy cập bị từ chối: Tài khoản này là Khách hàng. Chỉ nhân viên Barista hoặc Quản lý mới có quyền truy cập quầy!',
        );
      }

      setAuth(
        data.accessToken,
        data.user.email,
        data.user.fullName,
        data.user.phone,
        data.user.role,
      );
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Barista chuyển trạng thái đơn hàng (PAID -> PREPARING -> READY -> COMPLETED)
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

  // Barista HỦY ĐƠN HÀNG tại quầy (Hoàn trả nguyên liệu thô vào kho)
  const handleCancelByBarista = async (orderId: number) => {
    if (!token) return;
    const reason = prompt(
      `Xác nhận hủy đơn hàng #${orderId}?\nNhập lý do hủy (ví dụ: Hết nguyên liệu, Khách yêu cầu hủy, Sự cố quầy pha chế):`,
      'Hết nguyên liệu pha chế tại quầy',
    );
    if (reason === null) return; // Người dùng ấn Cancel trên hộp thoại

    setCancellingId(orderId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason.trim() || 'Barista hủy tại quầy' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Hủy đơn hàng thất bại');

      // Gỡ đơn khỏi hàng đợi KDS
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      alert(`✓ Đã hủy đơn hàng #${orderId} thành công!\nToàn bộ khối lượng nguyên liệu thô đã được hoàn trả lại vào kho.`);
      fetchRawIngredients();
    } catch (err: any) {
      alert(`[Lỗi hủy đơn]: ${err.message}`);
    } finally {
      setCancellingId(null);
    }
  };

  // Quản lý tạo Barista mới
  const handleCreateBarista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBaristaName.trim() || !newBaristaEmail.trim() || !newBaristaPassword) {
      setManageMessage({ type: 'error', text: 'Vui lòng điền đầy đủ họ tên, email và mật khẩu' });
      return;
    }
    setCreatingBarista(true);
    setManageMessage(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/baristas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newBaristaName.trim(),
          email: newBaristaEmail.trim(),
          password: newBaristaPassword,
          phone: newBaristaPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Tạo tài khoản Barista thất bại');

      setManageMessage({
        type: 'success',
        text: `Đã tạo tài khoản nhân viên Barista cho ${data.fullName} (${data.email}) thành công!`,
      });
      setNewBaristaName('');
      setNewBaristaEmail('');
      setNewBaristaPassword('');
      setNewBaristaPhone('');
      fetchBaristas();
    } catch (err: any) {
      setManageMessage({ type: 'error', text: err.message });
    } finally {
      setCreatingBarista(false);
    }
  };

  // Quản lý xóa tài khoản Barista
  const handleDeleteBarista = async (baristaId: number, baristaName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản Barista của "${baristaName}" không?`)) {
      return;
    }
    setDeletingId(baristaId);
    setManageMessage(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/baristas/${baristaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xóa tài khoản Barista thất bại');

      setManageMessage({
        type: 'success',
        text: `Đã xóa tài khoản Barista #${baristaId} (${baristaName}) thành công!`,
      });
      fetchBaristas();
    } catch (err: any) {
      setManageMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Quản lý xóa người dùng bất kỳ (Customer, Barista)
  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (userEmail === email) {
      alert('Không thể tự xóa tài khoản quản trị viên đang đăng nhập!');
      return;
    }
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userEmail}" (#${userId}) không?\nCác đơn hàng liên quan của tài khoản này sẽ được dọn dẹp sạch sẽ.`)) {
      return;
    }
    setDeletingUserId(userId);
    setManageMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Xóa tài khoản thất bại');
      setManageMessage({ type: 'success', text: data.message || `Đã xóa tài khoản #${userId} thành công!` });
      fetchAllUsers();
      fetchBaristas();
    } catch (err: any) {
      setManageMessage({ type: 'error', text: err.message });
    } finally {
      setDeletingUserId(null);
    }
  };

  // Khôi phục tài khoản mẫu (Reset users về 3 tài khoản ban đầu)
  const handleResetUsers = async () => {
    if (!confirm('Bạn có chắc chắn muốn đặt lại (Reset) danh sách người dùng về 3 tài khoản mặc định (user@brewlite.vn, barista@brewlite.vn, admin@brewlite.vn với mật khẩu 123456)?')) {
      return;
    }
    setLoadingUsers(true);
    setManageMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/users/reset`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể khôi phục tài khoản mặc định');
      setManageMessage({ type: 'success', text: data.message || 'Đã khôi phục 3 tài khoản mặc định thành công!' });
      fetchAllUsers();
      fetchBaristas();
    } catch (err: any) {
      setManageMessage({ type: 'error', text: err.message });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Cập nhật tồn kho nguyên liệu thô (g hoặc ml)
  const handleUpdateStock = async (ingredientId: number, newStock: number) => {
    if (newStock < 0) {
      setStockMessage('Khối lượng không thể là số âm');
      return;
    }
    setSavingIngredientId(ingredientId);
    setStockMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/ingredients/${ingredientId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Number(newStock) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể cập nhật tồn kho');
      setStockMessage(data.message || 'Cập nhật tồn kho thành công!');
      setEditingIngredientId(null);
      fetchRawIngredients();
    } catch (err: any) {
      setStockMessage(`Lỗi: ${err.message}`);
    } finally {
      setSavingIngredientId(null);
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

  // ==========================================
  // TRƯỜNG HỢP 1: CHƯA ĐĂNG NHẬP
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-950 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-600 text-3xl shadow-lg">
              ☕
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              BrewLite KDS
            </h1>
            <p className="mt-1 text-xs text-stone-400">
              Đăng nhập quầy pha chế Barista & Quản lý
            </p>
          </div>

          <form onSubmit={handleBaristaLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                Tài khoản Email Barista
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="barista@brewlite.vn"
                className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {loginError && (
              <div className="rounded-xl bg-rose-950/80 border border-rose-800 p-3 text-xs font-medium text-rose-300">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-xl bg-amber-600 py-3 font-bold text-white shadow-lg hover:bg-amber-500 transition active:scale-[0.99] disabled:opacity-50"
            >
              {loginLoading ? 'Đang xác thực...' : 'Đăng nhập vào Quầy Barista'}
            </button>
          </form>

          {/* Gợi ý tài khoản mẫu */}
          <div className="mt-6 border-t border-stone-800 pt-4 text-xs text-stone-400 space-y-2">
            <p className="font-bold text-stone-300">Tài khoản mẫu có sẵn:</p>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('barista@brewlite.vn');
                  setLoginPassword('123456');
                }}
                className="text-left rounded-lg bg-stone-900 p-2 border border-stone-800 hover:border-amber-600/50 transition"
              >
                <span className="font-bold text-amber-400">🧑‍🍳 Barista:</span>{' '}
                <span className="text-stone-300">barista@brewlite.vn</span> | MK: 123456
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginEmail('admin@brewlite.vn');
                  setLoginPassword('123456');
                }}
                className="text-left rounded-lg bg-stone-900 p-2 border border-stone-800 hover:border-amber-600/50 transition"
              >
                <span className="font-bold text-amber-400">👨‍💼 Quản lý (Admin):</span>{' '}
                <span className="text-stone-300">admin@brewlite.vn</span> | MK: 123456
              </button>
            </div>
            <div className="text-center pt-2">
              <Link href="/" className="text-stone-400 hover:text-white underline">
                ← Quay lại trang menu khách hàng
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP NHƯNG LÀ KHÁCH HÀNG (CUSTOMER)
  // ==========================================
  if (!isBaristaOrAdmin) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-900/60 bg-stone-950 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-950/80 text-4xl border border-rose-800">
            ⛔
          </div>
          <h1 className="text-xl font-black text-white">
            Truy Cập Bị Từ Chối
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-rose-400">
            Khu vực dành riêng cho Barista & Quản lý
          </p>
          <div className="mt-4 rounded-xl bg-stone-900 p-4 border border-stone-800 text-xs text-stone-300 leading-relaxed text-left">
            <p>
              Tài khoản hiện tại: <strong className="text-white">{email}</strong>
            </p>
            <p className="mt-1">
              Vai trò: <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">Khách hàng (CUSTOMER)</span>
            </p>
            <p className="mt-2 text-stone-400">
              Bạn không có quyền truy cập vào màn hình điều phối quầy pha chế. Vui lòng đăng nhập bằng tài khoản Barista của quán hoặc quay lại trang đặt món.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={logout}
              className="w-full rounded-xl bg-amber-600 py-3 font-bold text-white shadow hover:bg-amber-500 transition"
            >
              Đăng nhập bằng tài khoản Barista
            </button>
            <Link
              href="/"
              className="w-full rounded-xl border border-stone-700 bg-stone-900 py-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition"
            >
              ← Quay lại trang Menu đồ uống
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TRƯỜNG HỢP 3: ĐÃ ĐĂNG NHẬP VỚI ROLE LÀ BARISTA HOẶC ADMIN
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans">
      {/* Header Bar */}
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
                {role === 'ADMIN' ? '👨‍💼 Quản Lý Cửa Hàng' : '🧑‍🍳 Quầy Barista'}
              </span>
            </div>
            <p className="text-xs text-stone-400">
              Màn hình điều phối quầy pha chế • Quản lý tồn kho theo nguyên liệu
            </p>
          </div>
        </div>

        {/* Nút Kho nguyên liệu thô, Quản lý Barista và User Info */}
        <div className="flex items-center gap-3">
          {/* Nút xem kho nguyên liệu thô */}
          <button
            onClick={() => {
              fetchRawIngredients();
              setShowStockModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-stone-800 hover:border-amber-500/50 transition"
          >
            <span>📦</span>
            <span>Kho nguyên liệu thô</span>
          </button>

          {/* Tab chuyển đổi dành cho Quản lý */}
          {role === 'ADMIN' && (
            <div className="flex rounded-xl bg-stone-900 p-1 border border-stone-800 text-xs">
              <button
                onClick={() => setActiveView('KDS')}
                className={`px-3 py-1.5 font-bold rounded-lg transition ${
                  activeView === 'KDS'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                ☕ KDS
              </button>
              <button
                onClick={() => {
                  setActiveView('MANAGE_BARISTAS');
                  fetchBaristas();
                  fetchAllUsers();
                }}
                className={`px-3 py-1.5 font-bold rounded-lg transition ${
                  activeView === 'MANAGE_BARISTAS'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                👥 Quản lý Users
              </button>
            </div>
          )}

          {/* User info & Logout */}
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline text-stone-400">
              {fullName || email}
            </span>
            <button
              onClick={logout}
              className="rounded-lg bg-stone-800 hover:bg-rose-900/60 hover:text-rose-200 border border-stone-700 px-3 py-1.5 font-semibold text-stone-300 transition"
              title="Đăng xuất"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* MODAL XEM KHO NGUYÊN LIỆU THÔ (INGREDIENT-BASED STOCK) */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-stone-800 bg-stone-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📦</span>
                <div>
                  <h3 className="text-base font-black text-white">
                    Kho Nguyên Liệu Thô (Ingredient-based Stock)
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Định lượng thực tế theo gram/ml để tính số ly phục vụ tối đa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStockModal(false)}
                className="rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 p-1.5 text-xs font-bold"
              >
                ✕ Đóng
              </button>
            </div>

            {loadingStock ? (
              <div className="py-12 text-center text-xs text-stone-400 animate-pulse">
                Đang tải dữ liệu tồn kho nguyên liệu...
              </div>
            ) : (
              <div className="space-y-4">
                {stockMessage && (
                  <div className="rounded-xl bg-amber-950/80 border border-amber-800 p-2.5 text-xs text-amber-300 font-semibold flex items-center justify-between">
                    <span>✨ {stockMessage}</span>
                    <button
                      onClick={() => setStockMessage(null)}
                      className="text-stone-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400">
                        <th className="py-2 px-3">Tên nguyên liệu</th>
                        <th className="py-2 px-3">Đơn vị</th>
                        <th className="py-2 px-3 text-right">Khối lượng tồn & Chỉnh sửa</th>
                        <th className="py-2 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {rawIngredients.map((ing) => (
                        <tr key={ing.id} className="hover:bg-stone-900/50">
                          <td className="py-2.5 px-3 font-bold text-white">
                            {ing.name}
                          </td>
                          <td className="py-2.5 px-3 text-stone-400 font-mono">
                            {ing.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {editingIngredientId === ing.id ? (
                              <div className="flex items-center gap-1.5 justify-end">
                                <input
                                  type="number"
                                  value={editingStockValue}
                                  onChange={(e) => setEditingStockValue(Number(e.target.value))}
                                  className="w-24 rounded-lg bg-stone-900 border border-amber-500 px-2 py-1 text-right text-xs font-bold text-amber-300 focus:outline-none"
                                  min="0"
                                  step="50"
                                  autoFocus
                                />
                                <span className="text-stone-400 font-mono text-[11px]">{ing.unit}</span>
                                <button
                                  onClick={() => handleUpdateStock(ing.id, editingStockValue)}
                                  disabled={savingIngredientId === ing.id}
                                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow disabled:opacity-50"
                                >
                                  {savingIngredientId === ing.id ? '...' : 'Lưu'}
                                </button>
                                <button
                                  onClick={() => setEditingIngredientId(null)}
                                  className="rounded-lg bg-stone-800 hover:bg-stone-700 px-2 py-1 text-[11px] font-bold text-stone-300"
                                >
                                  Hủy
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 justify-end">
                                <span className="font-black text-amber-400 text-sm">
                                  {ing.stock.toLocaleString('vi-VN')} {ing.unit}
                                </span>
                                <button
                                  onClick={() => {
                                    setEditingIngredientId(ing.id);
                                    setEditingStockValue(ing.stock);
                                    setStockMessage(null);
                                  }}
                                  className="rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 px-2 py-1 text-[11px] font-semibold text-stone-200 transition"
                                  title="Chỉnh sửa trực tiếp số lượng"
                                >
                                  ✏️ Sửa
                                </button>
                                <button
                                  onClick={() => handleUpdateStock(ing.id, ing.stock + 1000)}
                                  disabled={savingIngredientId === ing.id}
                                  className="rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800/60 px-1.5 py-1 text-[10px] font-bold text-amber-300 transition"
                                  title="Nhập thêm 1000"
                                >
                                  +1k
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {ing.stock > 500 ? (
                              <span className="rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                                Dồi dào
                              </span>
                            ) : ing.stock > 0 ? (
                              <span className="rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold px-2 py-0.5">
                                Sắp hết
                              </span>
                            ) : (
                              <span className="rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[10px] font-bold px-2 py-0.5">
                                Hết hàng
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl bg-stone-900 p-3.5 border border-stone-800 text-[11px] text-stone-400 leading-relaxed">
                  <p className="font-bold text-amber-400 mb-1">
                    ☕ Công thức định lượng quy đổi hệ thống:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>1 ly Cà phê sữa = 15g Cà phê + 25g Sữa đặc</li>
                    <li>1 ly Americano = 18g Cà phê</li>
                    <li>1 ly Cappuccino = 18g Cà phê + 30g Sữa</li>
                    <li>1 ly Trà đào = 25g Cốt trà + 35g Đào miếng</li>
                    <li>Topping: Trân châu (30g/phần), Kem béo (25g/phần)</li>
                  </ul>
                  <p className="mt-1 text-stone-500 italic">
                    * Khi Barista hủy đơn, toàn bộ khối lượng nguyên liệu thô sẽ tự động được hoàn trả lại vào kho.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: QUẢN LÝ TÀI KHOẢN BARISTA (CHỈ DÀNH CHO ADMIN) */}
      {role === 'ADMIN' && activeView === 'MANAGE_BARISTAS' ? (
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-stone-800 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white">
                Quản Lý Nhân Viên Barista
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Quản lý cửa hàng có quyền tạo mới hoặc xóa tài khoản nhân viên pha chế Barista
              </p>
            </div>
            <button
              onClick={() => setActiveView('KDS')}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-stone-800 text-stone-200 hover:bg-stone-700 transition"
            >
              ← Quay lại màn hình pha chế KDS
            </button>
          </div>

          {/* Thông báo kết quả thao tác */}
          {manageMessage && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs font-semibold border ${
                manageMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-800 text-rose-300'
              }`}
            >
              {manageMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form tạo Barista mới */}
            <div className="rounded-2xl border border-stone-800 bg-stone-950 p-6 shadow-xl h-fit">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <span>➕</span> Thêm Barista Mới
              </h3>
              <form onSubmit={handleCreateBarista} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-stone-300 mb-1">
                    Họ và tên nhân viên <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Trần Văn Bình"
                    value={newBaristaName}
                    onChange={(e) => setNewBaristaName(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">
                    Email đăng nhập <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="binh.barista@brewlite.vn"
                    value={newBaristaEmail}
                    onChange={(e) => setNewBaristaEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">
                    Mật khẩu khởi tạo <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={newBaristaPassword}
                    onChange={(e) => setNewBaristaPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    placeholder="0909xxxxxx"
                    value={newBaristaPhone}
                    onChange={(e) => setNewBaristaPhone(e.target.value)}
                    className="w-full rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-white placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingBarista}
                  className="w-full mt-2 rounded-xl bg-amber-600 hover:bg-amber-500 py-3 font-bold text-white shadow transition active:scale-[0.99] disabled:opacity-50"
                >
                  {creatingBarista ? 'Đang tạo...' : 'Tạo Tài Khoản Barista'}
                </button>
              </form>
            </div>

            {/* Danh sách Barista hiện tại */}
            <div className="lg:col-span-2 rounded-2xl border border-stone-800 bg-stone-950 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🧑‍🍳</span> Danh Sách Barista Quầy ({baristas.length})
                </h3>
                <button
                  onClick={fetchBaristas}
                  disabled={loadingBaristas}
                  className="text-xs text-stone-400 hover:text-white underline"
                >
                  {loadingBaristas ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>

              {loadingBaristas && baristas.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  Đang tải danh sách nhân viên...
                </div>
              ) : baristas.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  Chưa có nhân viên Barista nào trong hệ thống.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-400">
                        <th className="py-2.5 px-3">Họ và tên</th>
                        <th className="py-2.5 px-3">Email</th>
                        <th className="py-2.5 px-3">Số điện thoại</th>
                        <th className="py-2.5 px-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {baristas.map((b) => (
                        <tr key={b.id} className="hover:bg-stone-900/60 transition">
                          <td className="py-3 px-3 font-bold text-white">
                            {b.fullName}
                          </td>
                          <td className="py-3 px-3 text-stone-300 font-mono">
                            {b.email}
                          </td>
                          <td className="py-3 px-3 text-stone-400">
                            {b.phone || '--'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteBarista(b.id, b.fullName)}
                              disabled={deletingId === b.id}
                              className="rounded-lg bg-rose-950/80 border border-rose-800 hover:bg-rose-900 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition active:scale-[0.98] disabled:opacity-50"
                            >
                              {deletingId === b.id ? 'Đang xóa...' : '🗑️ Xóa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* PHẦN 2: QUẢN LÝ TOÀN BỘ TÀI KHOẢN NGƯỜI DÙNG (ALL USERS) */}
          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-950 p-6 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-stone-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>👥</span> Toàn Bộ Tài Khoản Người Dùng ({allUsers.length})
                </h3>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Xem danh sách khách hàng, barista, quản trị viên và xóa tài khoản không cần thiết
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAllUsers}
                  disabled={loadingUsers}
                  className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition"
                >
                  {loadingUsers ? 'Đang tải...' : '🔄 Làm mới'}
                </button>
                <button
                  onClick={handleResetUsers}
                  disabled={loadingUsers}
                  className="rounded-xl bg-rose-950/80 border border-rose-800 hover:bg-rose-900 px-3 py-1.5 text-xs font-bold text-rose-300 transition active:scale-[0.98]"
                  title="Đặt lại hệ thống về 3 tài khoản mẫu"
                >
                  ⚠️ Reset 3 tài khoản mặc định
                </button>
              </div>
            </div>

            {/* Filter Role */}
            <div className="flex items-center gap-2 mb-4 text-xs">
              <span className="font-semibold text-stone-400">Lọc vai trò:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setUserRoleFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    userRoleFilter === 'ALL'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Tất cả ({allUsers.length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('CUSTOMER')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    userRoleFilter === 'CUSTOMER'
                      ? 'bg-cyan-700 text-white shadow-sm'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Khách hàng ({allUsers.filter((u) => u.role === 'CUSTOMER').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('BARISTA')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    userRoleFilter === 'BARISTA'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Barista ({allUsers.filter((u) => u.role === 'BARISTA').length})
                </button>
                <button
                  onClick={() => setUserRoleFilter('ADMIN')}
                  className={`px-3 py-1 rounded-lg font-bold transition ${
                    userRoleFilter === 'ADMIN'
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Quản lý ({allUsers.filter((u) => u.role === 'ADMIN').length})
                </button>
              </div>
            </div>

            {/* Users Table */}
            {loadingUsers && allUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">
                Đang tải danh sách tài khoản...
              </div>
            ) : allUsers.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">
                Không tìm thấy tài khoản người dùng nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400">
                      <th className="py-2.5 px-3">ID</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Số điện thoại</th>
                      <th className="py-2.5 px-3">Vai trò</th>
                      <th className="py-2.5 px-3 text-right">Điểm tích lũy</th>
                      <th className="py-2.5 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {allUsers
                      .filter((u) => userRoleFilter === 'ALL' || u.role === userRoleFilter)
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-stone-900/60 transition">
                          <td className="py-3 px-3 font-mono font-bold text-amber-400">
                            #{u.id}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            {u.fullName || '--'}
                          </td>
                          <td className="py-3 px-3 text-stone-300 font-mono">
                            {u.email}
                            {u.email === email && (
                              <span className="ml-1.5 text-[10px] text-amber-400 font-bold">(Bạn)</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-stone-400 font-mono">
                            {u.phone || '--'}
                          </td>
                          <td className="py-3 px-3">
                            {u.role === 'ADMIN' ? (
                              <span className="rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold px-2 py-0.5 text-[10px]">
                                👑 ADMIN
                              </span>
                            ) : u.role === 'BARISTA' ? (
                              <span className="rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold px-2 py-0.5 text-[10px]">
                                🧑‍🍳 BARISTA
                              </span>
                            ) : (
                              <span className="rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold px-2 py-0.5 text-[10px]">
                                👤 CUSTOMER
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-amber-300">
                            {u.loyaltyPoints ?? 0} pts
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              disabled={deletingUserId === u.id || u.email === email}
                              className="rounded-lg bg-rose-950/80 border border-rose-800 hover:bg-rose-900 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                              title={u.email === email ? 'Không thể tự xóa tài khoản của bạn' : 'Xóa tài khoản này'}
                            >
                              {deletingUserId === u.id ? 'Đang xóa...' : '🗑️ Xóa'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      ) : (
        /* VIEW 2: MÀN HÌNH ĐIỀU PHỐI KDS (BARISTA & ADMIN) */
        <>
          {/* Filter Bar */}
          <div className="bg-stone-950/60 border-b border-stone-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                Bộ lọc:
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

            <div className="flex items-center gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-2 bg-stone-900 px-3 py-1.5 rounded-lg border border-stone-800">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Tự động cập nhật (3s)</span>
                <span>•</span>
                <span>{lastRefreshed ? lastRefreshed.toLocaleTimeString('vi-VN') : '--:--'}</span>
              </div>
            </div>
          </div>

          {/* Kanban Board */}
          <main className="flex-1 p-6">
            {loading && orders.length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Cột 1: PAID (Chờ pha chế) */}
                {(activeFilter === 'ALL' || activeFilter === 'PAID') && (
                  <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-4 flex flex-col min-h-[500px]">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-amber-500"></span>
                        <h2 className="font-bold text-white text-base">
                          1. Chờ Pha Chế (PAID)
                        </h2>
                      </div>
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-extrabold text-amber-400">
                        {paidOrders.length}
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
                                      <span className="text-amber-300">({it.size})</span>
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

                            {/* Nút hành động Barista: Tiếp nhận pha chế VÀ Hủy đơn */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                                disabled={updatingId === order.id || cancellingId === order.id}
                                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                              >
                                {updatingId === order.id ? 'Đang cập nhật...' : '☕ Tiếp nhận pha chế'}
                              </button>
                              <button
                                onClick={() => handleCancelByBarista(order.id)}
                                disabled={cancellingId === order.id || updatingId === order.id}
                                className="rounded-lg bg-rose-950/80 border border-rose-800 hover:bg-rose-900 px-3 py-2.5 text-xs font-bold text-rose-300 transition active:scale-[0.98] disabled:opacity-50"
                                title="Hủy đơn hàng và hoàn nguyên liệu"
                              >
                                {cancellingId === order.id ? '...' : '❌ Hủy đơn'}
                              </button>
                            </div>
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
                          2. Đang Pha Chế (PREPARING)
                        </h2>
                      </div>
                      <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-extrabold text-blue-400">
                        {preparingOrders.length}
                      </span>
                    </div>

                    <div className="space-y-4 flex-1">
                      {preparingOrders.length === 0 ? (
                        <div className="py-12 text-center text-xs text-stone-500 italic">
                          Không có món đang pha
                        </div>
                      ) : (
                        preparingOrders.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-xl border border-blue-500/30 bg-stone-900 p-4 shadow transition hover:border-blue-500/60"
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
                              <span className="rounded bg-blue-950/80 border border-blue-800/60 text-blue-300 text-[10px] font-bold px-2 py-0.5 uppercase">
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

                            {/* Nút hành động Barista: Pha xong VÀ Hủy đơn */}
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'READY')}
                                disabled={updatingId === order.id || cancellingId === order.id}
                                className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
                              >
                                {updatingId === order.id ? 'Đang cập nhật...' : '🔔 Pha xong • Báo khách'}
                              </button>
                              <button
                                onClick={() => handleCancelByBarista(order.id)}
                                disabled={cancellingId === order.id || updatingId === order.id}
                                className="rounded-lg bg-rose-950/80 border border-rose-800 hover:bg-rose-900 px-3 py-2.5 text-xs font-bold text-rose-300 transition active:scale-[0.98] disabled:opacity-50"
                                title="Hủy đơn hàng (Sự cố quầy / Hết nguyên liệu)"
                              >
                                {cancellingId === order.id ? '...' : '❌ Hủy'}
                              </button>
                            </div>
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
                          3. Sẵn Sàng Giao (READY)
                        </h2>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-400">
                        {readyOrders.length}
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
        </>
      )}
    </div>
  );
}
