/**
 * Schemas the combined CLI consumes.
 *
 * We type the inputs locally rather than reaching into the
 * statik-backend or runtime-lib internals — combined is a pure
 * downstream consumer that should keep working even if those
 * packages refactor their internals, as long as their wire formats
 * stay stable.
 */

/* ---------------- archlens-statik ---------------- */

export type RuleStatus = "pass" | "fail" | "not_applicable";
export type Confidence = "high" | "medium" | "low";

export interface StatikRuleResult {
  ruleId: string;
  name: string;
  description: string;
  status: RuleStatus;
  confidence: Confidence;
  violationCount: number;
  affectedFiles: string[];
  explanation: string;
  weight: number;
  score: number;
}

export interface StatikReport {
  project: {
    name: string;
    fileCount: number;
    totalLoc: number;
    layerBreakdown: Record<string, number>;
  };
  overallScore: number;
  grade: string;
  rules: StatikRuleResult[];
  summary: { strongest: string[]; weakest: string[] };
  generatedAt: string;
}

/* ---------------- archlens-runtime (verified) ---------------- */

export interface RuntimeIssueSummary {
  index: number;
  id: string;
  componentName: string;
  source?: string;
  screenName: string;
  note: string;
  verdict: "verified" | "rejected" | "uncertain" | "no-after";
  reasoning: string;
  verifiedAt: string;
}

export interface RuntimeReport {
  projectName: string;
  sessionId: string;
  generatedAt: string;
  issues: RuntimeIssueSummary[];
}
