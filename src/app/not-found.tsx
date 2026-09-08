import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">This route is not part of the PATRI CMO workspace.</p>
      <Link href="/dashboard" className="text-sm underline">
        Return to dashboard
      </Link>
    </div>
  );
}
