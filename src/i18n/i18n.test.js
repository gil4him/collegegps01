import { describe, test, expect } from "vitest";
import { STRINGS } from "./strings.js";
import { localizeMilestone, localizePlan, bandLabel } from "./content.js";
import { generatePlan, verdictFor } from "../engines/verdict/verdict.js";
import { counselorNote } from "../engines/notes/notes.js";
import { NOTE_PACKS } from "../engines/notes/notes.i18n.js";

const LOCALES = ["ko", "es", "zh", "ja"];
const NOW = new Date("2026-03-15T12:00:00Z");
const CHILD = { nickname: "Maya", gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-03-15" };

describe("string dictionaries", () => {
  test("every locale covers every English key", () => {
    const enKeys = Object.keys(STRINGS.en);
    for (const loc of LOCALES) {
      const missing = enKeys.filter((k) => !(k in STRINGS[loc]));
      expect(missing, `${loc} missing: ${missing.join(", ")}`).toEqual([]);
    }
  });

  test("no locale has stray keys English lacks", () => {
    const enKeys = new Set(Object.keys(STRINGS.en));
    for (const loc of LOCALES) {
      const stray = Object.keys(STRINGS[loc]).filter((k) => !enKeys.has(k));
      expect(stray, `${loc} stray: ${stray.join(", ")}`).toEqual([]);
    }
  });
});

describe("milestone content localization", () => {
  test("every plan milestone localizes in every language", () => {
    const plan = generatePlan({ ...CHILD, gradYear: 2030 }, NOW); // grade 9 → widest plan
    for (const loc of LOCALES) {
      for (const m of plan.milestones) {
        const lm = localizeMilestone(m, loc);
        expect(lm.title, `${loc}:${m.id} title`).not.toBe(m.title);
        expect(lm.why, `${loc}:${m.id} why`).toBeTruthy();
      }
    }
  });

  test("proper nouns survive translation", () => {
    const plan = generatePlan(CHILD, NOW);
    for (const loc of LOCALES) {
      const all = localizePlan(plan, loc)
        .milestones.map((m) => m.title + m.why)
        .join(" ");
      expect(all).toContain("FAFSA");
    }
  });

  test("dates and structure are untouched by localization", () => {
    const plan = generatePlan(CHILD, NOW);
    const ko = localizePlan(plan, "ko");
    expect(ko.milestones.map((m) => m.id)).toEqual(plan.milestones.map((m) => m.id));
    expect(ko.milestones.map((m) => m.date)).toEqual(plan.milestones.map((m) => m.date));
    expect(ko.inputsHash).toBe(plan.inputsHash);
  });

  test("band labels localize and fall back", () => {
    expect(bandLabel("Not sure yet", "ko")).toBe("아직 모르겠어요");
    expect(bandLabel("Not sure yet", "en")).toBe("Not sure yet");
  });
});

describe("localized counselor note", () => {
  test("deterministic per locale, distinct across locales", () => {
    const plan = generatePlan(CHILD, NOW);
    const v = verdictFor(plan, CHILD, NOW);
    const seen = new Set();
    for (const loc of ["en", ...LOCALES]) {
      const a = counselorNote(CHILD, localizePlan(plan, loc), v, NOW, loc);
      const b = counselorNote(CHILD, localizePlan(plan, loc), v, NOW, loc);
      expect(a).toEqual(b);
      expect(a.paragraphs.length).toBeGreaterThanOrEqual(2);
      seen.add(a.paragraphs.join("|"));
    }
    expect(seen.size).toBe(5); // all five languages produce distinct notes
  });

  test("note packs keep FAFSA in English everywhere", () => {
    for (const loc of ["en", ...LOCALES]) {
      expect(NOTE_PACKS[loc].p3BaseFuture("Maya", 2027)).toContain("FAFSA");
    }
  });
});
