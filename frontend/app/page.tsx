'use client';

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { useCartStore } from '@/lib/cartStore';
import { useAuthStore } from '@/lib/authStore';

type Product = {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
};

const DEFAULT_PRODUCTS: Product[] = [
  { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg' },
  { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg' },
  { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg' },
  { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg' },
];

export default function MenuPage() {
  const cartCount = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.qty, 0),
  );
  const email = useAuthStore((s) => s.email);
  const fullName = useAuthStore((s) => s.fullName);
  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayFullName = (fullName || email?.split('@')[0] || '')
    .replace(/\s*\((?:Khách hàng|Customer)\)/gi, '')
    .trim();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`)
      .then((res) => {
        if (!res.ok) throw new Error('Lỗi tải danh mục món nước');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setProducts(data);
        }
      })
      .catch((err) => {
        console.warn('Sử dụng dữ liệu menu có sẵn:', err.message);
      });
  }, []);

  return (
    <main className="mx-auto max-w-4xl p-6 sm:p-8">
      {/* Top Navigation */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
              BrewLite
            </h1>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mt-1">
            Cà phê không dùng tiền mặt • Cashless Coffee
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Nút truy cập nhanh Quầy Barista / Trang Quản lý nếu tài khoản là Staff */}
          {(role === 'BARISTA' || role === 'ADMIN') && (
            <Link
              href="/barista"
              className="flex items-center gap-1.5 rounded-full bg-amber-800 hover:bg-amber-900 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-[0.98]"
              title="Đi tới quầy pha chế KDS"
            >
              <span>☕</span>
              <span className="hidden sm:inline">
                {role === 'ADMIN' ? 'Trang Quản Lý' : 'Quầy Barista'}
              </span>
            </Link>
          )}

          {email ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-stone-800 shadow-sm hover:bg-stone-50 transition active:scale-[0.99]"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                  {role === 'ADMIN' ? '👨‍💼' : role === 'BARISTA' ? '🧑‍🍳' : '👤'}
                </span>
                <span className="text-stone-600 hidden sm:inline">
                  Xin chào,{' '}
                  <strong className="text-stone-900 font-bold">
                    {displayFullName}
                  </strong>
                </span>
                <span className="text-stone-900 font-bold sm:hidden">
                  {displayFullName}
                </span>
                {(role === 'BARISTA' || role === 'ADMIN') && (
                  <span className="rounded bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 border border-amber-300 hidden md:inline">
                    {role === 'ADMIN' ? 'Admin' : 'Barista'}
                  </span>
                )}
                <svg
                  className={`h-4 w-4 text-stone-400 transition-transform ${
                    showUserDropdown ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-stone-200 bg-white py-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-stone-100">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Tài khoản
                      </p>
                      {role && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : role === 'BARISTA'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {role === 'ADMIN' ? '👨‍💼 Quản lý' : role === 'BARISTA' ? '🧑‍🍳 Barista' : '👤 Khách hàng'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-stone-900 truncate mt-0.5">
                      {displayFullName || email}
                    </p>
                    {email && <p className="text-xs text-stone-500 truncate">{email}</p>}
                  </div>

                  <div className="py-1">
                    {(role === 'BARISTA' || role === 'ADMIN') && (
                      <Link
                        href="/barista"
                        onClick={() => setShowUserDropdown(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50 transition border-b border-stone-100 mb-1"
                      >
                        <span className="text-base">☕</span>
                        <span>Vào quầy pha chế (KDS)</span>
                      </Link>
                    )}
                    <Link
                      href="/orders"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-amber-50 hover:text-amber-900 transition"
                    >
                      <span className="text-base">📋</span>
                      <span>Đơn hàng của tôi</span>
                    </Link>
                  </div>

                  <div className="border-t border-stone-100 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <span className="text-base">🚪</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-stone-300 bg-white px-3.5 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 shadow-sm transition"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-stone-200 bg-stone-100 px-3.5 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200 shadow-sm transition"
              >
                Đăng ký
              </Link>
            </div>
          )}

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-full bg-amber-900 px-5 py-2 text-sm font-bold text-white shadow hover:bg-amber-800 transition active:scale-[0.98] whitespace-nowrap"
          >
            <span>🛒 Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Hero Banner nhỏ */}
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-900 to-stone-800 p-6 text-white shadow-md">
        <h2 className="text-xl font-bold">Thực đơn đặc biệt hôm nay</h2>
        <p className="mt-1 text-sm text-amber-100">
          Chọn món, tùy chọn size và topping yêu thích. Thanh toán chỉ trong 1 chạm!
        </p>
      </div>

      {/* Grid Danh mục món nước */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            {/* Ảnh sản phẩm */}
            <div className="relative h-44 w-full overflow-hidden bg-stone-100">
              <img
                src={p.imageUrl || '/images/ca-phe-sua.jpg'}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Thông tin món */}
            <div className="p-4 flex flex-col flex-1 justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-900 transition">
                  {p.name}
                </h3>
                <p className="text-xs text-stone-500 mt-1">Đồ uống pha chế tươi</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                <span className="text-base font-black text-amber-900">
                  {p.price.toLocaleString('vi-VN')} đ
                </span>
                <span className="shrink-0 whitespace-nowrap rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 transition-colors group-hover:bg-amber-900 group-hover:text-white">
                  Chọn size
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
