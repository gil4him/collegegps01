# Claude Code Prompt — Build collegegps01 (College GPS)

> **Part 1** is the owner's original build brief, verbatim — the canonical spec.
> **Part 2** is the blindspot pass (Claude, 2026-08-03): corrections, risks, and decisions to make before/while building. Where Part 2 contradicts Part 1, Part 2 reflects what was actually found on disk and should win until the owner rules otherwise.
> Companion doc: `1_college_app/md_file_from_Macbook/claude-code-prompt_engine-extraction-for-collegegps01.md` (engine inventory + extraction plan).

---

# Part 1 — The build brief (original, verbatim)

New repo + new Firebase project: collegegps01. Paste this into Claude Code as the working brief. Stack: Firebase Auth + Firestore + React (Vite). Design: Apple-like — clean, bright, generous whitespace, one primary action per screen.

## 0. Role & working method

You are an agentic engineer working with a non-engineer product owner.

- Chain of thought first. Restate the goal, list assumptions, ask targeted questions where a decision changes data model, security, or cost. Then plan.
- Vertical slices. Plan → my OK → build one demoable slice at a time.
- Plain-English explanations for every non-trivial decision.
- Real data only for core logic (College Scorecard API / IPEDS dataset, the real milestone engine). No fabricated numbers. Secrets in .env.
- Clean, modular code. Ported engines live in src/engines/ with clear interfaces and no UI imports, so they stay testable and swappable.

## 1. The product (this is a pivot — read carefully)

College GPS is for parents who don't know what to do and want to be told exactly what needs to be done for the rest of their children's school years. It is a GPS, not a map: "you are here, here's the next turn."

- Core emotional job: answer "Is my kid behind?" first, then show the next concrete action. Anxiety relief, then direction.
- Primary surface: a household home dashboard — one card per child, all children's status visible at once.
- Each child card shows: name + grade, an On track / Needs attention verdict, and the One Next Thing (single next milestone with date + 2-line "why").
- Tapping a card opens the child's road: now → this semester → this year → later years. Full remaining-years plan, generated deterministically.

### Locked UI design direction (three altitudes — do not flatten into one)

We prototyped three directions and locked a layered combination:

- **Glance = status cards (home).** The household dashboard is a grid of child cards: avatar, name + grade, district chip, verdict pill (On track / N things due), One Next Thing with date + one-line "why", small alert line (new scholarship matches, activity ideas). Scannable in 5 seconds with any number of children.
- **Read = counselor's note (card detail, the product's voice).** Tapping a card opens NOT more widgets but a short counselor-style note in serif "voice" type: 2–3 warm, direct paragraphs that tell the parent what matters now and why, including the quiet money notes (e.g. FAFSA base-year window). Generated deterministically from the plan via templates — same inputs, same note. Tone: a private counselor who already did the thinking; plain language; no jargon; never alarmist. Two actions under the note: "Do this now" and "See the full road."
- **Plan = turn-by-turn route (one tap deeper).** "See the full road" opens the route timeline: vertical road with stops (done / next / upcoming), each stop dated with a one-line why; financial stops inline with academic ones; headline "Next turn: [milestone] · N days."

Visual language: Apple-like, bright, flat, generous whitespace, sentence case, one primary action per screen. Verdict pills use semantic tints; each child gets a stable accent color for avatar/route. The counselor note is the ONLY serif surface — it is the product's voice; all chrome stays sans.

Money milestones are woven into the academic timeline — e.g. FAFSA base year ("sophomore-to-junior-year income is what colleges count — last window to reposition assets"), 529 timing, FAFSA opening Oct 1. This is the differentiator; no competitor dates the financial moves.

### Not in this product (leave behind from collegeapp01)

The long onboarding wizard, the standalone search/results page as the main surface, any invite-gated login.

## 2. Source material — port from collegeapp01 (duplicate, don't share)

I will provide access to the collegeapp01 repo. Copy these into src/engines/ (and src/data/), adapting imports; do not npm-link or submodule:

- Milestone engine — grade-aware 9–12 playbook + dated milestone calendar + selection engine (deterministic). This is the heart of GPS.
- SAI estimator + Tier-2 what-if (aid position, asset-repositioning deltas).
- College dataset + Scorecard fetch layer (built-in IPEDS net-price dataset, 50 states + DC; optional live Scorecard key).
- deriveAnswers / budget-band logic from the streamlined parent onboarding.
- Auth + tenancy pattern (roles, custom claims, tenant attribution, Firestore rules) — per the access model below.

For each ported module: note its origin, keep its public interface, add a tiny smoke test proving it runs in the new repo.

## 3. Access model (settled — do not redesign)

- Parents/students sign up self-serve, no invitation ever required, from our site or an Admin/subcontractor's branded site. Sign-in asks one thing: Parent or Student? Plus a small "company or counselor? contact us →" mailto link (zymer4him@gmail.com). Superadmin exists: zymer4him@gmail.com.
- Tenant attribution is silent (Admin's branded URL → their tenantId, else default tenant). Never blocks login.
- Invitations are optional and post-login only, used to link a counterpart into the household (merge if the invitee already has an account).
- Multi-tenant rules enforced in Firestore security rules via custom claims: superadmin all; admin only own tenant; parent/student only own docs + own household.

## 4. Onboarding (the whole point — keep it this small)

Parent flow = "create your first child's card," not a questionnaire.

- Sign up (Parent) → "Add your child" → two questions: grade + ZIP.
- District resolution from ZIP (silent, correctable): resolve ZIP → school district via NCES/CCD data. Show a quiet chip on the card: "Based on [District] requirements — not right? tap to change" with a short candidate list. Use the district to sharpen the plan (graduation/course requirements, local testing calendar, AP/IB availability where known). Fallback rule: state-level requirements are the reliable floor; district data is opportunistic precision. If district data is missing or ambiguous, render the full plan from state rules immediately — never block or delay the card waiting on district lookup.
- Dashboard renders immediately with a live card: verdict + One Next Thing + milestone count for this semester, using engine defaults (state medians, typical family) labeled "based on a typical [state] family."
- Progressive refinement, always attached to visible payoff: the card and child view show "sharpen this" prompts — GPA band, test status, budget band, income band — each one visibly tightening a range or changing the plan ("answer this → your affordability range narrows / your playbook updates"). Bands and sliders, never exact dollar amounts up front.
- "Add another child" is one tap from the dashboard (repeat two questions).
- Parent-managed child profiles (default): student signup is OPTIONAL. The parent owns the card and can enter/update everything about the child — GPA, test status, courses, activities — without the student ever creating an account. The full product works parent-only.
- Student claim = optional upgrade, not an onboarding step. Later, the parent can "Invite [child] to claim their card" (or a student can sign up and link). On claim: the student gets their own view (their milestones + fit), can refine academics, and all parent-entered data is preserved — the student edits from there, never re-onboards. Unclaimed cards remain fully functional forever.

Design test: two children in the same grade with different inputs must get visibly different One Next Things. Generic guidance kills this product.

## 5. Data model (propose refinements, then confirm)

```
tenants/{tenantId}            // as in collegeapp01 pattern
users/{uid}                   // role, tenantId, householdId(optional)
households/{householdId}      // parentUids[], studentUids[], tenantId
children/{childId}            // householdId, name/nickname, grade, zip,
                              // state (derived), districtId? (resolved, correctable),
                              // gpaBand?, testStatus?, courses?, activities?
                              // claimedByUid? (OPTIONAL — set only if a student
                              //   claims the card; parent-managed is the default)
profiles/{householdId}        // parent financial bands (budget, income, 529…) — all optional
plans/{childId}               // generated milestone plan: engineVersion, inputsHash,
                              // milestones[ {id, date, title, why, category:
                              //   "academic"|"financial"|"testing"|"application",
                              //   status:"upcoming"|"done"|"missed"} ]
alerts/{childId}              // card deltas: new matches, deadline state changes
recommendations/{householdId} // affordability+fit output (later slice)
```

Plan regeneration is deterministic: same inputs → same plan. Store engineVersion + inputsHash; regenerate when inputs change.

### Pipeline feeds (config, not rewrite)

The Mac mini pipelines (scholarship DB, EC_finder) currently publish to collegeapp01's Firestore. Set up collegegps01 to read from its own project; I will configure the mini to dual-publish to both projects during transition. Provide the service-account/env changes needed on the publisher side as a short doc — do not modify the mini scripts yourself.

## 6. Retention surface (built into the model, minimal v1)

- Cards change state with the school-year calendar (PSAT Sept, FAFSA Oct 1, AP signups, summer-program deadlines Jan–Mar). Milestone dates come from the engine — never hardcode dates in UI.
- alerts produce a small badge on the card ("2 new — deadline approaching, 3 scholarship matches"). v1: computed on load; push/email later.
- Free vs paid boundary (build the seam, not the paywall): free = the plan + verdicts + ranges; paid = precision (exact SAI, Tier-2 what-if as dated financial milestones, alerts by email, award-letter comparison).

## 7. Build order (vertical slices — confirm before each)

1. Repo + Firebase bootstrap: Vite/React app, Firebase project collegegps01 (Auth, Firestore, Hosting), env scaffolding, deploy pipeline, security rules skeleton. GitHub repo collegegps01.
2. Port the engines: copy the five modules into src/engines/, smoke tests green, plain-English inventory of what each exposes.
3. Auth + access model: self-serve Parent/Student signup, claims, rules, contact-us link. (Reuse collegeapp01 pattern, minus any invite gating.)
4. Two-question onboarding → child card: add child (grade+ZIP) → district resolved (state fallback) → plan generated → dashboard card with verdict + One Next Thing. Card is parent-managed; no student account involved.
5. Card detail (counselor's note) + road view + progressive refinement: card tap → templated counselor note (serif voice, deterministic from plan) with "Do this now" / "See the full road" → route timeline (done/next/upcoming, dated, financial stops inline). "Sharpen this" prompts wired to visible range-narrowing.
6. Financial milestones: SAI/base-year/529 items merged into the dated timeline via the what-if engine.
7. Multi-child + optional student claim + alerts badge. (Claim preserves all parent-entered data; unclaimed cards keep full functionality.)
8. Polish: Apple-like pass, empty/loading/error states, accessibility.

## 8. Acceptance criteria

- New parent reaches a live child card in under 60 seconds with exactly two questions answered (grade + ZIP); no financial question appears before the dashboard.
- Card shows an on-track verdict + One Next Thing with date and "why."
- Card tap opens a counselor-style note (serif voice, 2–3 paragraphs, deterministic from the plan) — not a widget grid; "See the full road" opens the route timeline with dated stops, financial stops inline.
- District chip appears when ZIP resolves; tapping it corrects the district; missing/ambiguous district falls back to state rules with no delay.
- The entire product is usable parent-only: parent enters and edits all child data; no flow requires a student account.
- Student claim is optional; on claim, parent-entered data is preserved and the student refines from there (no re-onboarding).
- Two same-grade children with different inputs show different One Next Things.
- Every "sharpen this" answer visibly changes something on screen (range narrows or plan updates) — no dead-end questions.
- Financial milestones (incl. FAFSA base-year window) appear dated inline with academic ones.
- Plans are deterministic (same inputs → identical plan; engineVersion stored).
- Self-serve signup works with no invitation anywhere; tenancy rules block cross-tenant reads (show a denied request).
- Ported engines have smoke tests; secrets in .env; modules stay UI-free.

## 9. Deliverables per slice

Runnable code (npm run dev) + 5–10 line plain-English summary + any new env vars + open questions for me.

Begin with Slice 1: restate the goal, list assumptions, and give me the plan. Do not write code until I confirm.

---

# Part 2 — Blindspot pass & revisions (Claude, 2026-08-03)

The brief's shape is right: the layered UI, "build the seam not the paywall," and vertical-slice discipline are all sound. What follows are the places where the brief's assumptions and reality diverge, plus decisions the owner must make. **An on-disk inventory of collegeapp01 was done; this section reflects what actually exists** (details and file paths in the companion extraction doc).

## 2.1 Corrected engine reality — better than the first look, with two real gaps

An initial scan of `app/src/lib/` suggested the engines were thin. That was wrong. The real engines live **server-side in `collegeapp01/functions/` as pure, no-I/O modules, already extraction-ready**:

| Brief's module | What actually exists | Verdict |
|---|---|---|
| SAI estimator | `functions/finaid.js` — official 2025-26 SAI methodology (`computeSAIFrom`, `SAI_TABLES`, institutional estimate, 529 year-by-year waterfall) | **Port as-is** |
| Tier-2 what-if | `functions/portfolio.js` — `portfolioSAIImpact` → base/scenario/delta SAI + cap-gains estimate | **Port as-is** |
| College dataset + Scorecard | `functions/dataset.js` + `dataset_enrichment.js` (IPEDS net-price by income band, per-state) + live Scorecard fetch in `tools/regen-scorecard.js` and `functions/index.js` | **Port as-is** |
| deriveAnswers / budget bands | `app/src/wizard/defaultBank.js` — pure `deriveAnswers` + `BUDGET_BANDS`, depends only on pure `grade.js` | **Port as-is** |
| Auth + tenancy pattern | `firestore.rules` (374 lines, claims-based tenant isolation) + claims callables in `functions/index.js` | **Port pattern, strip invite gating** |
| Milestone engine ("the heart of GPS") | `app/src/lib/milestoneCalendar.js`: **17 milestones**, grades 9–12, keyed by coarse `window` (fall/spring/summer/year), **not dated**. `deriveThisWeek.js` picks ≤3 actions; its own comment says the "real milestone engine (`selectActions`)" **was never built**. | **Greenfield content + engine work** |
| Verdict / One Next Thing | Does not exist anywhere. `buildPlan` (gap analysis) and `computeReadiness` (weighted 4-pillar score) in `functions/` are ingredients, not the verdict. | **Greenfield** |

**Consequence for the build order:** Slice 2 splits into (a) a genuine port — fast, and (b) authoring the dated milestone playbook + verdict engine — the real work of the product, and it's *editorial* as much as engineering. The owner must review milestone content, verdict rules, and note templates; they are product decisions, not code.

## 2.2 Product blindspots

- **The verdict algorithm is unspecified — and it's the whole emotional promise.** "On track / Needs attention" has no defined rule anywhere in the brief. Naive rule ("any milestone overdue") means a parent signing up in March with a junior sees red everywhere in their first 60 seconds — an anxiety bomb from a product that promised relief. **Required decision: a cold-start policy.** Suggested: milestones dated before signup start as "catch-up" (neutral, actionable), never "missed"; verdict considers only what was actionable since the parent arrived, plus genuinely urgent upcoming items.
- **The differentiation test contradicts the two-question onboarding.** At onboarding the only inputs are grade + ZIP, so two same-grade, same-state children get identical plans *by construction*. Either the "two same-grade children differ" test applies only after refinement (say so in the acceptance criteria), or day-one differentiation must come from ZIP/district — which the data doesn't support (see 2.3). Define exactly which input deltas must change which visible outputs — ideally as golden fixtures (see 2.6).
- **Store `classOf` (graduation year), not `grade`.** A grade field is wrong every July. collegeapp01's `grade.js` already treats `gradYear` as the durable source of truth and derives grade/semester from it — keep that discipline in the `children/` schema. Also decide what happens at school-year rollover: silent plan regeneration, or a "new year, new road" moment for the parent.
- **Determinism vs. the calendar.** "Same inputs → same plan" only holds if *now* is an explicit engine input (school-year date), included in the determinism contract. The existing libs already pass `now` in — preserve this; never call `Date.now()` inside an engine. This also makes golden-fixture tests possible with a frozen clock.

## 2.3 Data blindspots (where the brief is most optimistic)

- **District graduation requirements are not a dataset.** NCES/CCD provides district *identities and boundaries* — not course/graduation requirements, and not local testing calendars. No one publishes those nationally. ZIP→district resolution is buildable (NCES EDGE geographies; note ZIP↔district is **many-to-many**, which the "candidate list" chip already handles well). But district-level *plan sharpening* is mostly vapor for v1. Reframe: **state rules are the product; the district chip is a UX affordance and a future data slot.**
- **The 50-state graduation-requirements table must be hand-curated** and maintained. That's content ops — owner or pipeline, not a free download.
- **Milestone content has a shelf life.** FAFSA has *not* reliably opened Oct 1 in recent cycles (the simplification-era 2024–25 form opened in December). SAT is digital; AP registration dates move; test-optional policies shift. Milestone definitions should live in a versioned, year-stamped data file ("reviewed for 2026–27"), and the engine should surface staleness rather than silently show last year's dates. Someone owns the annual refresh; that someone owns the product's credibility.
- **Counselor-note templates are a combinatorial writing job.** Grades × verdict states × milestone categories × financial situations = dozens of 2–3-paragraph notes in one consistent warm voice. Deterministic templating means this matrix is authored up front. Plan an owner review session in Slice 5 for tone.

## 2.4 Technical blindspots

- **Custom claims require the Admin SDK → Cloud Functions → the Blaze (billed) plan.** Concrete implication for a non-engineer owner: expect to attach a card to the collegegps01 Firebase project before Slice 3. (Alternative to consider: v1 enforces tenancy via rules + user docs without claims, adding claims when Admin tenants actually exist.)
- **`plans/{childId}` and `alerts/{childId}` are awkward for security rules** — rules can't cheaply join child→household. Denormalize `householdId` and `tenantId` onto every plan and alert doc; otherwise every rule needs `get()` calls (cost + complexity + failure modes).
- **"Merge if the invitee already has an account" is the hardest feature in the brief**, mentioned in one clause. Merging two auth users / two households with conflicting data is genuinely hard. Recommendation: v1 invitations link *fresh* accounts only; merge-existing is explicitly deferred.
- **Branded tenant URLs** need multi-site hosting or domain→tenant routing. Build the `tenantId` field and rules now (cheap); defer branded-domain resolution until a real Admin exists.

## 2.5 Legal / compliance blindspots

- **COPPA.** Student accounts for under-13s trigger parental-consent requirements. Parent-managed-by-default is the legal shield — lean on it, and gate student self-signup to 13+.
- **"Last window to reposition assets" is investment-advice-shaped language.** Add an "educational estimates, not financial advice" disclaimer footprint and soften the money-note phrasing. `portfolio.js` already enforces a "scenario education only" boundary — keep it intact through the port. SAI figures are estimates; present ranges as ranges everywhere. A wrong number a family plans around is a trust-killer.

## 2.6 How to prompt better (owner checklist)

1. **Golden fixtures — highest leverage.** Write 3–5 example children (grade, ZIP, refinements) with the verdict and One Next Thing you *expect*. These become the engine's acceptance tests and force the verdict-rule decision.
2. **Decide the verdict rule and cold-start policy** (see 2.2) before Slice 4.
3. **Rank the acceptance criteria** so trade-offs under time pressure are pre-decided (e.g. 60-second onboarding > district chip > tenancy demo).
4. **Confirm the deferrals:** account-merge (defer), branded domains (defer), Cloud Functions/Blaze (decide now), student claim (Slice 7 as written).
5. **Add owner content-review checkpoints** to Slices 2, 4, 5 — milestone playbook, verdict rules, and note templates are editorial product decisions.
6. **Brief-vs-reality conflict policy:** when the brief says "port X" and X doesn't exist as described, default is to build the described interface fresh and flag it (that's what the extraction doc does for the milestone engine and verdict).

**Corrected mental model:** this is not porting a GPS engine — the math engines port cleanly, but the *map data* (dated milestone playbook, state rules, note templates) and the *guidance layer* (verdict + One Next Thing) are being written for the first time. The code around them is the easy part.
