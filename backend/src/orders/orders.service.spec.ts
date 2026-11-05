import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { OrderStatus } from './order-state';
import { OrdersService } from './orders.service';

describe('Task 10 - OrdersService Business Logic & Concurrency', () => {
  let service: OrdersService;
  let mockPrisma: any;

  beforeEach(async () => {
    // Tạo mock PrismaService hỗ trợ transaction và optimistic locking
    const mockProducts = [
      { id: 1, name: 'Cà phê sữa', price: 35000, stock: 5, version: 0 },
      { id: 2, name: 'Americano', price: 40000, stock: 10, version: 0 },
    ];

    const mockOrders: any[] = [];
    let orderIdCounter = 1;

    mockPrisma = {
      isConnected: true,
      product: {
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.id?.in) {
            return mockProducts.filter((p) => where.id.in.includes(p.id));
          }
          return mockProducts;
        }),
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          return mockProducts.find((p) => p.id === where.id) || null;
        }),
        updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
          const product = mockProducts.find(
            (p) =>
              p.id === where.id &&
              p.version === where.version &&
              p.stock >= (where.stock?.gte || 0),
          );
          if (!product) return { count: 0 }; // Optimistic lock failed hoặc thiếu tồn kho

          if (data.stock?.decrement) {
            product.stock -= data.stock.decrement;
          }
          if (data.version?.increment) {
            product.version += data.version.increment;
          }
          return { count: 1 };
        }),
      },
      order: {
        findUnique: jest.fn().mockImplementation(async ({ where }) => {
          if (where?.idempotencyKey) {
            return (
              mockOrders.find(
                (o) => o.idempotencyKey === where.idempotencyKey,
              ) || null
            );
          }
          if (where?.id) {
            return mockOrders.find((o) => o.id === where.id) || null;
          }
          return null;
        }),
        create: jest.fn().mockImplementation(async ({ data }) => {
          const newOrder = {
            id: orderIdCounter++,
            ...data,
            createdAt: new Date(),
            items: data.items?.create || [],
          };
          mockOrders.push(newOrder);
          return newOrder;
        }),
        update: jest.fn().mockImplementation(async ({ where, data }) => {
          const order = mockOrders.find((o) => o.id === where.id);
          if (order) {
            Object.assign(order, data);
          }
          return order;
        }),
        findMany: jest.fn().mockImplementation(async ({ where }) => {
          return mockOrders.filter((o) => o.userId === where?.userId);
        }),
      },
      $transaction: jest.fn().mockImplementation(async (cb) => {
        return cb(mockPrisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('Requirement (b): Idempotency-Key trên tạo đơn hàng', () => {
    it('gửi 2 lần cùng Idempotency-Key chỉ tạo đúng 1 đơn hàng duy nhất', async () => {
      const idempotencyKey = 'unique-req-uuid-12345';
      const orderDto = {
        items: [{ productId: 1, size: 'M', toppings: ['Trân châu'], qty: 1 }],
      };

      // Gửi lần 1
      const order1 = await service.create(1, orderDto, idempotencyKey);
      expect(order1).toBeDefined();
      expect(order1.id).toBe(1);

      // Gửi lần 2 với cùng key
      const order2 = await service.create(1, orderDto, idempotencyKey);

      // Cả 2 lần trả về cùng 1 mã đơn hàng, không sinh thêm đơn thứ 2
      expect(order2.id).toBe(order1.id);
      expect(mockPrisma.order.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Requirement (c): Kiểm soát tồn kho & Concurrency (Optimistic Locking)', () => {
    it('chặn đặt hàng khi số lượng yêu cầu vượt quá tồn kho hiện tại', async () => {
      const orderDto = {
        items: [{ productId: 1, size: 'S', toppings: [], qty: 999 }], // Tồn kho chỉ có 5
      };

      await expect(service.create(1, orderDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('đặt hàng đồng thời: đảm bảo không bán vượt quá số lượng tồn kho (no overselling)', async () => {
      // Sản phẩm 1 khởi tạo có stock = 5
      // 10 yêu cầu đặt đồng thời, mỗi yêu cầu mua 1 sản phẩm
      const concurrentRequests = Array.from({ length: 10 }).map((_, index) =>
        service.create(index + 1, {
          items: [{ productId: 1, size: 'S', toppings: [], qty: 1 }],
        }),
      );

      const results = await Promise.allSettled(concurrentRequests);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const failures = results.filter((r) => r.status === 'rejected');

      // Đúng 5 đơn thành công, 5 đơn thất bại do hết tồn kho
      expect(successes.length).toBe(5);
      expect(failures.length).toBe(5);

      // Kiểm tra sản phẩm 1: tồn kho còn đúng 0, không bao giờ bị âm
      const prod = await mockPrisma.product.findUnique({ where: { id: 1 } });
      expect(prod.stock).toBe(0);
    });
  });

  describe('Requirement (4): Áp dụng mã giảm giá (Voucher)', () => {
    it('áp dụng mã GIAM10 giảm đúng 10% giá trị đơn hàng', async () => {
      // Ly Cà phê sữa Size S: 35.000 đ
      const order = await service.create(1, {
        items: [{ productId: 1, size: 'S', toppings: [], qty: 1 }],
        voucherCode: 'GIAM10',
      });

      expect(order.discount).toBe(3500); // 10% của 35.000
      expect(order.total).toBe(31500); // 35.000 - 3.500
      expect(order.voucherCode).toBe('GIAM10');
    });

    it('chặn mã giảm giá không hợp lệ', async () => {
      await expect(
        service.create(1, {
          items: [{ productId: 1, size: 'S', toppings: [], qty: 1 }],
          voucherCode: 'INVALID_CODE_999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Requirement (1): Cập nhật trạng thái đơn qua updateStatus()', () => {
    it('cho phép chuyển trạng thái hợp lệ theo thứ tự', async () => {
      const order = await service.create(1, {
        items: [{ productId: 2, size: 'S', toppings: [], qty: 1 }],
      });

      const step1 = await service.updateStatus(order.id, OrderStatus.PAID, 1);
      expect(step1.status).toBe(OrderStatus.PAID);

      const step2 = await service.updateStatus(
        order.id,
        OrderStatus.PREPARING,
        1,
      );
      expect(step2.status).toBe(OrderStatus.PREPARING);

      const step3 = await service.updateStatus(order.id, OrderStatus.READY, 1);
      expect(step3.status).toBe(OrderStatus.READY);

      const step4 = await service.updateStatus(
        order.id,
        OrderStatus.COMPLETED,
        1,
      );
      expect(step4.status).toBe(OrderStatus.COMPLETED);
    });

    it('chặn nhảy cóc từ PENDING sang READY', async () => {
      const order = await service.create(1, {
        items: [{ productId: 2, size: 'S', toppings: [], qty: 1 }],
      });

      await expect(
        service.updateStatus(order.id, OrderStatus.READY, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
