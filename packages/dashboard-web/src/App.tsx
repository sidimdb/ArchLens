/**
 * Top-level app: auth gate around a tiny state-based router.
 *
 * Two views for v1 — Inbox and IssueDetail. We use a `useState` rather
 * than react-router because the surface is small. If we add more
 * pages we'll bring in a proper router; today this is enough.
 */

import { useState } from "react";
import { AuthGate } from "./auth/AuthGate";
import { Inbox } from "./routes/Inbox";
import { IssueDetail } from "./routes/IssueDetail";

type View =
  | { kind: "inbox" }
  | { kind: "issue"; id: string };

export function App() {
  const [view, setView] = useState<View>({ kind: "inbox" });

  return (
    <AuthGate>
      {view.kind === "inbox" ? (
        <Inbox onOpen={(id) => setView({ kind: "issue", id })} />
      ) : (
        <IssueDetail
          id={view.id}
          onBack={() => setView({ kind: "inbox" })}
        />
      )}
    </AuthGate>
  );
}
