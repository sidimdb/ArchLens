import React, { useState, useEffect } from 'react';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') return 'light';
    return document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('archlens-theme', theme);
    } catch (e) {}
  }, [theme]);
  return [theme, setTheme];
}

function Icon({ name, className = '', filled = false }) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
    >
      {name}
    </span>
  );
}

export default function Layout({ activeView, onNavigate, hasReport, pageTitle, children }) {
  const [theme, setTheme] = useTheme();
  const NAV = [
    { key: 'upload', label: 'Home', icon: 'home' },
    { key: 'report', label: 'Report', icon: 'assessment', disabled: !hasReport },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-56 bg-surface-container-low border-r border-outline-variant z-40 hidden md:flex flex-col">
        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-outline-variant">
          <div className="leading-tight">
            <div className="text-body-lg font-black tracking-tight text-on-surface">
              ArchLens
            </div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
              v1.0.0
            </div>
          </div>
        </div>

        {/* Section label */}
        <div className="px-5 pt-4 pb-1.5">
          <span className="text-[9px] uppercase tracking-[0.2em] text-outline font-bold">
            Workspace
          </span>
        </div>

        {/* Nav */}
        <nav className="px-3 space-y-0.5">
          {NAV.map((item) => {
            const active = item.key === activeView;
            const disabled = item.disabled;
            return (
              <button
                key={item.key}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && onNavigate?.(item.key)}
                className={
                  'group w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-left relative ' +
                  (active
                    ? 'bg-surface-container-high text-on-surface'
                    : disabled
                    ? 'text-outline-variant cursor-not-allowed'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container')
                }
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-on-surface rounded-r" />
                )}
                <Icon
                  name={item.icon}
                  className={
                    'text-base ' +
                    (active
                      ? 'text-on-surface'
                      : disabled
                      ? 'text-outline-variant'
                      : 'text-outline group-hover:text-on-surface')
                  }
                />
                <span
                  className={
                    'text-body-sm ' + (active ? 'font-bold' : 'font-medium')
                  }
                >
                  {item.label}
                </span>
                {item.key === 'report' && hasReport && !active && (
                  <span className="ml-auto w-1.5 h-1.5 bg-status-pass rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA */}
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => onNavigate?.('upload')}
            className="w-full bg-on-surface text-surface font-bold py-2 rounded-md text-body-sm hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <Icon name="add" className="text-base" />
            New Analysis
          </button>
        </div>

        {/* Footer: theme toggle */}
        <div className="px-3 py-3 border-t border-outline-variant flex items-center justify-between gap-2">
          <span className="pl-2 text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">
            Mode
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="relative inline-flex items-center w-14 h-7 rounded-full bg-surface-container border border-outline-variant hover:border-outline transition-colors group"
          >
            {/* Sliding knob */}
            <span
              className={
                'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-on-surface flex items-center justify-center shadow-sm transition-transform duration-300 ease-out ' +
                (theme === 'dark' ? 'translate-x-7' : 'translate-x-0')
              }
            >
              <Icon
                name={theme === 'dark' ? 'dark_mode' : 'light_mode'}
                className="text-[14px] text-surface"
                filled
              />
            </span>
            {/* Background icons (the "off" sides) */}
            <span
              className={
                'absolute left-1.5 transition-opacity duration-200 ' +
                (theme === 'dark' ? 'opacity-100' : 'opacity-0')
              }
            >
              <Icon
                name="light_mode"
                className="text-[12px] text-on-surface-variant"
              />
            </span>
            <span
              className={
                'absolute right-1.5 transition-opacity duration-200 ' +
                (theme === 'light' ? 'opacity-100' : 'opacity-0')
              }
            >
              <Icon
                name="dark_mode"
                className="text-[12px] text-on-surface-variant"
              />
            </span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="md:pl-56 min-h-screen">{children}</main>
    </div>
  );
}

export { Icon };
