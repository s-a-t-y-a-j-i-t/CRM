import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  hideOnTablet?: boolean;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-3 py-3 font-medium", column.hideOnTablet && "hidden lg:table-cell", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn("border-b border-border/70 last:border-0", onRowClick && "cursor-pointer hover:bg-muted/50")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-3 py-3 align-middle", column.hideOnTablet && "hidden lg:table-cell", column.className)}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className="w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns
              .filter((column) => !column.hideOnMobile)
              .slice(0, 5)
              .map((column) => (
                <div key={column.key} className="flex items-start justify-between gap-3 py-1 text-sm">
                  <span className="text-xs text-muted-foreground">{column.header}</span>
                  <span className="text-right">{column.render(row)}</span>
                </div>
              ))}
          </button>
        ))}
      </div>
    </>
  );
}
