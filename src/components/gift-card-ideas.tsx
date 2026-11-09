import { Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { GiftCardIdea } from "@/lib/stores";

// "Gift card ideas": stores that carry several of the wished-for items
// (lib/stores.ts giftCardIdeas). Renders nothing when there are none.
export function GiftCardIdeas({
  ideas,
  description,
  limit = 5,
}: {
  ideas: GiftCardIdea[];
  description: string;
  limit?: number;
}) {
  if (ideas.length === 0) return null;
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Gift className="size-4" aria-hidden />
          <h2 className="text-sm font-medium">Gift card ideas</h2>
        </div>
        <p className="text-muted-foreground text-xs">{description}</p>
        <ul className="flex flex-col gap-1">
          {ideas.slice(0, limit).map((idea) => (
            <li
              key={idea.store}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="font-medium">{idea.store}</span>
              <span className="text-muted-foreground shrink-0">
                {idea.itemCount} items · {formatCurrency(idea.total)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
