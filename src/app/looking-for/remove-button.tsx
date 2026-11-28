"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeLookingForAction } from "./actions";

export function RemoveLookingFor({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={pending}
      aria-label={`Remove ${title}`}
      onClick={() => startTransition(() => removeLookingForAction(id))}
    >
      <X />
    </Button>
  );
}
