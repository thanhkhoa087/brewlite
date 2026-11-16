import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { AuthDto } from './auth.dto';

const MEMORY_USERS: any[] = [
  {
    id: 1,
    email: 'user@brewlite.vn',
    fullName: 'Trần Thanh Khoa',
    phone: '0901234567',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // 123456
  },
  {
    id: 2,
    email: 'barista@brewlite.vn',
    fullName: 'Quầy Barista',
    phone: '0987654321',
    passwordHash: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', // 123456
  },
];
let memoryUserSeq = 3;

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
          },
        });
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
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
    };
    MEMORY_USERS.push(newUser);
    return {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
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
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      fullName,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName,
        phone,
      },
    };
  }
}