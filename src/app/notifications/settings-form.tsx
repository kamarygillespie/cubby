"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NotificationSettings } from "@/lib/db/notifications";
import { saveSettingsAction } from "./actions";

export function SettingsForm({ settings }: { settings: NotificationSettings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Checkbox
          id="price_drops"
          name="price_drops"
          defaultChecked={settings.price_drops}
        />
        <Label htmlFor="price_drops">Price drops on my wishlist</Label>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <Label htmlFor="min_drop_percent" className="text-muted-foreground">
          When it drops at least
        </Label>
        <Input
          id="min_drop_percent"
          name="min_drop_percent"
          type="number"
          inputMode="numeric"
          min={1}
          max={90}
          defaultValue={settings.min_drop_percent}
          className="w-20"
        />
        <span className="text-muted-foreground text-sm">%</span>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="store_sales"
          name="store_sales"
          defaultChecked={settings.store_sales}
        />
        <Label htmlFor="store_sales">Sales at my favorite stores</Label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          Save
        </Button>
        {state?.saved && (
          <p role="status" className="text-muted-foreground text-sm">
            Saved
          </p>
        )}
        {state?.error && (
          <p role="alert" className="text-destructive text-sm">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
