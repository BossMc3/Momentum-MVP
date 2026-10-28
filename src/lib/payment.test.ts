import { describe, it, expect } from "vitest";
import { luhnValid, expiryValid, cvcValid, simulatedDecline, isStrategy } from "./momentum";
describe("simulated card payment", () => {
  it("accepts a Luhn-valid card", () => expect(luhnValid("4242 4242 4242 4242")).toBe(true));
  it("rejects an invalid card number", () => expect(luhnValid("4242 4242 4242 4241")).toBe(false));
  it("rejects expired cards", () => expect(expiryValid("09/26", new Date(2026, 9, 28))).toBe(false));
  it("accepts current month", () => expect(expiryValid("10/26", new Date(2026, 9, 28))).toBe(true));
  it("cvc 3-4 digits", () => { expect(cvcValid("123")).toBe(true); expect(cvcValid("12")).toBe(false); });
  it("decline test card fails", () => expect(simulatedDecline("4000 0000 0000 0002")).toBe(true));
  it("only known strategies", () => { expect(isStrategy("stocks")).toBe(true); expect(isStrategy("crypto")).toBe(false); });
});
