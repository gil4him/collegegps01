import { describe, test, expect } from "vitest";
import { computeSAIFrom, SAI_TABLES } from "./finaid.js";
import { scenarioGains, portfolioSAIImpact, baseYearForAcademicYear } from "./portfolio.js";

describe("SAI estimator (ported)", () => {
  test("computeSAIFrom is deterministic on a known family", () => {
    expect(computeSAIFrom(120000, 50000, 4, 0, 0, {})).toBe(18525);
    expect(computeSAIFrom(120000, 50000, 4, 0, 0, {})).toBe(18525);
  });

  test("SAI tables are keyed by aid year", () => {
    expect(Object.keys(SAI_TABLES).length).toBeGreaterThan(0);
  });
});

describe("Tier-2 what-if engine (ported)", () => {
  const lot = { ticker: "VTI", shares: 100, costBasisPerShare: 100, price: 200, acquired: "2020-01-01" };
  const ASOF = new Date("2026-03-15T12:00:00Z").getTime();

  test("scenarioGains splits long/short term", () => {
    const g = scenarioGains([{ lot, shares: 50 }], ASOF);
    expect(g).toEqual({ stGain: 0, ltGain: 5000, totalGain: 5000, proceeds: 10000 });
  });

  test("portfolioSAIImpact reports the aid consequence of realized gains", () => {
    const r = portfolioSAIImpact({ income: 120000, assets: 50000, fs: 4, ltGain: 5000 });
    expect(r.baseSAI).toBe(18525);
    expect(r.scenarioSAI).toBeGreaterThan(r.baseSAI);
    expect(r.deltaSAI).toBe(r.scenarioSAI - r.baseSAI);
    expect(r.capGainsTax.total).toBeGreaterThanOrEqual(0);
  });

  test("FAFSA base year maps from enrollment year", () => {
    expect(baseYearForAcademicYear(2028)).toBe(2026);
  });
});
