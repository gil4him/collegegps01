import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { signOut } from "../auth/account.js";
import { subscribeChildren, subscribePlans } from "../lib/children.js";
import { subscribeMoneyProfile } from "../lib/profiles.js";
import { gradeFromGradYear } from "../engines/milestones/grade.js";
import { verdictFor } from "../engines/verdict/verdict.js";
import { STATES } from "../data/dataset.js";
import AddChild from "./AddChild.jsx";
import ChildDetail from "./ChildDetail.jsx";
import RoadView from "./RoadView.jsx";

// Stable per-child accent colors (brief: each child gets a stable accent).
const ACCENTS = ["#0071e3", "#af52de", "#ff9500", "#34c759", "#ff2d55", "#5ac8fa"];
function accentFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function prettyDate(isoDay) {
  return new Date(isoDay + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ChildCard({ child, plan, onOpen }) {
  const now = new Date();
  const v = useMemo(() => (plan ? verdictFor(plan, child, now) : null), [plan, child]);
  const grade = gradeFromGradYear(child.gradYear, now);
  const next = v?.oneNextThing;

  return (
    <article
      className="child-card child-card-tappable"
      style={{ "--accent": accentFor(child.id) }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <header className="child-head">
        <span className="avatar">{child.nickname.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2 className="child-name">{child.nickname}</h2>
          <p className="child-grade">Grade {grade ?? "—"}</p>
        </div>
        {v && (
          <span className={v.status === "onTrack" ? "pill pill-ok" : "pill pill-warn"}>
            {v.pill}
          </span>
        )}
      </header>

      <p className="chip">
        Based on {STATES[child.state] || "state"} requirements
      </p>

      {next ? (
        <div className="next-thing">
          <p className="next-label">One next thing · {prettyDate(next.date)}</p>
          <p className="next-title">{next.title}</p>
          <p className="next-why">{next.why}</p>
        </div>
      ) : (
        <p className="next-why">Building the road…</p>
      )}

      {v && (
        <p className="card-foot">
          {v.dueThisSemester} {v.dueThisSemester === 1 ? "thing" : "things"} this semester
        </p>
      )}
    </article>
  );
}

export default function Home() {
  const { user, profile } = useAuth();
  const [children, setChildren] = useState(null);
  const [plans, setPlans] = useState({});
  const [money, setMoney] = useState(null);
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState({ name: "dashboard", childId: null });
  const householdId = profile?.householdId;

  useEffect(() => {
    if (!householdId) return undefined;
    const u1 = subscribeChildren(householdId, setChildren);
    const u2 = subscribePlans(householdId, setPlans);
    const u3 = subscribeMoneyProfile(householdId, setMoney);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [householdId]);

  if (profile && profile.role === "student") {
    return (
      <main className="shell">
        <header className="topbar">
          <span className="wordmark">College GPS</span>
          <button className="linklike" onClick={signOut}>
            Sign out
          </button>
        </header>
        <h1>Welcome</h1>
        <p className="tagline">
          Your view opens when you claim your card — ask your parent to invite
          you, or check back soon.
        </p>
      </main>
    );
  }

  const empty = children && children.length === 0;
  const selected = view.childId && children?.find((c) => c.id === view.childId);

  if (selected) {
    return (
      <main className="shell shell-wide">
        <header className="topbar">
          <span className="wordmark">College GPS</span>
          <button className="linklike" onClick={signOut}>
            Sign out
          </button>
        </header>
        {view.name === "road" ? (
          <RoadView
            child={selected}
            plan={plans[selected.id]}
            onBack={() => setView({ name: "detail", childId: selected.id })}
          />
        ) : (
          <ChildDetail
            child={selected}
            plan={plans[selected.id]}
            money={money}
            householdId={householdId}
            tenantId={profile.tenantId || "default"}
            onBack={() => setView({ name: "dashboard", childId: null })}
            onRoad={() => setView({ name: "road", childId: selected.id })}
          />
        )}
      </main>
    );
  }

  return (
    <main className="shell shell-wide">
      <header className="topbar">
        <span className="wordmark">College GPS</span>
        <button className="linklike" onClick={signOut}>
          Sign out
        </button>
      </header>

      {!children && <p className="status status-checking">Loading…</p>}

      {empty && !adding && (
        <div className="empty-state">
          <h1>Let&rsquo;s find where you are</h1>
          <p className="tagline">
            Two questions. Your child&rsquo;s road appears immediately.
          </p>
          <button className="primary" onClick={() => setAdding(true)}>
            Add your child
          </button>
        </div>
      )}

      {(adding || (empty && adding)) && householdId && (
        <div className="modal-center">
          <AddChild
            householdId={householdId}
            tenantId={profile.tenantId || "default"}
            onDone={() => setAdding(false)}
            onCancel={empty ? null : () => setAdding(false)}
          />
        </div>
      )}

      {children && children.length > 0 && !adding && (
        <>
          <div className="cards-grid">
            {children.map((c) => (
              <ChildCard
                key={c.id}
                child={c}
                plan={plans[c.id]}
                onOpen={() => setView({ name: "detail", childId: c.id })}
              />
            ))}
            <button className="add-card" onClick={() => setAdding(true)}>
              + Add another child
            </button>
          </div>
        </>
      )}
    </main>
  );
}
