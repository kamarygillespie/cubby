import { describe, expect, it } from "vitest";
import { onboardingSteps, showOnboarding } from "./onboarding";

const fresh = {
  itemCount: 0,
  wishlistCount: 0,
  favoriteStoreCount: 0,
  hasPushDevice: false,
  dismissed: false,
};

describe("onboarding", () => {
  it("a new account sees every step to do, adding an item first", () => {
    const steps = onboardingSteps(fresh);
    expect(steps.map((s) => s.id)).toEqual([
      "item",
      "list",
      "stores",
      "alerts",
    ]);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(showOnboarding(fresh)).toBe(true);
  });

  it("marks steps done from what the account has", () => {
    const steps = onboardingSteps({
      ...fresh,
      itemCount: 3,
      hasPushDevice: true,
    });
    expect(steps.filter((s) => s.done).map((s) => s.id)).toEqual([
      "item",
      "alerts",
    ]);
  });

  it("hides once dismissed or once everything's done", () => {
    expect(showOnboarding({ ...fresh, dismissed: true })).toBe(false);
    expect(
      showOnboarding({
        itemCount: 1,
        wishlistCount: 1,
        favoriteStoreCount: 1,
        hasPushDevice: true,
        dismissed: false,
      }),
    ).toBe(false);
  });
});
