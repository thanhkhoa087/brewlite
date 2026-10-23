import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateOrderDto } from './orders.dto';

const SIZE_EXTRA: Record<string, number> = { S: 0, M: 5000, L: 10000 };
const TOPPING_PRICE: Record<string, number> = { 'Trân châu': 5000, Kem: 5000 };

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto) {
    const ids = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
    });

    const items = dto.items.map((i) => {
      const product = products.find((p) => p.id === i.productId);
      if (!product) {
        throw new BadRequestException(`Sản phẩm ${i.productId} không tồn tại`);
      }
      let unit = product.price + SIZE_EXTRA[i.size];
      for (const t of i.toppings) {
        if (!(t in TOPPING_PRICE)) {
          throw new BadRequestException(`Topping "${t}" không hợp lệ`);
        }
        unit += TOPPING_PRICE[t];
      }
      return {
        productId: product.id,
        name: product.name,
        size: i.size,
        toppings: [...i.toppings].sort().join(','),
        qty: i.qty,
        lineTotal: unit * i.qty,
      };
    });

    const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

    return this.prisma.order.create({
      data: { userId, status: 'PENDING', total, items: { create: items } },
      include: { items: true },
    });
  }
}