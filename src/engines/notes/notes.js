// notes.js — GREENFIELD. The counselor's note: the product's voice.
// Deterministic templates over the plan + verdict — same inputs, same note.
// Tone contract (brief §1): a private counselor who already did the thinking;
// warm, direct, plain language, no jargon, never alarmist. 2–3 short
// paragraphs. The ONLY serif surface in the product.
//
// Editorial content — owner reviews tone. Engine rules still apply:
// pure, no clock reads, `now` is a parameter.

import { getGradeContext } from "../milestones/grade.js";

export const NOTES_VERSION = "notes-v1";

const ORDINAL = { 9: "ninth", 10: "tenth", 11: "eleventh", 12: "twelfth" };

const GRADE_FLAVOR = {
  9: "Ninth grade is about habits and honest exploration more than achievements — colleges won't see most of this year, but everything later builds on it.",
  10: "Tenth grade is the quiet-but-important year: depth starts to beat breadth, and the first real signals — course rigor, a practice test — take shape.",
  11: "Junior year is the one colleges read most closely. Grades, testing, and the story all come into focus now, which is exactly why a calm plan matters.",
  12: "Senior fall is execution season — deadlines, essays, and money paperwork. The thinking is mostly done; what wins now is follow-through.",
};

function prettyDate(isoDay) {
  const d = new Date(isoDay + "T12:00:00Z");
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// The quiet money paragraph — the differentiator, said gently.
function moneyParagraph(name, plan, v, today) {
  const base = plan.milestones.find((m) => m.id === "fin-base-year");
  if (base) {
    const baseYear = Number(base.date.slice(0, 4));
    if (base.date > today) {
      return `One quiet money note: starting January 1, ${baseYear}, that year's household income is what the FAFSA will count when ${name} applies. Most families hear this too late to plan around it — you now have it on the calendar, with time to think.`;
    }
    const stillCounting = today <= `${baseYear}-12-31`;
    if (stillCounting) {
      return `One quiet money note: this is the income year the FAFSA will count for ${name}. Nothing needs to happen today — just keep it in mind before any large financial moves, and the road will surface the next money stop when it's near.`;
    }
  }
  const fafsa = plan.milestones.find((m) => m.id === "g12-fafsa" && m.status !== "done");
  if (fafsa && fafsa.date <= today.slice(0, 4) + "-12-31" && fafsa.date >= today) {
    return `On money: the FAFSA opens ${prettyDate(fafsa.date)}, and at many schools aid is first-come. Filing in the first weeks is one of the few easy wins left this year.`;
  }
  return `Money stops are built into ${name}'s road right alongside the academic ones — when one gets close, it will surface here first, with time to act on it.`;
}

// counselorNote(child, plan, verdict, now) → { paragraphs: [..2–3 strings] }
export function counselorNote(child, plan, v, now) {
  const ctx = getGradeContext(child.gradYear, now);
  const name = child.nickname;
  const grade = Math.max(9, Math.min(12, ctx.grade));
  const today = now.toISOString().slice(0, 10);
  const semesterPhrase = ctx.semester === "fall" ? "in the fall semester" : ctx.semester === "spring" ? "in the spring semester" : "in the summer stretch";

  // P1 — where you are (verdict first: anxiety relief, then direction).
  let p1;
  if (v.status === "onTrack") {
    p1 = `${name} is in ${ORDINAL[grade]} grade, ${semesterPhrase}, and from everything you've shared things are on track — nothing has been missed, and nothing here is urgent. ${GRADE_FLAVOR[grade]}`;
  } else {
    const n = v.milestones.filter((m) => m.state === "overdue").length;
    p1 = `${name} is in ${ORDINAL[grade]} grade, ${semesterPhrase}. ${n === 1 ? "One thing has" : `${n} things have`} come due recently — nothing that can't be recovered, and catching up this week costs far less than it will later. ${GRADE_FLAVOR[grade]}`;
  }

  // P2 — the next turn and why it matters.
  const next = v.oneNextThing;
  let p2;
  if (next) {
    const when = next.date >= today ? `by ${prettyDate(next.date)}` : "as the first catch-up";
    p2 = `The next turn: ${next.title.charAt(0).toLowerCase()}${next.title.slice(1)}, ${when}. ${next.why}`;
    if (child.testStatus === "done" && grade >= 11) {
      p2 += ` With testing behind ${name}, attention shifts fully to the story and the paperwork — a genuinely lighter load.`;
    }
  } else {
    p2 = `${name}'s road is fully mapped and there's no action needed right now — a rare and pleasant place to be.`;
  }

  // P3 — the quiet money note.
  const p3 = moneyParagraph(name, plan, v, today);

  return { version: NOTES_VERSION, paragraphs: [p1, p2, p3] };
}
