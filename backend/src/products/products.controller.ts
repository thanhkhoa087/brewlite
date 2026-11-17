import { Body, Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('ingredients/stock')
  getRawIngredients() {
    return this.productsService.getRawIngredients();
  }

  @Patch('ingredients/:id/stock')
  updateIngredientStock(
    @Param('id', ParseIntPipe) id: number,
    @Body('stock', ParseIntPipe) stock: number,
  ) {
    return this.productsService.updateIngredientStock(id, stock);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}