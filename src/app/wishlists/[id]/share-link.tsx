"use client";

import { useState } from "react";
import { Check, ExternalLink, Link2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareLink({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const path = `/share/${shareToken}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions, insecure context) — show the URL so
      // it can be copied by hand.
      setShowUrl(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check /> : <Link2 />}
          {copied ? "Copied!" : "Copy share link"}
        </Button>
        <a
          href={path}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          Preview
          <ExternalLink />
        </a>
      </div>
      {showUrl && (
        <Input
          readOnly
          aria-label="Share link"
          value={`${window.location.origin}${path}`}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}
      <p className="text-muted-foreground text-xs">
        Anyone with the link can view this list — no account needed. Purchased
        and gifted items are hidden from it.
      </p>
    </div>
  );
}
