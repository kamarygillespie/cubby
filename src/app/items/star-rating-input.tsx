"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = [1, 2, 3, 4, 5] as const;

export function StarRatingInput({
  name,
  defaultValue = null,
}: {
  name: string;
  defaultValue?: number | null;
}) {
  const [value, setValue] = useState<number | null>(defaultValue);
  const [hovered, setHovered] = useState<number | null>(null);
  const displayed = hovered ?? value ?? 0;

  return (
    <div
      role="radiogroup"
      aria-label="Interest level"
      className="flex items-center gap-1"
      onMouseLeave={() => setHovered(null)}
    >
      <input type="hidden" name={name} value={value ?? ""} />
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={value === level}
          aria-label={`${level} star${level > 1 ? "s" : ""}`}
          onMouseEnter={() => setHovered(level)}
          onFocus={() => setHovered(level)}
          onBlur={() => setHovered(null)}
          onClick={() => setValue(value === level ? null : level)}
          className="focus-visible:ring-ring/50 rounded outline-none focus-visible:ring-3"
        >
          <Star
            className={cn(
              "text-muted-foreground size-5 transition-colors",
              level <= displayed && "fill-primary text-primary",
            )}
          />
        </button>
      ))}
    </div>
  );
}
