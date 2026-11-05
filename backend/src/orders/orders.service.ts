import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MOCK_PRODUCTS } from '../products/products.service';
import { assertTransition } from './order-state';
import { CreateOrderDto } from './orders.dto';
import { applyVoucher } from './vouchers';

const SIZE_EXTRA: Record<string, number> = { S: 0, M: 5000, L: 10000 };
const TOPPING_PRICE: Record<string, number> = { 'Trân châu': 5000, Kem: 5000 };

// Fallback in-memory store for offline/demo mode when PostgreSQL is not running
const MEMORY_ORDERS: any[] = [];
let memoryOrderSeq = 1001;
const MEMORY_STOCK: Map<number, { stock: number; version: number }> = new Map([
  [1, { stock: 100, version: 0 }],
  [2, { stock: 100, version: 0 }],
  [3, { stock: 100, version: 0 }],
  [4, { stock: 100, version: 0 }],
]);

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Tạo đơn hàng mới với:
   * 1. Idempotency-Key: chống tạo đơn trùng lặp khi người dùng gửi lại yêu cầu
   * 2. Áp dụng mã giảm giá (Voucher)
   * 3. Database Transaction + Optimistic Locking trên Product.stock kiểm soát tương tranh
   */
  async create(userId: number, dto: CreateOrderDto, idempotencyKeyHeader?: string) {
    const effectiveKey = idempotencyKeyHeader || dto.idempotencyKey || null;

    // 1. Kiểm tra Idempotency-Key: Nếu đã có đơn với key này, trả về ngay kết quả cũ
    if (effectiveKey) {
      if (this.prisma.isConnected) {
        try {
          const existing = await this.prisma.order.findUnique({
            where: { idempotencyKey: effectiveKey },
            include: { items: true },
          });
          if (existing) {
            return existing;
          }
        } catch {
          // Bỏ qua nếu lỗi DB
        }
      } else {
        const existing = MEMORY_ORDERS.find((o) => o.idempotencyKey === effectiveKey);
        if (existing) {
          return existing;
        }
      }
    }

    // 2. Tính toán giá từng món và kiểm tra tính hợp lệ của Size, Topping
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    let products: { id: number; name: string; price: number; stock?: number; version?: number }[] = [];

    if (this.prisma.isConnected) {
      try {
        products = await this.prisma.product.findMany({
          where: { id: { in: ids } },
        });
      } catch {
        products = MOCK_PRODUCTS;
      }
    } else {
      products = MOCK_PRODUCTS;
    }

    // Gom tổng số lượng đặt theo từng productId để kiểm tra tồn kho
    const qtyByProduct = new Map<number, number>();

    const items = dto.items.map((i) => {
      const product = products.find((p) => p.id === i.productId);
      if (!product) {
        throw new BadRequestException(`Sản phẩm #${i.productId} không tồn tại`);
      }

      qtyByProduct.set(i.productId, (qtyByProduct.get(i.productId) || 0) + i.qty);

      let unit = product.price + (SIZE_EXTRA[i.size] ?? 0);
      for (const t of i.toppings) {
        if (!(t in TOPPING_PRICE)) {
          throw new BadRequestException(`Topping "${t}" không hợp lệ`);
        }
        unit += TOPPING_PRICE[t];
      }

      return {
        productId: product.id,
        name: product.name,
        size: i.size,
        toppings: [...i.toppings].sort().join(','),
        qty: i.qty,
        lineTotal: unit * i.qty,
      };
    });

    // 3. Tính tiền tạm tính và áp dụng Voucher khuyến mãi (Task 10 - Requirement 4)
    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const { discount, appliedCode } = applyVoucher(dto.voucherCode, subtotal);
    const finalTotal = Math.max(0, subtotal - discount);

    // 4. Nếu kết nối PostgreSQL: Dùng Database Transaction + Optimistic Locking
    if (this.prisma.isConnected) {
      return this.prisma.$transaction(async (tx) => {
        // Kiểm tra tồn kho & cập nhật Optimistic Lock cho từng sản phẩm
        for (const [productId, requestedQty] of qtyByProduct.entries()) {
          const current = await tx.product.findUnique({
            where: { id: productId },
          });

          if (!current) {
            throw new BadRequestException(`Sản phẩm #${productId} không tồn tại`);
          }

          if (current.stock < requestedQty) {
            throw new BadRequestException(
              `Sản phẩm "${current.name}" không đủ số lượng tồn kho (còn lại: ${current.stock}, yêu cầu: ${requestedQty})`,
            );
          }

          // Optimistic locking: điều kiện version khớp và stock >= requestedQty
          const updated = await tx.product.updateMany({
            where: {
              id: current.id,
              version: current.version,
              stock: { gte: requestedQty },
            },
            data: {
              stock: { decrement: requestedQty },
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw new ConflictException(
              `Xung đột tương tranh: Sản phẩm "${current.name}" đã được cập nhật bởi giao dịch khác hoặc hết hàng. Vui lòng thử lại.`,
            );
          }
        }

        // Tạo đơn hàng và chi tiết đơn trong cùng Transaction
        return tx.order.create({
          data: {
            userId,
            status: 'PENDING',
            total: finalTotal,
            discount,
            voucherCode: appliedCode || null,
            idempotencyKey: effectiveKey,
            items: { create: items },
          },
          include: { items: true },
        });
      });
    }

    // Fallback in-memory: Mô phỏng kiểm tra tồn kho và optimistic lock
    for (const [productId, requestedQty] of qtyByProduct.entries()) {
      const stockInfo = MEMORY_STOCK.get(productId) || { stock: 100, version: 0 };
      if (stockInfo.stock < requestedQty) {
        const prod = products.find((p) => p.id === productId);
        throw new BadRequestException(
          `Sản phẩm "${prod?.name || productId}" không đủ số lượng tồn kho (còn lại: ${stockInfo.stock}, yêu cầu: ${requestedQty})`,
        );
      }
      stockInfo.stock -= requestedQty;
      stockInfo.version += 1;
      MEMORY_STOCK.set(productId, stockInfo);
    }

    const memoryOrder = {
      id: memoryOrderSeq++,
      userId,
      status: 'PENDING',
      total: finalTotal,
      discount,
      voucherCode: appliedCode || null,
      idempotencyKey: effectiveKey,
      createdAt: new Date(),
      items: items.map((item, idx) => ({ id: idx + 1, ...item })),
    };
    MEMORY_ORDERS.unshift(memoryOrder);
    return memoryOrder;
  }

  /**
   * Cập nhật trạng thái đơn hàng tuân theo Order State Machine
   * Chặn đứng mọi bước chuyển trạng thái không hợp lệ qua assertTransition()
   */
  async updateStatus(orderId: number, nextStatus: string, userId?: number) {
    let currentStatus = 'PENDING';
    let currentOrder: any = null;

    if (this.prisma.isConnected) {
      currentOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });
    } else {
      currentOrder = MEMORY_ORDERS.find((o) => o.id === orderId);
    }

    if (!currentOrder) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại`);
    }

    if (userId && currentOrder.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này');
    }

    currentStatus = currentOrder.status;

    // Chặn chuyển trạng thái sai theo Order State Machine (Task 10 - Requirement 1)
    assertTransition(currentStatus, nextStatus);

    if (this.prisma.isConnected) {
      return this.prisma.order.update({
        where: { id: orderId },
        data: { status: nextStatus },
        include: { items: true },
      });
    }

    currentOrder.status = nextStatus;
    return currentOrder;
  }

  async findByUser(userId: number) {
    if (this.prisma.isConnected) {
      try {
        return await this.prisma.order.findMany({
          where: { userId },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        });
      } catch {
        // Fallback
      }
    }
    return MEMORY_ORDERS.filter((o) => o.userId === userId);
  }

  async findById(userId: number, orderId: number) {
    let order: any = null;

    if (this.prisma.isConnected) {
      try {
        order = await this.prisma.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
      } catch {
        // Fallback
      }
    }

    if (!order) {
      order = MEMORY_ORDERS.find((o) => o.id === orderId);
    }

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${orderId} không tồn tại`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    return order;
  }
}
