import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase.js";
import { gradYearFromGrade } from "../engines/milestones/grade.js";
import { zipToState, resolveDistrict } from "../engines/districts/zipState.js";
import { generatePlan } from "../engines/verdict/verdict.js";

// Add a child from the two onboarding questions (grade + ZIP) and generate
// their plan in the same batch — the card must be live the moment the
// dashboard renders. Grade is stored as the durable gradYear; state derives
// from ZIP (district resolution is opportunistic and never blocks).
export async function addChild({ nickname, grade, zip }, householdId, tenantId, now) {
  const state = zipToState(zip);
  const district = resolveDistrict(zip);
  const childRef = doc(collection(db, "children"));
  const child = {
    householdId,
    tenantId,
    nickname: nickname.trim(),
    gradYear: gradYearFromGrade(Number(grade), now),
    zip: String(zip).trim(),
    state,
    districtId: district.districtId,
    signupDate: now.toISOString().slice(0, 10),
  };
  const plan = generatePlan(child, now);
  const batch = writeBatch(db);
  batch.set(childRef, { ...child, createdAt: serverTimestamp() });
  batch.set(doc(db, "plans", childRef.id), {
    householdId,
    tenantId,
    ...plan,
    generatedAt: serverTimestamp(),
  });
  await batch.commit();
  return childRef.id;
}

// A Firestore listener that errors (e.g. a transient permission race right
// after signup) is dead — it never retries on its own. Wrap with a retry so
// the dashboard can't be stranded on "Loading…".
function subscribeWithRetry(q, onData) {
  let unsub = null;
  let timer = null;
  let cancelled = false;
  const start = () => {
    unsub = onSnapshot(q, onData, (err) => {
      console.warn("listener error, retrying:", err.code);
      if (!cancelled) timer = setTimeout(start, 1500);
    });
  };
  start();
  return () => {
    cancelled = true;
    if (unsub) unsub();
    if (timer) clearTimeout(timer);
  };
}

function regeneratedPlanFor(child, oldPlan, now) {
  const plan = generatePlan(child, now);
  const doneIds = new Set(
    (oldPlan?.milestones || []).filter((m) => m.status === "done").map((m) => m.id)
  );
  plan.milestones = plan.milestones.map((m) =>
    doneIds.has(m.id) ? { ...m, status: "done" } : m
  );
  return plan;
}

// A "sharpen this" answer changed the child's inputs: save the patch and
// regenerate the plan in one batch, preserving any done marks by milestone
// id. Deterministic: inputsHash changes, milestones re-derive.
export async function updateChildInputs(child, oldPlan, patch, now) {
  const plan = regeneratedPlanFor({ ...child, ...patch }, oldPlan, now);
  const batch = writeBatch(db);
  batch.update(doc(db, "children", child.id), patch);
  batch.update(doc(db, "plans", child.id), { ...plan, generatedAt: serverTimestamp() });
  await batch.commit();
}

// The child's inputs changed OUTSIDE the sharpen flow (e.g. the Ask
// consultant patched a band server-side): bring the stored plan back in
// sync. Plan-only write; done marks preserved.
export async function regeneratePlan(child, oldPlan, now) {
  const plan = regeneratedPlanFor(child, oldPlan, now);
  await updateDoc(doc(db, "plans", child.id), { ...plan, generatedAt: serverTimestamp() });
}

// Mark a stop done (or not) on the stored plan.
export async function setMilestoneStatus(childId, plan, milestoneId, status) {
  const milestones = plan.milestones.map((m) =>
    m.id === milestoneId ? { ...m, status } : m
  );
  await updateDoc(doc(db, "plans", childId), { milestones });
}

export function subscribeChildren(householdId, cb) {
  const q = query(collection(db, "children"), where("householdId", "==", householdId));
  return subscribeWithRetry(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribePlans(householdId, cb) {
  const q = query(collection(db, "plans"), where("householdId", "==", householdId));
  return subscribeWithRetry(q, (snap) => {
    const byChildId = {};
    snap.docs.forEach((d) => (byChildId[d.id] = d.data()));
    cb(byChildId);
  });
}
