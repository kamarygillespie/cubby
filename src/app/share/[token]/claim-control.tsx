"use client";

import { useState, useTransition } from "react";
import { Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLAIMER_NAME_MAX_LENGTH, type ClaimState } from "@/lib/claims";
import { claimItemAction, unclaimItemAction } from "./actions";

// "I'm getting this" on a shared item (KAM-77).
export function ClaimControl({
  token,
  itemId,
  title,
  initialState,
}: {
  token: string;
  itemId: string;
  title: string;
  initialState: ClaimState;
}) {
  const [state, setState] = useState<ClaimState>(initialState);
  const [asking, setAsking] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state === "taken") {
    return (
      <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
        <Gift className="size-4" aria-hidden />
        Someone&apos;s getting this
      </p>
    );
  }

  if (state === "mine") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-brand flex items-center gap-1.5 font-medium">
          <Check className="size-4" aria-hidden />
          You&apos;re getting this
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          disabled={pending}
          aria-label={`Undo: I'm not getting ${title}`}
          onClick={() =>
            startTransition(async () => {
              const { ok } = await unclaimItemAction(token, itemId);
              if (ok) setState("open");
              else setMessage("Couldn't undo that. Try again.");
            })
          }
        >
          Undo
        </Button>
        {message && (
          <p role="alert" className="text-destructive w-full text-xs">
            {message}
          </p>
        )}
      </div>
    );
  }

  if (!asking) {
    return (
      <div className="mt-1 flex flex-col gap-1">
        <Button
          size="sm"
          className="self-start"
          aria-label={`I'm getting ${title}`}
          onClick={() => {
            setMessage(null);
            setAsking(true);
          }}
        >
          <Gift />
          I&apos;m getting this
        </Button>
        {message && (
          <p role="status" className="text-muted-foreground text-xs">
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="bg-muted/50 mt-1 flex flex-col gap-2 rounded-lg p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await claimItemAction(token, itemId, name);
          setState(result.state);
          setMessage(result.message);
          setAsking(false);
        });
      }}
    >
      <p className="text-sm">
        Others viewing this list will see it&apos;s taken, but not by whom. The
        list&apos;s owner doesn&apos;t see claims unless they choose to, so it
        can stay a surprise.
      </p>
      <Label htmlFor={`claim-name-${itemId}`} className="text-xs">
        Your name (optional, shown only to the owner if they turn claims on)
      </Label>
      <Input
        id={`claim-name-${itemId}`}
        value={name}
        maxLength={CLAIMER_NAME_MAX_LENGTH}
        autoComplete="given-name"
        placeholder="e.g. Aunt May"
        onChange={(e) => setName(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Claim it"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAsking(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
