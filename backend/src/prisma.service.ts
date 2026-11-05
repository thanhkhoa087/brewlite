import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    await this.tryConnect();
  }

  async tryConnect(): Promise<boolean> {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Đã kết nối cơ sở dữ liệu PostgreSQL thành công.');
      await this.ensureSeed();
      return true;
    } catch {
      this.isConnected = false;
      this.logger.warn(
        'Chưa thể kết nối PostgreSQL tại localhost:5432. Bật chế độ dữ liệu tức thì (0ms).',
      );
      return false;
    }
  }

  async ensureSeed() {
    try {
      const count = await this.product.count();
      if (count === 0) {
        this.logger.log(
          'Cơ sở dữ liệu chưa có sản phẩm. Đang tự động nạp dữ liệu mẫu (seed)...',
        );
        await this.product.createMany({
          data: [
            {
              name: 'Cà phê sữa',
              price: 35000,
              imageUrl: '/images/ca-phe-sua.jpg',
              stock: 100,
            },
            {
              name: 'Americano',
              price: 40000,
              imageUrl: '/images/americano.jpg',
              stock: 100,
            },
            {
              name: 'Cappuccino',
              price: 45000,
              imageUrl: '/images/cappuccino.jpg',
              stock: 100,
            },
            {
              name: 'Trà đào',
              price: 39000,
              imageUrl: '/images/tra-dao.jpg',
              stock: 100,
            },
          ],
        });
        this.logger.log('Đã nạp 4 sản phẩm mẫu vào cơ sở dữ liệu PostgreSQL.');
      }
    } catch (err) {
      this.logger.warn(
        'Không thể kiểm tra/nạp dữ liệu mẫu seed (bảng có thể chưa được migrate): ' +
          (err as Error).message,
      );
    }
  }
}
