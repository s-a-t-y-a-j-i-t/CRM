"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-8">
      <ErrorState message={error.message || "The workspace failed to load."} onRetry={reset} />
    </div>
  );
}
