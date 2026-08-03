// verdict.js — GREENFIELD (no collegeapp01 origin; see docs/ENGINES.md).
// The GPS core: turns a child's inputs into a dated milestone plan, an
// On-track verdict, and the One Next Thing. Deterministic: same inputs +
// same `now` → identical output. Never reads the clock itself.
//
// Cold-start policy (owner default, pending golden-fixture review):
// milestones dated before the child was added are "catch-up" — shown gently
// on the road, never counted against the verdict. Only items that came due
// while the family was here can flag "Needs attention".
//
// Content is year-stamped: date anchors reviewed for the 2026–27 cycle.
// (FAFSA's official open is October 1; recent cycles have slipped — the
// label says "typically" on purpose.)

import { getGradeContext } from "../milestones/grade.js";
import { milestonesForGrade } from "../milestones/milestoneCalendar.js";
import { baseYearForAcademicYear } from "../finaid/portfolio.js";

export const VERDICT_VERSION = "verdict-v1";
export const CONTENT_REVIEWED_FOR = "2026-27";

// Two-line "why" per milestone — the card/road voice. Editorial content.
const WHY = {
  "g9-rigor": "Colleges read your transcript in context — the courses picked now set the ceiling for later.",
  "g9-explore": "Depth beats breadth later; finding what sticks starts with honest tries now.",
  "g9-gpa": "Freshman grades count in the GPA all four years — protecting it now is far easier than repairing it.",
  "g9-summer": "A summer with substance becomes the first line of the story.",
  "g10-psat": "A practice PSAT gives a no-stakes baseline and shows where prep will pay off.",
  "g10-spike": "Admissions readers look for commitment, not a long list.",
  "g10-ap": "Next year's rigor is decided this spring — course selection is the quiet application move.",
  "g10-summer": "Sophomore summer is the launchpad for leadership stories.",
  "g11-psat": "This one counts — National Merit qualification can mean real scholarship money.",
  "g11-test": "A spring test date leaves room for a fall retake before applications.",
  "g11-recs": "The best letters come from teachers who know you — that takes a semester, not a week.",
  "g11-list": "A balanced list is the single best protection for both admission odds and cost.",
  "g11-summer": "Essays drafted in summer beat essays rushed in October.",
  "g12-fafsa": "Aid is first-come at many schools — filing early can be worth real money.",
  "g12-essays": "October you will thank September you.",
  "g12-deadlines": "EA/ED dates arrive fast — one tracker prevents the expensive miss.",
  "g12-submit": "Award letters can be compared — and sometimes appealed — before deciding.",
};

// data-model category from the seed's pillar, with testing/financial overrides.
const TESTING_IDS = new Set(["g10-psat", "g11-psat", "g11-test"]);
const FINANCIAL_IDS = new Set(["g12-fafsa"]);
function categoryOf(m) {
  if (TESTING_IDS.has(m.id)) return "testing";
  if (FINANCIAL_IDS.has(m.id)) return "financial";
  if (m.pillar === "application") return "application";
  return "academic";
}

// August-start school year for grade g of the class of gradYear.
function schoolYearStart(gradYear, grade) {
  return gradYear - (12 - grade) - 1;
}

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Window → anchor date within the grade's school year. Coarse by design:
// these are "act by" anchors, not registrar deadlines.
function dateFor(m, startYear) {
  if (m.id === "g10-psat" || m.id === "g11-psat") return iso(startYear, 10, 15); // mid-October test window
  if (m.id === "g12-fafsa") return iso(startYear, 10, 1); // typical FAFSA open
  switch (m.window) {
    case "fall": return iso(startYear, 11, 15);
    case "spring": return iso(startYear + 1, 3, 15);
    case "summer": return iso(startYear + 1, 6, 30);
    default: return iso(startYear + 1, 1, 15); // "year" → mid-year anchor
  }
}

// The quiet money stops (the differentiator — brief §1). Educational
// framing only; no dollar figures, no advice.
function financialMilestones(child) {
  const baseYear = baseYearForAcademicYear(child.gradYear); // sophomore-spring → junior-fall tax year
  return [
    {
      id: "fin-money-checkpoint",
      date: iso(baseYear - 1, 10, 1), // grade 10 fall, before the base year starts
      title: "Money checkpoint: review how college savings are held",
      why: "How savings are held (529 vs. accounts in the student's name) changes the aid math — worth a look before the year colleges count begins.",
      category: "financial",
      grade: 10,
    },
    {
      id: "fin-base-year",
      date: iso(baseYear, 1, 1),
      title: `FAFSA base year begins (tax year ${baseYear})`,
      why: `From January 1, ${baseYear} income is what the FAFSA will count. Plan any large financial moves with that window in mind.`,
      category: "financial",
      grade: 10,
    },
  ];
}

// Refinement selection: this is where two same-grade children diverge.
function applyRefinements(milestones, child) {
  let out = milestones;
  if (child.testStatus === "done") {
    out = out.filter((m) => m.category !== "testing");
  }
  return out;
}

// Tie-break priority when milestones share a date. A low GPA band pulls
// academics forward — the next thing should be the thing that matters most
// for THIS child.
function priorityOf(m, child) {
  const base = { financial: 1, testing: 2, application: 3, academic: 4 }[m.category] || 5;
  if (child.gpaBand === "below3" && m.category === "academic") return 0;
  return base;
}

// Deterministic stable hash of the plan-relevant inputs.
export function inputsHashOf(child) {
  const key = JSON.stringify({
    v: VERDICT_VERSION,
    gradYear: child.gradYear,
    state: child.state ?? null,
    zip: child.zip ?? null,
    gpaBand: child.gpaBand ?? null,
    testStatus: child.testStatus ?? null,
    signupDate: child.signupDate ?? null,
  });
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h * 33) ^ key.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// The full remaining-years plan: current grade through 12, dated, financial
// stops inline, sorted by date then priority.
export function generatePlan(child, now) {
  const ctx = getGradeContext(child.gradYear, now);
  const fromGrade = Math.max(9, Math.min(12, ctx.grade));
  const items = [];
  for (let g = fromGrade; g <= 12; g++) {
    const startYear = schoolYearStart(child.gradYear, g);
    for (const m of milestonesForGrade(g)) {
      items.push({
        id: m.id,
        date: dateFor(m, startYear),
        title: m.label,
        why: WHY[m.id] || "",
        category: categoryOf(m),
        grade: g,
        status: "upcoming",
      });
    }
  }
  for (const f of financialMilestones(child)) {
    if (f.grade >= fromGrade) items.push({ ...f, status: "upcoming" });
  }
  const selected = applyRefinements(items, child).sort(
    (a, b) => a.date.localeCompare(b.date) || priorityOf(a, child) - priorityOf(b, child)
  );
  return {
    engineVersion: VERDICT_VERSION,
    contentReviewedFor: CONTENT_REVIEWED_FOR,
    inputsHash: inputsHashOf(child),
    milestones: selected,
  };
}

// Verdict + One Next Thing, computed from a plan at render time.
// signupDate: ISO day the child was added (cold-start boundary).
export function verdictFor(plan, child, now) {
  const today = now.toISOString().slice(0, 10);
  const signup = child.signupDate || today;
  const semesterEnd = semesterEndFor(now);
  const ms = plan.milestones.map((m) => {
    if (m.status === "done") return { ...m, state: "done" };
    if (m.date < signup) return { ...m, state: "catchup" };
    if (m.date < today) return { ...m, state: "overdue" };
    return { ...m, state: "upcoming" };
  });
  const overdue = ms.filter((m) => m.state === "overdue");
  const upcoming = ms.filter((m) => m.state === "upcoming");
  const oneNextThing = overdue[0] || upcoming[0] || ms[ms.length - 1] || null;
  const dueThisSemester = ms.filter(
    (m) => (m.state === "upcoming" || m.state === "overdue") && m.date <= semesterEnd
  ).length;
  return {
    status: overdue.length ? "needsAttention" : "onTrack",
    pill: overdue.length
      ? `${overdue.length} ${overdue.length === 1 ? "thing needs" : "things need"} attention`
      : "On track",
    dueThisSemester,
    oneNextThing,
    milestones: ms,
  };
}

// End of the current semester (fall → Dec 31, spring/summer → Jun 30).
function semesterEndFor(now) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 8 ? iso(y, 12, 31) : iso(y, 6, 30);
}
