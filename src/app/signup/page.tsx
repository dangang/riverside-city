"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Supabase is not configured. You can still Play now as a guest.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase client unavailable");
      return;
    }
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/play");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Sign up</h1>
        <p>Create an account so your city persists across devices.</p>
        {!configured && (
          <p className="muted">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable
            auth. Guest play works without it.
          </p>
        )}
        <form onSubmit={onSubmit}>
          <input
            className="game-input"
            name="email"
            type="email"
            placeholder="Email"
            required
          />
          <input
            className="game-input"
            name="password"
            type="password"
            placeholder="Password (6+ chars)"
            minLength={6}
            required
          />
          {error && <p style={{ color: "#b03828" }}>{error}</p>}
          <button type="submit" className="game-btn primary full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/login">Already have an account?</Link>
          {" · "}
          <Link href="/play">Play as guest</Link>
        </p>
      </div>
    </main>
  );
}
