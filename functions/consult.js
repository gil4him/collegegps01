"use strict";
/* consult.js — the pure core of the Ask consultant. No Firebase, no network:
   builds the notebook corpus from data the callable fetched, defines the
   structured-output schema, and validates/whitelists what the model returns
   before anything is written. Unit-tested from the app's vitest suite. */

const { packDocs } = require("./retrieval.js");
const { SAMPLE, STATES } = require("./dataset.js");

const CONSULT_VERSION = "consult-v1";

// ---- band whitelists (must match the app's engines) ----
const PATCH_FIELDS = {
  gpaBand: ["3.7plus", "3.3to3.7", "3.0to3.3", "below3"],
  testStatus: ["notStarted", "registered", "done"],
  incomeBand: ["Under $50k", "$50–75k", "$75–110k", "$110–150k", "$150–200k", "$200k+"],
  budgetBand: ["Under $15k", "$15–30k", "$30–50k", "$50–80k", "$80k+", "Not sure yet"],
  savings529Band: ["None yet", "Under $10k", "$10–50k", "$50k+"],
};
const CHILD_FIELDS = new Set(["gpaBand", "testStatus"]);
const MONEY_FIELDS = new Set(["incomeBand", "budgetBand", "savings529Band"]);

const LANGUAGE_NAME = {
  en: "English",
  ko: "Korean",
  es: "Spanish (Mexico)",
  zh: "Simplified Chinese",
  ja: "Japanese",
};

// ---- system prompt (stable part — cacheable) ----
function systemPrompt(role) {
  const wall =
    role === "student"
      ? "\nThe person asking is a STUDENT. HARD RULE: never reveal, estimate, or discuss any family dollar figure — income, assets, savings, SAI, aid amounts, net prices, budgets. If asked about money, say that's something to look at together with their parent, and redirect to what they can control (academics, activities, essays, deadlines)."
      : "\nThe person asking is a PARENT. You may discuss the family's money picture using the bands and estimates in the notebook.";
  return (
    `You are the family's private college counselor inside College GPS — a calm, warm expert who has already done the thinking. The family's notebook (below) contains their children's roads, progress, money bands, and everything learned from past conversations.

RULES:
- Ground every specific fact (dates, statuses, numbers, school facts) in the notebook or the app reference data. Never invent deadlines, prices, admit rates, or aid figures. If the notebook lacks something, say so plainly.
- Keep proper nouns in English (FAFSA, SAT, PSAT, AP/IB, National Merit, college and state names) regardless of the response language.
- Tone: plain language, direct, never alarmist. Relief first, then direction. Short paragraphs.
- You are educational, not a licensed advisor: frame money topics as planning estimates, never investment advice.
- Alongside your answer, work like a consultant: record NEW facts the parent just told you as memos; convert facts that match a profile field into profilePatches (exact enum values only); leave concrete action items as todos (only when genuinely useful — do not manufacture busywork); and if ONE missing detail would most sharpen your advice, ask for it as a single gentle followUp question. Never ask more than one question. Do not repeat todos that already exist in the notebook's open list, and do not add memos for facts the notebook already records.` +
    wall
  );
}

// ---- structured output schema ----
const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "followUp", "memos", "profilePatches", "todos"],
  properties: {
    answer: { type: "string", description: "The counselor's answer, in the user's language." },
    followUp: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "ONE gentle question to gather a missing detail, or null.",
    },
    memos: {
      type: "array",
      description: "New facts learned from this message, as plain sentences (English).",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "childId"],
        properties: {
          text: { type: "string" },
          childId: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
    },
    profilePatches: {
      type: "array",
      description: "Structured field updates justified by what the user said.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["childId", "field", "value"],
        properties: {
          childId: { anyOf: [{ type: "string" }, { type: "null" }] },
          field: { type: "string", enum: Object.keys(PATCH_FIELDS) },
          value: { type: "string" },
        },
      },
    },
    todos: {
      type: "array",
      description: "Concrete action items for the family.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["childId", "title", "why", "dueDate"],
        properties: {
          childId: { anyOf: [{ type: "string" }, { type: "null" }] },
          title: { type: "string", description: "Short imperative, in the user's language." },
          why: { type: "string", description: "One-line why, in the user's language." },
          dueDate: {
            anyOf: [{ type: "string", format: "date" }, { type: "null" }],
            description: "ISO date if a real deadline applies, else null.",
          },
        },
      },
    },
  },
};

// ---- corpus builder ----
function childBlock(child, plan, verdictish) {
  const lines = [
    `Child: ${child.nickname} (id ${child.id})`,
    `Class of ${child.gradYear} · state ${child.state || "?"} · ZIP ${child.zip || "?"}`,
    `GPA band: ${child.gpaBand || "not shared yet"} · SAT/ACT status: ${child.testStatus || "not shared yet"}`,
    child.claimedByUid ? "Card claimed by the student." : "Parent-managed card.",
  ];
  if (plan && Array.isArray(plan.milestones)) {
    const done = plan.milestones.filter((m) => m.status === "done").length;
    lines.push(`Road: ${plan.milestones.length} stops, ${done} done. Upcoming:`);
    plan.milestones
      .filter((m) => m.status !== "done")
      .slice(0, 8)
      .forEach((m) => lines.push(`  - ${m.date} [${m.category}] ${m.title}`));
  }
  return lines.join("\n");
}

function moneyBlock(profile) {
  if (!profile) return "Money bands: none shared yet.";
  return [
    "Household money bands (parent-only):",
    `  income: ${profile.incomeBand || "not shared"}`,
    `  budget/yr: ${profile.budgetBand || "not shared"}`,
    `  529 savings: ${profile.savings529Band || "not shared"}`,
  ].join("\n");
}

function stateFacts(stateCode) {
  const schools = SAMPLE[stateCode] || [];
  if (!schools.length) return null;
  const rows = schools
    .slice(0, 20)
    .map(
      (s) =>
        `${s.name} (${s.city || "?"}): admit ${s.admit != null ? Math.round(s.admit * 100) + "%" : "?"}, avg net $${s.net ?? "?"}/yr, SAT ${s.sat25 ?? "?"}–${s.sat75 ?? "?"}`
    );
  return `In-state colleges in ${STATES[stateCode] || stateCode} (IPEDS reference data):\n` + rows.join("\n");
}

// buildNotebook(data, question) → the notebook string (cache-stable when it
// fits the budget). Parent sees money; student never does.
function buildNotebook(data, question) {
  const docs = [];
  for (const child of data.children) {
    if (data.role === "student" && data.studentUid && child.claimedByUid !== data.studentUid) continue;
    docs.push({
      id: `child-${child.id}`,
      title: `${child.nickname}'s road`,
      extractedText: childBlock(child, data.plansByChildId[child.id]),
    });
  }
  if (data.role !== "student") {
    docs.push({ id: "money", title: "Money bands", extractedText: moneyBlock(data.profile) });
  }
  if (data.memos.length) {
    docs.push({
      id: "memos",
      title: "Consultant memos (facts learned in past conversations)",
      extractedText: data.memos.map((m) => `- ${m.text}`).join("\n"),
    });
  }
  if (data.openTodos.length) {
    docs.push({
      id: "todos",
      title: "Open to-dos already given",
      extractedText: data.openTodos.map((t) => `- ${t.title}`).join("\n"),
    });
  }
  const states = [...new Set(data.children.map((c) => c.state).filter(Boolean))];
  for (const st of states) {
    const facts = stateFacts(st);
    if (facts) docs.push({ id: `facts-${st}`, title: `Colleges in ${st}`, extractedText: facts });
  }
  const packed = packDocs(docs, question || "", 300000);
  return packed.blocks.join("");
}

// ---- response validation (defense in depth) ----
// Returns a cleaned {memos, patches, todos}; silently drops anything invalid.
function validateEffects(parsed, ctx) {
  const childIds = new Set(ctx.children.map((c) => c.id));
  const memos = (parsed.memos || [])
    .filter((m) => m && typeof m.text === "string" && m.text.trim().length > 2)
    .slice(0, 6)
    .map((m) => ({ text: m.text.trim().slice(0, 500), childId: childIds.has(m.childId) ? m.childId : null }));

  const patches = [];
  for (const p of parsed.profilePatches || []) {
    if (!p || !PATCH_FIELDS[p.field]) continue;
    if (!PATCH_FIELDS[p.field].includes(p.value)) continue;
    if (MONEY_FIELDS.has(p.field)) {
      if (ctx.role === "student") continue; // students never touch money
      patches.push({ target: "profile", field: p.field, value: p.value });
    } else if (CHILD_FIELDS.has(p.field)) {
      if (!childIds.has(p.childId)) continue;
      if (ctx.role === "student" && ctx.studentUid) {
        const child = ctx.children.find((c) => c.id === p.childId);
        if (!child || child.claimedByUid !== ctx.studentUid) continue;
      }
      patches.push({ target: "child", childId: p.childId, field: p.field, value: p.value });
    }
  }

  const todos = (parsed.todos || [])
    .filter((t) => t && typeof t.title === "string" && t.title.trim().length > 2)
    .slice(0, 4)
    .map((t) => ({
      childId: childIds.has(t.childId) ? t.childId : null,
      title: t.title.trim().slice(0, 140),
      why: typeof t.why === "string" ? t.why.trim().slice(0, 300) : "",
      dueDate: typeof t.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : null,
    }));

  return { memos, patches: patches.slice(0, 6), todos };
}

function languageName(locale) {
  return LANGUAGE_NAME[locale] || "English";
}

module.exports = {
  CONSULT_VERSION,
  PATCH_FIELDS,
  RESPONSE_SCHEMA,
  systemPrompt,
  buildNotebook,
  validateEffects,
  languageName,
};
