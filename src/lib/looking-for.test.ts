import { describe, expect, it } from "vitest";
import { lookingForLine, parseLookingFor } from "./looking-for";

describe("parseLookingFor", () => {
  it("needs a title, and tidies everything", () => {
    expect(
      parseLookingFor({
        title: "  Essential   oil diffuser ",
        notes: " white or wood ",
        budget: "$60",
      }),
    ).toEqual({
      ok: true,
      value: {
        title: "Essential oil diffuser",
        notes: "white or wood",
        budget: 60,
      },
    });
    expect(parseLookingFor({ title: "  " })).toEqual({
      ok: false,
      error: "What are you looking for?",
    });
  });

  it("makes notes and budget optional, and rejects a bad budget", () => {
    expect(parseLookingFor({ title: "Desk lamp", budget: "" })).toEqual({
      ok: true,
      value: { title: "Desk lamp", notes: null, budget: null },
    });
    expect(parseLookingFor({ title: "Lamp", budget: "cheap" }).ok).toBe(false);
    expect(parseLookingFor({ title: "Lamp", budget: "0" }).ok).toBe(false);
  });
});

describe("lookingForLine", () => {
  it("reads as one line, with budget and notes when set", () => {
    expect(
      lookingForLine({ title: "Diffuser", budget: 60, notes: "white or wood" }),
    ).toBe("Diffuser (under $60.00): white or wood");
    expect(
      lookingForLine({ title: "Desk lamp", budget: null, notes: null }),
    ).toBe("Desk lamp");
  });
});
