"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureBookmarklet, captureShortcutScript } from "@/lib/page-capture";

const subscribe = () => () => {};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      disabled={!value}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="text-muted-foreground flex list-decimal flex-col gap-1.5 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export function SaveButtonSetup() {
  // The button must point at whichever Cubby the user is on.
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
  const bookmarklet = origin ? captureBookmarklet(origin) : "";
  const shortcutScript = origin ? captureShortcutScript(origin) : "";

  return (
    <>
      <section className="flex flex-col gap-3 rounded-2xl border p-4">
        <h2 className="text-lg">On a computer</h2>
        <Steps
          items={[
            "Show your browser's bookmarks bar.",
            "Drag the button below onto the bookmarks bar.",
            "On any product page, click Save to Cubby.",
          ]}
        />
        {/* React refuses javascript: links, so it's set on the element. */}
        <a
          ref={(link) => {
            if (link && bookmarklet) link.setAttribute("href", bookmarklet);
          }}
          draggable
          onClick={(event) => event.preventDefault()}
          className="bg-primary text-primary-foreground inline-flex w-fit cursor-grab items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
        >
          <Heart className="size-4" aria-hidden />
          Save to Cubby
        </a>
        <p className="text-muted-foreground text-xs">
          This is a button to drag, so clicking it here won&apos;t do anything.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border p-4">
        <h2 className="text-lg">On an iPhone</h2>
        <Steps
          items={[
            "Copy the script below.",
            "In the Shortcuts app, tap + and name the shortcut Save to Cubby.",
            "Add the action Run JavaScript on Web Page, then replace its text with the script.",
            "Add the action Open URLs, using the JavaScript Result.",
            "In the shortcut's details, turn on Show in Share Sheet.",
            "In Safari, open a product, tap Share, then Save to Cubby. Allow access if asked.",
          ]}
        />
        <CopyButton value={shortcutScript} label="Copy iPhone script" />
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border p-4">
        <h2 className="text-lg">Updating a price</h2>
        <p className="text-muted-foreground text-sm">
          Use Save to Cubby on something you&apos;ve already saved, and Cubby
          will offer to update its price. This is how to keep prices current at
          stores Cubby can&apos;t check automatically.
        </p>
      </section>
    </>
  );
}
