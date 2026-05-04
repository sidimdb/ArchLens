import React from 'react';

// Grayscale layer styling (red is reserved for fail)
const LAYER_STYLES = {
  screen:     { bg: 'bg-neutral-200', border: 'border-neutral-200', label: 'Screens' },
  component:  { bg: 'bg-neutral-400', border: 'border-neutral-400', label: 'Components' },
  service:    { bg: 'bg-neutral-500', border: 'border-neutral-500', label: 'Services' },
  hook:       { bg: 'bg-neutral-600', border: 'border-neutral-600', label: 'Hooks' },
  state:      { bg: 'bg-neutral-700', border: 'border-neutral-700', label: 'State' },
  navigation: { bg: 'bg-neutral-500', border: 'border-neutral-500', label: 'Navigation' },
  util:       { bg: 'bg-neutral-700', border: 'border-neutral-700', label: 'Utils' },
  config:     { bg: 'bg-neutral-800', border: 'border-neutral-800', label: 'Config' },
  unknown:    { bg: 'bg-neutral-900', border: 'border-neutral-900', label: 'Unknown' },
};

export default function LayerBreakdown({ breakdown, classificationStats }) {
  const entries = Object.entries(breakdown).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, n]) => s + n, 0);
  const stats = classificationStats;
  const unknownPct = stats ? Math.round(stats.unknownRatio * 100) : null;

  return (
    <section className="bg-surface-container border border-outline-variant p-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-body-lg font-bold text-on-surface">File Layer Distribution</h3>
          <p className="text-mono-label text-on-surface-variant">
            Mapping project architectural density by category
          </p>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="w-full h-6 flex bg-surface-container-lowest overflow-hidden border border-outline-variant/30">
        {entries.map(([layer, n]) => {
          const style = LAYER_STYLES[layer] || LAYER_STYLES.unknown;
          return (
            <div
              key={layer}
              className={`h-full ${style.bg}`}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${style.label}: ${n}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-3">
        {entries.map(([layer, n]) => {
          const style = LAYER_STYLES[layer] || LAYER_STYLES.unknown;
          return (
            <div
              key={layer}
              className={`flex flex-col gap-0.5 border-l-2 pl-2 ${style.border}`}
            >
              <span className="text-mono-label text-on-surface-variant uppercase">
                {style.label}
              </span>
              <span className="text-body-sm font-black text-on-surface">
                {String(n).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>

      {stats && (
        <div className="mt-3 pt-2 border-t border-outline-variant flex flex-wrap gap-x-4 gap-y-1 text-mono-label">
          <span className="text-on-surface-variant">
            <span className="uppercase">Classification confidence:</span>{' '}
            <strong className="text-status-pass">
              {stats.byConfidence.high} high
            </strong>{' '}
            ·{' '}
            <strong className="text-status-warn">
              {stats.byConfidence.medium} medium
            </strong>{' '}
            ·{' '}
            <strong className="text-on-surface-variant">
              {stats.byConfidence.low} low
            </strong>
          </span>
          <span
            className={
              unknownPct > 40 ? 'text-status-fail' : 'text-on-surface-variant'
            }
          >
            <span className="uppercase">Unknown:</span>{' '}
            <strong>{unknownPct}%</strong>
          </span>
        </div>
      )}
    </section>
  );
}
