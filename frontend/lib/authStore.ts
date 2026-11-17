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
  setAuth: (token: string, email: string, fullName?: string, phone?: string, role?: string) => void;
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
      setAuth: (token, email, fullName, phone, role) =>
        set({
          token,
          email,
          fullName: cleanFullName(fullName, email),
          phone: phone || '',
          role: role || 'CUSTOMER',
        }),
      logout: () => set({ token: null, email: null, fullName: null, phone: null, role: null }),
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