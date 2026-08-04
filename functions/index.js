"use strict";
/* askConsult — the Ask bubble's backend. One call: answers the question,
   records memos, applies whitelisted profile patches, files consultant
   to-dos, and appends both turns to the caller's private thread.
   Pattern ported from collegeapp01's askChat (prompt-cached notebook,
   per-user threads, entitlement caps); the consultant extraction loop is
   new. API key: Firebase secret ANTHROPIC_API_KEY. */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const Anthropic = require("@anthropic-ai/sdk");
const ent = require("./entitlements.js");
const consult = require("./consult.js");

setGlobalOptions({ region: "us-central1", maxInstances: 5 });
initializeApp();
const db = getFirestore();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const MODEL_BY_TIER = { standard: "claude-sonnet-5", priority: "claude-sonnet-5" };
const MAX_QUESTION_CHARS = 2000;
const HISTORY_TURNS = 10;

exports.askConsult = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, cors: true },
  async (request) => {
    const uid = request.auth && request.auth.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in first.");
    const question = String(request.data?.question || "").trim().slice(0, MAX_QUESTION_CHARS);
    if (!question) throw new HttpsError("invalid-argument", "Empty question.");
    const locale = ["en", "ko", "es", "zh", "ja"].includes(request.data?.locale)
      ? request.data.locale
      : "en";
    const focusChildId = typeof request.data?.childId === "string" ? request.data.childId : null;

    // ---- membership + role ----
    const userSnap = await db.doc(`users/${uid}`).get();
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "No profile.");
    const { role, householdId, tenantId } = userSnap.data();
    if (!householdId) throw new HttpsError("failed-precondition", "No household.");
    const hhSnap = await db.doc(`households/${householdId}`).get();
    const hh = hhSnap.exists ? hhSnap.data() : {};
    const isMember =
      (hh.parentUids || []).includes(uid) || (hh.studentUids || []).includes(uid);
    if (!isMember) throw new HttpsError("permission-denied", "Not a household member.");

    // ---- entitlements: daily fuse always on; monthly counted (soft launch) ----
    const tier = ent.tierOf(hh);
    const limits = ent.LIMITS[tier];
    const today = new Date().toISOString().slice(0, 10);
    const chatRef = db.doc(`households/${householdId}/ask_chats/${uid}`);
    const chatSnap = await chatRef.get();
    const counter = chatSnap.exists ? chatSnap.data() : {};
    const dayCount = counter.day === today ? counter.count || 0 : 0;
    if (dayCount >= limits.aiMessagesPerDay) {
      throw new HttpsError("resource-exhausted", "daily-limit");
    }
    const month = today.slice(0, 7);
    const usageRef = db.doc(`households/${householdId}/usage/${month}`);

    // ---- corpus ----
    const [childrenSnap, plansSnap, profileSnap, memosSnap, todosSnap, historySnap] =
      await Promise.all([
        db.collection("children").where("householdId", "==", householdId).get(),
        db.collection("plans").where("householdId", "==", householdId).get(),
        db.doc(`profiles/${householdId}`).get(),
        db.collection(`households/${householdId}/memos`).orderBy("createdAt", "desc").limit(40).get(),
        db.collection("todos").where("householdId", "==", householdId).where("status", "==", "open").limit(20).get(),
        chatRef.collection("messages").orderBy("createdAt", "desc").limit(HISTORY_TURNS).get(),
      ]);
    const children = childrenSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const plansByChildId = {};
    plansSnap.docs.forEach((d) => (plansByChildId[d.id] = d.data()));
    const memos = memosSnap.docs.map((d) => d.data());
    const openTodos = todosSnap.docs.map((d) => d.data());
    const history = historySnap.docs
      .map((d) => d.data())
      .reverse()
      .map((m) => `${m.role === "user" ? "User" : "Consultant"}: ${m.text}`)
      .join("\n");

    const notebook = consult.buildNotebook(
      { children, plansByChildId, profile: profileSnap.exists ? profileSnap.data() : null, memos, openTodos, role, studentUid: role === "student" ? uid : null },
      question
    );

    const focusChild = children.find((c) => c.id === focusChildId);
    const perQuestion = [
      focusChild ? `CURRENTLY VIEWING: ${focusChild.nickname}'s card (id ${focusChild.id}).` : "",
      history ? `RECENT CONVERSATION:\n${history}` : "",
      `Respond in ${consult.languageName(locale)}. Today's date: ${today}.`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // ---- model call (structured output; notebook block prompt-cached) ----
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value(), timeout: 45000, maxRetries: 0 });
    let response;
    try {
      response = await anthropic.messages.create({
        model: MODEL_BY_TIER[limits.modelTier] || MODEL_BY_TIER.standard,
        max_tokens: 1500,
        thinking: { type: "disabled" },
        system: [
          { type: "text", text: consult.systemPrompt(role) },
          {
            type: "text",
            text: "THE NOTEBOOK:\n\n" + notebook,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: perQuestion },
        ],
        output_config: { format: { type: "json_schema", schema: consult.RESPONSE_SCHEMA } },
        messages: [{ role: "user", content: question }],
      });
    } catch (err) {
      if (err && err.status === 401) return { ok: false, reason: "unconfigured" };
      console.error("anthropic error", err && err.message);
      throw new HttpsError("unavailable", "model-error");
    }
    if (response.stop_reason === "refusal") {
      return { ok: false, reason: "refused" };
    }
    const raw = response.content.find((b) => b.type === "text")?.text || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { answer: raw, followUp: null, memos: [], profilePatches: [], todos: [] };
    }
    const effects = consult.validateEffects(parsed, {
      children,
      role,
      studentUid: role === "student" ? uid : null,
      focusChildId,
    });
    const answerText =
      (parsed.answer || "").trim() +
      (parsed.followUp && typeof parsed.followUp === "string" ? `\n\n${parsed.followUp.trim()}` : "");

    // ---- apply everything in one batch ----
    const batch = db.batch();
    const now = FieldValue.serverTimestamp();
    const msgCol = chatRef.collection("messages");
    batch.set(msgCol.doc(), { role: "user", text: question, childId: focusChildId, createdAt: now });
    batch.set(msgCol.doc(), {
      role: "assistant",
      text: answerText,
      childId: focusChildId,
      todosAdded: effects.todos.length,
      createdAt: FieldValue.serverTimestamp(),
    });
    for (const m of effects.memos) {
      batch.set(db.collection(`households/${householdId}/memos`).doc(), {
        ...m,
        source: "ask",
        byUid: uid,
        createdAt: now,
      });
    }
    for (const p of effects.patches) {
      if (p.target === "child") {
        batch.update(db.doc(`children/${p.childId}`), { [p.field]: p.value });
      } else {
        batch.set(db.doc(`profiles/${householdId}`), { tenantId: tenantId || "default", [p.field]: p.value }, { merge: true });
      }
    }
    for (const t of effects.todos) {
      batch.set(db.collection("todos").doc(), {
        ...t,
        householdId,
        tenantId: tenantId || "default",
        status: "open",
        source: "ask",
        createdAt: now,
      });
    }
    batch.set(chatRef, { day: today, count: dayCount + 1, lastAskedAt: now }, { merge: true });
    batch.set(usageRef, { aiMessages: FieldValue.increment(1) }, { merge: true });
    await batch.commit();

    return {
      ok: true,
      todosAdded: effects.todos.length,
      patchesApplied: effects.patches.length,
      cacheRead: response.usage?.cache_read_input_tokens || 0,
    };
  }
);
