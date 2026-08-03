import { useAuth } from "./auth/AuthProvider.jsx";
import SignIn from "./auth/SignIn.jsx";
import Home from "./pages/Home.jsx";

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="shell">
        <p className="status status-checking">Loading…</p>
      </main>
    );
  }

  return user ? <Home /> : <SignIn />;
}
