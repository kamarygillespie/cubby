"use client";

import { useActionState, useState } from "react";
import { Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SIZE_KINDS, type Sizes } from "@/lib/sizes";
import { saveSizesAction } from "./actions";

// "Your sizes" (KAM-78): shown to givers on share links, next to the items
// they fit. Collapsed once filled in.
export function SizesForm({ sizes }: { sizes: Sizes }) {
  const [state, formAction, pending] = useActionState(saveSizesAction, null);
  const filled = SIZE_KINDS.filter((k) => sizes[k.key]);
  // Open until some are filled in; then a one-line summary. Saving keeps it
  // open, so the confirmation stays in view.
  const [open, setOpen] = useState(filled.length === 0);

  return (
    <details
      className="bg-card rounded-xl border p-3 text-sm"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <Ruler className="size-4" aria-hidden />
        Your sizes
        <span className="text-muted-foreground truncate font-normal">
          {filled.length
            ? filled.map((k) => `${k.label} ${sizes[k.key]}`).join(" · ")
            : "Add them so people you share with buy the right size"}
        </span>
      </summary>
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIZE_KINDS.filter((k) => k.key !== "other").map((kind) => (
            <div key={kind.key} className="flex flex-col gap-1">
              <Label htmlFor={`size-${kind.key}`} className="text-xs">
                {kind.label}
              </Label>
              <Input
                id={`size-${kind.key}`}
                name={kind.key}
                defaultValue={sizes[kind.key] ?? ""}
                maxLength={20}
                placeholder={
                  kind.key === "shoes"
                    ? "8.5"
                    : kind.key === "bras"
                      ? "34C"
                      : ""
                }
              />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="size-other" className="text-xs">
            Anything else (fit, inseam, colors you love)
          </Label>
          <Input
            id="size-other"
            name="other"
            defaultValue={sizes.other ?? ""}
            maxLength={80}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          Shown on your share links (each list can turn this off), next to the
          items they fit.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save sizes"}
          </Button>
          {state && (
            <p role="status" className="text-muted-foreground text-xs">
              {state.message}
            </p>
          )}
        </div>
      </form>
    </details>
  );
}
