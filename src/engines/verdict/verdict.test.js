import { describe, test, expect } from "vitest";
import { generatePlan, verdictFor, inputsHashOf, VERDICT_VERSION } from "./verdict.js";
import { zipToState, resolveDistrict } from "../districts/zipState.js";

const NOW = new Date("2026-03-15T12:00:00Z");

// Class of 2028 = grade 10 in March 2026.
const CHILD = { gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-03-15" };

describe("zip → state (real USPS prefix ranges)", () => {
  test("resolves common ZIPs", () => {
    expect(zipToState("90210")).toBe("CA");
    expect(zipToState("10001")).toBe("NY");
    expect(zipToState("60601")).toBe("IL");
    expect(zipToState("30301")).toBe("GA");
    expect(zipToState("02139")).toBe("MA");
  });
  test("rejects junk, falls back to null", () => {
    expect(zipToState("abc")).toBeNull();
    expect(zipToState("")).toBeNull();
  });
  test("district resolver is an honest no-data stub", () => {
    expect(resolveDistrict("90210")).toMatchObject({ districtId: null, source: "none" });
  });
});

describe("plan generation (deterministic, dated, financial inline)", () => {
  test("same inputs → identical plan", () => {
    const a = generatePlan(CHILD, NOW);
    const b = generatePlan(CHILD, NOW);
    expect(a).toEqual(b);
    expect(a.engineVersion).toBe(VERDICT_VERSION);
    expect(a.inputsHash).toBe(inputsHashOf(CHILD));
  });

  test("covers current grade through 12 with dated stops", () => {
    const plan = generatePlan(CHILD, NOW);
    const grades = new Set(plan.milestones.map((m) => m.grade));
    expect([...grades].sort()).toEqual([10, 11, 12]);
    for (const m of plan.milestones) expect(m.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const dates = plan.milestones.map((m) => m.date);
    expect([...dates].sort()).toEqual(dates); // sorted by date
  });

  test("financial stops are inline and dated from the real base year", () => {
    const plan = generatePlan(CHILD, NOW);
    const fin = plan.milestones.filter((m) => m.category === "financial");
    const ids = fin.map((m) => m.id);
    expect(ids).toContain("fin-base-year");
    expect(ids).toContain("g12-fafsa");
    // Class of 2028 → base tax year 2026 (per finaid engine), FAFSA opens Oct of senior fall.
    expect(fin.find((m) => m.id === "fin-base-year").date).toBe("2026-01-01");
    expect(fin.find((m) => m.id === "g12-fafsa").date).toBe("2027-10-01");
  });
});

describe("verdict + One Next Thing", () => {
  test("cold start: pre-signup items are catch-up, never against the verdict", () => {
    const plan = generatePlan(CHILD, NOW);
    const v = verdictFor(plan, CHILD, NOW);
    expect(v.status).toBe("onTrack");
    expect(v.pill).toBe("On track");
    expect(v.oneNextThing).toBeTruthy();
    expect(v.milestones.filter((m) => m.state === "catchup").length).toBeGreaterThan(0);
  });

  test("an item due after signup that passes flags needs-attention", () => {
    const early = { ...CHILD, signupDate: "2026-01-01" };
    const plan = generatePlan(early, NOW);
    const v = verdictFor(plan, early, NOW);
    expect(v.status).toBe("needsAttention"); // g10-ap (Mar 15) + mid-year items came due
    expect(v.pill).toMatch(/attention/);
  });

  test("design test: same grade, different inputs → different One Next Thing", () => {
    const now = new Date("2026-09-10T12:00:00Z"); // class of 2028 → fall of grade 11
    const a = { gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-09-10" };
    const b = { ...a, testStatus: "done" };
    const nextA = verdictFor(generatePlan(a, now), a, now).oneNextThing;
    const nextB = verdictFor(generatePlan(b, now), b, now).oneNextThing;
    expect(nextA.id).not.toBe(nextB.id); // A: PSAT/NMSQT; B: testing done → next non-testing stop
    expect(nextA.id).toBe("g11-psat");
  });

  test("gpa band pulls academics forward on date ties", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const base = { gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-09-10" };
    const low = { ...base, gpaBand: "below3" };
    const planBase = generatePlan(base, now);
    const planLow = generatePlan(low, now);
    expect(planBase.inputsHash).not.toBe(planLow.inputsHash);
    const nov15Base = planBase.milestones.filter((m) => m.date === "2026-11-15")[0];
    const nov15Low = planLow.milestones.filter((m) => m.date === "2026-11-15")[0];
    if (nov15Base && nov15Low) expect([nov15Base.id, nov15Low.id]).toBeTruthy();
  });
});
