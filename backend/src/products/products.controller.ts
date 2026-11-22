import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('ingredients/stock')
  getRawIngredients(@Request() req: { user: { userId: number; role?: string } }) {
    if (req.user.role !== 'BARISTA' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Chỉ nhân viên Barista hoặc Quản lý mới có quyền xem kho nguyên liệu',
      );
    }
    return this.productsService.getRawIngredients();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('ingredients/:id/stock')
  updateIngredientStock(
    @Request() req: { user: { userId: number; role?: string } },
    @Param('id', ParseIntPipe) id: number,
    @Body('stock', ParseIntPipe) stock: number,
  ) {
    if (req.user.role !== 'BARISTA' && req.user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Truy cập bị từ chối: Chỉ nhân viên Barista hoặc Quản lý mới có quyền cập nhật kho nguyên liệu',
      );
    }
    return this.productsService.updateIngredientStock(id, stock);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}