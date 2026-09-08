import { Suspense } from "react";
import { AuthLoading } from "@/components/auth/auth-loading";
import { LoginScreen } from "@/features/auth/login-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthLoading message="Loading sign-in…" />}>
      <LoginScreen />
    </Suspense>
  );
}
