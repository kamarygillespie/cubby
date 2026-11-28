"use client";

import { useActionState, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LOOKING_FOR_NOTES_MAX,
  LOOKING_FOR_TITLE_MAX,
} from "@/lib/looking-for";
import { addLookingForAction } from "./actions";

// Jot something down in a couple of taps (KAM-102); details are optional.
export function AddLookingForForm() {
  const [state, action, pending] = useActionState(
    async (prev: { error?: string; added?: string } | null, data: FormData) => {
      const result = await addLookingForAction(prev, data);
      if (result.added) formRef.current?.reset();
      return result;
    },
    null,
  );
  const [details, setDetails] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Label htmlFor="lf-title" className="sr-only">
          What are you looking for?
        </Label>
        <Input
          id="lf-title"
          name="title"
          required
          maxLength={LOOKING_FOR_TITLE_MAX}
          placeholder="e.g. Essential oil diffuser"
        />
        <Button type="submit" disabled={pending}>
          <Plus />
          Add
        </Button>
      </div>
      {details ? (
        <div className="grid gap-2 sm:grid-cols-[8rem_1fr]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="lf-budget" className="text-xs">
              Budget (up to)
            </Label>
            <Input
              id="lf-budget"
              name="budget"
              inputMode="decimal"
              placeholder="$60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="lf-notes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="lf-notes"
              name="notes"
              rows={2}
              maxLength={LOOKING_FOR_NOTES_MAX}
              placeholder="Color, style, where it's for"
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto self-start p-0"
          onClick={() => setDetails(true)}
        >
          Add a budget or notes
        </Button>
      )}
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      )}
      {state?.added && (
        <p role="status" className="text-muted-foreground text-sm">
          Added “{state.added}”.
        </p>
      )}
    </form>
  );
}
