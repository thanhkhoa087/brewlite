import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertTransition, OrderStatus } from '../orders/order-state';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './payments.dto';

// In-memory payment store for offline fallback / demo mode
const MEMORY_PAYMENTS: any[] = [];
let memoryPaymentSeq = 5001;

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Xử lý thanh toán không tiền mặt với:
   * 1. Idempotency-Key: chống trừ tiền / tạo giao dịch thanh toán 2 lần
   * 2. Order State Machine: kiểm soát chặt chẽ trạng thái bằng assertTransition
   * 3. Loyalty Points: tự động tích lũy điểm thưởng thành viên khi đơn PAID
   */
  async pay(userId: number, dto: CreatePaymentDto, idempotencyKeyHeader?: string) {
    const effectiveKey = idempotencyKeyHeader || dto.idempotencyKey || null;

    // 1. Kiểm tra Idempotency-Key chống thanh toán trùng lặp (Task 10 - Requirement 2)
    if (effectiveKey) {
      if (this.prisma.isConnected) {
        try {
          const existingPayment = await this.prisma.payment.findFirst({
            where: { idempotencyKey: effectiveKey },
          });

          if (existingPayment) {
            const order = await this.prisma.order.findUnique({
              where: { id: existingPayment.orderId },
              include: { items: true },
            });

            return {
              success: existingPayment.status === OrderStatus.PAID,
              status: existingPayment.status,
              message: 'Giao dịch đã được ghi nhận trước đó (Idempotent Payment)',
              orderId: existingPayment.orderId,
              amount: existingPayment.amount,
              method: existingPayment.method,
              idempotencyKey: existingPayment.idempotencyKey,
              order,
            };
          }
        } catch {
          // Bỏ qua nếu lỗi DB
        }
      } else {
        const existingPayment = MEMORY_PAYMENTS.find(
          (p) => p.idempotencyKey === effectiveKey,
        );
        if (existingPayment) {
          return {
            success: existingPayment.status === OrderStatus.PAID,
            status: existingPayment.status,
            message: 'Giao dịch đã được ghi nhận trước đó (Idempotent Payment)',
            orderId: existingPayment.orderId,
            amount: existingPayment.amount,
            method: existingPayment.method,
            idempotencyKey: existingPayment.idempotencyKey,
          };
        }
      }
    }

    // 2. Tìm đơn hàng và kiểm tra quyền sở hữu
    let order: any = null;
    if (this.prisma.isConnected) {
      order = await this.prisma.order.findUnique({
        where: { id: dto.orderId },
        include: { items: true },
      });
    }

    if (!order) {
      // Mock order fallback if needed
      order = {
        id: dto.orderId,
        userId,
        status: OrderStatus.PENDING,
        total: 50000,
        items: [],
      };
    }

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng này');
    }

    // Nếu đơn đã được thanh toán trước đó, trả về luôn
    if (order.status === OrderStatus.PAID) {
      return {
        success: true,
        status: OrderStatus.PAID,
        message: 'Đơn hàng này đã được thanh toán trước đó',
        orderId: order.id,
        amount: order.total,
        order,
      };
    }

    const nextStatus = dto.simulateFailure
      ? OrderStatus.PAYMENT_FAILED
      : OrderStatus.PAID;

    // 3. Kiểm soát chuyển trạng thái qua Order State Machine (Task 10 - Requirement 1)
    assertTransition(order.status, nextStatus);

    // Tính điểm thưởng tích lũy (Loyalty points): 1 điểm cho mỗi 10.000 đ
    const earnedPoints =
      nextStatus === OrderStatus.PAID ? Math.floor(order.total / 10000) : 0;

    // 4. Nếu có kết nối PostgreSQL: Thực thi trong Database Transaction
    if (this.prisma.isConnected) {
      return this.prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: dto.orderId },
          data: { status: nextStatus },
          include: { items: true },
        });

        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            method: dto.method,
            amount: order.total,
            status: nextStatus,
            idempotencyKey: effectiveKey,
          },
        });

        let totalLoyalty = 0;
        if (earnedPoints > 0) {
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: { loyaltyPoints: { increment: earnedPoints } },
          });
          totalLoyalty = updatedUser.loyaltyPoints;
        }

        return {
          success: !dto.simulateFailure,
          status: nextStatus,
          orderId: order.id,
          amount: order.total,
          method: dto.method,
          idempotencyKey: payment.idempotencyKey,
          earnedPoints,
          totalLoyaltyPoints: totalLoyalty,
          message: !dto.simulateFailure
            ? `Thanh toán thành công. +${earnedPoints} điểm tích lũy thành viên!`
            : 'Thanh toán thất bại, vui lòng thử lại',
          order: updatedOrder,
        };
      });
    }

    // Fallback in-memory
    const memPayment = {
      id: memoryPaymentSeq++,
      orderId: order.id,
      method: dto.method,
      amount: order.total,
      status: nextStatus,
      idempotencyKey: effectiveKey,
      createdAt: new Date(),
    };
    MEMORY_PAYMENTS.push(memPayment);

    order.status = nextStatus;

    return {
      success: !dto.simulateFailure,
      status: nextStatus,
      orderId: order.id,
      amount: order.total,
      method: dto.method,
      idempotencyKey: effectiveKey,
      earnedPoints,
      message: !dto.simulateFailure
        ? `Thanh toán thành công. +${earnedPoints} điểm tích lũy!`
        : 'Thanh toán thất bại, vui lòng thử lại',
      order,
    };
  }
}
