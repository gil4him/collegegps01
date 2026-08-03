// Ported from collegeapp01 app/src/lib/deriveThisWeek.js @ 8171b8a — keep public interface.
// deriveThisWeek — the pure brain behind the "This week" card. Given data the
// parent home ALREADY fetches (the student profile, their college matches, and
// their best-match scholarships), it returns at most three plain-language
// actions, dated ones first. No React, no Firestore, no Date.now(): the caller
// passes `now`, mirroring grade.js / credits.js so this stays unit-testable and
// is a drop-in for the real milestone engine (selectActions) if it ever lands.
//
// Explicit .js extensions on the two imports below are deliberate: both modules
// are pure and side-effect-free, so this file runs under plain Node for the unit
// test as well as under Vite. (Vite accepts the extension; Node requires it.)
import { getGradeContext } from "./grade.js";
import { currentMilestones } from "./milestoneCalendar.js";

// Whole days from `now` to a date string; null when absent/unparseable. Kept
// local (not imported from dates.js) so this module has no Date.now() dependency.
function daysUntil(dateStr, now) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

// Terse award label. Mirrors the classic UI's amount field; never invents a
// number — returns "" when there's nothing real to show.
function amountLabel(s) {
  const n = s && (s.amountMax ?? s.amountMin ?? s.amount);
  if (n == null || !isFinite(Number(n))) return "";
  return "$" + Math.round(Number(n)).toLocaleString("en-US");
}

// One short theme line per grade (8–12). Local constant map, as specced — the
// milestone/grade engine that would supply this server-side isn't in the repo.
export const GRADE_THEME = {
  8:  "Explore and build good habits",
  9:  "Explore widely and start strong",
  10: "Go deeper and find your spike",
  11: "Test, build your list, and stand out",
  12: "Apply, fund it, and decide",
};

export function gradeTheme(grade) {
  return GRADE_THEME[Number(grade)] || "Your plan, one step at a time";
}

// Deadlines inside this many days count as "this week's" dated actions.
const SOON_DAYS = 45;

// Returns an array of at most 3 items. Each item:
//   { id, kind, icon, action, why, date, href }
// `date` is the raw deadline string for dated items (null otherwise); dated
// items sort ahead of undated ones, soonest first. Presentation only — nothing
// here re-ranks or re-scores the inputs.
export function deriveThisWeek(profile, matches, scholarships, now) {
  const p = profile || {};
  const ctx = getGradeContext(p.gradYear ?? null, now);
  const grade = ctx.grade ?? (p.grade != null ? Number(p.grade) : null);
  const items = [];

  // 1) Dated — nearest scholarship deadlines among the student's best matches.
  //    Carries the same deadline + amount the classic scholarship card shows.
  const dated = (scholarships || [])
    .map((s) => ({ s, d: daysUntil(s && s.deadline, now) }))
    .filter((x) => x.d != null && x.d >= 0 && x.d <= SOON_DAYS)
    .sort((a, b) => a.d - b.d);
  for (const { s, d } of dated) {
    const amt = amountLabel(s);
    items.push({
      id: "sch-" + (s.id || s.name || items.length),
      kind: "scholarship",
      icon: "📅",
      action: `Apply to ${s.name || "a matched scholarship"}`,
      why: `Closes in ${d} day${d === 1 ? "" : "s"}${amt ? ` · ${amt}` : ""}`,
      date: s.deadline,
      href: "/scholarships",
    });
  }

  // 2) Grade milestone — the one thing that matters most this term. Undated.
  if (grade != null) {
    const m = currentMilestones(ctx)[0];
    if (m) {
      items.push({
        id: "ms-" + m.id,
        kind: "milestone",
        icon: "🎯",
        action: m.label,
        why: `Matters most in ${grade}th grade right now`,
        date: null,
        href: "/journey",
      });
    }
  }

  // 3) Profile gap — only when the plan is visibly thin, so we never nag a
  //    complete profile. Undated.
  if (p.onboardingStatus && p.onboardingStatus !== "complete") {
    items.push({
      id: "profile-onboarding",
      kind: "profile",
      icon: "📝",
      action: "Finish your student's academic profile",
      why: "A few more answers make matches accurate",
      date: null,
      href: "/home",
    });
  } else if (grade == null) {
    items.push({
      id: "profile-grade",
      kind: "profile",
      icon: "📝",
      action: "Add your student's graduation year",
      why: "It sets what matters most this year",
      date: null,
      href: "/home",
    });
  }

  // 4) Shortlist nudge — when there aren't many colleges saved/matched yet.
  if ((matches || []).length > 0 && (matches || []).length < 3) {
    items.push({
      id: "shortlist-thin",
      kind: "shortlist",
      icon: "🏫",
      action: "Look at a few more college matches",
      why: "A balanced list has reach, match, and safety schools",
      date: null,
      href: "/results",
    });
  }

  // Fallback so a brand-new / empty profile still gets one sensible action
  // instead of a blank card.
  if (!items.length) {
    items.push({
      id: "explore-scholarships",
      kind: "scholarship",
      icon: "🔎",
      action: "Explore scholarships your student can apply to",
      why: "Free money is worth a look, even early",
      date: null,
      href: "/scholarships",
    });
  }

  // Dated ahead of undated; among dated, soonest first. Stable otherwise.
  const withRank = items.map((it, i) => ({
    it,
    i,
    d: it.date ? daysUntil(it.date, now) : null,
  }));
  withRank.sort((a, b) => {
    const ad = a.d == null ? Infinity : a.d;
    const bd = b.d == null ? Infinity : b.d;
    if (ad !== bd) return ad - bd;
    return a.i - b.i;
  });

  return withRank.slice(0, 3).map((x) => x.it);
}
