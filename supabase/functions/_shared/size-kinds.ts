// Which saved size fits an item (KAM-78, KAM-97). Shared by the app (share
// page size hints) and the Edge Functions (stock checks), so it has no
// imports and works in both Node and Deno.

export type SizeKindKey =
  "tops" | "bottoms" | "dresses" | "shoes" | "rings" | "bras";

// Which sizes matter for an item, from its type and category names. Works
// for the built-in types and most custom ones ("Wide Leg Jeans" → bottoms).
export function sizeKindsFor(
  itemType: string,
  category: string,
): SizeKindKey[] {
  const text = `${itemType} ${category}`.toLowerCase();
  if (
    /\bshoes?\b|sneaker|\bboots?\b|\bflats\b|loafer|clog|\bheels?\b|sandal|slipper/.test(
      text,
    )
  ) {
    return ["shoes"];
  }
  if (/\bbras?\b/.test(text)) return ["bras"];
  if (/\brings?\b/.test(text)) return ["rings"];
  if (/\bdress/.test(text)) return ["dresses"];
  const tops =
    /\btops?\b|blouse|sweater|shirt|\btee\b|hoodie|jacket|coat|cardigan/.test(
      text,
    );
  const bottoms =
    /\bbottoms?\b|pant|jean|legging|jogger|skirt|\bshorts\b|trouser|underwear/.test(
      text,
    );
  return [
    ...(tops ? ["tops" as const] : []),
    ...(bottoms ? ["bottoms" as const] : []),
  ];
}

// The saved size for an item's type ("m" for a sweater when tops is "M"),
// or null when no saved size fits.
export function savedSizeFor(
  sizes: Partial<Record<string, string>> | null | undefined,
  itemType: string,
  category: string,
): string | null {
  if (!sizes) return null;
  for (const kind of sizeKindsFor(itemType, category)) {
    const value = sizes[kind];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
