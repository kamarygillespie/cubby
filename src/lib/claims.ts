// Gift-giver claims on shared lists (KAM-77): pure helpers shared by the
// share page, its actions and the owner's views.

export const CLAIMER_NAME_MAX_LENGTH = 40;

// What claim_shared_item() can answer.
export type ClaimOutcome =
  "claimed" | "mine" | "taken" | "limit" | "owner" | "not_found";

// How a shared item looks to this viewer.
export type ClaimState = "open" | "mine" | "taken";

export type SharedClaims = {
  // The signed-in viewer owns this list (claims hidden unless Show claims).
  owner: boolean;
  states: Map<string, Exclude<ClaimState, "open">>;
};

export function parseClaimerName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CLAIMER_NAME_MAX_LENGTH);
  return name || null;
}

const KNOWN: ClaimOutcome[] = [
  "claimed",
  "mine",
  "taken",
  "limit",
  "owner",
  "not_found",
];

export function toClaimOutcome(value: unknown): ClaimOutcome {
  return KNOWN.includes(value as ClaimOutcome)
    ? (value as ClaimOutcome)
    : "not_found";
}

// get_shared_claims() JSON → per-item state. Anything malformed reads as "no
// claims", never as an error on a public page.
export function parseSharedClaims(raw: unknown): SharedClaims {
  const empty: SharedClaims = { owner: false, states: new Map() };
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as { owner?: unknown; claims?: unknown };
  const states = new Map<string, "mine" | "taken">();
  if (Array.isArray(data.claims)) {
    for (const claim of data.claims) {
      if (!claim || typeof claim !== "object") continue;
      const { item_id, mine } = claim as { item_id?: unknown; mine?: unknown };
      if (typeof item_id === "string") {
        states.set(item_id, mine === true ? "mine" : "taken");
      }
    }
  }
  return { owner: data.owner === true, states };
}

// What the giver sees after tapping "I'm getting this".
export function claimMessage(outcome: ClaimOutcome): {
  state: ClaimState;
  message: string | null;
} {
  switch (outcome) {
    case "claimed":
    case "mine":
      return { state: "mine", message: null };
    case "taken":
      return {
        state: "taken",
        message: "Someone else just claimed this one.",
      };
    case "limit":
      return {
        state: "open",
        message: "You've claimed a lot of items. Undo one to claim another.",
      };
    case "owner":
      return {
        state: "open",
        message: "This is your list, so you can't claim from it.",
      };
    default:
      return {
        state: "open",
        message: "This item isn't on the list anymore.",
      };
  }
}
