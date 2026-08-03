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

describe("counselor note (bullet summary + deterministic voice)", () => {
  test("same inputs → identical note; bullets + 2 paragraphs", () => {
    const a = noteFor(CHILD);
    const b = noteFor(CHILD);
    expect(a).toEqual(b);
    expect(a.summary.length).toBeGreaterThanOrEqual(3);
    expect(a.summary.length).toBeLessThanOrEqual(4);
    expect(a.paragraphs.length).toBe(2);
  });

  test("summary relieves first, in plain terms", () => {
    const { summary, paragraphs } = noteFor(CHILD);
    expect(summary[0]).toContain("Grade 10");
    expect(summary[1]).toMatch(/On track/);
    expect(paragraphs[0]).toContain("The next turn:");
  });

  test("the money note is woven in for a sophomore", () => {
    const p = noteFor(CHILD).paragraphs[1];
    expect(p).toMatch(/FAFSA|money/i);
  });

  test("needs-attention summary stays calm and specific", () => {
    const early = { ...CHILD, signupDate: "2026-01-01" };
    const plan = generatePlan(early, NOW);
    const v = verdictFor(plan, early, NOW);
    expect(v.status).toBe("needsAttention");
    const { summary } = counselorNote(early, plan, v, NOW);
    expect(summary[1]).toMatch(/came due/);
    expect(summary.join(" ")).not.toMatch(/behind|failing|emergency/i);
  });

  test("different refinements → different note", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    const a = { nickname: "J", gradYear: 2028, state: "CA", zip: "90210", signupDate: "2026-09-10" };
    const b = { ...a, testStatus: "done" };
    const flat = (n) => [...n.summary, ...n.paragraphs].join("|");
    expect(flat(noteFor(a, now))).not.toBe(flat(noteFor(b, now)));
  });
});
