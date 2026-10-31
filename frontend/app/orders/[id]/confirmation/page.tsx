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

  if (loading) {
    return (
      <main className="mx-auto max-w-md p-8 text-center text-gray-600">
        Đang tải thông tin đơn hàng...
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <p className="text-red-600 mb-4">{error || 'Không tìm thấy đơn hàng'}</p>
        <Link href="/" className="underline text-sm text-gray-600">
          ← Về trang chủ
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-8">
      {/* Biểu tượng thành công */}
      <div className="text-center my-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl font-bold">
          ✓
        </div>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">
          Đặt hàng thành công!
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Cảm ơn quý khách đã mua sắm tại BrewLite
        </p>
      </div>

      {/* Thông tin đơn */}
      <div className="rounded-lg border p-5 bg-white shadow-sm space-y-3">
        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-gray-600 font-medium">Mã đơn hàng:</span>
          <span className="text-lg font-bold text-amber-900">#{order.id}</span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-gray-600 font-medium">Trạng thái:</span>
          <span className="inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {order.status}
          </span>
        </div>

        <div className="flex justify-between items-center pb-2 border-b">
          <span className="text-gray-600 font-medium">Thời gian:</span>
          <span className="text-sm text-gray-700">
            {new Date(order.createdAt).toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Danh sách món */}
        <div className="pt-2">
          <p className="font-semibold text-sm mb-2 text-gray-800">Món đã đặt:</p>
          <div className="space-y-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.name} ({item.size}) x{item.qty}
                  </p>
                  {item.toppings && (
                    <p className="text-xs text-gray-500">+ {item.toppings}</p>
                  )}
                </div>
                <span className="text-gray-700">
                  {item.lineTotal.toLocaleString('vi-VN')} đ
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t flex justify-between items-center text-lg font-bold">
          <span>Tổng thanh toán:</span>
          <span className="text-amber-900">
            {order.total.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Thông báo quầy */}
      <div className="mt-6 rounded-lg bg-amber-50 p-4 border border-amber-200 text-center">
        <p className="font-semibold text-amber-900 text-sm">
          ☕ Mời quý khách tới quầy nhận đồ uống khi hiển thị mã #{order.id}
        </p>
      </div>

      {/* Nút điều hướng */}
      <div className="mt-6 flex flex-col gap-3">
        <Link
          href="/orders"
          className="w-full text-center rounded border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-50"
        >
          Xem lịch sử đơn hàng
        </Link>
        <Link
          href="/"
          className="w-full text-center rounded bg-amber-900 py-3 font-medium text-white hover:bg-amber-800"
        >
          Về trang chủ / Tiếp tục đặt món
        </Link>
      </div>
    </main>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md p-8 text-center text-gray-600">
          Đang tải thông tin đơn hàng...
        </main>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
