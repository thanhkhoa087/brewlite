import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePaymentDto } from './payments.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async pay(userId: number, dto: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${dto.orderId} không tồn tại`);
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng này');
    }

    if (order.status === 'PAID') {
      return {
        success: true,
        status: 'PAID',
        message: 'Đơn hàng này đã được thanh toán trước đó',
        orderId: order.id,
        amount: order.total,
        order,
      };
    }

    if (order.status !== 'PENDING' && order.status !== 'PAYMENT_FAILED') {
      throw new BadRequestException(
        `Không thể thanh toán cho đơn hàng đang ở trạng thái ${order.status}`,
      );
    }

    const isSuccess = !dto.simulateFailure;
    const nextStatus = isSuccess ? 'PAID' : 'PAYMENT_FAILED';

    const updatedOrder = await this.prisma.order.update({
      where: { id: dto.orderId },
      data: { status: nextStatus },
      include: { items: true },
    });

    try {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          method: dto.method,
          amount: order.total,
          status: nextStatus,
          idempotencyKey: dto.idempotencyKey || null,
        },
      });
    } catch {
      // Bỏ qua nếu bảng Payment chưa được migrate
    }

    return {
      success: isSuccess,
      status: nextStatus,
      orderId: order.id,
      amount: order.total,
      method: dto.method,
      message: isSuccess
        ? 'Thanh toán thành công'
        : 'Thanh toán thất bại, vui lòng thử lại',
      order: updatedOrder,
    };
  }
}
