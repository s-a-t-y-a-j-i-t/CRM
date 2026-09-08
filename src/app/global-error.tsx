"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-8">
        <div className="space-y-3 text-center">
          <h1 className="text-lg font-semibold">Application error</h1>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
