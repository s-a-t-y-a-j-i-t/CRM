import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  hasMore,
  total,
  onPageChange,
}: {
  page: number;
  hasMore: boolean;
  total: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <p>
        {total} records · page {page}
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={!hasMore} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
