import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="relative block w-full">
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </label>
  );
}
