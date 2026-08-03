// Ported from collegeapp01 functions/finaid.js @ 8171b8a — keep public interface.
/* finaid.js — federal financial-aid math (SAI), CSS-Profile institutional
   estimate, and the year-by-year 529 funding waterfall. Ported from the retired
   legacy/college_app/finaid.js (Phase 3, 2026-07-29) into the live Functions
   codebase — PURE (no I/O), so tests/finaid.test.js pins it exactly.

   Every figure here is a clearly-labeled ESTIMATE. The official SAI comes from
   studentaid.gov; CSS-Profile schools run their own (partly proprietary)
   formulas, so computeInstitutionalEstimate is directional only. */

"use strict";

const STUDENT_IPA = 11510;

// OFFICIAL 2025-26 federal methodology (dependent student; parents' contribution),
// per the U.S. Dept. of Education "2025-26 SAI and Pell Grant Eligibility Guide".
// Keyed by aid year so future years drop in without code changes.
const SAI_TABLES = {
  "2025-26": {
    ipa: { 2: 28530, 3: 35510, 4: 43870, 5: 51750, 6: 60540, perAdd: 6840 }, // Table A2
    eeaRate: 0.35, eeaCap: 4890,
    assetRate: 0.12,
    oasdiRate: 0.062, oasdiCapSingle: 160200, oasdiCapJoint: 320400,
    medicareRate: 0.0145, medicareAddlRate: 0.009,
    medicareThreshSingle: 200000, medicareThreshJoint: 250000,
    saiFloor: -1500, aaiContribFloor: -1826,
  },
};
function saiTables(year) { return SAI_TABLES[year] || SAI_TABLES["2025-26"]; }

// Income Protection Allowance by family size (no "number in college" factor).
function parentIPA(fs, year) {
  const t = saiTables(year).ipa; fs = Math.max(1, Math.round(fs || 0));
  if (t[fs] != null) return t[fs];
  if (fs > 6) return t[6] + (fs - 6) * t.perAdd;
  return t[2];
}
function oasdiAllow(earned, joint, year) {
  const T = saiTables(year); const cap = joint ? T.oasdiCapJoint : T.oasdiCapSingle;
  return T.oasdiRate * Math.min(Math.max(0, earned || 0), cap);
}
function medicareAllow(earned, joint, year) {
  const T = saiTables(year); earned = Math.max(0, earned || 0);
  const th = joint ? T.medicareThreshJoint : T.medicareThreshSingle;
  return T.medicareRate * earned + (earned > th ? T.medicareAddlRate * (earned - th) : 0);
}
function payrollAllowance(earned, joint, year) { return oasdiAllow(earned, joint, year) + medicareAllow(earned, joint, year); }
function employmentAllowance(earned, eligible, year) {
  if (!eligible) return 0; const T = saiTables(year);
  return Math.min(T.eeaRate * Math.max(0, earned || 0), T.eeaCap);
}
// Rough federal income-tax ESTIMATE (2024 brackets + standard deduction), used
// only when actual 1040 tax paid is not supplied.
function estimateFederalTax(income, joint) {
  income = Math.max(0, income || 0);
  const t = Math.max(0, income - (joint ? 29200 : 14600));
  const br = joint
    ? [[23200, 0.10], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]]
    : [[11600, 0.10], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]];
  let tax = 0; let lo = 0;
  for (let i = 0; i < br.length; i++) { const hi = br[i][0]; if (t > hi) { tax += (hi - lo) * br[i][1]; lo = hi; } else { tax += (t - lo) * br[i][1]; break; } }
  return Math.round(tax);
}
// Adjusted Available Income -> parents' contribution (Table A5).
function assessAAI(aai, year) {
  const T = saiTables(year);
  if (aai < -8300) return T.aaiContribFloor;
  if (aai <= 21300) return aai * 0.22;
  if (aai <= 26700) return 4686 + (aai - 21300) * 0.25;
  if (aai <= 32000) return 6036 + (aai - 26700) * 0.29;
  if (aai <= 37500) return 7573 + (aai - 32000) * 0.34;
  if (aai <= 42900) return 9443 + (aai - 37500) * 0.40;
  return 11603 + (aai - 42900) * 0.47;
}
// computeSAIFrom — parents' + student contribution for a dependent student.
// opts (all optional): { earnedIncome, eeaEligible, joint, fedTaxPaid, year }.
function computeSAIFrom(income, assets, fs, sInc, sAss, opts) {
  opts = opts || {};
  const year = opts.year || "2025-26"; const T = saiTables(year);
  income = income || 0;
  const earned = (opts.earnedIncome != null) ? opts.earnedIncome : income;
  const joint = (opts.joint != null) ? !!opts.joint : true;
  const eeaEligible = (opts.eeaEligible != null) ? !!opts.eeaEligible : true;
  const fedTax = (opts.fedTaxPaid != null && opts.fedTaxPaid !== "") ? Number(opts.fedTaxPaid) : estimateFederalTax(income, joint);
  const availIncome = income - fedTax - payrollAllowance(earned, joint, year) - parentIPA(fs || 4, year) - employmentAllowance(earned, eeaEligible, year);
  const contribAssets = Math.max(0, Math.max(0, assets || 0) * T.assetRate);
  const parentContrib = assessAAI(availIncome + contribAssets, year);
  const studentContrib = Math.max(0, (sInc || 0) - STUDENT_IPA) * 0.5 + Math.max(0, (sAss || 0)) * 0.2;
  const sai = Math.round(parentContrib + studentContrib);
  return sai < T.saiFloor ? T.saiFloor : sai;
}

// CSS Profile / Institutional Methodology — ROUGH directional ESTIMATE.
function computeInstitutionalEstimate(opts) {
  opts = opts || {};
  const baseIncome = Math.max(0, opts.income || 0);
  const imIncome = baseIncome + Math.max(0, opts.ncpIncome || 0);
  const he = Math.max(0, opts.homeEquity || 0);
  const capMult = (opts.homeEquityCapMultiple == null) ? 1.2 : opts.homeEquityCapMultiple;
  const cappedHE = capMult > 0 ? Math.min(he, capMult * baseIncome) : he;
  const imAssets = Math.max(0, opts.assets || 0) + cappedHE + Math.max(0, opts.otherRealEstate || 0);
  const nic = Math.max(1, Math.round(opts.numberInCollege || 1));
  const parent = computeSAIFrom(imIncome, imAssets, opts.fs || 4, 0, 0,
    { joint: opts.joint !== false, eeaEligible: opts.eeaEligible !== false, fedTaxPaid: opts.fedTaxPaid });
  const perStudentParent = Math.max(0, Math.round(parent / nic));
  const minStudent = (opts.minStudentContribution != null) ? opts.minStudentContribution : 2000;
  return {
    institutionalEstimate: perStudentParent + minStudent,
    perStudentParent: perStudentParent,
    cappedHomeEquity: Math.round(cappedHE),
    numberInCollege: nic,
  };
}

// Year-by-year household funding plan: turns a one-shot net price into a 4-5 year
// waterfall funded by annual cash, then a 529 drawdown, then remaining-to-fund.
// opts: { netPrice, annualCash, fv529, years (4|5), startOffsetYears, inflation }
function buildYearByYear(opts) {
  opts = opts || {};
  const years = Math.max(1, Math.min(5, Math.round(opts.years || 4)));
  const infl = (opts.inflation != null) ? opts.inflation : 0.05;
  const startOffset = Math.max(0, opts.startOffsetYears || 0);
  const net = Math.max(0, opts.netPrice || 0);
  const cashBudget = Math.max(0, opts.annualCash || 0);
  let pool = Math.max(0, opts.fv529 || 0);
  const rows = []; const tot = { cost: 0, cash: 0, draw529: 0, remaining: 0 };
  for (let y = 0; y < years; y++) {
    const cost = Math.round(net * Math.pow(1 + infl, startOffset + y));
    const cash = Math.min(cashBudget, cost);
    const afterCash = cost - cash;
    const draw = Math.min(pool, afterCash); pool -= draw;
    const remaining = Math.max(0, afterCash - draw);
    rows.push({ year: y + 1, cost: cost, cash: Math.round(cash), draw529: Math.round(draw), remaining: Math.round(remaining) });
    tot.cost += cost; tot.cash += cash; tot.draw529 += draw; tot.remaining += remaining;
  }
  return {
    rows: rows, years: years, inflation: infl,
    totals: { cost: Math.round(tot.cost), cash: Math.round(tot.cash), draw529: Math.round(tot.draw529), remaining: Math.round(tot.remaining), leftover529: Math.round(pool) },
  };
}

export {
  STUDENT_IPA, SAI_TABLES,
  parentIPA, payrollAllowance, employmentAllowance, estimateFederalTax, assessAAI,
  computeSAIFrom, computeInstitutionalEstimate, buildYearByYear,
};
