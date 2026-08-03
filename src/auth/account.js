import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
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

export function signOut() {
  return fbSignOut(auth);
}

// Plain-language error messages for the sign-in screen.
export function authErrorMessage(err) {
  switch (err && err.code) {
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/email-already-in-use":
      return "There's already an account with this email — try signing in instead.";
    case "auth/weak-password":
      return "Please use a password of at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password didn't match. If you're new, choose “Create account.”";
    case "auth/too-many-requests":
      return "Too many tries — wait a minute and try again.";
    case "auth/operation-not-allowed":
      return "Email sign-in isn't switched on for this project yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}
