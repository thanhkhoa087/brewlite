import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();
  await prisma.product.createMany({
    data: [
      { name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg' },
      { name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg' },
      { name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg' },
      { name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg' },
    ],
  });
}

main().finally(() => prisma.$disconnect());