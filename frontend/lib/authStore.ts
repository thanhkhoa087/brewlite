import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthState = {
  token: string | null;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  setAuth: (token: string, email: string, fullName?: string, phone?: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      fullName: null,
      phone: null,
      setAuth: (token, email, fullName, phone) =>
        set({
          token,
          email,
          fullName: fullName || email.split('@')[0],
          phone: phone || '',
        }),
      logout: () => set({ token: null, email: null, fullName: null, phone: null }),
    }),
    { name: 'brewlite-auth' },
  ),
);