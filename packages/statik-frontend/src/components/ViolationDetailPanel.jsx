import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Layout.jsx';

const SEV_COLORS = {
  critical: { dot: 'bg-status-fail shadow-[0_0_8px_#DC2626]', label: 'Critical Violation' },
  major: { dot: 'bg-status-fail shadow-[0_0_6px_#DC2626]', label: 'Major Violation' },
  minor: { dot: 'bg-status-warn shadow-[0_0_8px_rgba(245,158,11,0.5)]', label: 'Minor Violation' },
};

// In-memory cache: closing and reopening the same violation in one
// session shouldn't burn a second API call. Keyed by ruleId + file +
// line + message so each unique violation gets a stable cache entry.
const suggestionCache = new Map();

function cacheKey(ruleId, violation) {
  return ruleId + '|' + violation.file + '|' + (violation.line ?? '') + '|' + violation.message;
}

export default function ViolationDetailPanel({ rule, violation, onClose, projectName }) {
  // AI suggestion lazy-loading state
  const cached = suggestionCache.get(cacheKey(rule.ruleId, violation));
  const [aiSuggestion, setAiSuggestion] = useState(cached?.suggestion ?? null);
  const [aiLoading, setAiLoading] = useState(!cached);
  const [aiError, setAiError] = useState(cached?.error ?? null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    // Lock background scroll while the panel is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Fetch the AI suggestion on mount if it's not already cached.
  useEffect(() => {
    const key = cacheKey(rule.ruleId, violation);
    if (suggestionCache.has(key)) return; // already populated

    let alive = true;
    setAiLoading(true);
    setAiError(null);

    fetch('/violations/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: projectName || 'Untitled project',
        ruleId: rule.ruleId,
        ruleName: rule.name,
        ruleDescription: rule.description,
        violation: {
          file: violation.file,
          line: violation.line,
          severity: violation.severity,
          message: violation.message,
        },
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Request failed (' + res.status + ')');
        }
        return res.json();
      })
      .then((data) => {
        if (!alive) return;
        const suggestion = (data && data.suggestion) || '';
        suggestionCache.set(key, { suggestion });
        setAiSuggestion(suggestion);
        setAiLoading(false);
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err?.message || 'AI suggestion unavailable.';
        suggestionCache.set(key, { error: msg });
        setAiError(msg);
        setAiLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [rule.ruleId, rule.name, rule.description, violation.file, violation.line, violation.severity, violation.message, projectName]);

  const sev = SEV_COLORS[violation.severity] || SEV_COLORS.minor;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-surface border-l border-neutral-800 h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-8 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-3 h-3 rounded-full ${sev.dot}`} />
              <span className="text-mono-label uppercase tracking-[0.2em] text-on-surface-variant">
                {sev.label}
              </span>
            </div>
            <h2 className="text-h1 text-on-surface mb-1 leading-tight truncate">
              {rule.name}
            </h2>
            <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
              <Icon name="description" className="text-[14px]" />
              <span className="truncate">{violation.file}</span>
              {violation.line ? (
                <span className="text-on-surface-variant whitespace-nowrap">
                  Line {violation.line}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-surface-container-highest transition-colors rounded-full text-on-surface-variant flex-shrink-0"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          {/* Violation Message */}
          <section>
            <h3 className="text-mono-label uppercase tracking-widest text-outline mb-3">
              Violation Message
            </h3>
            <div className="bg-surface-container p-5 border border-outline-variant">
              <p className="text-body-lg text-on-surface leading-relaxed">
                {violation.message}
              </p>
            </div>
          </section>

          {/* Rule Context */}
          <section>
            <h3 className="text-mono-label uppercase tracking-widest text-outline mb-3">
              Rule Description
            </h3>
            <div className="bg-surface-container-lowest border border-outline-variant rounded p-4">
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {rule.description}
              </p>
              {rule.explanation && (
                <p className="text-body-sm text-on-surface-variant leading-relaxed mt-3 pt-3 border-t border-outline-variant/50">
                  {rule.explanation}
                </p>
              )}
            </div>
          </section>

          {/* AI Suggestion — fetched lazily when this panel opens.
              Falls back to a deterministic hand-written hint while
              loading and if the API call fails. */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="auto_awesome" className="text-primary-fixed-dim" filled />
              <h3 className="text-mono-label uppercase tracking-widest text-primary-fixed-dim">
                Suggested Fix
              </h3>
              {aiLoading && (
                <span className="text-mono-label text-on-surface-variant italic">
                  · generating…
                </span>
              )}
            </div>
            <div className="bg-surface-container border border-primary-fixed-dim/30 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed-dim/50" />

              {aiLoading ? (
                <p className="text-body-sm text-on-surface-variant leading-relaxed italic">
                  Claude is reading this violation and writing a fix suggestion…
                </p>
              ) : aiSuggestion ? (
                <p className="text-body-sm text-on-surface leading-relaxed italic">
                  {aiSuggestion}
                </p>
              ) : (
                <>
                  <p className="text-body-sm text-on-surface leading-relaxed italic">
                    {violation.suggestion || defaultSuggestion(rule.ruleId, violation)}
                  </p>
                  {aiError && (
                    <p className="text-mono-label text-on-surface-variant mt-2 not-italic">
                      AI suggestion unavailable: {aiError}
                    </p>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-outline-variant bg-surface-container-high flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-2 bg-on-background text-surface font-black text-sm uppercase tracking-widest active:scale-95 transition-transform rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Fallback used when the AI suggestion fetch fails (offline, no
// API key, model timeout, etc.). Hand-written per ruleId — generic
// but at least always available.
function defaultSuggestion(ruleId, v) {
  switch (ruleId) {
    case 'RULE_2_CIRCULAR_DEPS':
      return `Break this dependency cycle by extracting the shared logic into a separate module that both files can import without importing each other.`;
    case 'RULE_3_FILE_SIZE':
      return `Split this file into smaller, focused modules — each handling one responsibility. Hooks, helpers, and sub-components can be extracted into their own files.`;
    case 'RULE_4_LAYER_SEPARATION':
      return `This import crosses an architectural layer boundary. Reorganize the dependency so that lower-level layers (services, utils) don't import from higher-level layers (screens, components).`;
    case 'RULE_1_SERVICE_LAYER':
      return `Move this network call into a dedicated service file. All HTTP access — whether in screens, components, hooks, or utils — should originate from the service layer so error handling, retries, and authentication stay in one place.`;
    case 'RULE_5_RULES_OF_HOOKS':
      return `Move the hook call to the top level of the component or custom hook, before any early return. Hooks must run unconditionally and in the same order on every render — calling them inside conditions, loops, or non-React functions silently corrupts React's internal state tracking.`;
    case 'RULE_6_INLINE_STYLES':
      return `Move this style object out of the JSX into a StyleSheet.create() block at the top of the file (or imported from a shared styles module). Reference it by key — e.g. style={styles.row} — so the same object is reused across renders.`;
    case 'RULE_7_NAMING':
      return `Rename the file (and its default export) to follow the convention for its layer: PascalCase for components and screens, useXxx for hooks, camelCase for services. React's tooling actually depends on these names — e.g. JSX only treats PascalCase functions as components, and the Rules-of-Hooks linter only fires on identifiers starting with 'use'.`;
    case 'RULE_8_NATIVE_API_IN_UI':
      return `Wrap this native API call in a hook (e.g. useAsyncStorage, usePlatform) or a service module, then have the screen/component consume the wrapper. Keeping the native boundary in one place makes the UI testable, lets you swap implementations per platform, and stops platform branching from leaking into JSX.`;
    default:
      return 'Review the violation and refactor the affected code to comply with the rule.';
  }
}
