// Ported from collegeapp01 tools/regen-scorecard.js @ 8171b8a — pure parts only.
// The origin script was Firestore-coupled; GPS keeps the College Scorecard
// query/mapping layer and drops the doc read/write plumbing. The mapping
// produces candidates in the exact shape of the offline IPEDS SAMPLE rows, so
// engine.recommend() accepts either source interchangeably.
// The API key comes from the caller (VITE_SCORECARD_API_KEY / server secret);
// with no key, callers fall back to the built-in IPEDS dataset.

import { INCOME_SUF } from "../../data/dataset.js";
import { PROGRAM_KEYS } from "./engine.js";

const BASE = ["school.name", "school.state", "school.city", "school.school_url", "school.ownership", "latest.student.size", "latest.admissions.admission_rate.overall", "latest.admissions.sat_scores.25th_percentile.critical_reading", "latest.admissions.sat_scores.75th_percentile.critical_reading", "latest.admissions.sat_scores.25th_percentile.math", "latest.admissions.sat_scores.75th_percentile.math", "latest.cost.avg_net_price.overall"];

export function scorecardFields() {
  return BASE
    .concat(INCOME_SUF.map((s) => "latest.cost.net_price.public.by_income_level." + s))
    .concat(INCOME_SUF.map((s) => "latest.cost.net_price.private.by_income_level." + s))
    .concat(PROGRAM_KEYS.map((k) => "latest.academics.program_percentage." + k))
    .join(",");
}

export function scorecardUrl(state, perState, key) {
  return "https://api.data.gov/ed/collegescorecard/v1/schools?school.degrees_awarded.predominant=3&school.operating=1&school.state=" + state + "&per_page=" + perState + "&fields=" + scorecardFields() + "&api_key=" + encodeURIComponent(key);
}

// Map one raw Scorecard record to the SAMPLE row shape. Pure — unit-testable
// without the network.
export function mapScorecardRow(rec) {
  const own = Number(rec["school.ownership"]);
  const ni = INCOME_SUF.map((s) => { let v = own === 2 ? rec["latest.cost.net_price.private.by_income_level." + s] : rec["latest.cost.net_price.public.by_income_level." + s]; if (v == null) v = rec["latest.cost.avg_net_price.overall"]; return (v == null || isNaN(v)) ? null : Number(v); });
  const r25 = rec["latest.admissions.sat_scores.25th_percentile.critical_reading"], m25 = rec["latest.admissions.sat_scores.25th_percentile.math"], r75 = rec["latest.admissions.sat_scores.75th_percentile.critical_reading"], m75 = rec["latest.admissions.sat_scores.75th_percentile.math"];
  const programs = {};
  PROGRAM_KEYS.forEach((k) => { const v = rec["latest.academics.program_percentage." + k]; if (v != null && !isNaN(v) && Number(v) > 0) programs[k] = Number(v); });
  return { name: rec["school.name"], state: rec["school.state"], city: rec["school.city"] || null, website: rec["school.school_url"] || null, own, size: rec["latest.student.size"], admit: rec["latest.admissions.admission_rate.overall"] != null ? Number(rec["latest.admissions.admission_rate.overall"]) : null, sat25: (r25 && m25) ? Number(r25) + Number(m25) : null, sat75: (r75 && m75) ? Number(r75) + Number(m75) : null, ni: ni.some((x) => x != null) ? ni.map((x) => (x == null ? 0 : x)) : null, net: rec["latest.cost.avg_net_price.overall"] != null ? Number(rec["latest.cost.avg_net_price.overall"]) : null, programs: Object.keys(programs).length ? programs : null };
}

// Query EACH state separately and merge (like the origin), so one big state
// can't crowd the others out of the per-page-capped candidate pool.
// Returns null when there is no key or no states — callers then use the
// offline IPEDS SAMPLE. `fetchImpl` is injectable for tests.
export async function fetchScorecardCandidates(key, states, fetchImpl = fetch) {
  if (!key || !states || !states.length) return null;
  const perState = Math.max(20, Math.floor(80 / states.length));
  const rows = [];
  for (const st of states) {
    const r = await fetchImpl(scorecardUrl(st, perState, key));
    if (!r.ok) continue;
    rows.push(...((await r.json()).results || []));
  }
  return rows.map(mapScorecardRow).filter((c) => c.name);
}
