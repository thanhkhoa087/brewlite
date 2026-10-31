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
      return true;
    } catch {
      this.isConnected = false;
      this.logger.warn(
        'Chưa thể kết nối PostgreSQL tại localhost:5432. Bật chế độ dữ liệu tức thì (0ms).',
      );
      return false;
    }
  }
}
