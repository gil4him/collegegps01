# Engine inventory — what each ported module exposes (plain English)

All ported from collegeapp01 @ `8171b8a`. Every module is pure (no React, no
Firestore, no network at import time), takes `now` as a parameter wherever time
matters, and has a smoke test (`npm test`). Origin and interface notes are in
each file's header.

## `src/engines/milestones/` — grade context + milestone seed

- **`grade.js`** — the durable-time core. You store a child's *graduation year*
  (never their grade); this module derives the current grade, semester, and
  month from it. `getGradeContext(gradYear, now)` is the input half of every
  plan computation.
- **`milestoneCalendar.js`** — the seed playbook: 17 milestones across grades
  9–12, each tagged with a season window (fall/spring/summer) and a pillar
  (academics / EC story / application). `currentMilestones(ctx)` returns what's
  in-window right now. **Not yet dated to real calendar dates** — expanding
  this into the full dated playbook is the Slice 4/5 greenfield work.
- **`deriveThisWeek.js`** — picks up to 3 plain-language actions for "right
  now" from the calendar plus scholarship/match data. The closest thing the old
  app had to One Next Thing; the GPS verdict engine will replace it.

## `src/engines/finaid/` — the money math

- **`finaid.js`** — the official federal Student Aid Index (SAI) methodology,
  2025-26 tables. `computeSAIFrom(income, assets, familySize, …)` → the number
  colleges use to compute aid. Also a directional CSS-Profile-style estimate
  and a 529 year-by-year funding waterfall (`buildYearByYear`).
- **`portfolio.js`** — the Tier-2 what-if: "if we sold these shares, what
  happens to aid and taxes?" `portfolioSAIImpact(...)` → base vs. scenario SAI,
  the delta, and rough capital-gains tax. `baseYearForAcademicYear(year)` is
  the hook that dates the FAFSA base-year milestone. Hard boundary preserved
  from origin: scenario education only, never advice.

## `src/engines/fit/` — college fit + readiness

- **`engine.js`** — the recommendation engine (`engine-v3`). `recommend(parent,
  student, config)` scores colleges on affordability (net price for the
  family's income band vs. budget), academic fit (reach/match/safety), and
  preferences. `buildPlan(...)` is the deterministic gap analysis (financial /
  academic / scholarship) — an ingredient for the GPS verdict.
- **`readiness.js`** — a 0–100 readiness score over four pillars (academics,
  EC story, application, funding), versioned `readiness-v1`. Another verdict
  ingredient.
- **`scorecard.js`** — live College Scorecard fetch layer. With an API key it
  pulls fresh candidates per state; without one it returns null and callers use
  the built-in IPEDS dataset. Mapping is pure and network-free for tests.
- **`collegeEntry.js` / `recognition.js` / `nationalRank.js`** — small data
  helpers the engine uses for entry-model warnings, recognition tiers, and
  display ranks.

## `src/engines/answers/` — friendly answers → engine inputs

- **`answers.js`** — `deriveAnswers(answers, now)` turns onboarding-friendly
  values into engine-facing ones: grade derived from gradYear, `annualBudget`
  filled from the tapped budget band (an exact typed amount overrides it).
  `BUDGET_BANDS` and `INCOME_BANDS` are the option lists for the two-tap money
  questions. Interface change vs. origin: `now` is a parameter.

## `src/engines/entitlements/` — the free/paid seam

- **`entitlements.js`** — tier limits (free/premium/elite) and `gate(tier,
  feature, used)`. No paywall in v1; surfaces read these limits so precision
  features (exact SAI, what-if, email alerts) can lock later without rework.
  Unknown features fail closed.

## `src/data/` — datasets

- **`dataset.js`** — the offline IPEDS set: ~183 schools, all 50 states + DC,
  net price by income band, admit rates, SAT ranges. The engine's candidate
  pool when no Scorecard key is configured.
- **`dataset_enrichment.js`** — per-school extras (grad rate, median earnings,
  debt, Pell rate, net-price-calculator URLs).
- **`recognitionTiers.json` / `nationalRank.json`** — data behind the fit
  helpers above.

## What is NOT here (greenfield, per the extraction doc)

The dated milestone playbook, the verdict + One Next Thing engine, the
counselor-note templates, and the ZIP→district resolver. See
`docs/claude-code-prompt_collegegps01-build.md` Part 2 and the extraction doc
in collegeapp01 for the plan.
