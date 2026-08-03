import { describe, test, expect } from "vitest";
import { deriveAnswers, BUDGET_BANDS, INCOME_BANDS } from "./answers.js";

const NOW = new Date("2026-03-15T12:00:00Z");

describe("deriveAnswers (ported, now-parameterized)", () => {
  test("derives grade from gradYear and budget from band", () => {
    expect(deriveAnswers({ gradYear: 2028, budgetBand: "$30–50k" }, NOW))
      .toEqual({ gradYear: 2028, budgetBand: "$30–50k", grade: "10", annualBudget: 40000 });
  });

  test("an exact typed budget overrides the band midpoint", () => {
    const a = deriveAnswers({ gradYear: 2028, budgetBand: "$30–50k", annualBudget: 37000 }, NOW);
    expect(a.annualBudget).toBe(37000);
  });

  test("'Not sure yet' derives nothing", () => {
    expect(deriveAnswers({ budgetBand: "Not sure yet" }, NOW).annualBudget).toBeNull();
  });

  test("bands are the onboarding-friendly option lists", () => {
    expect(Object.keys(BUDGET_BANDS).length).toBe(6);
    expect(INCOME_BANDS.length).toBe(6);
  });
});
