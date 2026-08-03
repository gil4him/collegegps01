# src/engines/

Deterministic logic only. Rules for every module in here:

- **Pure and UI-free** — no React, no Firestore, no fetch at import time. Callers pass data in, engines return data out.
- **`now` is always a parameter** — never call `Date.now()` or `new Date()` inside an engine. Determinism (same inputs → same output) is the contract; time is an input.
- **Ported modules keep their public interface** and carry an origin header: `// Ported from collegeapp01 <path> @ <commit> — keep public interface.`
- **Every module has a smoke test** (`*.test.js`, run with `npm test`).

Planned layout (Slice 2, per the extraction doc in collegeapp01
`md_file_from_Macbook/claude-code-prompt_engine-extraction-for-collegegps01.md`):

- `milestones/` — milestone calendar, grade context, selection (port + greenfield dated playbook)
- `finaid/` — SAI estimator (`finaid.js`) + Tier-2 what-if (`portfolio.js`)
- `fit/` — recommend/buildPlan engine, readiness, Scorecard fetch
- `answers/` — deriveAnswers + budget/income bands
- `verdict/` — greenfield: On-track verdict + One Next Thing
