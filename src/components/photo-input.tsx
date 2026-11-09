"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { resizeImageFile } from "@/lib/resize-image";

// A photo file input that shrinks the chosen photo before the form submits
// (lib/resize-image.ts). On phones the picker offers camera or library.
export function PhotoInput({
  onChange,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "accept">) {
  const [working, setWorking] = useState(false);
  return (
    <>
      <Input
        {...props}
        type="file"
        accept="image/*"
        onChange={async (e) => {
          onChange?.(e);
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (!file) return;
          setWorking(true);
          try {
            const resized = await resizeImageFile(file);
            if (resized !== file) {
              const dt = new DataTransfer();
              dt.items.add(resized);
              input.files = dt.files;
            }
          } finally {
            setWorking(false);
          }
        }}
      />
      {working && (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Preparing photo…
        </p>
      )}
    </>
  );
}
