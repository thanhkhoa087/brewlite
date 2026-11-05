import {
  Body,
  Controller,
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
import { CreateOrderDto, UpdateOrderStatusDto } from './orders.dto';
import { OrdersService } from './orders.service';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Post()
  create(
    @Request() req: { user: { userId: number } },
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') headerKey?: string,
  ) {
    return this.orders.create(req.user.userId, dto, headerKey);
  }

  @Patch(':id/status')
  updateStatus(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orders.updateStatus(id, dto.status, req.user.userId);
  }

  @Get('me')
  getMyOrders(@Request() req: { user: { userId: number } }) {
    return this.orders.findByUser(req.user.userId);
  }

  @Get(':id')
  getOrderById(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.orders.findById(req.user.userId, id);
  }
}
