import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreatePaymentDto } from './payments.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  pay(
    @Request() req: { user: { userId: number } },
    @Body() dto: CreatePaymentDto,
  ) {
    return this.payments.pay(req.user.userId, dto);
  }
}
