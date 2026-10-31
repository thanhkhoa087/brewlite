import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export const MOCK_PRODUCTS = [
  { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg', stock: 100 },
  { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg', stock: 100 },
  { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg', stock: 100 },
  { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg', stock: 100 },
];

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    if (!this.prisma.isConnected) {
      return MOCK_PRODUCTS;
    }
    try {
      const products = await this.prisma.product.findMany({
        orderBy: { id: 'asc' },
      });
      return products.length > 0 ? products : MOCK_PRODUCTS;
    } catch {
      return MOCK_PRODUCTS;
    }
  }

  async findOne(id: number) {
    if (!this.prisma.isConnected) {
      const mock = MOCK_PRODUCTS.find((p) => p.id === id);
      if (!mock) throw new NotFoundException('Không tìm thấy sản phẩm');
      return mock;
    }
    try {
      const product = await this.prisma.product.findUnique({ where: { id } });
      if (product) return product;
    } catch {
      // Fallback
    }
    const mock = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!mock) throw new NotFoundException('Không tìm thấy sản phẩm');
    return mock;
  }
}
