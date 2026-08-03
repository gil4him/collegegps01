import { useState } from "react";
import { signIn, signUp, authErrorMessage } from "./account.js";

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
