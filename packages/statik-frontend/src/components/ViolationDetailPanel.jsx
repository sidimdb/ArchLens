import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Layout.jsx';

const SEV_COLORS = {
  critical: { dot: 'bg-status-fail shadow-[0_0_8px_#DC2626]', label: 'Critical Violation' },
  major: { dot: 'bg-status-fail shadow-[0_0_6px_#DC2626]', label: 'Major Violation' },
  minor: { dot: 'bg-status-warn shadow-[0_0_8px_rgba(245,158,11,0.5)]', label: 'Minor Violation' },
};

export default function ViolationDetailPanel({ rule, violation, onClose }) {
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

          {/* AI Recommendation (placeholder until AI is wired up) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="auto_awesome" className="text-primary-fixed-dim" filled />
              <h3 className="text-mono-label uppercase tracking-widest text-primary-fixed-dim">
                Suggested Fix
              </h3>
            </div>
            <div className="bg-surface-container border border-primary-fixed-dim/30 p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary-fixed-dim/50" />
              <p className="text-body-sm text-on-surface leading-relaxed italic">
                {violation.suggestion ||
                  defaultSuggestion(rule.ruleId, violation)}
              </p>
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
