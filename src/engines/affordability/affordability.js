// affordability.js — GREENFIELD. The visible payoff for the money bands:
// a real net-price range for the family's state and income band (IPEDS
// data), a within-budget count, and an SAI range from the federal engine.
// Ranges only — bands in, ranges out, never a false-precision number.
// Pure and deterministic. Educational estimates, not financial advice.

import { SAMPLE, STATES } from "../../data/dataset.js";
import { computeSAIFrom } from "../finaid/finaid.js";
import { BUDGET_BANDS } from "../answers/answers.js";

export const AFFORDABILITY_VERSION = "affordability-v1";

// Same band semantics as the fit engine (engine.js representativeIncome →
// incomeBandIdx): label → representative income → dataset ni column.
const REP_INCOME = {
  "Under $50k": 40000,
  "$50–75k": 62000,
  "$75–110k": 92000,
  "$110–150k": 130000,
  "$150–200k": 175000,
  "$200k+": 220000,
};
function incomeBandIdx(income) {
  if (income <= 30000) return 0;
  if (income <= 48000) return 1;
  if (income <= 75000) return 2;
  if (income <= 110000) return 3;
  return 4;
}

// Income range each band spans, for the SAI range endpoints.
const BAND_RANGE = {
  "Under $50k": [30000, 50000],
  "$50–75k": [50000, 75000],
  "$75–110k": [75000, 110000],
  "$110–150k": [110000, 150000],
  "$150–200k": [150000, 200000],
  "$200k+": [200000, 300000],
};

// 529 band → representative parent-asset figure for the SAI estimate.
export const SAVINGS_BANDS = {
  "None yet": 0,
  "Under $10k": 5000,
  "$10–50k": 25000,
  "$50k+": 75000,
};

// The default family when no bands are answered: the middle income band.
// Surfaces as "based on a typical [state] family" until sharpened.
const TYPICAL_BAND = "$75–110k";

function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
}

// affordabilityFor(child, moneyProfile) → deterministic affordability view.
export function affordabilityFor(child, profile) {
  const schools = SAMPLE[child.state] || [];
  const band = profile?.incomeBand || TYPICAL_BAND;
  const typical = !profile?.incomeBand;
  const idx = incomeBandIdx(REP_INCOME[band] ?? 92000);

  const nets = schools
    .map((s) => (Array.isArray(s.ni) && s.ni.length === 5 ? s.ni[idx] : s.net))
    .filter((n) => n != null && n > 0)
    .sort((a, b) => a - b);
  if (!nets.length) return { version: AFFORDABILITY_VERSION, available: false };

  const budgetMid = BUDGET_BANDS[profile?.budgetBand] ?? null;
  const withinBudget = budgetMid != null ? nets.filter((n) => n <= budgetMid).length : null;

  let sai = null;
  if (profile?.incomeBand) {
    const [lo, hi] = BAND_RANGE[profile.incomeBand];
    const assets = SAVINGS_BANDS[profile.savings529Band] ?? 10000;
    sai = {
      low: computeSAIFrom(lo, assets, 4, 0, 0, {}),
      high: computeSAIFrom(hi, assets, 4, 0, 0, {}),
    };
  }

  return {
    version: AFFORDABILITY_VERSION,
    available: true,
    typical,
    stateName: STATES[child.state] || child.state,
    schoolCount: nets.length,
    netLow: quantile(nets, 0.1),
    netMedian: quantile(nets, 0.5),
    netHigh: quantile(nets, 0.9),
    budgetMid,
    withinBudget,
    sai,
  };
}
