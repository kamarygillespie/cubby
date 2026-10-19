import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ level }: { level: number | null }) {
  if (!level) return null;

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${level} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-3.5",
            n <= level ? "fill-primary text-primary" : "text-muted-foreground",
          )}
        />
      ))}
    </div>
  );
}
