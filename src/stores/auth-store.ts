"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginWithEmailPassword, logoutCurrentUser } from "@/services/auth/auth.service";
import type { AuthenticatedUser } from "@/types/rbac";

interface AuthState {
  user: AuthenticatedUser | null;
  hydrated: boolean;
  setHydrated: () => void;
  setUser: (user: AuthenticatedUser | null) => void;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      setUser: (user) => set({ user }),
      login: async (email, password, remember = true) => {
        const result = await loginWithEmailPassword(email, password, remember);
        set({ user: result.user });
      },
      logout: async () => {
        await logoutCurrentUser(get().user);
        set({ user: null });
      },
    }),
    {
      name: "patri-cmo-auth",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
