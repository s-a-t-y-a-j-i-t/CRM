"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FileUpload({
  label = "Attachment",
  onFile,
  accept = "application/pdf,image/png,image/jpeg",
}: {
  label?: string;
  onFile: (file: File) => void;
  accept?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="file-upload">{label}</Label>
      <Input
        id="file-upload"
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <p className="text-xs text-muted-foreground">Stores a Storage reference only. Max 15 MB. PDF and images.</p>
    </div>
  );
}
