import { redirect as nextRedirect } from "next/navigation";
import type { Route } from "next";

export function redirectTo(path: string): never {
  nextRedirect(path as Route);
}
