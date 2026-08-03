import {
  arrayUnion,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase.js";

// Human-friendly claim code: 6 chars, no ambiguous glyphs (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateClaimCode() {
  let code = "";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return code;
}

// Parent side: mint an invitation for this child's card.
export async function createClaimCode(child, tenantId) {
  const code = generateClaimCode();
  await setDoc(doc(db, "claimCodes", code), {
    householdId: child.householdId,
    childId: child.id,
    tenantId,
    createdAt: serverTimestamp(),
  });
  return code;
}

// Student side: redeem a code. Order matters for the rules chain:
// claims/{uid} names the code FIRST, then the household append is validated
// against it, then membership unlocks the child + own-profile updates.
// All parent-entered data is preserved — claiming only links, never resets.
export async function claimWithCode(rawCode, uid) {
  const code = rawCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const snap = await getDoc(doc(db, "claimCodes", code));
  if (!snap.exists()) throw new Error("code-not-found");
  const { householdId, childId, usedByUid } = snap.data();
  if (usedByUid) throw new Error("code-used");

  await setDoc(doc(db, "claims", uid), { code, householdId, childId });
  await updateDoc(doc(db, "households", householdId), {
    studentUids: arrayUnion(uid),
  });
  // Stamp the code used (rules allow this exactly once) so it can't link a
  // second account later.
  await updateDoc(doc(db, "claimCodes", code), { usedByUid: uid });
  await updateDoc(doc(db, "children", childId), { claimedByUid: uid });
  await updateDoc(doc(db, "users", uid), { householdId });
  return { householdId, childId };
}
