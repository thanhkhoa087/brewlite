import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function cleanFullName(name?: string | null, fallbackEmail?: string | null): string {
  if (!name && fallbackEmail) return fallbackEmail.split('@')[0];
  if (!name) return '';
  return name.replace(/\s*\((?:Khách hàng|Customer|Admin|Barista)\)/gi, '').trim();
}

type AuthState = {
  token: string | null;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: string | null;
  loyaltyPoints: number;
  setAuth: (
    token: string,
    email: string,
    fullName?: string,
    phone?: string,
    role?: string,
    loyaltyPoints?: number,
  ) => void;
  setLoyaltyPoints: (points: number) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      fullName: null,
      phone: null,
      role: null,
      loyaltyPoints: 0,
      setAuth: (token, email, fullName, phone, role, loyaltyPoints) =>
        set({
          token,
          email,
          fullName: cleanFullName(fullName, email),
          phone: phone || '',
          role: role || 'CUSTOMER',
          loyaltyPoints: loyaltyPoints ?? 0,
        }),
      setLoyaltyPoints: (points) => set({ loyaltyPoints: points }),
      logout: () =>
        set({
          token: null,
          email: null,
          fullName: null,
          phone: null,
          role: null,
          loyaltyPoints: 0,
        }),
    }),
    {
      name: 'brewlite-auth',
      onRehydrateStorage: () => (state) => {
        if (state && state.fullName) {
          state.fullName = cleanFullName(state.fullName, state.email);
        }
      },
    },
  ),
);