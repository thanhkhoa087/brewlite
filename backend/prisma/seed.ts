import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang khởi tạo dữ liệu mẫu (Seeding BrewLite DB) ---');

  // Mật khẩu mặc định cho toàn bộ tài khoản thử nghiệm là: 123456
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 1. Seed danh sách tài khoản người dùng, quản trị viên và nhân viên barista
  const defaultUsers = [
    {
      email: 'user@brewlite.vn',
      fullName: 'Nguyễn Văn A',
      phone: '0901234567',
      passwordHash: defaultPasswordHash,
      role: 'CUSTOMER',
      loyaltyPoints: 50,
    },
    {
      email: 'admin@brewlite.vn',
      fullName: 'Quản Lý Cửa Hàng',
      phone: '0988888888',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      loyaltyPoints: 100,
    },
    {
      email: 'barista@brewlite.vn',
      fullName: 'Nhân Viên Pha Chế',
      phone: '0987654321',
      passwordHash: defaultPasswordHash,
      role: 'BARISTA',
      loyaltyPoints: 0,
    },
  ];

  for (const u of defaultUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        phone: u.phone,
        passwordHash: u.passwordHash,
        role: u.role,
        loyaltyPoints: u.loyaltyPoints,
      },
      create: u,
    });
  }
  console.log(`✓ Đã tạo/cập nhật ${defaultUsers.length} tài khoản mẫu (user@brewlite.vn, admin@brewlite.vn, barista@brewlite.vn | Mật khẩu: 123456)`);

  // 2. Seed danh mục món nước mẫu (Menu)
  const defaultProducts = [
    { id: 1, name: 'Cà phê sữa', price: 35000, imageUrl: '/images/ca-phe-sua.jpg', stock: 100, version: 0 },
    { id: 2, name: 'Americano', price: 40000, imageUrl: '/images/americano.jpg', stock: 100, version: 0 },
    { id: 3, name: 'Cappuccino', price: 45000, imageUrl: '/images/cappuccino.jpg', stock: 100, version: 0 },
    { id: 4, name: 'Trà đào', price: 39000, imageUrl: '/images/tra-dao.jpg', stock: 100, version: 0 },
  ];

  for (const p of defaultProducts) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        stock: p.stock,
      },
      create: p,
    });
  }
  console.log(`✓ Đã tạo/cập nhật ${defaultProducts.length} sản phẩm mẫu vào Menu`);

  // 3. Seed danh mục nguyên liệu thô (Ingredient-based Stock)
  const defaultIngredients = [
    { id: 1, name: 'Cà phê Robusta (hạt rang mộc)', unit: 'g', stock: 5000 }, // 5kg
    { id: 2, name: 'Sữa đặc có đường', unit: 'g', stock: 4000 },             // 4kg
    { id: 3, name: 'Cốt trà đào thượng hạng', unit: 'g', stock: 3000 },       // 3kg
    { id: 4, name: 'Đào miếng ngâm đường', unit: 'g', stock: 2000 },          // 2kg
    { id: 5, name: 'Topping Trân châu đen', unit: 'g', stock: 2500 },         // 2.5kg
    { id: 6, name: 'Topping Kem béo phô mai', unit: 'g', stock: 2000 },       // 2kg
  ];

  for (const ing of defaultIngredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: { name: ing.name, unit: ing.unit, stock: ing.stock },
      create: ing,
    });
  }
  console.log(`✓ Đã tạo/cập nhật ${defaultIngredients.length} nguyên liệu thô vào kho`);

  // 4. Seed công thức định lượng (Recipe Items) cho từng ly thành phẩm
  const defaultRecipes = [
    // 1. Cà phê sữa: 15g Cà phê + 25g Sữa đặc
    { productId: 1, ingredientId: 1, amount: 15 },
    { productId: 1, ingredientId: 2, amount: 25 },
    // 2. Americano: 18g Cà phê
    { productId: 2, ingredientId: 1, amount: 18 },
    // 3. Cappuccino: 18g Cà phê + 30g Sữa
    { productId: 3, ingredientId: 1, amount: 18 },
    { productId: 3, ingredientId: 2, amount: 30 },
    // 4. Trà đào: 25g Cốt trà + 35g Đào miếng
    { productId: 4, ingredientId: 3, amount: 25 },
    { productId: 4, ingredientId: 4, amount: 35 },
  ];

  for (const r of defaultRecipes) {
    await prisma.recipeItem.upsert({
      where: {
        productId_ingredientId: {
          productId: r.productId,
          ingredientId: r.ingredientId,
        },
      },
      update: { amount: r.amount },
      create: r,
    });
  }
  console.log(`✓ Đã thiết lập công thức định lượng nguyên liệu cho các món đồ uống`);
}

main()
  .catch((e) => {
    console.error('Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
