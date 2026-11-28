// "Looking for" (KAM-102): things wanted before a product is found. Pure,
// so it's unit-tested.
import { formatCurrency } from "@/lib/format";

export type LookingForEntry = {
  title: string;
  notes: string | null;
  budget: number | null;
};

export const LOOKING_FOR_TITLE_MAX = 120;
export const LOOKING_FOR_NOTES_MAX = 500;

export function parseLookingFor(input: {
  title: unknown;
  notes?: unknown;
  budget?: unknown;
}): { ok: true; value: LookingForEntry } | { ok: false; error: string } {
  const text = (v: unknown, max: number) =>
    typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
  const title = text(input.title, LOOKING_FOR_TITLE_MAX);
  if (!title) return { ok: false, error: "What are you looking for?" };
  const rawBudget =
    typeof input.budget === "string" ? input.budget.replace(/[$,\s]/g, "") : "";
  let budget: number | null = null;
  if (rawBudget) {
    const n = Number(rawBudget);
    if (!Number.isFinite(n) || n <= 0 || n >= 10_000_000) {
      return { ok: false, error: "Budget should be an amount above $0." };
    }
    budget = Math.round(n * 100) / 100;
  }
  return {
    ok: true,
    value: {
      title,
      notes: text(input.notes, LOOKING_FOR_NOTES_MAX) || null,
      budget,
    },
  };
}

// "Essential oil diffuser (under $60): white or wood, quiet" for Copy
// wishlist and anywhere else it's shown as one line.
export function lookingForLine(entry: LookingForEntry): string {
  const budget =
    entry.budget !== null ? ` (under ${formatCurrency(entry.budget)})` : "";
  return `${entry.title}${budget}${entry.notes ? `: ${entry.notes}` : ""}`;
}
