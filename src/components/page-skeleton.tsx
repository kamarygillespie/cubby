import { cn } from "cn";

const Block = ({ className }: { className: string }) => (
  <div className={cn("bg-muted/60 animate-pulse rounded-lg", className)} />
);

// Loading placeholders shaped like the page that's about to appear (KAM-63),
// so moving between sections doesn't flash an unrelated layout.
export function PageSkeleton({
  variant,
  width = "max-w-2xl",
}: {
  variant: "grid" | "list" | "form";
  // The same max-width class as the page it stands in for.
  width?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "mx-auto flex min-h-screen w-full flex-col gap-4 p-4",
        width,
      )}
    >
      <div className="flex h-8 items-center justify-between gap-2">
        <Block className="h-6 w-32" />
        {variant !== "form" && <Block className="h-8 w-20" />}
      </div>

      {variant === "grid" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Block key={i} className="aspect-square w-full rounded-2xl" />
          ))}
        </div>
      )}

      {variant === "list" &&
        [0, 1, 2, 3, 4].map((i) => (
          <Block key={i} className="h-16 w-full rounded-xl" />
        ))}

      {variant === "form" &&
        [0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <Block className="h-4 w-24" />
            <Block className="h-9 w-full" />
          </div>
        ))}
    </div>
  );
}
