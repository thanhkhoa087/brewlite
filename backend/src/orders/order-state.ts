import { BadRequestException } from '@nestjs/common';

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CANCELLED = 'CANCELLED',
}

/**
 * Sơ đồ máy trạng thái đơn hàng (Order State Machine) theo Đề bài Mục 9.1:
 * - Luồng chính: PENDING -> PAID -> PREPARING -> READY -> COMPLETED
 * - Ngoại lệ:
 *   + PENDING -> PAYMENT_FAILED (thanh toán lỗi)
 *   + PENDING -> CANCELLED (hủy trước khi thanh toán)
 *   + PAYMENT_FAILED -> PAID (thử lại thanh toán thành công)
 *   + PAYMENT_FAILED -> CANCELLED (hủy đơn)
 *   + PAID -> CANCELLED (hủy trước khi pha chế)
 *   + PREPARING -> CANCELLED (sự cố quầy/hết nguyên liệu)
 * - Trạng thái kết thúc (terminal): COMPLETED, CANCELLED
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.PAID,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PAID,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAID]: [
    OrderStatus.PREPARING,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PREPARING]: [
    OrderStatus.READY,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.READY]: [
    OrderStatus.COMPLETED,
  ],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * Kiểm soát chuyển trạng thái đơn hàng.
 * Mọi chuyển tiếp không hợp lệ sẽ bị hàm assertTransition chặn lại (ném lỗi).
 */
export function assertTransition(fromStatus: string, toStatus: string): void {
  const from = fromStatus as OrderStatus;
  const to = toStatus as OrderStatus;

  const validFrom = Object.values(OrderStatus).includes(from);
  const validTo = Object.values(OrderStatus).includes(to);

  if (!validFrom || !validTo) {
    throw new BadRequestException(
      `Trạng thái đơn hàng không hợp lệ: "${fromStatus}" -> "${toStatus}"`,
    );
  }

  const allowed = ALLOWED_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `Chuyển trạng thái đơn hàng không hợp lệ: Không thể chuyển từ ${fromStatus} sang ${toStatus}`,
    );
  }
}
