import { describe, test, expect } from "vitest";
import { MILESTONE_CALENDAR, milestonesForGrade, currentMilestones } from "./milestoneCalendar.js";
import { getGradeContext, gradeFromGradYear } from "./grade.js";
import { deriveThisWeek } from "./deriveThisWeek.js";

// Frozen clock: engines never read time themselves.
const NOW = new Date("2026-03-15T12:00:00Z");

describe("milestone engine (ported)", () => {
  test("calendar covers grades 9-12", () => {
    expect(MILESTONE_CALENDAR.length).toBe(17);
    expect(milestonesForGrade(9).length).toBe(4);
    expect(milestonesForGrade(11).length).toBe(5);
  });

  test("grade context derives from durable gradYear", () => {
    expect(gradeFromGradYear(2027, NOW)).toBe(11);
    const ctx = getGradeContext(2028, NOW);
    expect(ctx).toMatchObject({ grade: 10, semester: "spring", monthLabel: "Mar", gradYear: 2028 });
  });

  test("currentMilestones picks the in-window items", () => {
    const ids = currentMilestones(getGradeContext(2028, NOW)).map((m) => m.id);
    expect(ids).toEqual(["g10-spike", "g10-ap"]);
  });

  test("deriveThisWeek is deterministic and capped at 3", () => {
    const profile = { gradYear: 2028, state: "CA" };
    const a = deriveThisWeek(profile, [], [], NOW);
    const b = deriveThisWeek(profile, [], [], NOW);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    expect(a.length).toBeLessThanOrEqual(3);
    expect(a[0]).toMatchObject({ id: "ms-g10-spike", kind: "milestone" });
  });
});
