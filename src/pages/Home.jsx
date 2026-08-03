import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { signOut } from "../auth/account.js";
import { subscribeChildren, subscribePlans } from "../lib/children.js";
import { subscribeMoneyProfile } from "../lib/profiles.js";
import { gradeFromGradYear } from "../engines/milestones/grade.js";
import { verdictFor } from "../engines/verdict/verdict.js";
import { STATES } from "../data/dataset.js";
import { LOCALES, prettyDate, useI18n } from "../i18n/index.jsx";
import { localizePlan } from "../i18n/content.js";
import AddChild from "./AddChild.jsx";
import ChildDetail from "./ChildDetail.jsx";
import RoadView from "./RoadView.jsx";
import StudentView from "./StudentView.jsx";

// Stable per-child accent colors (brief: each child gets a stable accent).
const ACCENTS = ["#0071e3", "#af52de", "#ff9500", "#34c759", "#ff2d55", "#5ac8fa"];
function accentFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

function Topbar() {
  const { locale, setLocale, t } = useI18n();
  return (
    <header className="topbar">
      <span className="wordmark">College GPS</span>
      <span className="topbar-right">
        <select
          className="lang-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          aria-label="Language"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native}
            </option>
          ))}
        </select>
        <button className="linklike" onClick={signOut}>
          {t("home.signOut")}
        </button>
      </span>
    </header>
  );
}

function pillFor(v, t) {
  if (v.status === "onTrack") return t("home.onTrack");
  const n = v.milestones.filter((m) => m.state === "overdue").length;
  return n === 1 ? t("home.needsAttentionOne") : t("home.needsAttention", { n });
}

function ChildCard({ child, plan, onOpen }) {
  const { locale, t } = useI18n();
  const now = new Date();
  const lPlan = useMemo(() => localizePlan(plan, locale), [plan, locale]);
  const v = useMemo(() => (lPlan ? verdictFor(lPlan, child, now) : null), [lPlan, child]);
  const grade = gradeFromGradYear(child.gradYear, now);
  const next = v?.oneNextThing;

  return (
    <article
      className="child-card child-card-tappable"
      style={{ "--accent": accentFor(child.id) }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      aria-label={t("home.openNote", { name: child.nickname })}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      <header className="child-head">
        <span className="avatar">{child.nickname.slice(0, 1).toUpperCase()}</span>
        <div>
          <h2 className="child-name">{child.nickname}</h2>
          <p className="child-grade">{t("home.grade", { n: grade ?? "—" })}</p>
        </div>
        {v && (
          <span className={v.status === "onTrack" ? "pill pill-ok" : "pill pill-warn"}>
            {pillFor(v, t)}
          </span>
        )}
      </header>

      <p className="chip">{t("home.basedOn", { state: STATES[child.state] || child.state || "—" })}</p>

      {next ? (
        <div className="next-thing">
          <p className="next-label">{t("home.oneNextThing", { date: prettyDate(next.date, locale) })}</p>
          <p className="next-title">{next.title}</p>
          <p className="next-why">{next.why}</p>
        </div>
      ) : (
        <p className="next-why">{t("home.buildingRoad")}</p>
      )}

      {v && (
        <p className="card-foot">
          {v.dueThisSemester === 1
            ? t("home.thingSemester")
            : t("home.thingsSemester", { n: v.dueThisSemester })}
          {v.dueSoon > 0 && (
            <span className="card-alert"> {t("home.approachingSoon", { n: v.dueSoon })}</span>
          )}
        </p>
      )}
    </article>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const { t } = useI18n();
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
      <main className="shell shell-wide">
        <Topbar />
        <StudentView children={children} plans={plans} />
      </main>
    );
  }

  const empty = children && children.length === 0;
  const selected = view.childId && children?.find((c) => c.id === view.childId);

  if (selected) {
    return (
      <main className="shell shell-wide">
        <Topbar />
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
      <Topbar />

      {!children && <p className="status status-checking">{t("home.loading")}</p>}

      {empty && !adding && (
        <div className="empty-state">
          <h1>{t("home.emptyTitle")}</h1>
          <p className="tagline">{t("home.emptySub")}</p>
          <button className="primary" onClick={() => setAdding(true)}>
            {t("home.addChild")}
          </button>
        </div>
      )}

      {adding && householdId && (
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
            {t("home.addAnother")}
          </button>
        </div>
      )}
    </main>
  );
}
