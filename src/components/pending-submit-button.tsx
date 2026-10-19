"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// A submit button for server-action forms: disabled while its form is
// submitting, so a slow action can't be double-fired and the tap visibly
// registered.
export function PendingSubmitButton({
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      {...props}
    />
  );
}
