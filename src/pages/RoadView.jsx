import { useMemo } from "react";
import { verdictFor } from "../engines/verdict/verdict.js";
import { setMilestoneStatus } from "../lib/children.js";

function prettyDate(isoDay) {
  return new Date(isoDay + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(isoDay, now) {
  return Math.ceil((new Date(isoDay + "T12:00:00") - now) / 86400000);
}

const CATEGORY_LABEL = { financial: "money", testing: "testing", application: "applications" };

// The turn-by-turn route (brief: Plan altitude). Vertical road, dated stops,
// financial stops inline, done/next/upcoming states.
export default function RoadView({ child, plan, onBack }) {
  const now = new Date();
  const v = useMemo(() => (plan ? verdictFor(plan, child, now) : null), [plan, child]);
  if (!plan || !v) return <p className="status status-checking">Loading…</p>;

  const next = v.oneNextThing;
  const days = next && next.date ? daysUntil(next.date, now) : null;

  return (
    <div>
      {onBack && (
        <button className="linklike" onClick={onBack}>
          ← {child.nickname}&rsquo;s note
        </button>
      )}

      <header className="detail-head">
        <h1>The road ahead</h1>
        {next && (
          <p className="child-grade">
            Next turn: {next.title}
            {days != null && days >= 0 ? ` · ${days} ${days === 1 ? "day" : "days"}` : ""}
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
                  {prettyDate(m.date)}
                  {CATEGORY_LABEL[m.category] && (
                    <span className={`tag tag-${m.category}`}>{CATEGORY_LABEL[m.category]}</span>
                  )}
                  {m.state === "catchup" && <span className="tag tag-catchup">worth a look back</span>}
                  {isNext && <span className="tag tag-next">next</span>}
                </p>
                <p className="stop-title">{m.title}</p>
                <p className="stop-why">{m.why}</p>
                <button
                  className="linklike stop-toggle"
                  onClick={() =>
                    setMilestoneStatus(child.id, plan, m.id, m.status === "done" ? "upcoming" : "done")
                  }
                >
                  {m.status === "done" ? "Mark not done" : "Mark done"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
