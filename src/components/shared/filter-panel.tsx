import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function FilterPanel({ children }: { children: ReactNode }) {
  return <Card className="p-4">{children}</Card>;
}
