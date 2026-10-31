import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsInt()
  orderId: number;

  @IsIn(['WALLET', 'CARD'])
  method: 'WALLET' | 'CARD';

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsBoolean()
  simulateFailure?: boolean;
}
