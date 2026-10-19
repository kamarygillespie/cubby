"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type AutofillResult = {
  title: string | null;
  image: string | null;
  price: number | null;
  salePrice: number | null;
};

// Local Supabase (`supabase start`) returns Storage URLs using the internal
// Docker hostname — unreachable from a browser on the host. Production's
// SUPABASE_URL is the real public domain, so this never applies there.
function fixLocalStorageUrl(url: string): string {
  if (process.env.NODE_ENV !== "development") return url;
  return url.replace(
    "http://kong:8000",
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
}

export function LinkAutofillField({
  onAutofill,
}: {
  onAutofill: (result: AutofillResult, link: string) => void;
}) {
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleFetch() {
    if (!link) return;
    setStatus("loading");

    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke<AutofillResult>(
      "link-autofill",
      { body: { url: link } },
    );

    if (error || !data) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    onAutofill(
      { ...data, image: data.image ? fixLocalStorageUrl(data.image) : null },
      link,
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="autofill-link">Paste a product link (optional)</Label>
      <div className="flex gap-2">
        <Input
          id="autofill-link"
          type="url"
          placeholder="https://"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={status === "loading" || !link}
          onClick={handleFetch}
        >
          {status === "loading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Fetch details"
          )}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-muted-foreground text-sm">
          Couldn&apos;t fetch details from that link — fill in the rest manually
          below.
        </p>
      )}
    </div>
  );
}
