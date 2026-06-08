/**
 * App chrome: top bar with the ArchLens mark, a centered title slot,
 * and a sign-out menu on the right. Same visual language as the
 * statik-frontend so the two surfaces feel like one product.
 */

import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "../supabase";

export function Icon({
  name,
  className = "",
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  const fillCls = filled ? "filled" : "";
  return (
    <span className={`material-symbols-outlined ${fillCls} ${className}`}>
      {name}
    </span>
  );
}

export function Layout({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-outline-variant bg-surface">
        <div className="max-w-container-max mx-auto px-margin-page h-[56px] flex items-center justify-between">
          <div className="flex items-center gap-stack-sm">
            <Icon
              name="grain"
              filled
              className="text-on-surface text-[20px]"
            />
            <span className="font-mono text-data-point text-on-surface tracking-tight">
              ArchLens · Dashboard
            </span>
          </div>
          <div className="flex items-center gap-stack-md">
            {email ? (
              <span className="text-mono-label text-on-surface-variant hidden sm:inline">
                {email}
              </span>
            ) : null}
            <button
              onClick={() => void supabase.auth.signOut()}
              className="text-mono-label uppercase tracking-widest text-on-surface-variant hover:text-on-surface"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-container-max mx-auto px-margin-page py-stack-lg">
        {(title || right) && (
          <div className="mb-stack-lg pb-stack-md border-b-2 border-on-surface">
            <div className="flex items-end justify-between gap-stack-md">
              <div>
                {title ? (
                  <h1 className="text-h1 text-on-surface tracking-tight font-extrabold">
                    {title}
                  </h1>
                ) : null}
                {subtitle ? (
                  <p className="text-body-sm text-on-surface-variant mt-stack-xs">
                    {subtitle}
                  </p>
                ) : null}
              </div>
              {right ? <div>{right}</div> : null}
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
