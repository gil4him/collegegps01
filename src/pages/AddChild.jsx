import { useState } from "react";
import { addChild } from "../lib/children.js";
import { zipToState } from "../engines/districts/zipState.js";
import { useI18n } from "../i18n/index.jsx";

// The whole onboarding (brief §4): two questions — grade + ZIP — plus a
// name for the card. No financial question before the dashboard, ever.
export default function AddChild({ householdId, tenantId, onDone, onCancel }) {
  const { t } = useI18n();
  const [nickname, setNickname] = useState("");
  const [grade, setGrade] = useState("");
  const [zip, setZip] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const GRADES = [
    { value: 9, label: t("add.grade9") },
    { value: 10, label: t("add.grade10") },
    { value: 11, label: t("add.grade11") },
    { value: 12, label: t("add.grade12") },
  ];

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!zipToState(zip)) {
      setError(t("add.zipError"));
      return;
    }
    setBusy(true);
    try {
      await addChild({ nickname, grade, zip }, householdId, tenantId, new Date());
      onDone();
    } catch (err) {
      setError(t("add.saveError"));
      setBusy(false);
    }
  }

  return (
    <form className="card auth-card" onSubmit={submit}>
      <h2 className="card-title">{t("add.title")}</h2>
      <label className="field">
        <span>{t("add.name")}</span>
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} required maxLength={40} />
      </label>
      <label className="field">
        <span>{t("add.grade")}</span>
        <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
          <option value="" disabled>
            {t("add.chooseGrade")}
          </option>
          {GRADES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t("add.zip")}</span>
        <input
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          inputMode="numeric"
          pattern="\d{5}"
          placeholder={t("add.zipPlaceholder")}
          required
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button className="primary" type="submit" disabled={busy}>
        {busy ? t("add.building") : t("add.create")}
      </button>
      {onCancel && (
        <button type="button" className="linklike" onClick={onCancel}>
          {t("add.cancel")}
        </button>
      )}
    </form>
  );
}
