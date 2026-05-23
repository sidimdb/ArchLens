import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ScoreGauge, { gaugeColor } from './ScoreGauge.jsx';
import RuleCard from './RuleCard.jsx';
import LayerBreakdown from './LayerBreakdown.jsx';
import AiInsights from './AiInsights.jsx';
import ViolationDetailPanel from './ViolationDetailPanel.jsx';
import { Icon } from './Layout.jsx';

function SectionHeader({ number, title }) {
  return (
    <div className="flex items-baseline gap-3 mb-3">
      <span className="font-mono text-mono-label text-on-surface-variant tracking-[0.25em]">
        {number}
      </span>
      <h2 className="text-body-lg font-black text-on-surface tracking-tight">
        {title}
      </h2>
      <span className="flex-1 h-px bg-outline-variant/60" />
    </div>
  );
}

export default function ReportPage({ data, onNewAnalysis }) {
  const { report, markdown } = data;
  const [activeViolation, setActiveViolation] = useState(null);
  const passedRules = report.rules.filter((r) => r.status === 'pass').length;
  const failedRules = report.rules.filter((r) => r.status === 'fail').length;
  const totalViolations = report.rules.reduce(
    (s, r) => s + r.violations.length,
    0
  );

  const date = new Date(report.generatedAt || Date.now());
  const dateStr = date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const scoreColor = gaugeColor(report.overallScore);

  return (
    <div className="px-8 py-6 max-w-[1100px] mx-auto space-y-10">
      {/* Header */}
      <header className="space-y-1 min-w-0">
        <p className="text-mono-label text-on-surface-variant uppercase tracking-[0.25em]">
          Architectural Report
        </p>
        <h1 className="text-h1 font-black text-on-surface truncate">
          {report.project.name}
        </h1>
        <p className="text-mono-label text-on-surface-variant">
          {dateStr} · {timeStr}
        </p>
      </header>

      {/* Skipped sub-projects notice */}
      {Array.isArray(report.project.skippedSubprojects) &&
        report.project.skippedSubprojects.length > 0 && (
          <div className="bg-surface-container-low border-l-2 border-outline px-4 py-3 rounded-sm">
            <div className="flex items-center gap-2 mb-1">
              <Icon
                name="folder_off"
                className="text-on-surface-variant text-[14px]"
              />
              <span className="text-mono-label uppercase tracking-widest text-on-surface-variant font-bold">
                Skipped sub-projects
              </span>
            </div>
            <p className="text-body-sm text-on-surface-variant leading-snug mb-2">
              The following {report.project.skippedSubprojects.length === 1 ? 'folder was' : 'folders were'} excluded from the analysis because they look like a separate backend rather than React Native code:
            </p>
            <ul className="space-y-1">
              {report.project.skippedSubprojects.map((s, i) => (
                <li key={i} className="text-mono-label text-on-surface-variant">
                  <span className="font-mono text-on-surface">{s.path}</span>
                  <span className="text-outline"> — {s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* 01 — Overview: gauge left, headline + inline stats right */}
      <section>
        <SectionHeader number="01" title="Overview" />
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-4 flex justify-center">
            <ScoreGauge score={report.overallScore} size={160} />
          </div>
          <div className="md:col-span-8 space-y-4">
            <div>
              <p className="text-mono-label uppercase tracking-widest text-on-surface-variant mb-1">
                Health Score · Grade{' '}
                <span className="font-black" style={{ color: scoreColor }}>
                  {report.grade}
                </span>
              </p>
              <p className="text-on-surface text-body-lg leading-snug">
                <span className="font-black">
                  {Math.round(report.overallScore)}/100
                </span>{' '}
                — {failedRules > 0
                  ? `${failedRules} of ${report.rules.length} architectural rules failing.`
                  : `All ${report.rules.length} architectural rules passing.`}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
              <Stat label="Files" value={report.project.fileCount} />
              <Stat
                label="Lines of Code"
                value={report.project.totalLoc.toLocaleString()}
              />
              <Stat
                label="Rules Passed"
                value={`${passedRules}/${report.rules.length}`}
              />
              <Stat
                label="Violations"
                value={String(totalViolations).padStart(2, '0')}
              />
            </div>
          </div>
        </div>
      </section>

      {/* 02 — Rules */}
      <section>
        <SectionHeader number="02" title="Rules" />

        <div className="space-y-2">
          {report.rules.map((r) => (
            <RuleCard
              key={r.ruleId}
              rule={r}
              classificationStats={report.project.classificationStats}
              onViolationClick={({ violation }) =>
                setActiveViolation({ rule: r, violation })
              }
            />
          ))}
        </div>
      </section>

      {/* 03 — Insights */}
      <section>
        <SectionHeader number="03" title="Insights" />
        <AiInsights report={report} />
      </section>

      {/* 04 — Project structure */}
      <section>
        <SectionHeader number="04" title="Project Structure" />
        <LayerBreakdown
          breakdown={report.project.layerBreakdown}
          classificationStats={report.project.classificationStats}
        />
      </section>

      {/* 05 — Full markdown report */}
      <section>
        <SectionHeader number="05" title="Full Markdown Report" />
        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 p-3 hover:bg-surface-container-high transition-colors select-none">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-surface-container-high flex items-center justify-center flex-shrink-0">
                  <Icon
                    name="description"
                    className="text-on-surface text-base"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm font-bold text-on-surface leading-tight">
                    Complete analysis output
                  </p>
                  <p className="text-mono-label text-on-surface-variant">
                    Click to expand the raw markdown report
                  </p>
                </div>
              </div>
              <Icon
                name="keyboard_arrow_down"
                className="text-base text-on-surface-variant group-open:rotate-180 transition-transform duration-200 flex-shrink-0"
              />
            </summary>
            <div className="prose-review p-4 pt-2 border-t border-outline-variant">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          </details>
        </div>
      </section>

      {/* Violation Detail Side Panel */}
      {activeViolation && (
        <ViolationDetailPanel
          rule={activeViolation.rule}
          violation={activeViolation.violation}
          projectName={report.project.name}
          onClose={() => setActiveViolation(null)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <p className="text-mono-label uppercase tracking-widest text-on-surface-variant mb-0.5">
        {label}
      </p>
      <p
        className="text-xl font-black leading-none tracking-tight text-on-surface"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

