// notes.js — GREENFIELD. The counselor's note: the product's voice.
// Deterministic templates over the plan + verdict — same inputs (including
// locale), same note. Tone contract (brief §1): a private counselor who
// already did the thinking; warm, direct, plain language, never alarmist.
// 2–3 short paragraphs. The ONLY serif surface in the product.
//
// Localized via NOTE_PACKS (en/ko/es/zh/ja); pass an already-localized plan
// so milestone titles/whys in the prose match the user's language. Engine
// rules still apply: pure, no clock reads, `now` is a parameter.

import { getGradeContext } from "../milestones/grade.js";
import { NOTE_PACKS } from "./notes.i18n.js";

export const NOTES_VERSION = "notes-v3"; // v3: bullet summary opening

// counselorNote(child, plan, verdict, now, locale?) →
//   { summary: [3–4 plain bullets], paragraphs: [2 prose paragraphs] }
// The summary answers "where are we?" at a glance (owner request: simple
// terms, bullet points); the prose keeps the counselor voice for the next
// turn and the quiet money note.
export function counselorNote(child, plan, v, now, locale = "en") {
  const pack = NOTE_PACKS[locale] || NOTE_PACKS.en;
  const ctx = getGradeContext(child.gradYear, now);
  const name = child.nickname;
  const grade = Math.max(9, Math.min(12, ctx.grade));
  const today = now.toISOString().slice(0, 10);
  const semShort = pack.semesterShort[ctx.semester] || pack.semesterShort.fall;

  // Opening summary — simple bullets: where, verdict, what this year is, load.
  const overdue = v.milestones.filter((m) => m.state === "overdue").length;
  const summary = [
    pack.bGrade(grade, semShort),
    v.status === "onTrack" ? pack.bOnTrack : pack.bNeeds(overdue),
    pack.bFlavor[grade],
  ];
  if (v.dueThisSemester != null) summary.push(pack.bSemester(v.dueThisSemester));

  // P2 — the next turn and why it matters.
  const next = v.oneNextThing;
  let p2;
  if (next) {
    const whenStr = next.date >= today ? pack.whenBy(pack.date(next.date)) : pack.whenCatchup;
    p2 = pack.p2Next(next.title, whenStr, next.why);
    if (child.testStatus === "done" && grade >= 11) p2 += pack.p2TestingDone(name);
  } else {
    p2 = pack.p2None(name);
  }

  // P3 — the quiet money note.
  const p3 = moneyParagraph(pack, name, plan, today);

  return { version: NOTES_VERSION, locale, summary, paragraphs: [p2, p3] };
}

function moneyParagraph(pack, name, plan, today) {
  const base = plan.milestones.find((m) => m.id === "fin-base-year");
  if (base) {
    const baseYear = Number(base.date.slice(0, 4));
    if (base.date > today) return pack.p3BaseFuture(name, baseYear);
    if (today <= `${baseYear}-12-31`) return pack.p3BaseCounting(name);
  }
  const fafsa = plan.milestones.find((m) => m.id === "g12-fafsa" && m.status !== "done");
  if (fafsa && fafsa.date <= today.slice(0, 4) + "-12-31" && fafsa.date >= today) {
    return pack.p3Fafsa(pack.date(fafsa.date));
  }
  return pack.p3Default(name);
}
