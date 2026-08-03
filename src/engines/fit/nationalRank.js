// Ported from collegeapp01 functions/nationalRank.js @ 8171b8a — keep public interface.
/* nationalRank.js — curated national-ranking overlay (U.S. News Best Colleges).
   Same house pattern as recognition.js: name-keyed curated data with
   source/asOf, lazy-required by the engine, resolved at row-build time.

   Ranks are DISPLAY data only — like recognition tier, they must never feed
   any fit/affordability/preference score (the honest fit math stays untouched;
   ranked schools already surface through the recognition quotas + reach seed).

   National Universities and Liberal Arts Colleges are SEPARATE U.S. News
   lists, so the resolved rank carries which list it came from ("#1" at
   Williams means best LAC, not better than Princeton). Only the top ~50 of
   each list is curated — everything else honestly resolves to no rank at all
   (rendering nothing), never a made-up number. Name matching reuses
   recognition's canonicalKey so IPEDS/Scorecard spellings fold in. */

"use strict";

import DATA from "../../data/nationalRank.json";
import { canonicalKey } from "./recognition.js";

function buildIndex() {
  const byKey = new Map();
  const put = (obj, list) => Object.keys(obj || {}).forEach((name) => {
    const k = canonicalKey(name);
    if (!byKey.has(k)) byKey.set(k, { rank: obj[name], list });
  });
  put(DATA.nationalUniversities, "national");
  put(DATA.liberalArts, "liberal_arts");
  return byKey;
}
const IDX = buildIndex();

// resolveNationalRank(schoolName) →
//   { nationalRank: number|null, nationalRankList: "national"|"liberal_arts"|null,
//     nationalRankSource: string|null }
function resolveNationalRank(schoolName) {
  const hit = IDX.get(canonicalKey(schoolName));
  if (!hit) return { nationalRank: null, nationalRankList: null, nationalRankSource: null };
  return { nationalRank: hit.rank, nationalRankList: hit.list, nationalRankSource: DATA.source };
}

export { resolveNationalRank };
export const SOURCE = DATA.source;
export const AS_OF = DATA.asOf;
