import { useMemo, useState } from "react";
import { verdictFor } from "../engines/verdict/verdict.js";
import { counselorNote } from "../engines/notes/notes.js";
import { gradeFromGradYear } from "../engines/milestones/grade.js";
import { updateChildInputs } from "../lib/children.js";

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

// Card detail = the counselor's note (brief: NOT more widgets). Serif voice,
// two actions, then the sharpen prompts with visible payoff.
export default function ChildDetail({ child, plan, onBack, onRoad }) {
  const now = new Date();
  const [busy, setBusy] = useState(false);
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
      </section>
    </div>
  );
}
