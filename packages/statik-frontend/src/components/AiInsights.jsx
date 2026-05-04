import React from 'react';
import { Icon } from './Layout.jsx';

// Renders the AI insights card. When `report.aiSummary` exists (added in the
// upcoming AI integration), it shows the LLM-generated paragraph. Until then
// it falls back gracefully to the strongest/weakest summary the backend
// already produces.
export default function AiInsights({ report }) {
  const aiSummary = report.aiSummary; // future field
  const aiSuggestions = report.aiSuggestions; // future field

  return (
    <div className="space-y-4">
      {/* Main summary — minimal, no card chrome */}
      <div className="border-l-2 border-on-surface/40 pl-4">
          {aiSummary ? (
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              {aiSummary}
            </p>
          ) : (
            <p className="text-body-sm text-on-surface-variant leading-relaxed">
              Project{' '}
              <span className="text-on-surface font-bold">
                {report.project.name}
              </span>{' '}
              scored{' '}
              <span className="text-on-surface font-bold">
                {Math.round(report.overallScore)}/100
              </span>{' '}
              ({report.grade}). Strongest:{' '}
              <span className="text-on-surface font-bold">
                {report.summary.strongest.join(', ') || '—'}
              </span>
              . Weakest:{' '}
              <span className="text-status-fail font-bold">
                {report.summary.weakest.join(', ') || '—'}
              </span>
              .
            </p>
          )}
        </div>

      {/* Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon
            name="auto_awesome"
            className="text-on-surface-variant text-sm"
            filled
          />
          <h4 className="text-mono-label text-on-surface-variant uppercase tracking-widest">
            Improvement Suggestions
          </h4>
        </div>
        <ul className="space-y-2">
          {(aiSuggestions || derivedSuggestions(report)).map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 w-1 h-1 bg-on-surface-variant rounded-full flex-shrink-0" />
              <p className="text-body-sm text-on-surface-variant leading-relaxed flex-1">
                {s}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Deterministic fallback suggestions based on which rules failed
function derivedSuggestions(report) {
  const failed = report.rules.filter((r) => r.status === 'fail');
  if (failed.length === 0) {
    return [
      'No architectural violations detected. Maintain current discipline as the codebase grows.',
      'Consider adding regression tests for critical service-layer modules to lock in this state.',
    ];
  }
  return failed.slice(0, 3).map((r) => {
    const count = r.violations.length;
    return `${r.name}: ${count} violation${
      count === 1 ? '' : 's'
    } detected. Review the file list below and refactor the affected modules.`;
  });
}
