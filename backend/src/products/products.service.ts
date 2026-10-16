import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class ProductsService {
  private products = [
    { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg' },
    { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg' },
    { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg' },
    { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg' },
  ];

  findAll() {
    return this.products;
  }

  findOne(id: number) {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }
}