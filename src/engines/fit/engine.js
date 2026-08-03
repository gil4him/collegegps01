// Ported from collegeapp01 functions/engine.js @ 8171b8a — keep public interface.
/* engine.js — pure recommendation engine.
   recommend(parentAnswers, studentAnswers, config) -> ranked results[]
   Scores each candidate college on: affordability (net price for the family's
   income band vs the parent's budget), academic fit (reach/match/safety), and
   preference fit; combines them with superadmin-configurable weights into a
   "sweet-spot" score. Pure + deterministic so it can be unit-tested and swapped.
   Candidates here come from the real IPEDS dataset; generateRecommendations may
   pass live College Scorecard candidates of the same shape instead. */
import { SAMPLE, STATES } from "../../data/dataset.js";
import * as CE from "./collegeEntry.js";
import { resolveRecognition, canonicalKey } from "./recognition.js";
import { resolveNationalRank } from "./nationalRank.js";

const MODEL_VERSION = "engine-v3";
// Top-level axis weights, plus how the preference axis splits between the
// student's and the parent's stated preferences (parent-led 40/60 by default),
// and a small bonus when BOTH sides' preferences are satisfied by a school.
const DEFAULT_WEIGHTS = {
  affordability: 0.5, academicFit: 0.35, preferenceFit: 0.15,
  preferenceSplit: { student: 0.4, parent: 0.6 },
  agreementBonus: 5,
};

// True 3-way sector from Scorecard `school.ownership` (1/2/3). The legacy `own`
// field (1/2) collapses for-profit into "private" — sector keeps the distinction
// so a for-profit vocational college is never displayed unmarked next to a
// public flagship (failure class F5, docs/STRATEGY.md).
function sectorFromOwnership(own) {
  return own === 1 ? "public" : own === 2 ? "private_nonprofit" : own === 3 ? "for_profit" : "unknown";
}

// Entry-model resolution (failure class F1 — see collegeEntry.js). Precedence
// per major: school byMajor > definitional pre-professional majors > school
// default. Across the student's majors we surface the MOST CAUTIONARY
// applicable model — the badge exists to warn, so the riskiest gate wins.
// No data → honest "unknown" (renders nothing, never a false "direct entry").
const ENTRY_SEVERITY = { secondary_admission: 4, transfer_only: 3, pre_professional: 2, direct_entry: 1, unknown: 0 };
function resolveEntryModel(schoolName, majorLabels) {
  const key = CE.NAME_ALIASES[schoolName] || schoolName;
  const rec = CE.ENTRY_MODELS[key];
  const majors = (Array.isArray(majorLabels) ? majorLabels : (majorLabels ? [majorLabels] : [])).filter(Boolean);

  let best = null; // { model, note, source, asOf, confidence }
  const consider = (model, note, source, asOf, confidence) => {
    if (!model || model === "unknown") return;
    if (!best || ENTRY_SEVERITY[model] > ENTRY_SEVERITY[best.model]) best = { model, note, source, asOf, confidence };
  };
  for (const m of majors) {
    if (rec && rec.byMajor && rec.byMajor[m]) consider(rec.byMajor[m], rec.note, rec.source, rec.asOf, rec.confidence);
    else if (CE.PRE_PROFESSIONAL_MAJORS[m]) consider("pre_professional", CE.PRE_PROFESSIONAL_MAJORS[m], "definitional", null, 0.95);
    else if (rec && rec.default) consider(rec.default, rec.note, rec.source, rec.asOf, rec.confidence);
  }
  // No majors stated: the school-wide default still informs (e.g. Penn State's
  // entrance-to-major gate applies regardless of which major they'll pick).
  if (!majors.length && rec && rec.default) consider(rec.default, rec.note, rec.source, rec.asOf, rec.confidence);

  if (!best) return { entryModel: "unknown" };
  return { entryModel: best.model, entryModelNote: best.note || null, entryModelSource: best.source || null, entryModelAsOf: best.asOf || null, entryModelConfidence: best.confidence != null ? best.confidence : null };
}

// Recognition tier (slate composition data — see recognition.js). NEVER feeds
// any fit/affordability/preference score: it only shapes which rows the slate
// composer picks per bucket. Unlisted schools honestly default to tier 4.
function resolveRecognitionSafe(schoolName, carnegieBasic) {
  return resolveRecognition(schoolName, carnegieBasic);
}

// National rank (display data — see nationalRank.js). Like recognition, it
// never feeds any score; unlisted schools honestly resolve to no rank.
function resolveNationalRankSafe(schoolName) {
  return resolveNationalRank(schoolName);
}

function incomeBandIdx(income) {
  if (income <= 30000) return 0;
  if (income <= 48000) return 1;
  if (income <= 75000) return 2;
  if (income <= 110000) return 3;
  return 4;
}
// Map the questionBank income-band label to a representative income.
function representativeIncome(band) {
  const m = { "Under $50k": 40000, "$50–75k": 62000, "$75–110k": 92000, "$110–150k": 130000, "$150–200k": 175000, "$200k+": 220000 };
  return m[band] != null ? m[band] : 90000;
}
function netFor(school, income) {
  if (Array.isArray(school.ni) && school.ni.length === 5) return Math.max(0, school.ni[incomeBandIdx(income)]);
  return school.net != null ? school.net : null;
}
// Academic fit from the student's strength (SAT and/or GPA, blended) vs the
// school's difficulty (its SAT 75th + admit rate). GPA matters even when the
// student is test-optional, so changing GPA changes reach/match/safety.
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function gpaStrength01(gpa, scale) {
  const g = Number(gpa);
  if (!isFinite(g) || g <= 0) return null;
  const max = scale === "5.0" ? 5 : scale === "100" ? 100 : 4;
  return clamp01(g / max);
}
// ACT→SAT concordance (College Board / ACT 2018 tables). Used ONLY when a
// student reported an ACT but no SAT, so an ACT-only applicant's score still
// counts toward fit instead of being silently ignored. We convert in-memory for
// scoring and never persist a synthetic SAT — Ask/essays must not tell a student
// they took a test they didn't.
const ACT_TO_SAT = { 36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340, 28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080, 20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890, 15: 850, 14: 800, 13: 760, 12: 710, 11: 670, 10: 630, 9: 590 };
function effectiveSat(student) {
  const sat = Number(student.sat) || null;
  if (sat) return sat;
  const act = Math.round(Number(student.act));
  return isFinite(act) && ACT_TO_SAT[act] ? ACT_TO_SAT[act] : null;
}
// Blended 0–1 academic strength (60% SAT / 40% GPA, either alone if only one).
// Shared by per-school fit AND slate sizing, so both agree on "strong student".
function studentStrength01(student) {
  const sat = effectiveSat(student);
  const satStr = sat ? clamp01((sat - 400) / 1200) : null;          // 400→0, 1600→1
  const gpaStr = gpaStrength01(student.gpa, student.gpaScale);
  if (satStr != null && gpaStr != null) return 0.6 * satStr + 0.4 * gpaStr;
  return satStr != null ? satStr : gpaStr;
}
function academic(student, school) {
  const strength = studentStrength01(student);

  if (strength == null) {
    // No student academic signal at all → fall back to school selectivity only.
    const admit = school.admit;
    if (admit != null) {
      if (admit >= 0.6) return { category: "safety", fit: 80 };
      if (admit <= 0.2) return { category: "reach", fit: 35 };
      return { category: "match", fit: 65 };
    }
    return { category: "match", fit: 50 };
  }

  const diffs = [];
  if (school.sat75) diffs.push(clamp01((school.sat75 - 400) / 1200));
  if (school.admit != null) diffs.push(clamp01(1 - school.admit));
  const difficulty = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0.5;

  const gap = strength - difficulty;
  if (gap >= 0.12) return { category: "safety", fit: Math.min(100, Math.round(80 + gap * 50)) };
  if (gap >= -0.12) return { category: "match", fit: Math.round(62 + gap * 80) };
  return { category: "reach", fit: Math.max(15, Math.round(45 + gap * 60)) };
}
function affordability(net, budget) {
  if (net == null || !budget) return { score: 50, gap: null };
  const gap = net - budget;
  if (net <= budget) return { score: Math.min(100, 80 + Math.round((20 * (budget - net)) / budget)), gap };
  if (net <= budget * 1.25) return { score: 55, gap };
  if (net <= budget * 1.6) return { score: 30, gap };
  return { score: 10, gap };
}
function clamp(n) { return Math.max(0, Math.min(100, n)); }
function nonEmpty(v) { return v != null && String(v).trim() !== "" && v !== "No preference"; }
// A value is "present" if it's a non-empty array OR a non-empty scalar.
function present(v) { return Array.isArray(v) ? v.some(nonEmpty) : nonEmpty(v); }

// Map each preferred-major LABEL (must match app/src/wizard/options.js
// MAJOR_OPTIONS) to a College Scorecard program category key
// (latest.academics.program_percentage.<key>). "Undecided" maps to nothing.
const MAJOR_TO_CIP = {
  "Accounting": "business_marketing", "Aerospace Engineering": "engineering",
  "Agriculture & Natural Resources": "agriculture", "Anthropology": "social_science",
  "Architecture": "architecture", "Art & Design": "visual_performing", "Biology": "biological",
  "Biomedical Engineering": "engineering", "Business Administration": "business_marketing",
  "Chemical Engineering": "engineering", "Chemistry": "physical_science", "Civil Engineering": "engineering",
  "Communications & Journalism": "communication", "Computer Engineering": "engineering",
  "Computer Science": "computer", "Criminal Justice": "security_law_enforcement", "Cybersecurity": "computer",
  "Data Science": "computer", "Dentistry (Pre-Dental)": "health", "Economics": "social_science",
  "Education": "education", "Electrical Engineering": "engineering", "English & Literature": "english",
  "Environmental Science": "resources", "Film & Media Studies": "visual_performing", "Finance": "business_marketing",
  "Foreign Languages": "language", "Graphic Design": "visual_performing", "History": "history",
  "Hospitality & Tourism": "business_marketing", "Industrial Engineering": "engineering",
  "Information Technology": "computer", "International Relations": "social_science",
  "Kinesiology & Exercise Science": "parks_recreation_fitness", "Law (Pre-Law)": "legal",
  "Linguistics": "language", "Management": "business_marketing", "Marketing": "business_marketing",
  "Mathematics": "mathematics", "Mechanical Engineering": "engineering", "Medicine (Pre-Med)": "biological",
  "Music": "visual_performing", "Neuroscience": "biological", "Nursing": "health",
  "Nutrition & Dietetics": "health", "Performing Arts (Theater/Dance)": "visual_performing",
  "Pharmacy": "health", "Philosophy": "philosophy_religious", "Physics": "physical_science",
  "Political Science": "social_science", "Psychology": "psychology", "Public Health": "health",
  "Public Policy": "public_administration_social_service", "Social Work": "public_administration_social_service",
  "Sociology": "social_science", "Software Engineering": "computer", "Statistics": "mathematics",
  "Supply Chain & Logistics": "business_marketing", "Veterinary Science (Pre-Vet)": "biological",
};
// Major-SPECIFIC 4-digit CIP codes (CIP-4 precision layer). The broad CIP-2
// families above collapse distinct majors ("health" ≈ nursing + pharmacy +
// public health…), so a nursing gate lets a public-health-only school through.
// Where a major has a canonical, unambiguous CIP-4 home, list it here — a
// school verified (live Scorecard field-of-study data) to award a BACHELOR'S
// in one of these codes is the top ordering tier; verified NOT to is demoted.
// Ambiguous majors (Film, pre-professional tracks, broad fields) are
// deliberately absent and keep CIP-2 behavior; arrays mean any-of.
const MAJOR_TO_CIP4 = {
  "Accounting": ["5203"], "Aerospace Engineering": ["1402"], "Anthropology": ["4502"],
  "Architecture": ["0402"], "Biology": ["2601"], "Biomedical Engineering": ["1405"],
  "Business Administration": ["5202"], "Chemical Engineering": ["1407"], "Chemistry": ["4005"],
  "Civil Engineering": ["1408"], "Computer Engineering": ["1409"], "Computer Science": ["1107"],
  "Criminal Justice": ["4301"], "Cybersecurity": ["1110"], "Data Science": ["3070", "1107"],
  "Economics": ["4506"], "Electrical Engineering": ["1410"], "English & Literature": ["2301"],
  "Finance": ["5208"], "History": ["5401"], "Hospitality & Tourism": ["5209"],
  "Industrial Engineering": ["1435"], "Information Technology": ["1110"],
  "International Relations": ["4509"], "Kinesiology & Exercise Science": ["3105"],
  "Linguistics": ["1602"], "Management": ["5202"], "Marketing": ["5214"],
  "Mathematics": ["2701"], "Mechanical Engineering": ["1419"], "Music": ["5009"],
  "Neuroscience": ["2615"], "Nursing": ["5138"], "Nutrition & Dietetics": ["5131"],
  "Pharmacy": ["5120"], "Philosophy": ["3801"], "Physics": ["4008"],
  "Political Science": ["4510"], "Psychology": ["4201"], "Public Health": ["5122"],
  "Public Policy": ["4405"], "Social Work": ["4407"], "Sociology": ["4511"],
  "Software Engineering": ["1107", "1409"], "Statistics": ["2705"],
  "Supply Chain & Logistics": ["5220"],
};
function resolveMajorCip4(majorLabels) {
  const out = [];
  (Array.isArray(majorLabels) ? majorLabels : []).forEach((m) => {
    (MAJOR_TO_CIP4[m] || []).forEach((c) => { if (out.indexOf(c) < 0) out.push(c); });
  });
  return out;
}

// Canonical major labels (mirror of app MAJOR_OPTIONS minus "Undecided"). Shared
// so Career Discovery can constrain its suggested major to a real option, making
// the wizard's majors prefill an exact match instead of a fuzzy client-side guess.
const MAJOR_LABELS = Object.keys(MAJOR_TO_CIP);
// The distinct Scorecard program keys we request/score.
const PROGRAM_KEYS = Array.from(new Set(Object.keys(MAJOR_TO_CIP).map((k) => MAJOR_TO_CIP[k])));
function resolveMajorKeys(majors) {
  const arr = Array.isArray(majors) ? majors : (majors ? [majors] : []);
  const out = [];
  arr.forEach((m) => { const k = MAJOR_TO_CIP[m]; if (k && out.indexOf(k) < 0) out.push(k); });
  return out;
}
function sizeCatOf(size) { return size < 5000 ? "Small" : size <= 15000 ? "Medium" : "Large"; }

// Regions → member states, so "West Coast" etc. resolve to real schools.
// The three BROAD bands (West/Central/East) are the wizard's primary options —
// every state appears in exactly one band; the finer regions remain resolvable
// so previously saved preferences keep working.
const REGIONS = {
  "west": ["WA", "OR", "CA", "NV", "ID", "MT", "WY", "UT", "CO", "AZ", "NM", "AK", "HI"],
  "central": ["ND", "SD", "NE", "KS", "OK", "TX", "MN", "IA", "MO", "AR", "LA", "WI", "IL", "MI", "IN", "OH"],
  "east": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA", "DE", "MD", "DC", "VA", "WV", "KY", "TN", "NC", "SC", "GA", "AL", "MS", "FL"],
  "northeast": ["ME", "NH", "VT", "MA", "RI", "CT", "NY", "NJ", "PA"],
  "new england": ["ME", "NH", "VT", "MA", "RI", "CT"],
  "mid-atlantic": ["NY", "NJ", "PA", "DE", "MD", "DC", "VA"],
  "southeast": ["VA", "NC", "SC", "GA", "FL", "TN", "AL", "MS", "KY", "WV", "AR", "LA"],
  "midwest": ["OH", "MI", "IN", "IL", "WI", "MN", "IA", "MO"],
  "great plains": ["ND", "SD", "NE", "KS"],
  "southwest": ["TX", "OK", "NM", "AZ"],
  "mountain west": ["CO", "UT", "NV", "ID", "MT", "WY"],
  "west coast": ["CA", "OR", "WA"],
  "pacific northwest": ["WA", "OR", "ID"],
};
let _nameToAbbr;
function nameToAbbr() {
  if (!_nameToAbbr) { _nameToAbbr = {}; Object.keys(STATES || {}).forEach((ab) => { _nameToAbbr[STATES[ab].toLowerCase()] = ab; }); }
  return _nameToAbbr;
}
// Resolve a free-text/region/state location (string OR array) to a set of state
// abbreviations.
function resolveStates(location) {
  if (Array.isArray(location)) {
    const out = [];
    location.forEach((l) => resolveStates(l).forEach((s) => { if (out.indexOf(s) < 0) out.push(s); }));
    return out;
  }
  const loc = String(location || "").trim().toLowerCase();
  if (!loc) return [];
  if (REGIONS[loc]) return REGIONS[loc];
  const n2a = nameToAbbr();
  if (n2a[loc]) return [n2a[loc]];
  const up = loc.toUpperCase();
  if (STATES && STATES[up]) return [up];
  for (const name in n2a) { if (loc.indexOf(name) >= 0) return [n2a[name]]; }
  return [];
}
function locationHit(school, location) {
  const states = resolveStates(location);
  if (states.length) return states.indexOf(school.state) >= 0;
  const city = String(school.city || "").toLowerCase();
  return city.length >= 4 && (" " + String(location).toLowerCase() + " ").indexOf(city) >= 0;
}
// Alias-aware canonical name key (recognition.js), safe-required. Live
// Scorecard spellings ("University of California-Los Angeles") and offline
// ones ("University of California, Los Angeles") must compare equal wherever
// names are matched — target hits and pool dedup both go through this.
function canonNameSafe(n) {
  return canonicalKey(n);
}
// A target list (array or string) hits when a named school matches this school.
// Compared on normalized names so a stored target hits its live-spelled row.
function targetHit(school, targets) {
  if (!present(targets)) return false;
  const list = Array.isArray(targets) ? targets : String(targets).split(/[,;\n]+/);
  const name = canonNameSafe(school.name);
  return list.map((t) => canonNameSafe(t)).filter((t) => t.length >= 4)
    .some((t) => name.indexOf(t) >= 0 || t.indexOf(name) >= 0);
}
// All offline (IPEDS) schools, flattened — used to guarantee a named target
// appears in the candidate pool even if a location filter would exclude it.
let _allSample;
function allSample() {
  if (!_allSample) { _allSample = []; Object.keys(SAMPLE).forEach((st) => SAMPLE[st].forEach((sc) => _allSample.push(Object.assign({ state: st }, sc)))); }
  return _allSample;
}
function toArr(v) { return Array.isArray(v) ? v : (present(v) ? [v] : []); }

// National reach seed: the nationally recognized selective schools (tier ≤2,
// admit ≤25%) MISSING from an existing candidate pool, spliced from the offline
// dataset. buildRecommendations appends these to the state/region-scoped LIVE
// Scorecard pool so a strong student never misses "the Ivies" just because of
// where they live (the offline fallback pool is already national and needs no
// seeding). Seeds still pass through recommend()'s location filter, so an
// explicit location choice is honored. Dedup is by canonical name so a live
// Scorecard row ("Massachusetts Institute of Technology") is never doubled by
// its offline twin ("MIT").
const SEED_TIER_MAX = 2;
const SEED_ADMIT_MAX = 0.25;
function nationalReachSeeds(existing) {
  const canonKey = canonicalKey;
  const have = new Set((existing || []).map((c) => canonKey(c.name)));
  return allSample().filter((sc) =>
    sc.admit != null && sc.admit <= SEED_ADMIT_MAX &&
    resolveRecognitionSafe(sc.name, sc.carnegie).recognitionTier <= SEED_TIER_MAX &&
    !have.has(canonKey(sc.name)));
}

// Whether a side expressed ANY usable college preference.
// Dialogue-derived fallback (docs/STRATEGY.md Slice 3 — "the conversation is
// the preference data"): when no majors were explicitly picked, Career
// Discovery's suggested major (cd_major, constrained to the canonical list at
// the source) supplies the major signal at HALF weight. An explicit pick always
// wins; the AI suggestion never competes with it.
function effectiveMajorKeys(prefs) {
  const explicit = resolveMajorKeys(prefs && prefs.majors);
  if (explicit.length) return { keys: explicit, derived: false };
  return { keys: resolveMajorKeys(prefs && prefs.cd_major ? [prefs.cd_major] : []), derived: true };
}

function hasPrefs(p) {
  return !!p && (present(p.size) || present(p.location) || present(p.targets) || effectiveMajorKeys(p).keys.length > 0);
}

// The household's intended-major context for slate composition. EXPLICIT
// picks (student or parent chose a major) carry a HARD gate — a school that
// demonstrably doesn't offer the major can't hold a slate slot. A major only
// inferred from Career Discovery dialogue (cd_major) reorders but never
// gates: an AI guess must not silently ban schools.
function majorContext(student, parentPrefs) {
  const sm = effectiveMajorKeys(student || {});
  const pm = resolveMajorKeys(parentPrefs && parentPrefs.majors);
  const explicit = Array.from(new Set((sm.derived ? [] : sm.keys).concat(pm)));
  const keys = explicit.length ? explicit : sm.keys;
  const sLabels = toArr((student || {}).majors);
  const pLabels = toArr(parentPrefs && parentPrefs.majors);
  const labels = sLabels.concat(pLabels).filter(Boolean);
  const cip4 = resolveMajorCip4(labels.length ? labels : toArr((student || {}).cd_major));
  return { keys, hardGate: explicit.length > 0, cip4 };
}
// Relevance of one row to the intended majors: 1 strong program (≥5% of
// degrees), 0 offered, -1 provably not offered, null unknown (no program
// data — never treated as "doesn't offer it").
function majorRelevance(row, majorKeys) {
  return majorMatch(row, majorKeys || []);
}
// Bucket ORDERING score (composition only). CIP-4 evidence, when a row was
// verified against live field-of-study data (row.cip4 = {code: bool}),
// outranks the broad CIP-2 family signal: a school verified to award a
// bachelor's in the SPECIFIC program is the top tier; one verified to lack
// it (e.g. public-health-only for a nursing kid, or grad-only nursing) sinks
// to the bottom — demoted, never banned, since it may still offer adjacent
// paths. Unverified rows keep the CIP-2 tiers. -1 stays the hard-gate signal.
function majorOrderScore(row, mctx) {
  const rel = majorRelevance(row, mctx.keys);
  if (rel === -1) return 0;
  const cip4 = mctx.cip4 || [];
  if (cip4.length && row && row.cip4) {
    const known = cip4.filter((c) => row.cip4[c] === true || row.cip4[c] === false);
    if (known.some((c) => row.cip4[c] === true)) return 6;
    if (known.length && known.length === cip4.length) return 1;
  }
  return rel === 1 ? 4 : rel === 0 ? 3 : 2;
}
// How well a school's program mix matches the desired majors: 1 strong (>=5% of
// degrees), 0 offered, -1 not offered, null when the school has no program data.
function majorMatch(school, majorKeys) {
  if (!majorKeys.length || !school.programs) return null;
  let best = -1;
  for (const k of majorKeys) {
    const pct = Number(school.programs[k]);
    if (isFinite(pct) && pct > 0) best = Math.max(best, pct >= 0.05 ? 1 : 0);
  }
  return best;
}
// One side's preference fit for a school (0–100), neutral 50 baseline. Setting is
// skipped (no data); majors use Scorecard program percentages when available.
function prefScore(school, prefs) {
  let s = 50;
  if (nonEmpty(prefs.size)) s += prefs.size === sizeCatOf(school.size || 0) ? 20 : -12;
  if (present(prefs.location)) s += locationHit(school, prefs.location) ? 15 : -8;
  const em = effectiveMajorKeys(prefs);
  const mm = majorMatch(school, em.keys);
  const mw = em.derived ? 0.5 : 1; // AI-suggested major nudges at half strength
  if (mm === 1) s += 20 * mw; else if (mm === 0) s += 8 * mw; else if (mm === -1) s -= 15 * mw;
  if (targetHit(school, prefs.targets)) s += 30; // explicit target — highest signal
  return clamp(Math.round(s));
}

// Blend the student's and parent's preference fit using the configured split,
// renormalized over whichever sides actually expressed preferences. When both
// did and both are satisfied (>=70), add the agreement bonus.
function blendPreference(school, studentPrefs, parentPrefs, weights) {
  const hasS = hasPrefs(studentPrefs), hasP = hasPrefs(parentPrefs);
  if (!hasS && !hasP) return { score: 50, both: false };
  const sS = hasS ? prefScore(school, studentPrefs) : null;
  const sP = hasP ? prefScore(school, parentPrefs) : null;
  if (hasS && !hasP) return { score: sS, both: false };
  if (hasP && !hasS) return { score: sP, both: false };
  const split = weights.preferenceSplit;
  let blended = split.student * sS + split.parent * sP;
  const both = sS >= 70 && sP >= 70;
  if (both) blended += weights.agreementBonus;
  return { score: clamp(Math.round(blended)), both };
}

function normalizeWeights(w) {
  const a = Number(w.affordability) || 0, b = Number(w.academicFit) || 0, c = Number(w.preferenceFit) || 0;
  const t = a + b + c || 1;
  const ds = DEFAULT_WEIGHTS.preferenceSplit;
  const sp = (w.preferenceSplit && typeof w.preferenceSplit === "object") ? w.preferenceSplit : ds;
  const ss = Number(sp.student), pp = Number(sp.parent);
  const st = (ss || 0) + (pp || 0) || 1;
  return {
    affordability: a / t, academicFit: b / t, preferenceFit: c / t,
    preferenceSplit: { student: (ss || ds.student) / st, parent: (pp || ds.parent) / st },
    agreementBonus: Number(w.agreementBonus != null ? w.agreementBonus : DEFAULT_WEIGHTS.agreementBonus) || 0,
  };
}
// Neutral, privacy-safe rationale: never attributes a preference to the parent
// vs. the student (the recommendations doc is read by both), so an unshared
// parent preference can't leak through the text. Each clause is omitted when its
// axis is unavailable (partial onboarding).
function rationale(net, aff, acad, pref) {
  const parts = [];
  if (net != null && aff && aff.gap != null) parts.push(aff.gap <= 0
    ? "Within budget (net ~$" + net.toLocaleString() + "/yr)"
    : "Over budget by ~$" + Math.abs(aff.gap).toLocaleString() + " (net ~$" + net.toLocaleString() + "/yr)");
  else if (net != null) parts.push("Net ~$" + net.toLocaleString() + "/yr");
  if (acad && acad.category) parts.push("academically a " + acad.category);
  if (pref) {
    if (pref.both) parts.push("matches both your and your family's preferences");
    else if (pref.score >= 70) parts.push("fits the stated preferences");
  }
  return parts.join(" · ") || "Add more details to refine this match";
}

function num(v) { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
// Which scoring axes can be computed from the inputs present. The parent supplies
// the financial axis; the student supplies the academic axis; either side can
// supply preferences. Missing axes are surfaced (not silently treated as 50).
function availabilityOf(parent, student, parentPrefs) {
  return {
    financial: num(parent.annualBudget) > 0 || nonEmpty(parent.incomeBand),
    academic: effectiveSat(student) != null || nonEmpty(student.gpa),
    preference: hasPrefs(student) || hasPrefs(parentPrefs),
  };
}
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

// candidates: optional array of {name,state,own,size,admit,sat25,sat75,ni|net};
//   defaults to the full IPEDS dataset.
// config.parentPrefs: the parent's college preferences (preferences/{parentUid}
//   .answers); student preferences are read from the `student` answers object.
function recommend(parent, student, config) {
  config = config || {};
  const weights = normalizeWeights(config.weights || DEFAULT_WEIGHTS);
  const income = representativeIncome(parent.incomeBand);
  const budget = Number(parent.annualBudget) || 0;
  const sat = Number(student.sat) || null;
  const studentPrefs = student || {};
  const parentPrefs = config.parentPrefs || {};

  let candidates = config.candidates;
  if (!candidates) {
    candidates = [];
    Object.keys(SAMPLE).forEach((st) => SAMPLE[st].forEach((sc) => candidates.push(Object.assign({ state: st }, sc))));
  }

  // A named preferred location (either side) FILTERS the pool to those states —
  // a location preference means "show me schools here," not a tiny nudge. We
  // keep the filter only if it leaves a usable set (>=5), else fall back to all.
  // The family's HOME state always survives the filter: it anchors the likely
  // bucket with affordable in-state options, and stripping it would skew the
  // whole list expensive the moment anyone picks a far-away region.
  const homeState = /^[A-Z]{2}$/.test(String(parent.state || "").toUpperCase()) ? String(parent.state).toUpperCase() : null;
  const prefStates = Array.from(new Set([].concat(resolveStates(studentPrefs.location), resolveStates(parentPrefs.location))));
  if (prefStates.length) {
    const keepStates = new Set(homeState ? prefStates.concat([homeState]) : prefStates);
    const filtered = candidates.filter((c) => keepStates.has(c.state));
    // Honor an explicit location choice even if it's only a few schools; only
    // fall back to the full pool when the chosen location has none.
    if (filtered.length >= 1) candidates = filtered;
  }

  // Target schools (either side) are GUARANTEED in the pool — add any missing
  // ones from the offline dataset so a location filter can't drop a target.
  // Dedup is canonical: a live row under its official spelling must block the
  // offline twin, or the target renders twice.
  const targetNames = [].concat(toArr(studentPrefs.targets), toArr(parentPrefs.targets)).map((t) => String(t).trim()).filter(Boolean);
  if (targetNames.length) {
    const have = candidates.map((c) => canonNameSafe(c.name));
    allSample().forEach((sc) => {
      if (targetHit(sc, targetNames) && have.indexOf(canonNameSafe(sc.name)) < 0) { candidates = candidates.concat([sc]); have.push(canonNameSafe(sc.name)); }
    });
  }

  const avail = availabilityOf(parent, student, parentPrefs);

  // Entry-model is major-specific: resolve against the household's intended
  // majors (either side), once per school inside the map.
  const intendedMajors = [].concat(toArr(studentPrefs.majors), toArr(parentPrefs.majors)).filter(Boolean);

  const results = candidates.map((sc) => {
    const net = avail.financial ? netFor(sc, income) : null;
    const aff = avail.financial ? affordability(net, budget) : { score: null, gap: null };
    const acad = avail.academic ? academic(student, sc) : { category: null, fit: null };
    const pref = blendPreference(sc, studentPrefs, parentPrefs, weights);

    // Sweet-spot is the weighted average over only the AVAILABLE axes,
    // renormalized — so a solo user still gets a meaningful ranking.
    const axes = [];
    if (avail.financial && aff.score != null) axes.push([weights.affordability, aff.score]);
    if (avail.academic && acad.fit != null) axes.push([weights.academicFit, acad.fit]);
    if (avail.preference) axes.push([weights.preferenceFit, pref.score]);
    const wsum = axes.reduce((s, x) => s + x[0], 0) || 1;
    const sweet = axes.length ? Math.round(axes.reduce((s, x) => s + x[0] * x[1], 0) / wsum) : null;

    return {
      collegeId: sc.id || sc.name,
      // Scorecard unit id (NOT collegeId — that stays name-keyed so favorites
      // and stored docs keep correlating). Used for CIP-4 offering lookups.
      scorecardId: sc.scorecardId != null ? sc.scorecardId : null,
      name: sc.name,
      state: sc.state || null,
      city: sc.city || null,
      website: sc.website || null,
      priceCalcUrl: sc.priceCalcUrl || null,
      gradRate: sc.gradRate != null ? sc.gradRate : null,
      earnings: sc.earnings != null ? sc.earnings : null,
      earningsYrs: sc.earningsYrs != null ? sc.earningsYrs : null,
      medianDebt: sc.medianDebt != null ? sc.medianDebt : null,
      pellRate: sc.pellRate != null ? sc.pellRate : null,
      act25: sc.act25 != null ? sc.act25 : null,
      act75: sc.act75 != null ? sc.act75 : null,
      own: sc.own != null ? sc.own : null,
      sector: sc.sector || sectorFromOwnership(sc.own),
      // Per-RECORD provenance (not the doc-level recs.source): target-backfill
      // can splice offline SAMPLE rows into a live Scorecard list, so a single
      // result set is mixed-provenance and each card must carry its own.
      dataSource: sc.dataSource || null,
      dataAsOf: sc.dataAsOf || null,
      dataConfidence: sc.dataConfidence != null ? sc.dataConfidence : null,
      ...resolveEntryModel(sc.name, intendedMajors),
      ...resolveRecognitionSafe(sc.name, sc.carnegie),
      ...resolveNationalRankSafe(sc.name),
      size: sc.size != null ? sc.size : null,
      programs: sc.programs || null,
      admit: sc.admit != null ? sc.admit : null,
      sat25: sc.sat25 || null,
      sat75: sc.sat75 || null,
      netPriceEstimate: net,
      affordabilityScore: aff.score,
      fitScore: acad.fit,
      preferenceScore: avail.preference ? pref.score : null,
      sweetSpotScore: sweet,
      category: acad.category,
      merit: sc.merit || null,
      target: targetNames.length ? targetHit(sc, targetNames) : false,
      rationale: rationale(net, aff, acad, avail.preference ? pref : null),
    };
  });
  results.sort((a, b) => (b.sweetSpotScore == null ? -1 : b.sweetSpotScore) - (a.sweetSpotScore == null ? -1 : a.sweetSpotScore) || a.name.localeCompare(b.name));
  const limit = config.limit || 20;
  // Pin target schools to the very top (sorted among themselves by score), then
  // fill the rest with the normal location-balanced ranking.
  if (targetNames.length) {
    const pinned = results.filter((r) => r.target);
    const pinnedIds = new Set(pinned.map((r) => r.collegeId));
    const rest = results.filter((r) => !pinnedIds.has(r.collegeId));
    const fill = rebalanceByState(rest, prefStates, Math.max(0, limit - pinned.length));
    return pinned.concat(fill).slice(0, limit);
  }
  return rebalanceByState(results, prefStates, limit);
}

// When several locations are preferred, guarantee each is represented (≥3 each,
// budget permitting) so one large state can't crowd the others out — then fill
// the rest by score. With 0–1 preferred states this is just the top-N.
function rebalanceByState(sorted, prefStates, limit) {
  if (!prefStates || prefStates.length < 2) return sorted.slice(0, limit);
  const quota = Math.max(3, Math.floor(limit / prefStates.length));
  const picked = []; const seen = new Set();
  for (const st of prefStates) {
    let n = 0;
    for (const r of sorted) {
      if (r.state === st && !seen.has(r.collegeId)) { picked.push(r); seen.add(r.collegeId); if (++n >= quota) break; }
    }
  }
  for (const r of sorted) { if (picked.length >= limit) break; if (!seen.has(r.collegeId)) { picked.push(r); seen.add(r.collegeId); } }
  picked.sort((a, b) => (b.sweetSpotScore == null ? -1 : b.sweetSpotScore) - (a.sweetSpotScore == null ? -1 : a.sweetSpotScore) || a.name.localeCompare(b.name));
  return picked.slice(0, limit);
}

// Rough federal Pell Grant eligibility from the household income band. The
// 2024-25+ FAFSA ties "maximum Pell" to income vs. the federal poverty
// guideline; without family-size/asset detail we approximate from the income
// band alone. College Scorecard net price already nets out grants (incl. Pell),
// so this is surfaced as eligibility CONTEXT, not an extra discount.
const PELL_MAX = 7395; // 2024-25 / 2025-26 maximum award
function estimatePell(incomeBand) {
  switch (incomeBand) {
    case "Under $50k": return { amount: PELL_MAX, label: "Likely maximum Pell", max: PELL_MAX };
    case "$50–75k": return { amount: 4000, label: "Likely partial Pell", max: PELL_MAX };
    case "$75–110k": return { amount: 1000, label: "Possible minimum Pell", max: PELL_MAX };
    default: return { amount: 0, label: "Unlikely to qualify by income", max: PELL_MAX };
  }
}

// Household-level planning summary derived from the ranked results + raw inputs.
// Each section flags whether it's `available` and, if not, what to add/finish.
function buildPlan(parent, student, parentPrefs, results) {
  parent = parent || {}; student = student || {};
  const avail = availabilityOf(parent, student, parentPrefs || {});

  const budget = Number(parent.annualBudget) || 0;
  const savings529 = Number(parent.savings529) || 0;
  const nets = results.map((r) => r.netPriceEstimate).filter((n) => n != null);
  const avgNet = nets.length ? Math.round(nets.reduce((a, b) => a + b, 0) / nets.length) : null;
  const remainingPerYear = (avail.financial && avgNet != null) ? Math.max(0, avgNet - budget) : null;
  const financial = {
    available: avail.financial,
    budget, savings529, incomeBand: parent.incomeBand || null,
    avgNet, remainingPerYear,
    fourYearGap: remainingPerYear != null ? remainingPerYear * 4 : null,
    yearsCoveredBy529: (savings529 > 0 && avgNet) ? Math.round((savings529 / avgNet) * 10) / 10 : null,
    pell: parent.incomeBand ? estimatePell(parent.incomeBand) : null,
    missing: avail.financial ? null : "Add the parent's budget & income to estimate affordability and 4-year funding.",
  };

  const sat = effectiveSat(student);
  const reachSat = results.filter((r) => r.category === "reach" && r.sat75).map((r) => r.sat75);
  const satTargetRaw = reachSat.length ? Math.min(1600, median(reachSat)) : null;
  const academicPlan = {
    available: avail.academic,
    sat, gpa: student.gpa || null, testOptional: !!student.testOptional,
    reachCount: results.filter((r) => r.category === "reach").length,
    matchCount: results.filter((r) => r.category === "match").length,
    safetyCount: results.filter((r) => r.category === "safety").length,
    satTarget: (avail.academic && satTargetRaw && sat && satTargetRaw > sat) ? satTargetRaw : null,
    missing: avail.academic ? null : "Add the student's GPA/SAT to estimate academic fit (reach / match / safety).",
  };

  const meritList = results.filter((r) => r.merit);
  const scholarship = {
    available: results.length > 0,
    count: meritList.length,
    highlights: meritList.slice(0, 5).map((r) => ({ name: r.name, state: r.state, merit: r.merit })),
    satForMerit: academicPlan.satTarget,
    missing: results.length ? null : "Generate your list to surface merit/scholarship signals.",
  };

  return { financial, academic: academicPlan, scholarship, availability: avail };
}

// --- recognition-balanced slate (composition layer) -------------------------
// Regroups the fit-ranked list into Dream/Target/Likely with recognition
// quotas. THE FIT MATH IS UNTOUCHED: buckets come from r.category, order
// inside a bucket is the existing rank, and quota shortfalls are fixed by
// swapping WITHIN the same bucket only — never by promoting a school across
// reach/match/safety lines (that would lie about odds). Hidden gems (tier 3-4
// in target/likely) always carry an anchorComparison to a recognizable school;
// dream schools carry an honest "unlocks" gap instead of inflated odds.
// Dream and target are 6 wide (3 felt discouragingly thin for strong
// students); likely stays a compact 3. A bucket renders fewer only when the
// pool honestly has fewer — shortfalls are never fixed by promoting schools
// across reach/match/safety lines.
const SLATE_SHAPE = [
  { key: "dream", count: 6, tierMax: 2, minRecognized: 2 },
  { key: "target", count: 6, tierMax: 2, minRecognized: 1 },
  { key: "likely", count: 3, tierMax: 3, minRecognized: 1 },
];
// Ultra-selective schools are a long shot for EVERYONE regardless of stats —
// the display bucket honors that (the legacy fitBand had this same override).
// This is dream-ELIGIBILITY only: r.category (and every score) is untouched,
// and the card still shows its true category chip.
const ULTRA_SELECTIVE_ADMIT = 0.15;
// Which display bucket a scored row belongs to (the same mapping composeSlate
// uses). Shared so the stored-results filler and the client's per-section
// "See all" expansion agree with the slate's own composition.
function slateBucketOf(r) {
  if (!r || !r.category) return null;
  const ultra = r.category === "match" && r.admit != null && r.admit <= ULTRA_SELECTIVE_ADMIT;
  if (r.category === "reach" || ultra) return "dream";
  if (r.category === "match") return "target";
  if (r.category === "safety") return "likely";
  return null;
}
function composeSlate(rankedRows, student, parentPrefs) {
  const rows = (rankedRows || []).filter((r) => r && r.category);
  const notes = [];
  const tierOfRow = (r) => (r.recognitionTier != null ? r.recognitionTier : 4);
  const sat = effectiveSat(student || {});

  const isUltra = (r) => r.category === "match" && r.admit != null && r.admit <= ULTRA_SELECTIVE_ADMIT;
  const poolByKey = {
    dream: rows.filter((r) => r.category === "reach" || isUltra(r)),
    target: rows.filter((r) => r.category === "match" && !isUltra(r)),
    likely: rows.filter((r) => r.category === "safety"),
  };

  // MAJOR RELEVANCE (composition only — fit math untouched): a "dream nursing
  // school" is a top school FOR NURSING, not a famous school with no nursing
  // program. With an intended major, every bucket fills strongest-program
  // first (strong > offered > unknown), and an EXPLICIT major hard-gates
  // schools whose program data shows the major isn't offered. Same logic for
  // every family and every major — the inputs are the household's own.
  const mctx = majorContext(student, parentPrefs);
  if (mctx.keys.length) {
    let gatedOut = 0;
    for (const k of Object.keys(poolByKey)) {
      let pool = poolByKey[k];
      if (mctx.hardGate) { const n = pool.length; pool = pool.filter((r) => majorRelevance(r, mctx.keys) !== -1); gatedOut += n - pool.length; }
      poolByKey[k] = pool.map((r, i) => [r, i]).sort((a, b) => majorOrderScore(b[0], mctx) - majorOrderScore(a[0], mctx) || a[1] - b[1]).map((p) => p[0]);
    }
    if (gatedOut > 0) notes.push("Schools that don't offer the intended major are set aside — every pick here offers it.");
  }

  const picksByKey = {};
  for (const shape of SLATE_SHAPE) {
    const pool = poolByKey[shape.key];
    const rank = new Map(pool.map((r, i) => [r.collegeId, i]));
    const picked = pool.slice(0, shape.count);
    const isRec = (r) => tierOfRow(r) <= shape.tierMax;
    let have = picked.filter(isRec).length;
    if (have < shape.minRecognized) {
      // Swap recognized schools in from deeper in the SAME bucket, replacing
      // the lowest-ranked unrecognized picks first.
      for (const c of pool.slice(shape.count)) {
        if (have >= shape.minRecognized) break;
        if (!isRec(c)) continue;
        for (let i = picked.length - 1; i >= 0; i--) {
          if (!isRec(picked[i])) { picked[i] = c; have++; break; }
        }
      }
      picked.sort((a, b) => rank.get(a.collegeId) - rank.get(b.collegeId));
    }
    if (have < shape.minRecognized) {
      notes.push(shape.key === "dream"
        ? "Well-known reach schools are scarce with your current filters — widen your geography to see more."
        : "Want more well-known options here? Widening your geography usually adds recognizable names.");
    }
    picksByKey[shape.key] = picked;
  }

  // Anchors: recognizable (tier ≤2) picks from the same bucket or a MORE
  // selective one — a gem may be anchored upward ("outcomes near Purdue's"),
  // never downward.
  const anchorsFor = {
    target: [...picksByKey.target, ...picksByKey.dream].filter((r) => tierOfRow(r) <= 2),
    likely: [...picksByKey.likely, ...picksByKey.target, ...picksByKey.dream].filter((r) => tierOfRow(r) <= 2),
  };
  const topPrograms = (r) => Object.entries(r.programs || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const pickAnchor = (gem, anchors) => {
    if (!anchors.length) return null;
    const gemTop = topPrograms(gem);
    let best = anchors[0]; let bestOverlap = -1;
    for (const a of anchors) {
      const overlap = topPrograms(a).filter((k) => gemTop.includes(k)).length;
      if (overlap > bestOverlap) { best = a; bestOverlap = overlap; }
    }
    return best;
  };
  const anchorComparison = (gem, anchor) => {
    if (!anchor) return null;
    const cmp = { anchorName: anchor.name };
    if (gem.admit > 0 && anchor.admit > 0) cmp.admitRateRatio = Math.round((gem.admit / anchor.admit) * 10) / 10;
    if (gem.netPriceEstimate != null && anchor.netPriceEstimate != null) cmp.netPriceDelta = Math.round(gem.netPriceEstimate - anchor.netPriceEstimate);
    // Outcome deltas only when BOTH rows carry real data — never fabricate an
    // outcomes claim.
    if (gem.earnings != null && anchor.earnings != null) cmp.earningsDelta = Math.round(gem.earnings - anchor.earnings);
    if (gem.gradRate != null && anchor.gradRate != null) cmp.gradRateDelta = Math.round((gem.gradRate - anchor.gradRate) * 100) / 100;
    return cmp;
  };
  // The badge must be EARNED: outcomes on par with the anchor (every known
  // outcome within tolerance, and at least one known — no outcomes data, no
  // gem claim) PLUS a genuine win (meaningfully cheaper or much better odds).
  // An obscure school that compares badly is just a safety — badging it "gem"
  // with an all-downside line would be a warning wearing a gem badge.
  const earnsGemBadge = (cmp) => {
    if (!cmp) return false;
    const gradKnown = cmp.gradRateDelta != null; const earnKnown = cmp.earningsDelta != null;
    if (!gradKnown && !earnKnown) return false;
    if (gradKnown && cmp.gradRateDelta < -0.05) return false;
    if (earnKnown && cmp.earningsDelta < -4000) return false;
    return (cmp.netPriceDelta != null && cmp.netPriceDelta <= -1000) || (cmp.admitRateRatio != null && cmp.admitRateRatio >= 1.5);
  };

  const entry = (r, bucketKey) => {
    const out = { collegeId: r.collegeId, recognitionTier: tierOfRow(r) };
    if (bucketKey === "dream") {
      // Honest unlocks: the concrete score gap to the admitted-range top, never
      // an inflated chance. A no-test student still gets the target number
      // (satGap null) — "a 1520+ SAT typically anchors admits here."
      if (r.sat75 && (!sat || sat < r.sat75)) out.unlocks = { satNeeded: r.sat75, satGap: sat ? r.sat75 - sat : null };
    } else if (tierOfRow(r) >= 3) {
      const cmp = anchorComparison(r, pickAnchor(r, anchorsFor[bucketKey]));
      if (earnsGemBadge(cmp)) { out.hiddenGem = true; out.anchorComparison = cmp; }
    }
    return out;
  };

  const slate = {
    dream: picksByKey.dream.map((r) => entry(r, "dream")),
    target: picksByKey.target.map((r) => entry(r, "target")),
    likely: picksByKey.likely.map((r) => entry(r, "likely")),
    notes,
  };
  // Invariant: a slate must never render with zero recognizable names.
  const all = [...picksByKey.dream, ...picksByKey.target, ...picksByKey.likely];
  if (all.length && !all.some((r) => tierOfRow(r) <= 2)) {
    slate.notes = [...notes, "Want more well-known options? Widen your geography — filters are limiting the pool."];
  }
  return slate;
}
// Student-safe slate: identical composition, minus dollar deltas (the wall).
function slateStudentSafe(slate) {
  if (!slate) return null;
  const strip = (e) => {
    const out = { ...e };
    if (out.anchorComparison) { const { netPriceDelta, ...rest } = out.anchorComparison; out.anchorComparison = rest; }
    return out;
  };
  return { dream: (slate.dream || []).map(strip), target: (slate.target || []).map(strip), likely: (slate.likely || []).map(strip), notes: slate.notes || [] };
}

// --- student-safe projection (THE WALL) ------------------------------------
// Strips every dollar figure from a recommendation result set + plan, replacing
// per-school net price and the financial plan with reach/stretch/out-of-plan
// STATUS. Used to build the student-readable recommendations doc.
function affordabilityStatus(score) {
  if (score == null) return null;
  return score >= 70 ? "within reach" : score >= 40 ? "stretch" : "out of plan";
}
function fundingStatusOf(financial) {
  if (!financial || !financial.available) return null;
  if (financial.remainingPerYear == null) return "stretch";
  const ratio = financial.budget ? financial.remainingPerYear / financial.budget : 1;
  return ratio <= 0.1 ? "within reach" : ratio <= 0.5 ? "stretch" : "out of plan";
}
function safeRationaleFor(r) {
  const parts = [];
  const aff = affordabilityStatus(r.affordabilityScore);
  if (aff) parts.push("Affordability: " + aff);
  if (r.category) parts.push("academically a " + r.category);
  if (r.preferenceScore != null && r.preferenceScore >= 70) parts.push("fits the stated preferences");
  return parts.join(" · ") || "Add more details to refine this match";
}
function toStudentSafe(results, planning) {
  const safeResults = (results || []).map((r) => ({
    collegeId: r.collegeId, name: r.name, state: r.state, city: r.city, website: r.website || null,
    priceCalcUrl: r.priceCalcUrl || null,
    gradRate: r.gradRate != null ? r.gradRate : null, earnings: r.earnings != null ? r.earnings : null,
    earningsYrs: r.earningsYrs != null ? r.earningsYrs : null,
    medianDebt: r.medianDebt != null ? r.medianDebt : null, pellRate: r.pellRate != null ? r.pellRate : null,
    act25: r.act25 != null ? r.act25 : null, act75: r.act75 != null ? r.act75 : null,
    own: r.own != null ? r.own : null, size: r.size != null ? r.size : null, programs: r.programs || null,
    // Sector + per-record provenance are non-financial and matter MOST to the
    // student (they're the one applying) — explicitly whitelisted through the wall.
    sector: r.sector || null,
    dataSource: r.dataSource || null, dataAsOf: r.dataAsOf || null,
    dataConfidence: r.dataConfidence != null ? r.dataConfidence : null,
    entryModel: r.entryModel || "unknown", entryModelNote: r.entryModelNote || null,
    entryModelSource: r.entryModelSource || null, entryModelAsOf: r.entryModelAsOf || null,
    entryModelConfidence: r.entryModelConfidence != null ? r.entryModelConfidence : null,
    // Recognition (non-financial composition data) — whitelisted through the wall.
    recognitionTier: r.recognitionTier != null ? r.recognitionTier : 4,
    recognitionFlags: r.recognitionFlags || null,
    // National rank (public display data) — whitelisted through the wall.
    nationalRank: r.nationalRank != null ? r.nationalRank : null,
    nationalRankList: r.nationalRankList || null,
    nationalRankSource: r.nationalRankSource || null,
    admit: r.admit, sat25: r.sat25 || null, sat75: r.sat75,
    category: r.category, fitScore: r.fitScore, preferenceScore: r.preferenceScore, sweetSpotScore: r.sweetSpotScore,
    affordabilityStatus: affordabilityStatus(r.affordabilityScore),
    merit: r.merit || null, target: !!r.target,
    rationale: safeRationaleFor(r),
    // intentionally omitted: netPriceEstimate, affordabilityScore (dollars)
  }));
  const p = planning || {};
  const f = p.financial || {};
  const safePlanning = {
    financial: { available: !!f.available, status: fundingStatusOf(f), missing: f.missing || null },
    academic: p.academic || null,       // no dollars in the academic plan
    scholarship: p.scholarship || null, // merit text only (no family dollars)
    availability: p.availability || null,
  };
  return { results: safeResults, planning: safePlanning };
}

export { recommend, buildPlan, availabilityOf, toStudentSafe, affordabilityStatus, resolveStates, resolveMajorKeys, sectorFromOwnership, resolveEntryModel, composeSlate, slateStudentSafe, slateBucketOf, majorContext, majorRelevance, majorOrderScore, resolveMajorCip4, nationalReachSeeds, PROGRAM_KEYS, MAJOR_LABELS, MODEL_VERSION, DEFAULT_WEIGHTS, normalizeWeights, prefScore, blendPreference };
