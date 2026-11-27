// The share page and its actions both read this cookie (KAM-77). Kept
// outside actions.ts, because a "use server" file may only export async
// functions.
export const GIVER_COOKIE = "cubby_giver";
