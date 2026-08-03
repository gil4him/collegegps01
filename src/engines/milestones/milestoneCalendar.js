// Ported from collegeapp01 app/src/lib/milestoneCalendar.js @ 8171b8a — keep public interface.
// Static, deterministic college-prep milestone calendar. Wall-safe by
// construction: labels only, never a dollar figure. Keyed by grade (9–12) and a
// coarse time `window` so a student sees what matters for THIS part of the year.
// Pure selectors mirror the readiness.js / credits.js convention.
//
//   window: "fall" (Aug–Dec) | "spring" (Jan–May) | "summer" (Jun–Jul) | "year" (any time)
//   pillar: readiness pillar it advances — academics | ecStory | application
export const MILESTONE_CALENDAR = [
  // 9th — build habits, explore
  { id: "g9-rigor", grade: 9, window: "fall", pillar: "academics", label: "Pick challenging core courses and build strong study habits" },
  { id: "g9-explore", grade: 9, window: "year", pillar: "ecStory", label: "Try 2–3 activities to find what you genuinely care about" },
  { id: "g9-gpa", grade: 9, window: "spring", pillar: "academics", label: "Protect your GPA early — it's the hardest number to raise later" },
  { id: "g9-summer", grade: 9, window: "summer", pillar: "ecStory", label: "Use the summer for a project, job, or program you enjoy" },

  // 10th — deepen, first tests
  { id: "g10-psat", grade: 10, window: "fall", pillar: "academics", label: "Take the PSAT for practice and a baseline score" },
  { id: "g10-spike", grade: 10, window: "year", pillar: "ecStory", label: "Go deeper in 1–2 activities instead of adding more" },
  { id: "g10-ap", grade: 10, window: "spring", pillar: "academics", label: "Plan next year's AP/IB/Honors courses with your counselor" },
  { id: "g10-summer", grade: 10, window: "summer", pillar: "ecStory", label: "Take on leadership or a summer program tied to your interests" },

  // 11th — the pivotal year
  { id: "g11-psat", grade: 11, window: "fall", pillar: "academics", label: "Take the PSAT/NMSQT — it qualifies for National Merit" },
  { id: "g11-test", grade: 11, window: "spring", pillar: "academics", label: "Take the SAT or ACT this spring; plan a retake if needed" },
  { id: "g11-recs", grade: 11, window: "spring", pillar: "application", label: "Build relationships with 1–2 teachers for recommendation letters" },
  { id: "g11-list", grade: 11, window: "spring", pillar: "application", label: "Start a balanced college list (reach / match / safety)" },
  { id: "g11-summer", grade: 11, window: "summer", pillar: "application", label: "Visit or research colleges and draft your main essay" },

  // 12th — apply
  { id: "g12-fafsa", grade: 12, window: "fall", pillar: "application", label: "File the FAFSA — it opens October 1" },
  { id: "g12-essays", grade: 12, window: "fall", pillar: "application", label: "Finish essays and request recommendation letters early" },
  { id: "g12-deadlines", grade: 12, window: "fall", pillar: "application", label: "Track every application deadline (EA/ED and regular)" },
  { id: "g12-submit", grade: 12, window: "spring", pillar: "application", label: "Submit remaining applications and compare your offers" },
];

// Which RoadmapTimeline lane a milestone belongs in.
const LANE_FOR_PILLAR = { academics: "academic", ecStory: "extracurricular", application: "academic" };

export function milestonesForGrade(grade) {
  const g = Number(grade);
  return MILESTONE_CALENDAR.filter((m) => m.grade === g);
}

// The milestones that matter right now: this grade's items whose window is the
// current semester (or "year"). Falls back to all of the grade's items if none
// match the window.
export function currentMilestones(ctx) {
  if (!ctx || ctx.grade == null) return [];
  const all = milestonesForGrade(ctx.grade);
  const inWindow = all.filter((m) => m.window === "year" || m.window === ctx.semester);
  return inWindow.length ? inWindow : all;
}

export function laneForMilestone(m) { return LANE_FOR_PILLAR[m.pillar] || "academic"; }
