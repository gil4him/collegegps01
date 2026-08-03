import { useState } from "react";
import { signIn, signInWithGoogle, signUp, authErrorMessage } from "./account.js";

// The one sign-in screen (brief §3): asks a single thing — Parent or Student —
// plus email/password. Self-serve, no invitation anywhere. Companies and
// counselors go to the mailto link.
export default function SignIn() {
  const [role, setRole] = useState("parent");
  const [mode, setMode] = useState("signup"); // "signup" | "signin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") await signUp(role, email.trim(), password);
      else await signIn(email.trim(), password);
      // AuthProvider picks up the session; App switches views.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle(role);
    } catch (err) {
      setError(authErrorMessage(err)); // null for a closed popup — no error shown
      setBusy(false);
    }
  }

  return (
    <main className="shell shell-narrow">
      <h1>College GPS</h1>
      <p className="tagline">You are here. Here&rsquo;s the next turn.</p>

      <form className="card auth-card" onSubmit={submit}>
        <div className="segmented" role="radiogroup" aria-label="I am a">
          <button
            type="button"
            className={role === "parent" ? "seg seg-active" : "seg"}
            aria-pressed={role === "parent"}
            onClick={() => setRole("parent")}
          >
            Parent
          </button>
          <button
            type="button"
            className={role === "student" ? "seg seg-active" : "seg"}
            aria-pressed={role === "student"}
            onClick={() => setRole("student")}
          >
            Student
          </button>
        </div>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={6}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="primary" type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        <div className="divider" aria-hidden="true">
          <span>or</span>
        </div>

        <button type="button" className="google-btn" onClick={google} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          className="linklike"
          onClick={() => {
            setMode(mode === "signup" ? "signin" : "signup");
            setError(null);
          }}
        >
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create account"}
        </button>
      </form>

      <p className="fineprint">
        Company or counselor?{" "}
        <a href="mailto:zymer4him@gmail.com?subject=College%20GPS%20for%20organizations">
          Contact us →
        </a>
      </p>
    </main>
  );
}
