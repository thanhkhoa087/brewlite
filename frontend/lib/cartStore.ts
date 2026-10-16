import { create } from 'zustand';

export type CartItem = {
  key: string; // nhận diện dòng: sản phẩm + size + topping
  productId: number;
  name: string;
  size: string;
  toppings: string[];
  unitPrice: number;
  qty: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'key' | 'qty'>) => void;
  setQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const key = `${item.productId}-${item.size}-${[...item.toppings].sort().join(',')}`;
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.key === key ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, { ...item, key, qty: 1 }] };
    }),

  setQty: (key, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.key !== key)
          : state.items.map((i) => (i.key === key ? { ...i, qty } : i)),
    })),

  removeItem: (key) =>
    set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

  clear: () => set({ items: [] }),
}));