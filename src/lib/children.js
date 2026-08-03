import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
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

export function subscribeChildren(householdId, cb) {
  const q = query(collection(db, "children"), where("householdId", "==", householdId));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribePlans(householdId, cb) {
  const q = query(collection(db, "plans"), where("householdId", "==", householdId));
  return onSnapshot(q, (snap) => {
    const byChildId = {};
    snap.docs.forEach((d) => (byChildId[d.id] = d.data()));
    cb(byChildId);
  });
}
