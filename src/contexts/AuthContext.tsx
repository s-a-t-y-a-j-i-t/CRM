"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { isDemoMode, isFirebaseConfigured } from "@/lib/env";
import { getClientAuth } from "@/lib/firebase/client";
import { toAuthenticatedUser, useIdentityStore } from "@/stores/identity-store";
import { useAuthStore } from "@/stores/auth-store";
import { logoutCurrentUser } from "@/services/auth/auth.service";
import type { IdentityProfile } from "@/types/identity";
import type { AuthenticatedUser } from "@/types/rbac";

export interface AuthContextValue {
  user: AuthenticatedUser | null;
  profile: IdentityProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const storeUser = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const login = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const users = useIdentityStore((state) => state.users);
  const roles = useIdentityStore((state) => state.roles);

  const profile = useMemo(() => {
    if (!storeUser) return null;
    return (
      users.find((item) => item.firebaseUid === storeUser.uid || item.id === storeUser.uid || item.email === storeUser.email) ??
      null
    );
  }, [storeUser, users]);

  const user = useMemo(() => {
    if (!storeUser) return null;
    if (profile) return toAuthenticatedUser(profile, roles);
    return storeUser;
  }, [storeUser, profile, roles]);

  useEffect(() => {
    if (!hydrated || !storeUser || !profile) return;
    if (profile.status !== "ACTIVE") {
      void logoutCurrentUser(storeUser).then(() => setUser(null));
    }
  }, [hydrated, storeUser, profile, setUser]);

  useEffect(() => {
    if (!hydrated || isDemoMode() || !isFirebaseConfigured()) return;
    const auth = getClientAuth();
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && useAuthStore.getState().user) {
        setUser(null);
      }
    });
    return unsubscribe;
  }, [hydrated, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading: !hydrated,
      isAuthenticated: Boolean(user && user.isActive && user.status !== "SUSPENDED" && user.status !== "INACTIVE"),
      login,
      logout: async () => {
        await logoutCurrentUser(user);
        setUser(null);
      },
    }),
    [user, profile, hydrated, login, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
