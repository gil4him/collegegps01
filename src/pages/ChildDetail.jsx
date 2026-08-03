import { useMemo, useState } from "react";
import { verdictFor } from "../engines/verdict/verdict.js";
import { counselorNote } from "../engines/notes/notes.js";
import { gradeFromGradYear } from "../engines/milestones/grade.js";
import { affordabilityFor, SAVINGS_BANDS } from "../engines/affordability/affordability.js";
import { INCOME_BANDS, BUDGET_BANDS } from "../engines/answers/answers.js";
import { updateChildInputs } from "../lib/children.js";
import { updateMoneyProfile } from "../lib/profiles.js";
import { createClaimCode } from "../lib/claims.js";
import { useI18n } from "../i18n/index.jsx";
import { bandLabel, localizePlan } from "../i18n/content.js";
import ConsultantList from "../components/ConsultantList.jsx";

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
  const { t } = useI18n();
  const a = useMemo(() => affordabilityFor(child, money), [child, money]);
  if (!a.available) return null;
  return (
    <section className="afford">
      <h2 className="section-title">{t("afford.title", { state: a.stateName })}</h2>
      {a.typical && <p className="afford-basis">{t("afford.typical", { state: a.stateName })}</p>}
      <p className="afford-range">
        {t("afford.netLabel", { n: a.schoolCount })}:{" "}
        <strong>
          {money$(a.netLow)}–{money$(a.netHigh)}
        </strong>{" "}
        {t("afford.perYearMedian", { median: money$(a.netMedian) })}
      </p>
      {a.withinBudget != null && (
        <p className="afford-range">
          {t("afford.budgetLabel", { amount: money$(a.budgetMid) })}:{" "}
          <strong>{t("afford.budgetValue", { k: a.withinBudget, n: a.schoolCount })}</strong>
        </p>
      )}
      {a.sai && (
        <p className="afford-range">
          {t("afford.aidLabel")}:{" "}
          <strong>
            {money$(a.sai.low)}–{money$(a.sai.high)}
          </strong>
          . {t("afford.aidNote")}
        </p>
      )}
      <p className="afford-fineprint">{t("afford.finePrint")}</p>
    </section>
  );
}

// Card detail = the counselor's note (brief: NOT more widgets). Serif voice,
// two actions, then the sharpen prompts with visible payoff.
export default function ChildDetail({ child, plan, money, todos, householdId, tenantId, onBack, onRoad }) {
  const { locale, t } = useI18n();
  const now = new Date();
  const [busy, setBusy] = useState(false);
  const [claimCode, setClaimCode] = useState(null);
  const lPlan = useMemo(() => localizePlan(plan, locale), [plan, locale]);
  const v = useMemo(() => (lPlan ? verdictFor(lPlan, child, now) : null), [lPlan, child]);
  const note = useMemo(
    () => (lPlan && v ? counselorNote(child, lPlan, v, now, locale) : null),
    [lPlan, v, child, locale]
  );
  const grade = gradeFromGradYear(child.gradYear, now);

  const GPA_BANDS = [
    { value: "3.7plus", label: "3.7+" },
    { value: "3.3to3.7", label: "3.3–3.7" },
    { value: "3.0to3.3", label: "3.0–3.3" },
    { value: "below3", label: "< 3.0" },
  ];
  const TEST_STATUS = [
    { value: "notStarted", label: t("detail.notStarted") },
    { value: "registered", label: t("detail.registered") },
    { value: "done", label: t("detail.done") },
  ];
  const INCOME_OPTIONS = INCOME_BANDS.map((b) => ({ value: b, label: bandLabel(b, locale) }));
  const BUDGET_OPTIONS = Object.keys(BUDGET_BANDS).map((b) => ({ value: b, label: bandLabel(b, locale) }));
  const SAVINGS_OPTIONS = Object.keys(SAVINGS_BANDS).map((b) => ({ value: b, label: bandLabel(b, locale) }));

  async function sharpen(patch) {
    setBusy(true);
    try {
      await updateChildInputs(child, plan, patch, new Date());
    } finally {
      setBusy(false);
    }
  }

  if (!lPlan || !v) return <p className="status status-checking">{t("home.loading")}</p>;

  const pill =
    v.status === "onTrack"
      ? t("home.onTrack")
      : (() => {
          const n = v.milestones.filter((m) => m.state === "overdue").length;
          return n === 1 ? t("home.needsAttentionOne") : t("home.needsAttention", { n });
        })();

  return (
    <div>
      <button className="linklike" onClick={onBack}>
        {t("detail.allChildren")}
      </button>

      <header className="detail-head">
        <h1>{child.nickname}</h1>
        <p className="child-grade">
          {t("home.grade", { n: grade })} ·{" "}
          <span className={v.status === "onTrack" ? "inline-ok" : "inline-warn"}>{pill}</span>
        </p>
      </header>

      <section className="note" lang={locale}>
        <ul className="note-summary">
          {note.summary.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        {note.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>

      <div className="detail-actions">
        <button className="primary" onClick={() => onRoad(v.oneNextThing?.id)}>
          {t("detail.doThisNow")}
        </button>
        <button className="linklike" onClick={() => onRoad(null)}>
          {t("detail.seeRoad")}
        </button>
      </div>

      <ConsultantList todos={todos} childId={child.id} />

      <AffordabilityPanel child={child} money={money} />

      <section className="sharpen">
        <h2 className="section-title">{t("detail.sharpenTitle")}</h2>
        <p className="sharpen-sub">{t("detail.sharpenSub", { name: child.nickname })}</p>
        <SharpenRow
          label={t("detail.gpaBand")}
          payoff={t("detail.gpaPayoff")}
          options={GPA_BANDS}
          value={child.gpaBand}
          onPick={(gpaBand) => sharpen({ gpaBand })}
          busy={busy}
        />
        <SharpenRow
          label={t("detail.testStatus")}
          payoff={t("detail.testPayoff")}
          options={TEST_STATUS}
          value={child.testStatus}
          onPick={(testStatus) => sharpen({ testStatus })}
          busy={busy}
        />
        <SharpenRow
          label={t("detail.income")}
          payoff={t("detail.incomePayoff")}
          options={INCOME_OPTIONS}
          value={money?.incomeBand}
          onPick={(incomeBand) => updateMoneyProfile(householdId, tenantId, { incomeBand })}
          busy={busy}
        />
        <SharpenRow
          label={t("detail.budget")}
          payoff={t("detail.budgetPayoff")}
          options={BUDGET_OPTIONS}
          value={money?.budgetBand}
          onPick={(budgetBand) => updateMoneyProfile(householdId, tenantId, { budgetBand })}
          busy={busy}
        />
        <SharpenRow
          label={t("detail.savings")}
          payoff={t("detail.savingsPayoff")}
          options={SAVINGS_OPTIONS}
          value={money?.savings529Band}
          onPick={(savings529Band) => updateMoneyProfile(householdId, tenantId, { savings529Band })}
          busy={busy}
        />
      </section>

      <section className="claim-section">
        <h2 className="section-title">{t("detail.ownView", { name: child.nickname })}</h2>
        {child.claimedByUid ? (
          <p className="sharpen-sub">{t("detail.claimed", { name: child.nickname })}</p>
        ) : claimCode ? (
          <p className="sharpen-sub">
            {t("detail.shareCode", { name: child.nickname })}{" "}
            <strong className="claim-code">{claimCode}</strong>
            <br />
            {t("detail.shareCodeSub", { name: child.nickname })}
          </p>
        ) : (
          <>
            <p className="sharpen-sub">{t("detail.claimOptional", { name: child.nickname })}</p>
            <button
              className="linklike"
              onClick={async () => setClaimCode(await createClaimCode(child, tenantId))}
            >
              {t("detail.invite", { name: child.nickname })}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
