import { getFunctions, httpsCallable } from "firebase/functions";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { app, db } from "./firebase.js";

const functions = getFunctions(app, "us-central1");
const askConsultCallable = httpsCallable(functions, "askConsult", { timeout: 65000 });

// One call: answer + memos + patches + todos, all applied server-side.
// The thread subscription picks up both new messages; todos/children/profile
// subscriptions pick up the consultant's effects.
export async function askConsult({ question, childId, locale }) {
  const res = await askConsultCallable({ question, childId: childId || null, locale });
  return res.data;
}

export function subscribeAskThread(householdId, uid, cb) {
  const q = query(
    collection(db, "households", householdId, "ask_chats", uid, "messages"),
    orderBy("createdAt")
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([])
  );
}

export function subscribeTodos(householdId, cb) {
  const q = query(collection(db, "todos"), where("householdId", "==", householdId));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      ),
    () => cb([])
  );
}

export function setTodoStatus(todoId, status) {
  return updateDoc(doc(db, "todos", todoId), { status });
}
