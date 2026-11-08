// Pure rules for custom categories and item types.

export const TAXONOMY_NAME_MAX_LENGTH = 40;

export type TaxonomyNameResult =
  { ok: true; name: string } | { ok: false; error: string };

export function parseTaxonomyName(raw: string): TaxonomyNameResult {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Give it a name." };
  if (name.length > TAXONOMY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the name to ${TAXONOMY_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { ok: true, name };
}

// Postgres error codes surfaced by PostgREST, mapped to messages people can
// act on. 23505: the duplicate-name trigger; 23503: ON DELETE RESTRICT.
export function taxonomyErrorMessage(
  error: unknown,
  kind: "category" | "item type",
): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "23505") return `You already have a ${kind} with that name.`;
  if (code === "23503") {
    return kind === "category"
      ? "This category still has item types. Move or delete them first."
      : "Items still use this type. Change their type first.";
  }
  return `Couldn't save the ${kind}. Try again.`;
}
