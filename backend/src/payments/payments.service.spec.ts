import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '../orders/order-state';
import { PrismaService } from '../prisma.service';
import { PaymentsService } from './payments.service';

describe('Task 10 - PaymentsService Idempotency & Loyalty Points', () => {
  let service: PaymentsService;
  let mockPrisma: any;

  beforeEach(async () => {
    const mockUser = { id: 1, email: 'test@example.com', loyaltyPoints: 10 };
    const mockOrder = {
      id: 101,
      userId: 1,
      status: OrderStatus.PENDING,
      total: 50000,
      items: [],
    };
    const mockPayments: any[] = [];
    let paymentSeq = 1;

    mockPrisma = {
      isConnected: true,
      order: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          if (where.id === mockOrder.id) return mockOrder;
          return null;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          if (where.id === mockOrder.id) {
            Object.assign(mockOrder, data);
            return mockOrder;
          }
          return null;
        }),
      },
      payment: {
        findFirst: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.idempotencyKey) {
            return (
              mockPayments.find(
                (p) => p.idempotencyKey === where.idempotencyKey,
              ) || null
            );
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }) => {
          const newPayment = {
            id: paymentSeq++,
            ...data,
            createdAt: new Date(),
          };
          mockPayments.push(newPayment);
          return newPayment;
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          if (where.id === mockUser.id) {
            if (data.loyaltyPoints?.increment) {
              mockUser.loyaltyPoints += data.loyaltyPoints.increment;
            }
            return mockUser;
          }
          return null;
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('Requirement (b): Idempotent Payment (Chống trừ tiền trùng lặp)', () => {
    it('gửi 2 lần cùng Idempotency-Key chỉ tạo đúng 1 bản ghi payment và không trừ tiền 2 lần', async () => {
      const paymentDto = {
        orderId: 101,
        method: 'WALLET' as const,
        idempotencyKey: 'pay-key-uuid-999',
      };

      // Gửi thanh toán lần 1
      const res1 = await service.pay(1, paymentDto);
      expect(res1.success).toBe(true);
      expect(res1.status).toBe(OrderStatus.PAID);
      expect(res1.earnedPoints).toBe(5); // 50.000 / 10.000 = 5 điểm

      // Gửi thanh toán lần 2 với cùng key
      const res2 = await service.pay(1, paymentDto);

      // Nhận được kết quả idempotency, payment record không bị tạo thêm
      expect(res2.success).toBe(true);
      expect(res2.status).toBe(OrderStatus.PAID);
      expect(res2.message).toContain('Idempotent');
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Requirement (4): Tích lũy điểm thưởng thành viên (Loyalty Points)', () => {
    it('cộng điểm tích lũy thành viên chính xác khi đơn chuyển sang PAID (1 điểm / 10.000 đ)', async () => {
      const res = await service.pay(1, {
        orderId: 101,
        method: 'CARD',
      });

      expect(res.status).toBe(OrderStatus.PAID);
      expect(res.earnedPoints).toBe(5); // 50.000 đ = 5 điểm
      expect(res.totalLoyaltyPoints).toBe(15); // 10 cũ + 5 mới = 15
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { loyaltyPoints: { increment: 5 } },
      });
    });

    it('không cộng điểm thưởng nếu thanh toán thất bại (simulateFailure = true)', async () => {
      const res = await service.pay(1, {
        orderId: 101,
        method: 'CARD',
        simulateFailure: true,
      });

      expect(res.status).toBe(OrderStatus.PAYMENT_FAILED);
      expect(res.earnedPoints).toBe(0);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('Requirement (a): State Machine validation trong Payment', () => {
    it('chặn thanh toán khi đơn hàng đang ở trạng thái không thể thanh toán (ví dụ COMPLETED)', async () => {
      // Giả sử đơn hàng đã COMPLETED
      mockPrisma.order.findUnique.mockResolvedValueOnce({
        id: 101,
        userId: 1,
        status: OrderStatus.COMPLETED,
        total: 50000,
        items: [],
      });

      await expect(
        service.pay(1, { orderId: 101, method: 'WALLET' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
