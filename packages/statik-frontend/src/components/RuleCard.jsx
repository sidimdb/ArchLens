import React from 'react';
import { Icon } from './Layout.jsx';

const STATUS = {
  pass: {
    icon: 'check_circle',
    color: 'text-status-pass',
    border: 'border-outline-variant',
    bar: 'bg-status-pass',
  },
  fail: {
    icon: 'error',
    color: 'text-status-fail',
    border: 'border-status-fail',
    bar: 'bg-status-fail',
  },
  not_applicable: {
    icon: 'remove_circle',
    color: 'text-on-surface-variant',
    border: 'border-outline-variant',
    bar: 'bg-on-surface-variant',
  },
};

// Builds a short, human explanation of why a rule's confidence is
// less than "high". Confidence is the lower of the rule's own
// certainty and how confidently the analyzer could classify the
// files it looked at — so the dominant, explainable cause is
// classification uncertainty. Returns null for high confidence.
function confidenceReason(confidence, stats) {
  if (!confidence || confidence === 'high') return null;
  if (!stats) {
    return 'Some inputs were ambiguous, so this result is less certain.';
  }
  const byConf = stats.byConfidence || {};
  const total =
    (byConf.high || 0) + (byConf.medium || 0) + (byConf.low || 0);
  const unknownPct = Math.round((stats.unknownRatio || 0) * 100);
  const lowPct = total > 0 ? Math.round(((byConf.low || 0) / total) * 100) : 0;

  if (unknownPct >= 20) {
    return `${unknownPct}% of files couldn't be classified into a layer, so this rule's result is less reliable.`;
  }
  if (lowPct > 0) {
    return `${lowPct}% of files were classified with low confidence, so this rule's result is less reliable.`;
  }
  return 'Some files were classified with reduced confidence, so this result is less certain.';
}

export default function RuleCard({ rule, onViolationClick, classificationStats }) {
  const s = STATUS[rule.status] || STATUS.not_applicable;
  const confReason = confidenceReason(rule.confidence, classificationStats);

  return (
    <div
      className={`bg-surface-container border ${s.border} rounded overflow-hidden`}
    >
      {/* Header row — always visible, not interactive */}
      <div className="w-full px-3 py-2.5 flex items-center gap-3 text-left">
        <Icon name={s.icon} className={`${s.color} text-base flex-shrink-0`} />
        <span className="font-bold text-on-surface truncate text-body-sm flex-1">
          {rule.name}
        </span>
        <span
          className={
            'text-mono-label whitespace-nowrap ' +
            (rule.violations.length > 0
              ? 'text-status-fail font-bold'
              : 'text-on-surface-variant')
          }
        >
          {rule.violations.length} violation
          {rule.violations.length === 1 ? '' : 's'}
        </span>
        <span
          className={`text-body-sm ${s.color} font-bold whitespace-nowrap min-w-[55px] text-right`}
        >
          {Math.round(rule.score)}/100
        </span>
      </div>

      {/* Body — always open */}
      <div className="p-2.5 bg-surface-container-lowest border-t border-outline-variant/30">
          {/* Confidence + description */}
          <div className="flex flex-wrap items-center gap-2 mb-2 text-mono-label text-on-surface-variant">
            <span className="px-2 py-0.5 bg-surface-container-high rounded uppercase">
              {rule.confidence} confidence
            </span>
            <span className="flex-1 min-w-0">{rule.description}</span>
          </div>

          {confReason && (
            <p className="text-mono-label text-on-surface-variant italic leading-snug mb-2 flex items-start gap-1">
              <Icon name="info" className="text-[13px] flex-shrink-0 mt-px" />
              <span>{confReason}</span>
            </p>
          )}

          {rule.explanation && (
            <p className="text-body-sm text-on-surface-variant leading-snug mb-2">
              {rule.explanation}
            </p>
          )}

          {rule.aiExplanation && (
            <div className="mb-2 p-2.5 bg-surface-container-low border-l-2 border-primary-fixed-dim/60 rounded-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon
                  name="auto_awesome"
                  className="text-primary-fixed-dim text-[14px]"
                  filled
                />
                <span className="text-mono-label uppercase tracking-widest text-primary-fixed-dim font-bold">
                  AI explanation
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant leading-snug italic">
                {rule.aiExplanation}
              </p>
            </div>
          )}

          {rule.violations.length > 0 && (
            <>
              <div className="flex justify-between items-center text-mono-label text-on-surface-variant py-1 border-b border-outline-variant/10 mb-1">
                <span>File Path</span>
                <span className="flex items-center gap-1">
                  <Icon name="touch_app" className="text-[12px]" />
                  Click any row for details
                </span>
              </div>
              <ul className="divide-y divide-outline-variant/20">
                {rule.violations.slice(0, 25).map((v, i) => (
                  <li
                    key={i}
                    role="button"
                    tabIndex={0}
                    className="group flex justify-between items-center text-body-sm py-1.5 cursor-pointer hover:bg-surface-container-low hover:border-l-2 hover:border-on-surface hover:pl-1.5 rounded px-2 -mx-2 border-l-2 border-transparent transition-all"
                    onClick={() => onViolationClick?.({ rule, violation: v })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViolationClick?.({ rule, violation: v });
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-2 h-2 ${
                          v.severity === 'critical'
                            ? 'bg-status-fail shadow-[0_0_8px_#DC2626]'
                            : v.severity === 'major'
                            ? 'bg-status-fail'
                            : 'bg-status-warn'
                        } rounded-full flex-shrink-0`}
                      />
                      <span className="font-mono text-on-surface truncate group-hover:underline">
                        {v.file}
                        {v.line ? (
                          <span className="text-on-surface-variant">
                            :{v.line}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={
                          'text-mono-label font-bold px-2 py-0.5 rounded uppercase ' +
                          (v.severity === 'critical'
                            ? 'bg-status-fail/20 text-status-fail'
                            : v.severity === 'major'
                            ? 'bg-status-fail/10 text-status-fail'
                            : 'bg-status-warn/10 text-status-warn')
                        }
                      >
                        {v.severity}
                      </span>
                      <Icon
                        name="chevron_right"
                        className="text-base text-on-surface-variant group-hover:text-on-surface group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {rule.violations.length > 25 && (
                <p className="text-mono-label text-on-surface-variant italic mt-2">
                  …and {rule.violations.length - 25} more
                </p>
              )}
            </>
          )}
        </div>
    </div>
  );
}
