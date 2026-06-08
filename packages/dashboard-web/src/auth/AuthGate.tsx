/**
 * Renders the LoginPage when there's no Supabase Auth session; renders
 * the children once a user is signed in. Subscribes to auth-state
 * changes so signing in or out reflects immediately.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { LoginPage } from "./LoginPage";
import { Spinner } from "../components/Spinner";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <>{children}</>;
}
