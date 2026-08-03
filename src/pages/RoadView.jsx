import { useMemo } from "react";
import { verdictFor } from "../engines/verdict/verdict.js";
import { setMilestoneStatus } from "../lib/children.js";
import { prettyDate, useI18n } from "../i18n/index.jsx";
import { localizePlan } from "../i18n/content.js";

function daysUntil(isoDay, now) {
  return Math.ceil((new Date(isoDay + "T12:00:00") - now) / 86400000);
}

// The turn-by-turn route (brief: Plan altitude). Vertical road, dated stops,
// financial stops inline, done/next/upcoming states.
export default function RoadView({ child, plan, onBack }) {
  const { locale, t } = useI18n();
  const now = new Date();
  const lPlan = useMemo(() => localizePlan(plan, locale), [plan, locale]);
  const v = useMemo(() => (lPlan ? verdictFor(lPlan, child, now) : null), [lPlan, child]);
  if (!lPlan || !v) return <p className="status status-checking">{t("home.loading")}</p>;

  const next = v.oneNextThing;
  const days = next && next.date ? daysUntil(next.date, now) : null;
  const CATEGORY_LABEL = {
    financial: t("tag.money"),
    testing: t("tag.testing"),
    application: t("tag.applications"),
  };

  return (
    <div>
      {onBack && (
        <button className="linklike" onClick={onBack}>
          {t("road.backTo", { name: child.nickname })}
        </button>
      )}

      <header className="detail-head">
        <h1>{onBack ? t("road.title") : t("road.titleNamed", { name: child.nickname })}</h1>
        {next && (
          <p className="child-grade">
            {t("road.nextTurn", { title: next.title })}
            {days != null && days > 1 && ` ${t("road.days", { n: days })}`}
            {days === 1 && ` ${t("road.day")}`}
          </p>
        )}
      </header>

      <ol className="road">
        {v.milestones.map((m) => {
          const isNext = next && m.id === next.id;
          const cls =
            m.state === "done"
              ? "stop stop-done"
              : isNext
              ? "stop stop-next"
              : m.state === "catchup"
              ? "stop stop-catchup"
              : m.state === "overdue"
              ? "stop stop-overdue"
              : "stop";
          return (
            <li key={m.id} className={cls}>
              <span className="stop-marker" aria-hidden="true" />
              <div className="stop-body">
                <p className="stop-date">
                  {prettyDate(m.date, locale)}
                  {CATEGORY_LABEL[m.category] && (
                    <span className={`tag tag-${m.category}`}>{CATEGORY_LABEL[m.category]}</span>
                  )}
                  {m.state === "catchup" && <span className="tag tag-catchup">{t("tag.catchup")}</span>}
                  {isNext && <span className="tag tag-next">{t("tag.next")}</span>}
                </p>
                <p className="stop-title">{m.title}</p>
                <p className="stop-why">{m.why}</p>
                <button
                  className="linklike stop-toggle"
                  onClick={() =>
                    setMilestoneStatus(child.id, plan, m.id, m.status === "done" ? "upcoming" : "done")
                  }
                >
                  {m.status === "done" ? t("road.markNotDone") : t("road.markDone")}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
