/**
 * Email + password login / signup. Minimal surface for v1 — magic
 * links and OAuth providers come later.
 */

import { useState, type FormEvent } from "react";
import { supabase } from "../supabase";

type Mode = "signin" | "signup";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo(
          "Account created. Check your email if confirmation is enabled, then sign in."
        );
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-stack-md">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-stack-sm mb-stack-lg">
          <span className="material-symbols-outlined filled text-on-surface text-[28px]">
            grain
          </span>
          <span className="font-mono text-h2 text-on-surface tracking-tight">
            ArchLens
          </span>
        </div>

        <h1 className="text-h1 text-on-surface mb-stack-xs">
          {mode === "signin" ? "Sign in" : "Create an account"}
        </h1>
        <p className="text-body-sm text-on-surface-variant mb-stack-lg">
          {mode === "signin"
            ? "Sign in to review UX-audit issues."
            : "Create an account to start receiving audits."}
        </p>

        <form onSubmit={onSubmit} className="space-y-stack-md">
          <div>
            <label className="block text-mono-label uppercase tracking-widest text-on-surface-variant mb-stack-xs">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-stack-sm py-stack-sm text-body-sm text-on-surface focus:outline-none focus:border-on-surface"
            />
          </div>
          <div>
            <label className="block text-mono-label uppercase tracking-widest text-on-surface-variant mb-stack-xs">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-stack-sm py-stack-sm text-body-sm text-on-surface focus:outline-none focus:border-on-surface"
            />
          </div>

          {error ? (
            <div className="text-body-sm text-status-fail border-l-2 border-status-fail pl-stack-sm">
              {error}
            </div>
          ) : null}
          {info ? (
            <div className="text-body-sm text-on-surface-variant border-l-2 border-status-info pl-stack-sm">
              {info}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary text-on-primary text-body-sm font-bold py-stack-sm rounded hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-stack-md w-full text-body-sm text-on-surface-variant hover:text-on-surface"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
