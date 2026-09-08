import { Input } from "@/components/ui/input";

export function DatePicker({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />;
}
