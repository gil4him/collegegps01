import { describe, test, expect } from "vitest";
import {
  buildNotebook,
  validateEffects,
  systemPrompt,
  RESPONSE_SCHEMA,
  PATCH_FIELDS,
} from "../../functions/consult.js";
import { packDocs, rankDocs } from "../../functions/retrieval.js";

const CHILDREN = [
  { id: "c1", nickname: "Maya", gradYear: 2029, state: "CA", zip: "90210", claimedByUid: "stu1" },
  { id: "c2", nickname: "Eli", gradYear: 2027, state: "CA", zip: "90210" },
];
const DATA = {
  children: CHILDREN,
  plansByChildId: {
    c1: { milestones: [{ date: "2027-01-01", category: "financial", title: "FAFSA base year begins", status: "upcoming" }] },
  },
  profile: { incomeBand: "$75–110k", budgetBand: "$30–50k" },
  memos: [{ text: "Maya is interested in engineering." }],
  openTodos: [{ title: "Visit UCLA" }],
  role: "parent",
  studentUid: null,
};

describe("consultant notebook (server core, pure)", () => {
  test("parent notebook includes children, money, memos, and state facts", () => {
    const nb = buildNotebook(DATA, "is maya behind?");
    expect(nb).toContain("Maya");
    expect(nb).toContain("Money bands");
    expect(nb).toContain("interested in engineering");
    expect(nb).toContain("California");
    expect(nb).toContain("FAFSA base year");
  });

  test("student notebook: no money block, only the claimed child", () => {
    const nb = buildNotebook({ ...DATA, role: "student", studentUid: "stu1" }, "q");
    expect(nb).not.toContain("Money bands");
    expect(nb).not.toContain("income:");
    expect(nb).toContain("Maya");
    expect(nb).not.toContain("Eli's road");
  });

  test("deterministic for identical inputs", () => {
    expect(buildNotebook(DATA, "q")).toBe(buildNotebook(DATA, "q"));
  });
});

describe("effect validation (whitelist, wall, caps)", () => {
  const ctx = { children: CHILDREN, role: "parent", studentUid: null };

  test("valid patches pass; invalid values and unknown children drop", () => {
    const v = validateEffects(
      {
        profilePatches: [
          { childId: "c1", field: "gpaBand", value: "3.3to3.7" },
          { childId: "c1", field: "gpaBand", value: "A+" },
          { childId: "cX", field: "testStatus", value: "done" },
          { childId: null, field: "budgetBand", value: "$30–50k" },
          { childId: null, field: "budgetBand", value: "$1M" },
        ],
        memos: [],
        todos: [],
      },
      ctx
    );
    expect(v.patches).toEqual([
      { target: "child", childId: "c1", field: "gpaBand", value: "3.3to3.7" },
      { target: "profile", field: "budgetBand", value: "$30–50k" },
    ]);
  });

  test("students can never patch money fields or other children", () => {
    const v = validateEffects(
      {
        profilePatches: [
          { childId: null, field: "incomeBand", value: "$200k+" },
          { childId: "c2", field: "gpaBand", value: "3.7plus" },
          { childId: "c1", field: "testStatus", value: "done" },
        ],
        memos: [],
        todos: [],
      },
      { children: CHILDREN, role: "student", studentUid: "stu1" }
    );
    expect(v.patches).toEqual([{ target: "child", childId: "c1", field: "testStatus", value: "done" }]);
  });

  test("todos are capped, trimmed, and date-validated", () => {
    const v = validateEffects(
      {
        memos: [],
        profilePatches: [],
        todos: [
          { childId: "c1", title: "Register for the PSAT", why: "October window", dueDate: "2026-09-15" },
          { childId: "cX", title: "Bad child ok as household", why: "", dueDate: "soon" },
          { childId: null, title: "x", why: "", dueDate: null },
        ],
      },
      ctx
    );
    expect(v.todos.length).toBe(2);
    expect(v.todos[0].dueDate).toBe("2026-09-15");
    expect(v.todos[1].childId).toBeNull();
    expect(v.todos[1].dueDate).toBeNull();
  });

  test("student prompt carries the money wall; schema fields align with whitelists", () => {
    expect(systemPrompt("student")).toMatch(/never reveal/i);
    expect(systemPrompt("parent")).not.toMatch(/never reveal/i);
    expect(RESPONSE_SCHEMA.properties.profilePatches.items.properties.field.enum).toEqual(
      Object.keys(PATCH_FIELDS)
    );
  });
});

describe("retrieval layer (ported, pure)", () => {
  test("packDocs is stable in the fits case and ranks on overflow", () => {
    const docs = [
      { id: "a", title: "PSAT dates", extractedText: "The PSAT is in October. ".repeat(10) },
      { id: "b", title: "Lunch menu", extractedText: "Pizza on Fridays. ".repeat(10) },
    ];
    const fits = packDocs(docs, "psat", 100000);
    expect(fits.truncated).toBe(false);
    expect(fits.blocks.length).toBe(2);
    const ranked = rankDocs(docs, "when is the PSAT test");
    expect(ranked[0].id).toBe("a");
  });
});
