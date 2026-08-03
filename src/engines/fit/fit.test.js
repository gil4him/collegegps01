import { describe, test, expect } from "vitest";
import { recommend, buildPlan, MODEL_VERSION } from "./engine.js";
import { computeReadiness, READINESS_VERSION } from "./readiness.js";
import { scorecardUrl, mapScorecardRow, fetchScorecardCandidates } from "./scorecard.js";
import { SAMPLE, STATES, INCOME_SUF } from "../../data/dataset.js";
import { ENRICH } from "college-engine/engines/fit/dataset_enrichment";

const PARENT = { state: "CA", incomeBand: "$75–110k", annualBudget: 30000 };
const STUDENT = { state: "CA", gpa: 3.7, gpaScale: "4.0", testOptional: true, majors: ["Engineering"] };

describe("dataset (ported)", () => {
  test("covers 50 states + DC with enrichment", () => {
    expect(Object.keys(STATES).length).toBe(51);
    expect(Object.keys(SAMPLE).length).toBe(51);
    expect(Object.keys(ENRICH).length).toBe(183);
    expect(INCOME_SUF.length).toBe(5);
  });
});

describe("fit engine (ported)", () => {
  test("recommend is deterministic", () => {
    expect(MODEL_VERSION).toBe("engine-v3");
    const a = recommend(PARENT, STUDENT, { limit: 5 });
    const b = recommend(PARENT, STUDENT, { limit: 5 });
    expect(a).toEqual(b);
    expect(a.length).toBe(5);
    expect(a[0].name).toBeTruthy();
  });

  test("buildPlan produces the financial/academic/scholarship gap analysis", () => {
    const plan = buildPlan(PARENT, STUDENT, {}, recommend(PARENT, STUDENT, { limit: 5 }));
    expect(Object.keys(plan)).toEqual(["financial", "academic", "scholarship", "availability"]);
    expect(plan.financial.budget).toBe(30000);
    expect(plan.financial.avgNet).toBeGreaterThan(0);
  });

  test("readiness scores are versioned", () => {
    expect(READINESS_VERSION).toBe("readiness-v1");
    const r = computeReadiness({ gpa: 3.7, gpaScale: "4.0" });
    expect(r.version).toBe("readiness-v1");
    expect(Object.keys(r.dimensions)).toEqual(["academics", "ecStory", "application", "funding"]);
  });
});

describe("scorecard fetch layer (ported, network-free)", () => {
  test("returns null with no key (callers fall back to IPEDS)", async () => {
    expect(await fetchScorecardCandidates(null, ["CA"])).toBeNull();
    expect(await fetchScorecardCandidates("key", [])).toBeNull();
  });

  test("maps a raw Scorecard record to the SAMPLE row shape", () => {
    const row = mapScorecardRow({
      "school.name": "Test University",
      "school.state": "CA",
      "school.ownership": 1,
      "latest.student.size": 20000,
      "latest.admissions.admission_rate.overall": 0.5,
      "latest.admissions.sat_scores.25th_percentile.critical_reading": 550,
      "latest.admissions.sat_scores.25th_percentile.math": 550,
      "latest.admissions.sat_scores.75th_percentile.critical_reading": 650,
      "latest.admissions.sat_scores.75th_percentile.math": 650,
      "latest.cost.avg_net_price.overall": 15000,
    });
    expect(row).toMatchObject({ name: "Test University", state: "CA", own: 1, admit: 0.5, sat25: 1100, sat75: 1300, net: 15000 });
    expect(row.ni.length).toBe(INCOME_SUF.length);
  });

  test("fetches per state via injectable fetch", async () => {
    const calls = [];
    const fakeFetch = async (url) => {
      calls.push(url);
      return { ok: true, json: async () => ({ results: [{ "school.name": "Injected U", "school.state": "CA", "school.ownership": 1 }] }) };
    };
    const out = await fetchScorecardCandidates("k", ["CA", "OR"], fakeFetch);
    expect(calls.length).toBe(2);
    expect(scorecardUrl("CA", 40, "k")).toContain("school.state=CA");
    expect(out.length).toBe(2);
    expect(out[0].name).toBe("Injected U");
  });
});
