// Ported from collegeapp01 functions/readiness.js @ 8171b8a — keep public interface.
/* readiness.js — pure readiness scoring. Normalizes four dimensions to 0–100
   and a weighted overall, renormalized over whichever dimensions are available.
   The ENGINE stays the source of truth for money/fit: funding is derived from a
   recommend()/buildPlan() result passed in (we never recompute net price here).
   Wall note: this module returns the dollar `gap` for funding so a parent/advisor
   view can use it — the CALLER must strip dollars before writing anything a
   student can read. Students get only {score, status}. */

const READINESS_VERSION = "readiness-v1";
const WEIGHTS = { academics: 0.35, ecStory: 0.30, application: 0.20, funding: 0.15 };

function clamp(n) { return Math.max(0, Math.min(100, n)); }
function num(v) { const n = Number(v); return isFinite(n) ? n : null; }
function nonEmpty(v) { return v != null && String(v).trim() !== "" && v !== "No preference"; }

// Weighted average over only the sub-scores that are present (null = absent).
function blend(pairs) {
  const live = pairs.filter((p) => p[1] != null);
  if (!live.length) return null;
  const w = live.reduce((s, p) => s + p[0], 0) || 1;
  return Math.round(live.reduce((s, p) => s + p[0] * p[1], 0) / w);
}

function gpaScoreOf(gpa, scale) {
  const g = num(gpa);
  if (g == null) return null;
  const max = scale === "5.0" ? 5 : scale === "100" ? 100 : 4;
  return clamp((g / max) * 100);
}
function rigorScoreOf(rigor) {
  const r = num(rigor);
  if (r == null) return null;
  return clamp((r / 8) * 100); // ~8 AP/IB/honors reads as a full rigor load
}
// ACT→SAT concordance (College Board / ACT 2018 tables). Lets an ACT-only
// student's score count toward readiness instead of reading as "no test." We
// convert in-memory only; nothing synthetic is persisted. Kept local so this
// module stays standalone (it never imports the engine).
const ACT_TO_SAT = { 36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340, 28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080, 20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890, 15: 850, 14: 800, 13: 760, 12: 710, 11: 670, 10: 630, 9: 590 };
function effectiveSat(student) {
  const sat = num(student.sat);
  if (sat != null && sat > 0) return sat;
  const act = Math.round(Number(student.act));
  return isFinite(act) && ACT_TO_SAT[act] ? ACT_TO_SAT[act] : null;
}
// Test score relative to the student's target-school bands when available
// (median of the list's 75th-percentile SATs); otherwise an absolute band.
function testScoreOf(student, satTargets) {
  if (student.testOptional) return null;
  const sat = effectiveSat(student);
  if (sat == null || sat <= 0) return null;
  const targets = (satTargets || []).filter((x) => x > 0);
  if (targets.length) {
    const sorted = [...targets].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    return clamp((sat / mid) * 100);
  }
  return clamp(((sat - 600) / (1500 - 600)) * 100);
}

function academicsOf(student, satTargets) {
  const gpa = gpaScoreOf(student.gpa, student.gpaScale);
  const rigor = rigorScoreOf(student.rigor);
  const test = testScoreOf(student, satTargets);
  const score = blend([[0.45, gpa], [0.30, rigor], [0.25, test]]);
  return { available: score != null, score, gpaScore: gpa, rigorScore: rigor, testScore: test };
}

// Heuristic story coherence when the AI thread (Phase 3) isn't present yet:
// the share of activities sharing the single most common theme.
function heuristicCoherence(activities) {
  const themed = activities.filter((a) => nonEmpty(a.theme));
  if (!themed.length) return 0;
  const counts = {};
  themed.forEach((a) => { const t = String(a.theme).trim().toLowerCase(); counts[t] = (counts[t] || 0) + 1; });
  const top = Math.max(...Object.values(counts));
  return Math.round((top / activities.length) * 100);
}

function ecStoryOf(activities, storyThread) {
  activities = activities || [];
  const coherence = (storyThread && num(storyThread.coherenceScore) != null)
    ? clamp(num(storyThread.coherenceScore)) : heuristicCoherence(activities);
  const withImpact = activities.filter((a) => nonEmpty(a.impactMetric)).length;
  const breadth = clamp((withImpact / 3) * 100);
  const available = activities.length > 0 || !!(storyThread && num(storyThread.coherenceScore) != null);
  const score = available ? Math.round(0.70 * coherence + 0.30 * breadth) : null;
  return { available, score, coherenceScore: coherence, activitiesWithImpact: withImpact };
}

// Application is a weighted checklist. Some items are inferred from the data we
// already have (scores entered, activity list); essays/recommenders come from an
// optional application doc the student maintains.
const APP_ITEMS = [
  { key: "scoresEntered", weight: 0.25 },
  { key: "activityList", weight: 0.25 },
  { key: "essaysDrafted", weight: 0.30 },
  { key: "recommenders", weight: 0.20 },
];
function applicationOf(student, activities, application) {
  application = application || {};
  const done = {
    scoresEntered: nonEmpty(student.gpa) || effectiveSat(student) != null || student.testOptional === true,
    activityList: (activities || []).length > 0,
    essaysDrafted: application.essaysDrafted === true,
    recommenders: application.recommenders === true,
  };
  const score = Math.round(APP_ITEMS.reduce((s, it) => s + (done[it.key] ? it.weight : 0), 0) * 100);
  return { available: true, score, items: done };
}

// Funding derived from a plan (engine output). Returns score + student-safe
// status + the dollar gap (caller strips the gap for student-readable docs).
function fundingOf(plan) {
  const f = plan && plan.financial;
  if (!f || !f.available) {
    return { available: false, score: null, status: "needs a parent", gap: null };
  }
  const budget = num(f.budget) || 0;
  const gap = f.remainingPerYear != null ? Math.max(0, num(f.remainingPerYear)) : null;
  if (gap == null || !budget) return { available: true, score: 60, status: "stretch", gap };
  const ratio = gap / budget;
  const score = clamp(Math.round(100 - ratio * 100));
  const status = ratio <= 0.1 ? "within reach" : ratio <= 0.5 ? "stretch" : "out of plan";
  return { available: true, score, status, gap };
}

function computeReadiness(inputs) {
  inputs = inputs || {};
  const student = inputs.student || {};
  const academics = academicsOf(student, inputs.satTargets);
  const ecStory = ecStoryOf(inputs.activities, inputs.storyThread);
  const application = applicationOf(student, inputs.activities, inputs.application);
  const funding = fundingOf(inputs.plan);

  const overall = blend([
    [WEIGHTS.academics, academics.score],
    [WEIGHTS.ecStory, ecStory.score],
    [WEIGHTS.application, application.score],
    [WEIGHTS.funding, funding.score],
  ]);

  return { version: READINESS_VERSION, overall, dimensions: { academics, ecStory, application, funding } };
}

// Project the funding dimension to a student-safe shape (drop the dollar gap).
function studentSafe(readiness) {
  const d = readiness.dimensions;
  return {
    version: readiness.version,
    overall: readiness.overall,
    dimensions: {
      academics: d.academics,
      ecStory: d.ecStory,
      application: d.application,
      funding: { available: d.funding.available, score: d.funding.score, status: d.funding.status },
    },
  };
}

export { computeReadiness, studentSafe, READINESS_VERSION, WEIGHTS };
