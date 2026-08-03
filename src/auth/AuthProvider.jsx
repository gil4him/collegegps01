import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase.js";

// Auth context: `user` is the Firebase auth user, `profile` is their
// users/{uid} doc ({role, tenantId, householdId}). Live-subscribed so role
// or household changes take effect without a reload.
const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true });

  useEffect(() => {
    let unsubProfile = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (!user) {
        setState({ user: null, profile: null, loading: false });
        return;
      }
      unsubProfile = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => setState({ user, profile: snap.exists() ? snap.data() : null, loading: false }),
        () => setState({ user, profile: null, loading: false })
      );
    });
    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
