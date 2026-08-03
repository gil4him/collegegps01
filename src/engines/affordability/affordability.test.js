import { describe, test, expect } from "vitest";
import { affordabilityFor, SAVINGS_BANDS } from "./affordability.js";

const CHILD = { gradYear: 2029, state: "CA", zip: "90210" };

describe("affordability range (real IPEDS data, bands → ranges)", () => {
  test("no bands → typical-family range, labeled as such", () => {
    const a = affordabilityFor(CHILD, null);
    expect(a.available).toBe(true);
    expect(a.typical).toBe(true);
    expect(a.stateName).toBe("California");
    expect(a.schoolCount).toBeGreaterThan(3);
    expect(a.netLow).toBeLessThan(a.netMedian);
    expect(a.netMedian).toBeLessThan(a.netHigh);
    expect(a.sai).toBeNull();
    expect(a.withinBudget).toBeNull();
  });

  test("answering the income band visibly changes the range", () => {
    const typical = affordabilityFor(CHILD, null);
    const low = affordabilityFor(CHILD, { incomeBand: "Under $50k" });
    const high = affordabilityFor(CHILD, { incomeBand: "$200k+" });
    expect(low.typical).toBe(false);
    expect(low.netMedian).toBeLessThan(high.netMedian);
    expect([low.netMedian, high.netMedian]).not.toContain(typical.netMedian);
  });

  test("budget band produces the within-budget count", () => {
    const a = affordabilityFor(CHILD, { incomeBand: "$75–110k", budgetBand: "$30–50k" });
    expect(a.budgetMid).toBe(40000);
    expect(a.withinBudget).toBeGreaterThan(0);
    expect(a.withinBudget).toBeLessThanOrEqual(a.schoolCount);
    const tight = affordabilityFor(CHILD, { incomeBand: "$75–110k", budgetBand: "Under $15k" });
    expect(tight.withinBudget).toBeLessThanOrEqual(a.withinBudget);
  });

  test("SAI range comes from the federal engine and moves with income", () => {
    const a = affordabilityFor(CHILD, { incomeBand: "$75–110k", savings529Band: "$10–50k" });
    expect(a.sai.low).toBeLessThan(a.sai.high);
    const richer = affordabilityFor(CHILD, { incomeBand: "$150–200k", savings529Band: "$10–50k" });
    expect(richer.sai.low).toBeGreaterThan(a.sai.low);
  });

  test("deterministic", () => {
    const p = { incomeBand: "$75–110k", budgetBand: "$30–50k", savings529Band: "None yet" };
    expect(affordabilityFor(CHILD, p)).toEqual(affordabilityFor(CHILD, p));
    expect(Object.keys(SAVINGS_BANDS).length).toBe(4);
  });
});
