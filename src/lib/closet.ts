// Which items belong in the closet (KAM-47). Pure, so the rule is tested and
// shared by the closet query's intent and the UI.
//
// - Pieces added straight to the closet (source 'closet').
// - Wishlist items you bought for yourself: purchased, not gifted.
// - Wishlist items gifted to you: gifted, not purchased.
// Purchased AND gifted means you bought it as a gift for someone else
// (KAM-22's definition), so it isn't in your closet.
type ClosetFields = { source: string; purchased: boolean; gifted: boolean };

export function isInCloset(item: ClosetFields): boolean {
  if (item.source === "closet") return true;
  return item.purchased !== item.gifted;
}

export type ClosetOrigin = "added" | "bought" | "gift";

export function closetOrigin(item: ClosetFields): ClosetOrigin {
  if (item.source === "closet") return "added";
  return item.gifted ? "gift" : "bought";
}
