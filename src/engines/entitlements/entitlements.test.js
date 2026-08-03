import { describe, test, expect } from "vitest";
import { tierOf, gate, LIMITS, TIER_ORDER } from "./entitlements.js";

describe("entitlements seam (ported)", () => {
  test("unknown or missing tier falls back to free", () => {
    expect(tierOf(null)).toBe("free");
    expect(tierOf({ tier: "bogus" })).toBe("free");
    expect(tierOf({ tier: "elite" })).toBe("elite");
    expect(TIER_ORDER).toEqual(["free", "premium", "elite"]);
  });

  test("boolean and numeric gates work", () => {
    expect(gate("free", "financePlanner").allowed).toBe(false);
    expect(gate("elite", "financePlanner").allowed).toBe(true);
    const g = gate("free", "aiMessagesPerDay", 5);
    expect(g).toMatchObject({ allowed: true, limit: LIMITS.free.aiMessagesPerDay, used: 5, remaining: 15 });
  });

  test("unknown features fail closed", () => {
    expect(gate("elite", "notARealFeature").allowed).toBe(false);
  });
});
