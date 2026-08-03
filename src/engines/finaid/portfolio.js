// Ported from collegeapp01 functions/portfolio.js @ 8171b8a — keep public interface.
/* portfolio.js — per-lot repositioning → SAI/aid impact. Ported from the retired
   legacy/college_app/portfolio.js (Phase 3, 2026-07-29). PURE; depends on
   finaid.js. Powers the Elite "asset & gains what-if" (financePlanner gate).

   SAFE BOUNDARY (hard rule): SCENARIO EDUCATION only. It shows the aid/tax math
   of a hypothetical. It never recommends buying/selling any security and never
   places orders — that keeps the product clear of investment/tax advice; a
   licensed advisor acts on it. All tax figures are rough ESTIMATES. */

"use strict";

import { computeSAIFrom, estimateFederalTax } from "./finaid.js";

// A lot: { ticker, shares, costBasisPerShare, price, acquired:"YYYY-MM-DD" }.
// No acquisition date (e.g. an aggregate position without tax lots) → honor an
// explicit longTermOverride, else default short-term (conservative: higher hit).
function lotIsLongTerm(lot, asOfMs) {
  if (!lot) return false;
  if (!lot.acquired) return !!lot.longTermOverride;
  const acq = new Date(lot.acquired);
  const asOf = asOfMs ? new Date(asOfMs) : new Date(acq.getTime()); // caller passes a timestamp; no wall-clock in pure code
  const oneYearLater = new Date(acq.getFullYear() + 1, acq.getMonth(), acq.getDate());
  return asOf > oneYearLater;
}
function perShareBasis(lot) {
  if (lot.costBasisPerShare != null) return Number(lot.costBasisPerShare);
  if (lot.costBasis != null && lot.shares) return Number(lot.costBasis) / Number(lot.shares);
  return 0; // unknown basis → treat as fully-gained (conservative: max tax + max FAFSA income hit)
}
function lotSale(lot, shares) {
  const n = Math.min((shares == null ? lot.shares : shares), lot.shares) || 0;
  const proceeds = n * (Number(lot.price) || 0);
  const basis = n * perShareBasis(lot);
  return { shares: n, proceeds: proceeds, basis: basis, gain: proceeds - basis };
}

// Aggregate a scenario. `sells` = array of { lot, shares } (or lots carrying a
// .sellShares field). asOfMs = the sale-date timestamp (caller supplies it).
function scenarioGains(sells, asOfMs) {
  let st = 0; let lt = 0; let proceeds = 0; let gain = 0;
  (sells || []).forEach((s) => {
    const lot = s.lot || s;
    const shares = s.shares != null ? s.shares : lot.sellShares;
    if (!shares) return;
    const r = lotSale(lot, shares);
    proceeds += r.proceeds; gain += r.gain;
    if (lotIsLongTerm(lot, asOfMs)) lt += r.gain; else st += r.gain;
  });
  return { stGain: st, ltGain: lt, totalGain: gain, proceeds: proceeds };
}

// Long-term cap-gains tax (ESTIMATE), 0/15/20% stacked above ordinary taxable income.
function estLongTermTax(ltGain, ordinaryIncome, joint) {
  if (!ltGain || ltGain <= 0) return 0;
  const t0 = joint ? 94050 : 47025; const t15 = joint ? 583750 : 518900;
  const base = Math.max(0, (ordinaryIncome || 0) - (joint ? 29200 : 14600));
  const hi = base + ltGain;
  const b15 = Math.max(0, Math.min(hi, t15) - Math.max(base, t0));
  const b20 = Math.max(0, hi - Math.max(base, t15));
  return b15 * 0.15 + b20 * 0.20;
}
function estCapGainsTax(stGain, ltGain, ordinaryIncome, joint) {
  const stTax = Math.max(0, estimateFederalTax((ordinaryIncome || 0) + Math.max(0, stGain || 0), joint) - estimateFederalTax(ordinaryIncome || 0, joint));
  const ltTax = Math.max(0, estLongTermTax(ltGain, ordinaryIncome, joint));
  return { stTax: Math.round(stTax), ltTax: Math.round(ltTax), total: Math.round(stTax + ltTax) };
}

// The SAI/aid consequence of a scenario, via the official SAI engine.
// p: { income, assets, fs, joint, eeaEligible, fedTaxPaid, stGain, ltGain, repositionOutOfAssets }
function portfolioSAIImpact(p) {
  p = p || {};
  const joint = p.joint !== false; const eea = p.eeaEligible !== false;
  const baseFedTax = (p.fedTaxPaid != null && p.fedTaxPaid !== "") ? Number(p.fedTaxPaid) : estimateFederalTax(p.income || 0, joint);
  const gains = (p.stGain || 0) + (p.ltGain || 0);
  const cg = estCapGainsTax(p.stGain || 0, p.ltGain || 0, p.income || 0, joint);
  const base = computeSAIFrom(p.income || 0, p.assets || 0, p.fs || 4, 0, 0, { joint: joint, eeaEligible: eea, fedTaxPaid: baseFedTax });
  const scenAssets = Math.max(0, (p.assets || 0) - (p.repositionOutOfAssets || 0));
  const scen = computeSAIFrom((p.income || 0) + gains, scenAssets, p.fs || 4, 0, 0, { joint: joint, eeaEligible: eea, fedTaxPaid: baseFedTax + cg.total });
  return {
    baseSAI: base, scenarioSAI: scen, deltaSAI: scen - base,
    aidImpact: -(scen - base), // negative SAI change => more potential need-based aid
    capGainsTax: cg, realizedGains: gains,
  };
}

// Base-year timing: an academic year starting in calendar year A uses the
// prior-prior tax year (A-2) on the FAFSA. Gains in tax year T affect the year
// starting T+2.
function baseYearForAcademicYear(acadStartYear) { return acadStartYear - 2; }
function enrollmentYearsHitBySale(saleTaxYear, firstAcadStartYear, years) {
  const hit = [];
  for (let y = 0; y < (years || 4); y++) {
    if ((firstAcadStartYear + y) - 2 === saleTaxYear) hit.push(y + 1);
  }
  return hit;
}

export {
  lotIsLongTerm, perShareBasis, lotSale, scenarioGains,
  estLongTermTax, estCapGainsTax, portfolioSAIImpact,
  baseYearForAcademicYear, enrollmentYearsHitBySale,
};
