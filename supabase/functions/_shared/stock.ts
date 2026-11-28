// Stock for the size Kamary wants (KAM-75). Her size is usually in the
// item's notes ("size M", "sz 8.5", "Size: 30x32").

const ALIASES: Record<string, string> = {
  extrasmall: "xs",
  xsmall: "xs",
  small: "s",
  medium: "m",
  med: "m",
  large: "l",
  extralarge: "xl",
  xlarge: "xl",
  xxlarge: "xxl",
  "2xl": "xxl",
  xxsmall: "xxs",
  "2xs": "xxs",
};

export function normalizeSize(size: string): string {
  const key = size.toLowerCase().replace(/[\s_-]+/g, "");
  return ALIASES[key] ?? key;
}

// Two-word sizes first, so "extra small" isn't read as just "extra".
const SIZE_IN_NOTES =
  /\b(?:size|sz)\s*[:=-]?\s*(extra[\s-]?(?:small|large)|x[\s-](?:small|large)|[a-z0-9][a-z0-9./]*(?:\s*x\s*\d+)?)\b/i;

export function wantedSize(notes: string | null | undefined): string | null {
  const match = notes?.match(SIZE_IN_NOTES);
  return match ? normalizeSize(match[1]) : null;
}

export type Stock = {
  inStock: boolean | null;
  // The size the answer is about, when it's size-specific.
  size: string | null;
};

// The wanted size's stock when the page lists it; otherwise the item's.
// The size comes from the notes, else from the saved size for the item's
// type (KAM-97, "Your sizes").
export function stockForNotes(
  page: {
    inStock: boolean | null;
    sizes: { size: string; inStock: boolean }[];
  },
  notes: string | null | undefined,
  savedSize?: string | null,
): Stock {
  const want =
    wantedSize(notes) ?? (savedSize ? normalizeSize(savedSize) : null);
  if (want) {
    const match = page.sizes.find((s) => normalizeSize(s.size) === want);
    if (match) return { inStock: match.inStock, size: want };
  }
  return { inStock: page.inStock, size: null };
}
