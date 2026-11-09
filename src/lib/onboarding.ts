// First-run "Get started" checklist (KAM-46). Pure, so the rules are
// unit-tested; the card renders whatever this returns.

export type OnboardingFacts = {
  itemCount: number;
  wishlistCount: number;
  favoriteStoreCount: number;
  hasPushDevice: boolean;
  dismissed: boolean;
};

export type OnboardingStep = {
  id: "item" | "list" | "stores" | "alerts";
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

export function onboardingSteps(facts: OnboardingFacts): OnboardingStep[] {
  return [
    {
      id: "item",
      label: "Add your first item",
      hint: "Paste a product link and Cubby fills in the name, photo and price.",
      href: "/items/new",
      done: facts.itemCount > 0,
    },
    {
      id: "list",
      label: "Make a wishlist to share",
      hint: "Group items into a list and send the link. Friends can see it without an account.",
      href: "/wishlists",
      done: facts.wishlistCount > 0,
    },
    {
      id: "stores",
      label: "Star your favorite stores",
      hint: "Cubby tells you when they're running a sale.",
      href: "/stores",
      done: facts.favoriteStoreCount > 0,
    },
    {
      id: "alerts",
      label: "Turn on price alerts",
      hint: "Get one daily heads-up when something on your wishlist drops.",
      href: "/notifications",
      done: facts.hasPushDevice,
    },
  ];
}

// Shown until it's hidden or every step is done.
export function showOnboarding(facts: OnboardingFacts): boolean {
  return !facts.dismissed && onboardingSteps(facts).some((s) => !s.done);
}
