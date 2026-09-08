import { StatusBadge } from "@/components/shared/status-badge";

export function ActivityItem({
  title,
  detail,
  status,
}: {
  title: string;
  detail?: string;
  status?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div>
        <p className="font-medium">{title}</p>
        {detail ? <p className="text-muted-foreground">{detail}</p> : null}
      </div>
      {status ? <StatusBadge value={status} /> : null}
    </div>
  );
}
