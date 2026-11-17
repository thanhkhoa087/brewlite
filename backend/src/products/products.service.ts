import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  calculateAvailableCups,
  MEMORY_INGREDIENTS,
  RawIngredient,
} from './ingredients';

export const MOCK_PRODUCTS = [
  { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg', stock: 100 },
  { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg', stock: 100 },
  { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg', stock: 100 },
  { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg', stock: 100 },
];

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy bản đồ tồn kho nguyên liệu thô hiện tại từ PostgreSQL hoặc Fallback In-Memory
   */
  private async getIngredientsMap(): Promise<Map<number, { stock: number }>> {
    const map = new Map<number, { stock: number }>();

    if (this.prisma.isConnected) {
      try {
        const ingredients = await this.prisma.ingredient.findMany();
        if (ingredients && ingredients.length > 0) {
          for (const ing of ingredients) {
            map.set(ing.id, { stock: ing.stock });
          }
          return map;
        }
      } catch {
        // Fallback
      }
    }

    // In-Memory Fallback
    for (const [id, ing] of MEMORY_INGREDIENTS.entries()) {
      map.set(id, { stock: ing.stock });
    }
    return map;
  }

  /**
   * Danh sách toàn bộ nguyên liệu thô trong kho (phục vụ Barista / Quản lý theo dõi định lượng)
   */
  async getRawIngredients(): Promise<RawIngredient[]> {
    if (this.prisma.isConnected) {
      try {
        const ingredients = await this.prisma.ingredient.findMany({
          orderBy: { id: 'asc' },
        });
        if (ingredients && ingredients.length > 0) {
          return ingredients;
        }
      } catch {
        // Fallback
      }
    }
    return Array.from(MEMORY_INGREDIENTS.values());
  }

  /**
   * Chỉnh sửa số lượng nguyên liệu thô có trong kho (g hoặc ml)
   */
  async updateIngredientStock(ingredientId: number, newStock: number) {
    if (newStock < 0) {
      throw new BadRequestException('Khối lượng nguyên liệu không thể là số âm');
    }

    if (this.prisma.isConnected) {
      try {
        const updated = await this.prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            stock: newStock,
            version: { increment: 1 },
          },
        });
        return {
          success: true,
          message: `Đã cập nhật tồn kho nguyên liệu "${updated.name}" thành ${updated.stock}${updated.unit}`,
          ingredient: updated,
        };
      } catch (err: any) {
        throw new BadRequestException(`Lỗi cập nhật nguyên liệu: ${err.message}`);
      }
    }

    const ing = MEMORY_INGREDIENTS.get(ingredientId);
    if (!ing) {
      throw new NotFoundException(`Không tìm thấy nguyên liệu #${ingredientId}`);
    }
    ing.stock = newStock;
    ing.version += 1;
    MEMORY_INGREDIENTS.set(ingredientId, ing);

    return {
      success: true,
      message: `Đã cập nhật tồn kho nguyên liệu "${ing.name}" thành ${ing.stock}${ing.unit}`,
      ingredient: ing,
    };
  }

  /**
   * Lấy danh sách menu đồ uống.
   * Số lượng "stock" của từng món không lưu cứng theo ly, mà được Backend
   * tự động tính toán từ khối lượng nguyên liệu thô còn lại trong kho theo công thức định lượng!
   */
  async findAll() {
    const ingredientsMap = await this.getIngredientsMap();

    let rawProducts: any[] = MOCK_PRODUCTS;

    if (this.prisma.isConnected) {
      try {
        const products = await this.prisma.product.findMany({
          orderBy: { id: 'asc' },
        });
        if (products.length > 0) {
          rawProducts = products;
        }
      } catch {
        rawProducts = MOCK_PRODUCTS;
      }
    }

    // Tự động tính số ly tối đa có thể phục vụ cho từng món nước
    return rawProducts.map((p) => {
      const availableCups = calculateAvailableCups(p.id, ingredientsMap);
      return {
        ...p,
        stock: availableCups, // Số ly tối đa có thể phục vụ
      };
    });
  }

  async findOne(id: number) {
    const ingredientsMap = await this.getIngredientsMap();
    let product: any = null;

    if (this.prisma.isConnected) {
      try {
        product = await this.prisma.product.findUnique({ where: { id } });
      } catch {
        // Fallback
      }
    }

    if (!product) {
      product = MOCK_PRODUCTS.find((p) => p.id === id);
    }

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const availableCups = calculateAvailableCups(product.id, ingredientsMap);
    return {
      ...product,
      stock: availableCups,
    };
  }
}
