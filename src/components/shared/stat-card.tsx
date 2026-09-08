import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
