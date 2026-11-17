export interface RawIngredient {
  id: number;
  name: string;
  unit: string;
  stock: number; // Khối lượng nguyên liệu thô trong kho (g hoặc ml)
  version: number;
}

export interface RecipeRequirement {
  ingredientId: number;
  amount: number; // Khối lượng nguyên liệu thô (g) cho 1 ly size tiêu chuẩn (Size S)
}

// 1. Kho nguyên liệu thô ban đầu (In-memory store & seeding)
export const MEMORY_INGREDIENTS: Map<number, RawIngredient> = new Map([
  [1, { id: 1, name: 'Cà phê Robusta (hạt rang mộc)', unit: 'g', stock: 5000, version: 0 }], // 5000g = 5kg
  [2, { id: 2, name: 'Sữa đặc có đường', unit: 'g', stock: 4000, version: 0 }],             // 4000g = 4kg
  [3, { id: 3, name: 'Cốt trà đào thượng hạng', unit: 'g', stock: 3000, version: 0 }],       // 3000g = 3kg
  [4, { id: 4, name: 'Đào miếng ngâm đường', unit: 'g', stock: 2000, version: 0 }],          // 2000g = 2kg
  [5, { id: 5, name: 'Topping Trân châu đen', unit: 'g', stock: 2500, version: 0 }],         // 2500g = 2.5kg
  [6, { id: 6, name: 'Topping Kem béo phô mai', unit: 'g', stock: 2000, version: 0 }],       // 2000g = 2kg
]);

// 2. Công thức định lượng quy đổi cho từng món nước (Recipe per Drink)
export const PRODUCT_RECIPES: Record<number, RecipeRequirement[]> = {
  1: [
    // 1 ly Cà phê sữa: 15g Cà phê + 25g Sữa đặc
    { ingredientId: 1, amount: 15 },
    { ingredientId: 2, amount: 25 },
  ],
  2: [
    // 1 ly Americano: 18g Cà phê
    { ingredientId: 1, amount: 18 },
  ],
  3: [
    // 1 ly Cappuccino: 18g Cà phê + 30g Sữa
    { ingredientId: 1, amount: 18 },
    { ingredientId: 2, amount: 30 },
  ],
  4: [
    // 1 ly Trà đào: 25g Cốt trà + 35g Đào miếng ngâm
    { ingredientId: 3, amount: 25 },
    { ingredientId: 4, amount: 35 },
  ],
};

// 3. Định lượng nguyên liệu cho Topping:
export const TOPPING_INGREDIENTS: Record<string, { ingredientId: number; amount: number }> = {
  'Trân châu': { ingredientId: 5, amount: 30 }, // 30g trân châu / phần
  'Trân châu đen': { ingredientId: 5, amount: 30 },
  'Tran chau': { ingredientId: 5, amount: 30 },
  'Tran chau den': { ingredientId: 5, amount: 30 },
  Kem: { ingredientId: 6, amount: 25 },         // 25g kem béo / phần
  'Kem béo': { ingredientId: 6, amount: 25 },
  'Kem beo': { ingredientId: 6, amount: 25 },
  'Kem cheese': { ingredientId: 6, amount: 25 },
};

// 4. Hệ số nguyên liệu theo Size ly:
export const SIZE_INGREDIENT_MULTIPLIER: Record<string, number> = {
  S: 1.0,
  M: 1.2,
  L: 1.5,
};

/**
 * Backend tự động tính toán số ly tối đa có thể phục vụ cho từng món nước
 * dựa trên khối lượng nguyên liệu thô còn lại trong kho (Ingredient-based Stock)
 */
export function calculateAvailableCups(
  productId: number,
  ingredientsMap: Map<number, { stock: number }>,
): number {
  const recipe = PRODUCT_RECIPES[productId];
  if (!recipe || recipe.length === 0) return 100;

  let maxCups = Infinity;
  for (const item of recipe) {
    const ing = ingredientsMap.get(item.ingredientId);
    if (!ing) return 0;
    const cups = Math.floor(ing.stock / item.amount);
    if (cups < maxCups) {
      maxCups = cups;
    }
  }
  return maxCups === Infinity ? 0 : maxCups;
}

/**
 * Tính toán tổng khối lượng nguyên liệu thô (gam) cần dùng cho một danh sách món đặt
 */
export function calculateRequiredIngredients(
  items: Array<{ productId: number; size: string; toppings: string[]; qty: number }>,
): Map<number, number> {
  const required = new Map<number, number>();

  for (const item of items) {
    const multiplier = SIZE_INGREDIENT_MULTIPLIER[item.size] || 1.0;
    const recipes = PRODUCT_RECIPES[item.productId] || [];

    // Tính nguyên liệu cốt lõi của món
    for (const r of recipes) {
      const amountPerCup = Math.round(r.amount * multiplier);
      const totalAmount = amountPerCup * item.qty;
      required.set(r.ingredientId, (required.get(r.ingredientId) || 0) + totalAmount);
    }

    // Tính nguyên liệu của topping
    for (const t of item.toppings) {
      const topInfo = TOPPING_INGREDIENTS[t];
      if (topInfo) {
        const totalTopAmount = topInfo.amount * item.qty;
        required.set(
          topInfo.ingredientId,
          (required.get(topInfo.ingredientId) || 0) + totalTopAmount,
        );
      }
    }
  }

  return required;
}
