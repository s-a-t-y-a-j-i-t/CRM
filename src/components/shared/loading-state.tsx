import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  );
}
