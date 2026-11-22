import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AuthDto, CreateBaristaDto } from './auth.dto';

export const MEMORY_USERS: any[] = [
  {
    id: 1,
    email: 'user@brewlite.vn',
    fullName: 'Nguyễn Văn A',
    phone: '0901234567',
    passwordHash: '$2b$10$6g0Q2Dl2f5bHrt8fmOXOWOtn2n6qLaUcm5ZW2pm4W6ne4fWB66sAO', // 123456
    role: 'CUSTOMER',
    loyaltyPoints: 50,
  },
  {
    id: 2,
    email: 'admin@brewlite.vn',
    fullName: 'Quản Lý Cửa Hàng',
    phone: '0988888888',
    passwordHash: '$2b$10$6g0Q2Dl2f5bHrt8fmOXOWOtn2n6qLaUcm5ZW2pm4W6ne4fWB66sAO', // 123456
    role: 'ADMIN',
    loyaltyPoints: 100,
  },
  {
    id: 3,
    email: 'barista@brewlite.vn',
    fullName: 'Nhân Viên Pha Chế',
    phone: '0987654321',
    passwordHash: '$2b$10$6g0Q2Dl2f5bHrt8fmOXOWOtn2n6qLaUcm5ZW2pm4W6ne4fWB66sAO', // 123456
    role: 'BARISTA',
    loyaltyPoints: 0,
  },
];
let memoryUserSeq = 4;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(dto: AuthDto) {
    if (this.prisma.isConnected) {
      try {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new ConflictException('Email đã được đăng ký');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName || dto.email.split('@')[0],
            phone: dto.phone || '',
            role: 'CUSTOMER',
          },
        });
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
        };
      } catch (err) {
        if (err instanceof ConflictException) throw err;
      }
    }

    const memExists = MEMORY_USERS.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
    );
    if (memExists) throw new ConflictException('Email đã được đăng ký');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newUser = {
      id: memoryUserSeq++,
      email: dto.email,
      fullName: dto.fullName || dto.email.split('@')[0],
      phone: dto.phone || '',
      passwordHash,
      role: 'CUSTOMER',
      loyaltyPoints: 0,
    };
    MEMORY_USERS.push(newUser);
    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role: newUser.role,
    };
  }

  async login(dto: AuthDto) {
    let user: any = null;
    if (this.prisma.isConnected) {
      try {
        user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      } catch {
        // Fallback
      }
    }

    if (!user) {
      user = MEMORY_USERS.find(
        (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
      );
    }

    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Sai email hoặc mật khẩu');

    const fullName = user.fullName || user.email.split('@')[0];
    const phone = user.phone || '';
    const role = user.role || 'CUSTOMER';

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      fullName,
      role,
    });

    return {
      accessToken,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName,
        phone,
        role,
        loyaltyPoints: user.loyaltyPoints ?? 0,
      },
    };
  }

  async getProfile(userId: number) {
    let user: any = null;
    if (this.prisma.isConnected) {
      try {
        user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            loyaltyPoints: true,
          },
        });
      } catch {
        // Fallback
      }
    }

    if (!user) {
      const mem = MEMORY_USERS.find((u) => u.id === userId);
      if (mem) {
        user = {
          id: mem.id,
          email: mem.email,
          fullName: mem.fullName || mem.email.split('@')[0],
          phone: mem.phone || '',
          role: mem.role || 'CUSTOMER',
          loyaltyPoints: mem.loyaltyPoints ?? 0,
        };
      }
    }

    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản');
    }

    return user;
  }

  // --- CÁC HÀM QUẢN LÝ TÀI KHOẢN BARISTA (CHỈ DÀNH CHO ADMIN / QUẢN LÝ) ---

  private async verifyAdmin(adminUserId: number) {
    let adminUser: any = null;
    if (this.prisma.isConnected) {
      try {
        adminUser = await this.prisma.user.findUnique({ where: { id: adminUserId } });
      } catch {
        // Fallback
      }
    }
    if (!adminUser) {
      adminUser = MEMORY_USERS.find((u) => u.id === adminUserId);
    }
    if (!adminUser || adminUser.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Chỉ quản lý cửa hàng (Admin) mới có quyền quản lý tài khoản Barista',
      );
    }
    return adminUser;
  }

  async getBaristas(adminUserId: number) {
    await this.verifyAdmin(adminUserId);

    if (this.prisma.isConnected) {
      try {
        return await this.prisma.user.findMany({
          where: { role: 'BARISTA' },
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            createdAt: true,
          },
          orderBy: { id: 'desc' },
        });
      } catch {
        // Fallback
      }
    }

    return MEMORY_USERS.filter((u) => u.role === 'BARISTA').map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt || new Date(),
    }));
  }

  async createBarista(adminUserId: number, dto: CreateBaristaDto) {
    await this.verifyAdmin(adminUserId);

    if (this.prisma.isConnected) {
      try {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists) throw new ConflictException(`Email "${dto.email}" đã tồn tại trên hệ thống`);

        const passwordHash = await bcrypt.hash(dto.password, 10);
        const barista = await this.prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            fullName: dto.fullName,
            phone: dto.phone || '',
            role: 'BARISTA',
          },
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        });
        return barista;
      } catch (err) {
        if (err instanceof ConflictException) throw err;
      }
    }

    const memExists = MEMORY_USERS.find(
      (u) => u.email.toLowerCase() === dto.email.toLowerCase(),
    );
    if (memExists) {
      throw new ConflictException(`Email "${dto.email}" đã tồn tại trên hệ thống`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const newBarista = {
      id: memoryUserSeq++,
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone || '',
      passwordHash,
      role: 'BARISTA',
      createdAt: new Date(),
    };
    MEMORY_USERS.unshift(newBarista);

    return {
      id: newBarista.id,
      email: newBarista.email,
      fullName: newBarista.fullName,
      phone: newBarista.phone,
      role: newBarista.role,
      createdAt: newBarista.createdAt,
    };
  }

  async deleteBarista(adminUserId: number, baristaId: number) {
    await this.verifyAdmin(adminUserId);

    if (this.prisma.isConnected) {
      try {
        const target = await this.prisma.user.findUnique({ where: { id: baristaId } });
        if (!target || target.role !== 'BARISTA') {
          throw new NotFoundException(`Không tìm thấy tài khoản Barista #${baristaId}`);
        }
        await this.prisma.user.delete({ where: { id: baristaId } });
        return { success: true, message: `Đã xóa tài khoản Barista #${baristaId} thành công` };
      } catch (err) {
        if (err instanceof NotFoundException) throw err;
      }
    }

    const idx = MEMORY_USERS.findIndex((u) => u.id === baristaId && u.role === 'BARISTA');
    if (idx === -1) {
      throw new NotFoundException(`Không tìm thấy tài khoản Barista #${baristaId}`);
    }
    MEMORY_USERS.splice(idx, 1);

    return { success: true, message: `Đã xóa tài khoản Barista #${baristaId} thành công` };
  }

  // --- CÁC HÀM QUẢN LÝ TẤT CẢ USER / XÓA USER / RESET USER ---

  async getAllUsers() {
    if (this.prisma.isConnected) {
      try {
        const users = await this.prisma.user.findMany({
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            loyaltyPoints: true,
            createdAt: true,
          },
          orderBy: { id: 'asc' },
        });
        if (users && users.length > 0) return users;
      } catch {}
    }

    return MEMORY_USERS.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      loyaltyPoints: u.loyaltyPoints || 0,
      createdAt: u.createdAt || new Date(),
    }));
  }

  async deleteUser(userId: number) {
    if (this.prisma.isConnected) {
      try {
        await this.prisma.payment.deleteMany({
          where: { order: { userId } },
        });
        await this.prisma.orderItem.deleteMany({
          where: { order: { userId } },
        });
        await this.prisma.order.deleteMany({
          where: { userId },
        });
        await this.prisma.user.delete({
          where: { id: userId },
        });
        return { success: true, message: `Đã xóa tài khoản #${userId} thành công` };
      } catch (err: any) {
        throw new BadRequestException(`Không thể xóa tài khoản #${userId}: ${err.message}`);
      }
    }

    const idx = MEMORY_USERS.findIndex((u) => u.id === userId);
    if (idx !== -1) {
      MEMORY_USERS.splice(idx, 1);
      return { success: true, message: `Đã xóa tài khoản #${userId} thành công` };
    }
    throw new NotFoundException(`Không tìm thấy người dùng #${userId}`);
  }

  async resetUsers() {
    const defaultPasswordHash = await bcrypt.hash('123456', 10);
    const defaults = [
      { email: 'user@brewlite.vn', fullName: 'Nguyễn Văn A', role: 'CUSTOMER', loyaltyPoints: 50 },
      { email: 'barista@brewlite.vn', fullName: 'Nhân Viên Barista', role: 'BARISTA', loyaltyPoints: 0 },
      { email: 'admin@brewlite.vn', fullName: 'Quản Lý Cửa Hàng', role: 'ADMIN', loyaltyPoints: 100 },
    ];

    if (this.prisma.isConnected) {
      try {
        await this.prisma.payment.deleteMany();
        await this.prisma.orderItem.deleteMany();
        await this.prisma.order.deleteMany();
        await this.prisma.user.deleteMany();

        for (const u of defaults) {
          await this.prisma.user.create({
            data: {
              email: u.email,
              fullName: u.fullName,
              phone: '0901234567',
              role: u.role,
              loyaltyPoints: u.loyaltyPoints,
              passwordHash: defaultPasswordHash,
            },
          });
        }
        return {
          success: true,
          message: 'Đã reset danh sách người dùng về 3 tài khoản mặc định (mật khẩu: 123456)',
        };
      } catch (err: any) {
        throw new BadRequestException(`Lỗi khi reset người dùng: ${err.message}`);
      }
    }

    MEMORY_USERS.length = 0;
    defaults.forEach((u, idx) => {
      MEMORY_USERS.push({
        id: idx + 1,
        ...u,
        phone: '0901234567',
        passwordHash: defaultPasswordHash,
        createdAt: new Date(),
      });
    });

    return {
      success: true,
      message: 'Đã reset danh sách người dùng về 3 tài khoản mặc định (mật khẩu: 123456)',
    };
  }
}