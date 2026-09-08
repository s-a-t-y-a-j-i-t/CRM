import type { ReactNode } from "react";

export function Timeline({ children }: { children: ReactNode }) {
  return <ol className="space-y-4 border-l border-border pl-4">{children}</ol>;
}

export function TimelineItem({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children?: ReactNode;
}) {
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-primary" />
      <p className="text-sm font-medium">{title}</p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      {children}
    </li>
  );
}
