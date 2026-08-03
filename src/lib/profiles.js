import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

// profiles/{householdId} — the household money picture, bands only
// (incomeBand, budgetBand, savings529Band). Shared across all children;
// all fields optional forever.
export function subscribeMoneyProfile(householdId, cb) {
  return onSnapshot(
    doc(db, "profiles", householdId),
    (snap) => cb(snap.exists() ? snap.data() : null),
    () => cb(null)
  );
}

export function updateMoneyProfile(householdId, tenantId, patch) {
  return setDoc(
    doc(db, "profiles", householdId),
    { tenantId, ...patch },
    { merge: true }
  );
}
