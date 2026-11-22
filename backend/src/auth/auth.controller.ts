import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto, CreateBaristaDto } from './auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  register(@Body() dto: AuthDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AuthDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: { userId: number } }) {
    return this.auth.getProfile(req.user.userId);
  }

  // --- QUẢN LÝ TÀI KHOẢN BARISTA (CHỈ DÀNH CHO ADMIN / QUẢN LÝ) ---

  @UseGuards(JwtAuthGuard)
  @Get('baristas')
  getBaristas(@Request() req: { user: { userId: number } }) {
    return this.auth.getBaristas(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('baristas')
  createBarista(
    @Request() req: { user: { userId: number } },
    @Body() dto: CreateBaristaDto,
  ) {
    return this.auth.createBarista(req.user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('baristas/:id')
  deleteBarista(
    @Request() req: { user: { userId: number } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.auth.deleteBarista(req.user.userId, id);
  }

  // --- QUẢN LÝ DANH SÁCH USER ---

  @Get('users')
  getAllUsers() {
    return this.auth.getAllUsers();
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.auth.deleteUser(id);
  }

  @Post('users/reset')
  resetUsers() {
    return this.auth.resetUsers();
  }
}