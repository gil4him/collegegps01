// Ported from collegeapp01 app/src/lib/grade.js @ 8171b8a — keep public interface.
// Pure grade derivation. The graduation year is the durable source of truth (it
// never goes stale); the current grade and academic month are DERIVED from it and
// `now`. Caller passes `now` — no Date.now() inside — mirroring the readiness.js /
// credits.js convention so this stays fully testable.

const ACADEMIC_MONTHS = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

function clampGrade(n) { return Math.max(9, Math.min(12, n)); }

// The school year that CONTAINS `now`, named by the calendar year it ENDS in.
// It rolls over on Aug 1: Aug–Dec belong to the year that ends next spring.
function schoolYearEndYear(now) {
  return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
}

// A "class of {gradYear}" student is in 12th grade during the school year that
// ends in gradYear, 11th the year before, and so on. Clamped to 9–12.
export function gradeFromGradYear(gradYear, now) {
  if (gradYear == null || gradYear === "") return null;
  const g = Number(gradYear);
  if (!isFinite(g)) return null;
  return clampGrade(12 - (g - schoolYearEndYear(now)));
}

// Academic-month ordering: 0 = August … 11 = July.
function academicMonthIndex(now) { return (now.getMonth() + 5) % 12; }

function semesterOf(monthIndex) {
  if (monthIndex <= 4) return "fall";   // Aug–Dec
  if (monthIndex <= 9) return "spring"; // Jan–May
  return "summer";                      // Jun–Jul
}

export function getGradeContext(gradYear, now) {
  const grade = gradeFromGradYear(gradYear, now);
  const monthIndex = academicMonthIndex(now);
  return {
    grade,
    monthIndex,
    monthLabel: ACADEMIC_MONTHS[monthIndex],
    semester: semesterOf(monthIndex),
    gradYear: gradYear != null && gradYear !== "" ? Number(gradYear) : null,
  };
}

// ===== Stage tokens — one design system, five settings (docs/STRATEGY.md
// Slice 2; Blind-Spot §3.2). What scales by stage is density, vocabulary,
// time horizon, number exposure, and who the surface addresses — never the
// visual language. These are TOKENS, not behavior: surfaces opt in one at a
// time (gradeEmphasis/applicationsAreEarly below already read from them; the
// number/anxiety consumers land with product review).
// Grade 8 is defined here for the parent-only S0 stage, but NOTHING enables it
// at runtime until the COPPA posture is counsel-approved — clampGrade (above)
// still floors every derived grade at 9. studentAccount `false` = no student
// account at all; "optional_13plus" = student account allowed from age 13.
export const STAGE_TOKENS = {
  8:  { density: "single",    horizon: "this_month",    numbers: "none",              readingLevel: 6,  agency: "parent_only",   motivation: "doors_open", anxietyGuard: "max",      gamification: "none",      studentAccount: false,
        emphasis: ["academics", "ecStory", "application", "funding"], applicationsEarly: true },
  9:  { density: "single",    horizon: "this_month",    numbers: "none",              readingLevel: 6,  agency: "parent_owned",  motivation: "curiosity",  anxietyGuard: "max",      gamification: "discovery", studentAccount: "optional_13plus",
        emphasis: ["academics", "ecStory", "application", "funding"], applicationsEarly: true },
  10: { density: "grouped_3", horizon: "this_semester", numbers: "ranges",            readingLevel: 8,  agency: "parent_led",    motivation: "mastery",    anxietyGuard: "high",     gamification: "progress",  studentAccount: true,
        emphasis: ["academics", "ecStory", "application", "funding"], applicationsEarly: true },
  11: { density: "dashboard", horizon: "this_year",     numbers: "full_with_context", readingLevel: 10, agency: "student_led",   motivation: "strategy",   anxietyGuard: "moderate", gamification: "none",      studentAccount: true,
        emphasis: ["academics", "application", "ecStory", "funding"], applicationsEarly: false },
  12: { density: "tracker",   horizon: "weeks_dates",   numbers: "full_plus_gaps",    readingLevel: 12, agency: "student_owned", motivation: "execution",  anxietyGuard: "low",      gamification: "none",      studentAccount: true,
        emphasis: ["application", "academics", "ecStory", "funding"], applicationsEarly: false },
};

// Neutral tokens for an unknown grade — matches today's uniform UI (full
// dashboard, full numbers, neutral pillar order).
const NEUTRAL_TOKENS = { density: "dashboard", horizon: "this_year", numbers: "full_with_context", readingLevel: 10, agency: "student_led", motivation: "strategy", anxietyGuard: "moderate", gamification: "none", studentAccount: true,
  emphasis: ["academics", "ecStory", "application", "funding"], applicationsEarly: false };

export function stageTokens(grade) {
  return STAGE_TOKENS[Number(grade)] || NEUTRAL_TOKENS;
}

// The readiness pillars a given grade should LEAD with, most-emphasized first.
// Presentation only — it reorders/mutes what the UI surfaces, never the scores.
// Derived from the stage tokens so tokens are load-bearing from day one.
export function gradeEmphasis(grade) {
  return stageTokens(grade).emphasis;
}

// Whether applications are still "down the road" for this grade — drives the
// muted/"later" treatment of the Application pillar and college-match headline.
export function applicationsAreEarly(grade) {
  return !!STAGE_TOKENS[Number(grade)] && STAGE_TOKENS[Number(grade)].applicationsEarly;
}

// Graduation-year options for onboarding: the current senior class through ~4
// years out (covers a rising 9th grader). Soonest-graduating first.
export function gradYearOptions(now) {
  const end = schoolYearEndYear(now);
  return [end, end + 1, end + 2, end + 3, end + 4];
}

// Inverse of gradeFromGradYear: a student in `grade` right now graduates when
// they finish 12th. We ask students their current grade (concrete and easy) but
// STORE the graduation year, which never goes stale as the calendar rolls over.
export function gradYearFromGrade(grade, now) {
  const g = clampGrade(Number(grade));
  if (!isFinite(g)) return null;
  return schoolYearEndYear(now) + (12 - g);
}

export { ACADEMIC_MONTHS };
