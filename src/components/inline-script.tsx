"use client";

// A <script> that runs once during HTML parsing on a full page load. On the
// client it renders as text/plain so React doesn't warn about (or re-run)
// script tags; suppressHydrationWarning covers the type mismatch. Pattern
// from Next's "preventing flash before hydration" guide. Must be a Client
// Component: in a Server Component `typeof window` is always undefined, so
// client-side renders (e.g. Next's not-found recovery) would still get a
// text/javascript script and React would warn.
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
