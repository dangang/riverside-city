"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!configured) {
      setError("Supabase is not configured. Play as guest instead.");
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
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
        <h1>Sign in</h1>
        <p>Welcome back to your city.</p>
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
            placeholder="Password"
            required
          />
          {error && <p style={{ color: "#b03828" }}>{error}</p>}
          <button type="submit" className="game-btn primary full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/signup">Create account</Link>
          {" · "}
          <Link href="/play">Play as guest</Link>
        </p>
      </div>
    </main>
  );
}
