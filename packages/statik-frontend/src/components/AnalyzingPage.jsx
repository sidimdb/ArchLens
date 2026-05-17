import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Layout.jsx';

const DETERMINISTIC_STEPS = [
  { key: 'scan', label: 'Scanning files', detail: 'Reading source files' },
  { key: 'ast', label: 'Parsing AST', detail: 'Building abstract syntax trees' },
  { key: 'classify', label: 'Classifying file layers', detail: 'Determining architectural boundaries' },
  { key: 'deps', label: 'Building dependency graph', detail: 'Tracing module imports' },
  { key: 'rules', label: 'Running rules', detail: 'Evaluating 8 architectural rules' },
];

const AI_STEP = {
  key: 'ai',
  label: 'Generating AI explanations',
  detail: 'Claude writes project-aware explanations for failed rules',
};

export default function AnalyzingPage({ projectName, onCancel, aiEnabled = true }) {
  // AI step only appears when the toggle is on. With AI off, the
  // pipeline is significantly faster, so we skip the extra step too.
  const STEPS = useMemo(
    () => (aiEnabled ? [...DETERMINISTIC_STEPS, AI_STEP] : DETERMINISTIC_STEPS),
    [aiEnabled]
  );

  // Backend is synchronous — animate steps over an estimated duration.
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Step cadence: deterministic steps move ~1.4s each; the AI step
    // stays "active" longer because AI calls take real time. We never
    // reach the final step on our own — request resolution moves us to
    // the report.
    const interval = setInterval(() => {
      setCurrentStep((s) => {
        const isAtAiStep = aiEnabled && s === STEPS.length - 1;
        // Hold on the AI step instead of looping past it.
        if (isAtAiStep) return s;
        return Math.min(s + 1, STEPS.length - 1);
      });
      setProgress((p) => Math.min(p + 100 / (STEPS.length + 1), 92));
    }, 1400);
    return () => clearInterval(interval);
  }, [aiEnabled, STEPS.length]);

  return (
    <div className="p-margin-page flex items-center justify-center min-h-[calc(100vh-64px)]">
      <div className="w-full max-w-[640px] space-y-stack-lg">
        {/* Card */}
        <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-surface-container-high px-stack-lg py-stack-md border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-stack-sm">
              <div className="spinner w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              <h2 className="text-h2 text-on-surface">Analysis In Progress</h2>
            </div>
            <span className="text-mono-label text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded">
              ID: {Math.random().toString(36).slice(2, 8).toUpperCase()}
            </span>
          </div>

          {/* Body */}
          <div className="p-stack-lg space-y-stack-lg">
            <div className="space-y-stack-xs">
              <label className="text-mono-label text-on-surface-variant uppercase tracking-widest">
                Active Scope
              </label>
              <p className="text-h1 text-primary truncate">
                Analyzing: {projectName || 'project'}
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-stack-md relative">
              <div className="absolute left-[11px] top-4 bottom-4 w-[1px] bg-outline-variant" />
              {STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                return (
                  <div
                    key={step.key}
                    className="flex items-center gap-stack-md relative z-10"
                  >
                    <div
                      className={
                        'w-6 h-6 rounded-full flex items-center justify-center ' +
                        (done
                          ? 'bg-primary text-on-primary'
                          : active
                          ? 'bg-surface-container-highest border border-primary'
                          : 'bg-surface-container-low border border-outline-variant')
                      }
                    >
                      {done ? (
                        <Icon name="check" className="text-[16px]" filled />
                      ) : active ? (
                        <div className="spinner w-3 h-3 border border-primary border-t-transparent rounded-full" />
                      ) : (
                        <div className="w-1.5 h-1.5 bg-outline-variant rounded-full" />
                      )}
                    </div>
                    <div
                      className={
                        'flex flex-col ' +
                        (done || active ? '' : 'opacity-50')
                      }
                    >
                      <span
                        className={
                          'text-data-point ' +
                          (active ? 'text-primary font-bold' : 'text-on-surface')
                        }
                      >
                        {step.label}
                      </span>
                      <span className="text-mono-label text-on-surface-variant">
                        {done ? 'Complete' : active ? step.detail : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar */}
            <div className="space-y-stack-sm pt-stack-md border-t border-outline-variant">
              <div className="flex justify-between items-end">
                <span className="text-mono-label text-on-surface-variant">
                  Overall Progress
                </span>
                <span className="text-data-point text-on-surface">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="flex justify-end pt-stack-sm">
              <button
                type="button"
                onClick={onCancel}
                className="px-stack-lg py-stack-sm border border-on-surface text-on-surface rounded text-body-sm hover:bg-surface-container-high active:scale-95 transition-all"
              >
                Cancel Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
