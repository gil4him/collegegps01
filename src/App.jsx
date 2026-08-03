import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./lib/firebase.js";

// Placeholder shell for Slice 1. Reads a doc that doesn't exist: with
// deny-all rules a "permission-denied" error still proves the app reached
// the live Firestore backend, so both outcomes count as connected.
export default function App() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    getDoc(doc(db, "healthcheck", "ping"))
      .then(() => setStatus("connected"))
      .catch((err) =>
        setStatus(err.code === "permission-denied" ? "connected" : "error")
      );
  }, []);

  return (
    <main className="shell">
      <h1>College GPS</h1>
      <p className="tagline">You are here. Here&rsquo;s the next turn.</p>
      <p className={`status status-${status}`}>
        {status === "checking" && "Checking connection…"}
        {status === "connected" && "Connected to Firebase (rules active)"}
        {status === "error" && "Could not reach Firebase"}
      </p>
    </main>
  );
}
