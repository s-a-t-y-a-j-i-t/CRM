import { Construction } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Construction className="size-8 text-muted-foreground" />
          <p className="font-medium">Scheduled for a later phase</p>
          <p className="max-w-xl text-sm text-muted-foreground">
            Types, Zod schemas, Firestore services, RBAC keys, and audit hooks for this module are already in the
            foundation. Implementation starts after Authentication and User Management.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
