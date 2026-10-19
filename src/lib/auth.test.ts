import { describe, expect, it } from "vitest";
import { PASSWORD_MIN_LENGTH, signUpPasswordError } from "./auth";

describe("signUpPasswordError", () => {
  it("accepts a long-enough password that matches its confirmation", () => {
    expect(signUpPasswordError("hunter22", "hunter22")).toBeNull();
    const min = "x".repeat(PASSWORD_MIN_LENGTH);
    expect(signUpPasswordError(min, min)).toBeNull();
  });

  it("rejects passwords that are too short", () => {
    const short = "x".repeat(PASSWORD_MIN_LENGTH - 1);
    expect(signUpPasswordError(short, short)).toMatch(/at least/);
  });

  it("rejects a confirmation that doesn't match", () => {
    expect(signUpPasswordError("hunter22", "hunter23")).toBe(
      "Passwords don't match.",
    );
    expect(signUpPasswordError("hunter22", "")).toBe("Passwords don't match.");
  });
});
