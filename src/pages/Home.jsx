import { useAuth } from "../auth/AuthProvider.jsx";
import { signOut } from "../auth/account.js";

// Placeholder home. Slice 4 replaces this with the household dashboard:
// one card per child, verdict + One Next Thing.
export default function Home() {
  const { user, profile } = useAuth();

  return (
    <main className="shell">
      <header className="topbar">
        <span className="wordmark">College GPS</span>
        <button className="linklike" onClick={signOut}>
          Sign out
        </button>
      </header>

      <h1>Welcome{profile?.role === "parent" ? "" : ", student"}</h1>
      <p className="tagline">
        Signed in as {user?.email} ({profile?.role ?? "…"})
      </p>
      <p className="status status-checking">
        Your dashboard arrives in the next slice — &ldquo;Add your child&rdquo; starts here.
      </p>
    </main>
  );
}
