// Ported from collegeapp01 functions/recognition.js @ 8171b8a — keep public interface.
/* recognition.js — curated recognition-tier overlay for slate composition.
   Same house pattern as collegeEntry.js: name-keyed curated data with
   source/asOf, lazy-required by the engine, resolved at row-build time.

   Recognition answers "does this list look credible to a parent in 5 seconds"
   — it is COMPOSITION data only and must never leak into fit scores (that
   would corrupt the honest fit math; see the slate spec + docs/STRATEGY.md).

   Tiers: 1 household · 2 national/flagship/name-LAC · 3 known-in-field ·
   4 long tail (the honest default for anything unlisted).

   Name matching: canonical names live in recognitionTiers.json (offline-dataset
   spelling); IPEDS/Scorecard official names fold in via the aliases map plus a
   conservative normalizer. Normalization deliberately does NOT strip campus
   words like "-Los Angeles" — that would collide the UC system — it only
   canonicalizes punctuation/case and the literal "-Main Campus" suffix. */

"use strict";

import DATA from "../../data/recognitionTiers.json";

// Conservative name normalizer (shared by keys and lookups).
function normName(name) {
  let s = String(name || "").toLowerCase();
  s = s.replace(/[–—]/g, "-");            // unify dashes
  s = s.replace(/&/g, " and ");           // "A&M" ≡ "A and M"
  s = s.replace(/-/g, " ");               // "Michigan-Ann Arbor" ≡ "Michigan Ann Arbor"
  s = s.replace(/[.,'’()]/g, " ");        // drop punctuation, keep tokens
  s = s.replace(/\s+/g, " ").trim();
  if (s.startsWith("the ")) s = s.slice(4);
  if (s.endsWith(" main campus")) s = s.slice(0, -12).trim();
  return s;
}

// Build lookup tables once. Aliases resolve FIRST (an alias points an official
// IPEDS name at its canonical record and wins over accidental direct matches).
function buildIndex() {
  const tierByName = new Map();
  const put = (arr, tier) => (arr || []).forEach((n) => { const k = normName(n); if (!tierByName.has(k)) tierByName.set(k, tier); });
  put(DATA.tier1, 1); put(DATA.tier2, 2); put(DATA.tier3, 3);
  const aliasTo = new Map();
  Object.keys(DATA.aliases || {}).forEach((from) => aliasTo.set(normName(from), normName(DATA.aliases[from])));
  const flagSet = new Set((DATA.flagships || []).map(normName));
  const p4Set = new Set((DATA.power4 || []).map(normName));
  const academySet = new Set((DATA.serviceAcademies || []).map(normName));
  return { tierByName, aliasTo, flagSet, p4Set, academySet };
}
const IDX = buildIndex();

// resolveRecognition(schoolName, carnegieBasic?) →
//   { recognitionTier: 1|2|3|4, recognitionFlags: {flagship,power4,serviceAcademy,r1} }
// carnegieBasic: Scorecard `school.carnegie_basic` (15 = R1 "very high research").
// Offline rows have no Carnegie code → r1 is null (unknown), never false-claimed.
// Canonical identity key for a school name: normalized + alias-resolved, so a
// live Scorecard row ("Massachusetts Institute of Technology") and its offline
// SAMPLE twin ("MIT") compare equal. Used to dedupe mixed-provenance pools.
function canonicalKey(schoolName) {
  const raw = normName(schoolName);
  return IDX.aliasTo.get(raw) || raw;
}

function resolveRecognition(schoolName, carnegieBasic) {
  const key = canonicalKey(schoolName);
  const tier = IDX.tierByName.get(key) || 4;
  return {
    recognitionTier: tier,
    recognitionFlags: {
      flagship: IDX.flagSet.has(key),
      power4: IDX.p4Set.has(key),
      serviceAcademy: IDX.academySet.has(key),
      r1: carnegieBasic != null ? Number(carnegieBasic) === 15 : null,
    },
  };
}

export { resolveRecognition, normName, canonicalKey };
export const SOURCE = DATA.source;
export const AS_OF = DATA.asOf;
