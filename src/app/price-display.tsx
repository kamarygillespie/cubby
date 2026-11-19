import { formatCurrency } from "@/lib/format";
import { displayDiscountPercent } from "@/lib/items-view";

export function PriceDisplay({
  price,
  salePrice,
}: {
  price: number | null;
  salePrice: number | null;
}) {
  if (price === null) return null;

  const onSale = salePrice !== null && salePrice < price;

  if (!onSale) {
    return <span className="font-medium">{formatCurrency(price)}</span>;
  }

  const discountPercent = displayDiscountPercent(price, salePrice);

  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-brand font-medium">
        {formatCurrency(salePrice)}
      </span>
      <span className="text-muted-foreground text-sm line-through">
        {formatCurrency(price)}
      </span>
      {discountPercent !== null && (
        <span className="bg-brand/10 text-brand rounded-full px-2 py-0.5 text-xs font-semibold">
          -{discountPercent}%
        </span>
      )}
    </span>
  );
}
