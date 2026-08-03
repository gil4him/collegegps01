import { useState } from "react";
import { addChild } from "../lib/children.js";
import { zipToState } from "../engines/districts/zipState.js";

const GRADES = [
  { value: 9, label: "9th grade" },
  { value: 10, label: "10th grade" },
  { value: 11, label: "11th grade" },
  { value: 12, label: "12th grade" },
];

// The whole onboarding (brief §4): two questions — grade + ZIP — plus a
// name for the card. No financial question before the dashboard, ever.
export default function AddChild({ householdId, tenantId, onDone, onCancel }) {
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!zipToState(zip)) {
      setError("That ZIP doesn't look right — five digits, e.g. 90210.");
      return;
    }
    setBusy(true);
    try {
      await addChild({ nickname, grade, zip }, householdId, tenantId, new Date());
      onDone();
    } catch (err) {
      setError("Couldn't save just now — please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2 className="card-title">Add your child</h2>
      <label className="field">
        <span>First name or nickname</span>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={40} />
      </label>
      <label className="field">
        <span>Grade</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
          <option value="" disabled>
            Choose a grade
          </option>
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Home ZIP code</span>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          pattern="\d{5}"
          placeholder="e.g. 90210"
          required
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="primary" type="submit" disabled={busy}>
        {busy ? "Building the road…" : "Create the card"}
      </button>
      {onCancel && (
        <button type="button" className="linklike" onClick={onCancel}>
          Cancel
        </button>
      )}
    </form>
  );
}
