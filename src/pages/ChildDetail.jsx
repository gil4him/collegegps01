import { useMemo, useState } from "react";
import { verdictFor } from "../engines/verdict/verdict.js";
import { counselorNote } from "../engines/notes/notes.js";
import { gradeFromGradYear } from "../engines/milestones/grade.js";
import { affordabilityFor, SAVINGS_BANDS } from "../engines/affordability/affordability.js";
import { INCOME_BANDS, BUDGET_BANDS } from "../engines/answers/answers.js";
import { updateChildInputs } from "../lib/children.js";
import { updateMoneyProfile } from "../lib/profiles.js";
import { createClaimCode } from "../lib/claims.js";

const INCOME_OPTIONS = INCOME_BANDS.map((b) => ({ value: b, label: b }));
const BUDGET_OPTIONS = Object.keys(BUDGET_BANDS).map((b) => ({ value: b, label: b }));
const SAVINGS_OPTIONS = Object.keys(SAVINGS_BANDS).map((b) => ({ value: b, label: b }));

const GPA_BANDS = [
  { value: "3.7plus", label: "3.7+" },
  { value: "3.3to3.7", label: "3.3–3.7" },
  { value: "3.0to3.3", label: "3.0–3.3" },
  { value: "below3", label: "Below 3.0" },
];
const TEST_STATUS = [
  { value: "notStarted", label: "Not started" },
  { value: "registered", label: "Registered" },
  { value: "done", label: "Done" },
];

function SharpenRow({ label, payoff, options, value, onPick, busy }) {
  return (
    <div className="sharpen-row">
      <div className="sharpen-head">
        <span className="sharpen-label">{label}</span>
        <span className="sharpen-payoff">{payoff}</span>
      </div>
      <div className="sharpen-options">
        {options.map((o) => (
          <button
            key={o.value}
            disabled={busy}
            className={value === o.value ? "chip-btn chip-btn-active" : "chip-btn"}
            onClick={() => onPick(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function money$(n) {
  return "$" + Math.round(n).toLocaleString();
}

function AffordabilityPanel({ child, money }) {
  const a = useMemo(() => affordabilityFor(child, money), [child, money]);
  if (!a.available) return null;
  return (
    <section className="afford">
      <h2 className="section-title">Affordability — {a.stateName}</h2>
      {a.typical && (
        <p className="afford-basis">Based on a typical {a.stateName} family — answer the money bands below to make this yours.</p>
      )}
      <p className="afford-range">
        Net price at {a.schoolCount} in-state colleges:{" "}
        <strong>
          {money$(a.netLow)}–{money$(a.netHigh)}
        </strong>{" "}
        a year (median {money$(a.netMedian)}).
      </p>
      {a.withinBudget != null && (
        <p className="afford-range">
          Around your budget band: <strong>{a.withinBudget} of {a.schoolCount}</strong> in-state
          colleges land at or under {money$(a.budgetMid)} a year.
        </p>
      )}
      {a.sai && (
        <p className="afford-range">
          Aid math: your Student Aid Index likely falls around{" "}
          <strong>
            {money$(a.sai.low)}–{money$(a.sai.high)}
          </strong>
          . Colleges use it to size aid — lower means more need-based help.
        </p>
      )}
      <p className="afford-fineprint">Planning estimates from public IPEDS data — not financial advice.</p>
    </section>
  );
}

// Card detail = the counselor's note (brief: NOT more widgets). Serif voice,
// two actions, then the sharpen prompts with visible payoff.
export default function ChildDetail({ child, plan, money, householdId, tenantId, onBack, onRoad }) {
  const now = new Date();
  const [busy, setBusy] = useState(false);
  const [claimCode, setClaimCode] = useState(null);
  const v = useMemo(() => (plan ? verdictFor(plan, child, now) : null), [plan, child]);
  const note = useMemo(
    () => (plan && v ? counselorNote(child, plan, v, now) : null),
    [plan, v, child]
  );
  const grade = gradeFromGradYear(child.gradYear, now);

  async function sharpen(patch) {
    setBusy(true);
    try {
      await updateChildInputs(child, plan, patch, new Date());
    } finally {
      setBusy(false);
    }
  }

  if (!plan || !v) return <p className="status status-checking">Loading…</p>;

  return (
    <div>
      <button className="linklike" onClick={onBack}>
        ← All children
      </button>

      <header className="detail-head">
        <h1>{child.nickname}</h1>
        <p className="child-grade">
          Grade {grade} ·{" "}
          <span className={v.status === "onTrack" ? "inline-ok" : "inline-warn"}>{v.pill}</span>
        </p>
      </header>

      <section className="note">
        {note.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <div className="detail-actions">
        <button className="primary" onClick={() => onRoad(v.oneNextThing?.id)}>
          Do this now
        </button>
        <button className="linklike" onClick={() => onRoad(null)}>
          See the full road →
        </button>
      </div>

      <AffordabilityPanel child={child} money={money} />

      <section className="sharpen">
        <h2 className="section-title">Sharpen this</h2>
        <p className="sharpen-sub">Each answer updates {child.nickname}&rsquo;s road instantly.</p>
        <SharpenRow
          label="GPA band"
          payoff="tunes what comes first"
          options={GPA_BANDS}
          value={child.gpaBand}
          onPick={(gpaBand) => sharpen({ gpaBand })}
          busy={busy}
        />
        <SharpenRow
          label="SAT/ACT status"
          payoff="adds or clears testing stops"
          options={TEST_STATUS}
          value={child.testStatus}
          onPick={(testStatus) => sharpen({ testStatus })}
          busy={busy}
        />
        <SharpenRow
          label="Household income band"
          payoff="narrows the affordability range · shared across your children"
          options={INCOME_OPTIONS}
          value={money?.incomeBand}
          onPick={(incomeBand) => updateMoneyProfile(householdId, tenantId, { incomeBand })}
          busy={busy}
        />
        <SharpenRow
          label="What could you pay per year?"
          payoff="shows how many colleges fit your budget"
          options={BUDGET_OPTIONS}
          value={money?.budgetBand}
          onPick={(budgetBand) => updateMoneyProfile(householdId, tenantId, { budgetBand })}
          busy={busy}
        />
        <SharpenRow
          label="College savings so far"
          payoff="tunes the aid estimate"
          options={SAVINGS_OPTIONS}
          value={money?.savings529Band}
          onPick={(savings529Band) => updateMoneyProfile(householdId, tenantId, { savings529Band })}
          busy={busy}
        />
      </section>

      <section className="claim-section">
        <h2 className="section-title">{child.nickname}&rsquo;s own view</h2>
        {child.claimedByUid ? (
          <p className="sharpen-sub">
            Claimed — {child.nickname} sees their road and can refine academics.
            Everything you entered is preserved.
          </p>
        ) : claimCode ? (
          <p className="sharpen-sub">
            Share this code with {child.nickname}: <strong className="claim-code">{claimCode}</strong>
            <br />
            They sign up as a Student, enter it, and get their own view of the
            road. Nothing you&rsquo;ve entered is lost — and this card keeps
            working for you either way.
          </p>
        ) : (
          <>
            <p className="sharpen-sub">
              Optional: {child.nickname} can claim this card to see their own
              milestones and refine academics. The card works fully without it.
            </p>
            <button
              className="linklike"
              onClick={async () => setClaimCode(await createClaimCode(child, tenantId))}
            >
              Invite {child.nickname} to claim their card →
            </button>
          </>
        )}
      </section>
    </div>
  );
}
