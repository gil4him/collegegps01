import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
} from "firebase/auth";
import { collection, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

// Tenant attribution is silent (brief §3): everyone lands in the default
// tenant until branded-URL routing exists. Never blocks login.
const DEFAULT_TENANT = "default";

// Self-serve signup: create the auth user, then their user doc + a fresh
// household in one batch. No invitation anywhere. Linking a counterpart into
// an existing household is a later, post-login flow.
export async function signUp(role, email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  const householdRef = doc(collection(db, "households"));
  const batch = writeBatch(db);
  batch.set(householdRef, {
    tenantId: DEFAULT_TENANT,
    parentUids: role === "parent" ? [uid] : [],
    studentUids: role === "student" ? [uid] : [],
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, "users", uid), {
    role,
    tenantId: DEFAULT_TENANT,
    householdId: householdRef.id,
    email,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
  return cred.user;
}

export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Google sign-in doubles as signup: if this Google account has no profile
// yet, create the user doc + household exactly like email signup, using the
// role picked on screen. Returning users keep their existing profile — the
// role toggle is ignored for them.
export async function signInWithGoogle(role) {
  const cred = await signInWithPopup(auth, new GoogleAuthProvider());
  const uid = cred.user.uid;
  const existing = await getDoc(doc(db, "users", uid));
  if (!existing.exists()) {
    const householdRef = doc(collection(db, "households"));
    const batch = writeBatch(db);
    batch.set(householdRef, {
      tenantId: DEFAULT_TENANT,
      parentUids: role === "parent" ? [uid] : [],
      studentUids: role === "student" ? [uid] : [],
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, "users", uid), {
      role,
      tenantId: DEFAULT_TENANT,
      householdId: householdRef.id,
      email: cred.user.email,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  }
  return cred.user;
}

export function signOut() {
  return fbSignOut(auth);
}

// Plain-language error messages for the sign-in screen, via the caller's
// translator. Returns null for benign cases (user closed the popup).
export function authErrorMessage(err, t) {
  switch (err && err.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return t("err.popupBlocked");
    case "auth/account-exists-with-different-credential":
      return t("err.accountExists");
    case "auth/invalid-email":
      return t("err.invalidEmail");
    case "auth/email-already-in-use":
      return t("err.emailInUse");
    case "auth/weak-password":
      return t("err.weakPassword");
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return t("err.badCredentials");
    case "auth/too-many-requests":
      return t("err.tooMany");
    case "auth/operation-not-allowed":
      return t("err.notEnabled");
    default:
      return t("err.generic");
  }
}
