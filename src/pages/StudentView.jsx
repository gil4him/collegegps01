import { useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { claimWithCode } from "../lib/claims.js";
import { updateChildInputs } from "../lib/children.js";
import RoadView from "./RoadView.jsx";

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

// Student home: claim the card (optional upgrade, never onboarding), then
// their own road + academic refinements. No money surfaces here — those
// stay parent-side by design.
export default function StudentView({ children, plans }) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const mine = children?.find((c) => c.claimedByUid === user.uid);

  async function redeem(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await claimWithCode(code, user.uid);
      // Subscriptions re-key off the updated profile householdId.
    } catch (err) {
      setError(
        err.message === "code-not-found"
          ? "That code didn't match — check it with your parent and try again."
          : err.message === "code-used"
          ? "That code was already used. Ask your parent to make a fresh one."
          : "Couldn't claim just now — please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!mine) {
    return (
      <div className="empty-state">
        <h1>Claim your card</h1>
        <p className="tagline">
          If your parent set up your road, they can share a claim code with you.
          Everything they entered stays — you refine from there.
        </p>
        <form className="claim-form" onSubmit={redeem}>
          <input
            className="claim-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. K7MPQ2"
            maxLength={8}
            required
          />
          <button className="primary" disabled={busy}>
            {busy ? "Linking…" : "Claim"}
          </button>
        </form>
        {error && <p className="form-error claim-error">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <RoadView child={mine} plan={plans[mine.id]} onBack={null} />
      <section className="sharpen">
        <h2 className="section-title">Sharpen your road</h2>
        <div className="sharpen-row">
          <div className="sharpen-head">
            <span className="sharpen-label">GPA band</span>
          </div>
          <div className="sharpen-options">
            {GPA_BANDS.map((o) => (
              <button
                key={o.value}
                className={mine.gpaBand === o.value ? "chip-btn chip-btn-active" : "chip-btn"}
                onClick={() => updateChildInputs(mine, plans[mine.id], { gpaBand: o.value }, new Date())}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="sharpen-row">
          <div className="sharpen-head">
            <span className="sharpen-label">SAT/ACT status</span>
          </div>
          <div className="sharpen-options">
            {TEST_STATUS.map((o) => (
              <button
                key={o.value}
                className={mine.testStatus === o.value ? "chip-btn chip-btn-active" : "chip-btn"}
                onClick={() => updateChildInputs(mine, plans[mine.id], { testStatus: o.value }, new Date())}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
