import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  orderId: number;

  @IsIn(['WALLET', 'CARD', 'MOMO', 'VNPAY', 'CASH'])
  method: 'WALLET' | 'CARD' | 'MOMO' | 'VNPAY' | 'CASH';

  @IsOptional()
  @IsInt()
  amount?: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
