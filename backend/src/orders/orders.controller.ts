import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto } from './orders.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(
    @Request() req: { user: { userId: number; role?: string } },
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') headerKey?: string,
  ) {
    return this.orders.create(req.user.userId, dto, headerKey);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: { user: { userId: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    if (req.user.role !== 'BARISTA' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Chỉ nhân viên Barista mới có quyền cập nhật trạng thái chế biến',
      );
    }
    return this.orders.updateStatus(id, dto.status, req.user.userId, true);
  }

  @Post(':id/cancel')
  cancel(
    @Request() req: { user: { userId: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto?: CancelOrderDto,
  ) {
    const isBarista = req.user.role === 'BARISTA' || req.user.role === 'ADMIN';
    return this.orders.cancelOrder(id, req.user.userId, isBarista, dto?.reason);
  }

  @Get('barista/queue')
  getBaristaQueue(@Request() req: { user: { userId: number; role?: string } }) {
    if (req.user.role !== 'BARISTA' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Chỉ nhân viên Barista mới có quyền truy cập hàng đợi quầy',
      );
    }
    return this.orders.findActiveOrders();
  }

  @Get()
  getOrders(@Request() req: { user: { userId: number; role?: string } }) {
    return this.orders.findByUser(req.user.userId);
  }

  @Get('history')
  getOrderHistory(@Request() req: { user: { userId: number; role?: string } }) {
    return this.orders.findByUser(req.user.userId);
  }

  @Get('me')
  getMyOrders(@Request() req: { user: { userId: number; role?: string } }) {
    return this.orders.findByUser(req.user.userId);
  }

  @Get(':id')
  getOrderById(
    @Request() req: { user: { userId: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orders.findById(req.user.userId, id);
  }
}
