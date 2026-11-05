import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productId: number;

  @IsIn(['S', 'M', 'L'])
  size: string;

  @IsArray()
  @IsString({ each: true })
  toppings: string[];

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  voucherCode?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateOrderStatusDto {
  @IsIn([
    'PENDING',
    'PAID',
    'PREPARING',
    'READY',
    'COMPLETED',
    'PAYMENT_FAILED',
    'CANCELLED',
  ])
  status: string;
}
