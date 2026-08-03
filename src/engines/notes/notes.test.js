import { describe, test, expect } from "vitest";
import { counselorNote } from "./notes.js";
import { generatePlan, verdictFor } from "../verdict/verdict.js";

const NOW = new Date("2026-03-15T12:00:00Z");
const CHILD = { nickname: "Maya", gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-03-15" };

function noteFor(child, now = NOW) {
  const plan = generatePlan(child, now);
  const v = verdictFor(plan, child, now);
  return counselorNote(child, plan, v, now);
}

describe("counselor note (deterministic voice)", () => {
  test("same inputs → identical note, 2–3 paragraphs", () => {
    const a = noteFor(CHILD);
    const b = noteFor(CHILD);
    expect(a).toEqual(b);
    expect(a.paragraphs.length).toBeGreaterThanOrEqual(2);
    expect(a.paragraphs.length).toBeLessThanOrEqual(3);
  });

  test("on-track note relieves first, then directs", () => {
    const [p1, p2] = noteFor(CHILD).paragraphs;
    expect(p1).toContain("on track");
    expect(p1).toContain("tenth grade");
    expect(p2).toContain("The next turn:");
  });

  test("the money note is woven in for a sophomore", () => {
    const p3 = noteFor(CHILD).paragraphs[2];
    expect(p3).toMatch(/FAFSA|money/i);
  });

  test("needs-attention note stays calm and specific", () => {
    const early = { ...CHILD, signupDate: "2026-01-01" };
    const plan = generatePlan(early, NOW);
    const v = verdictFor(plan, early, NOW);
    expect(v.status).toBe("needsAttention");
    const [p1] = counselorNote(early, plan, v, NOW).paragraphs;
    expect(p1).toMatch(/come due/);
    expect(p1).not.toMatch(/behind|failing|emergency/i);
  });

  test("different refinements → different note", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const a = { nickname: "J", gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-09-10" };
    const b = { ...a, testStatus: "done" };
    expect(noteFor(a, now).paragraphs.join()).not.toBe(noteFor(b, now).paragraphs.join());
  });
});
