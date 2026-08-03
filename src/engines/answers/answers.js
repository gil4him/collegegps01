// Ported from collegeapp01 app/src/wizard/defaultBank.js @ 8171b8a — subset only.
// GPS keeps the engine-facing pieces (deriveAnswers, the bands) and leaves the
// wizard question schemas behind (the wizard is not part of this product).
// Interface change vs. origin: deriveAnswers takes `now` as a parameter instead
// of calling new Date() internally — engines never read the clock themselves.

import { gradeFromGradYear } from "../milestones/grade.js";

// Budget bands → representative annual dollars for the engine (midpoints).
// Tap-a-range beats typing a scary exact number during onboarding. "Not sure
// yet" derives nothing — the engine then leans on the income band alone.
export const BUDGET_BANDS = {
  "Under $15k": 10000,
  "$15–30k": 22500,
  "$30–50k": 40000,
  "$50–80k": 65000,
  "$80k+": 95000,
  "Not sure yet": null,
};

// Household income bands (option list from the origin's parent question bank).
// A range is all the engine needs to estimate net price at each college.
export const INCOME_BANDS = [
  "Under $50k",
  "$50–75k",
  "$75–110k",
  "$110–150k",
  "$150–200k",
  "$200k+",
];

// Derive engine-facing values from the friendly onboarding answers. The engine
// reads `annualBudget` (a number); users answer `budgetBand` (a range). An
// exact amount entered later ("sharpen this") overrides the range — derived
// midpoints keep tracking the band if it changes.
export function deriveAnswers(answers, now) {
  const a = { ...answers };
  // gradYear is the durable source of truth; grade is derived from it so it
  // never goes stale across school-year rollovers.
  if (a.gradYear != null && a.gradYear !== "") {
    const g = gradeFromGradYear(a.gradYear, now);
    if (g != null) a.grade = String(g);
  }
  if (a.budgetBand === undefined) return a; // pre-bands user — leave untouched
  const cur = Number(a.annualBudget);
  const isDerived = !cur || Object.values(BUDGET_BANDS).some((v) => v != null && v === cur);
  if (isDerived) a.annualBudget = BUDGET_BANDS[a.budgetBand] ?? null;
  return a;
}
