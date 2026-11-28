"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { claimSharedItem, unclaimSharedItem } from "@/lib/db/claims";
import { claimMessage, parseClaimerName, type ClaimState } from "@/lib/claims";
import { GIVER_COOKIE } from "./giver-cookie";

// A giver's browser key (KAM-77): random, made on their first claim, kept in
// an httpOnly cookie so only that browser can undo its claims. It isn't an
// account and identifies nothing beyond "this browser".
async function giverKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GIVER_COOKIE)?.value;
  if (existing) return existing;
  const key = crypto.randomUUID();
  store.set(GIVER_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/share",
    maxAge: 60 * 60 * 24 * 365,
  });
  return key;
}

export async function claimItemAction(
  token: string,
  itemId: string,
  rawName: string,
): Promise<{ state: ClaimState; message: string | null }> {
  try {
    const outcome = await claimSharedItem(
      await createClient(),
      token,
      itemId,
      await giverKey(),
      parseClaimerName(rawName),
    );
    revalidatePath(`/share/${token}`);
    return claimMessage(outcome);
  } catch {
    return { state: "open", message: "Couldn't save that. Try again." };
  }
}

export async function unclaimItemAction(
  token: string,
  itemId: string,
): Promise<{ ok: boolean }> {
  const key = (await cookies()).get(GIVER_COOKIE)?.value;
  if (!key) return { ok: false };
  try {
    const ok = await unclaimSharedItem(
      await createClient(),
      token,
      itemId,
      key,
    );
    revalidatePath(`/share/${token}`);
    return { ok };
  } catch {
    return { ok: false };
  }
}
