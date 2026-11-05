import { BadRequestException } from '@nestjs/common';
import { assertTransition, OrderStatus } from './order-state';

describe('Task 10.1 - Order State Machine (assertTransition)', () => {
  describe('Valid transitions (Luồng hợp lệ)', () => {
    it('cho phép chuyển từ PENDING -> PAID (thanh toán thành công)', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.PAID),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PENDING -> PAYMENT_FAILED (thanh toán lỗi)', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PENDING -> CANCELLED (hủy đơn trước thanh toán)', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PAYMENT_FAILED -> PAID (thanh toán lại thành công)', () => {
      expect(() =>
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PAYMENT_FAILED -> CANCELLED (hủy đơn sau lỗi)', () => {
      expect(() =>
        assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PAID -> PREPARING (barista tiếp nhận pha chế)', () => {
      expect(() =>
        assertTransition(OrderStatus.PAID, OrderStatus.PREPARING),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PAID -> CANCELLED (hủy đơn trước khi pha)', () => {
      expect(() =>
        assertTransition(OrderStatus.PAID, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PREPARING -> READY (pha xong, chờ khách lấy)', () => {
      expect(() =>
        assertTransition(OrderStatus.PREPARING, OrderStatus.READY),
      ).not.toThrow();
    });

    it('cho phép chuyển từ PREPARING -> CANCELLED (sự cố quầy)', () => {
      expect(() =>
        assertTransition(OrderStatus.PREPARING, OrderStatus.CANCELLED),
      ).not.toThrow();
    });

    it('cho phép chuyển từ READY -> COMPLETED (giao món thành công)', () => {
      expect(() =>
        assertTransition(OrderStatus.READY, OrderStatus.COMPLETED),
      ).not.toThrow();
    });
  });

  describe('Invalid transitions (Chặn đứng các bước nhảy cóc / chuyển sai)', () => {
    it('chặn nhảy cóc từ PENDING -> READY (chưa thanh toán mà đã đòi nhận món)', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.READY),
      ).toThrow(BadRequestException);
    });

    it('chặn nhảy cóc từ PENDING -> PREPARING (chưa thanh toán mà đã pha chế)', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.PREPARING),
      ).toThrow(BadRequestException);
    });

    it('chặn nhảy cóc từ PENDING -> COMPLETED', () => {
      expect(() =>
        assertTransition(OrderStatus.PENDING, OrderStatus.COMPLETED),
      ).toThrow(BadRequestException);
    });

    it('chặn chuyển từ COMPLETED sang bất kỳ trạng thái nào (trạng thái kết thúc)', () => {
      expect(() =>
        assertTransition(OrderStatus.COMPLETED, OrderStatus.PAID),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.COMPLETED, OrderStatus.CANCELLED),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.COMPLETED, OrderStatus.PREPARING),
      ).toThrow(BadRequestException);
    });

    it('chặn chuyển từ CANCELLED sang bất kỳ trạng thái nào (trạng thái kết thúc)', () => {
      expect(() =>
        assertTransition(OrderStatus.CANCELLED, OrderStatus.PAID),
      ).toThrow(BadRequestException);
      expect(() =>
        assertTransition(OrderStatus.CANCELLED, OrderStatus.PREPARING),
      ).toThrow(BadRequestException);
    });

    it('chặn quay ngược trạng thái từ READY -> PENDING', () => {
      expect(() =>
        assertTransition(OrderStatus.READY, OrderStatus.PENDING),
      ).toThrow(BadRequestException);
    });

    it('chặn các trạng thái không xác định (undefined/unknown)', () => {
      expect(() => assertTransition('FOO', 'BAR')).toThrow(BadRequestException);
      expect(() => assertTransition(OrderStatus.PENDING, 'UNKNOWN')).toThrow(
        BadRequestException,
      );
    });
  });
});
