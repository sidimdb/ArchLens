/**
 * Core domain types shared across the analysis pipeline.
 *
 * Pipeline stages:
 *   input -> scanner -> ast -> classifier (multi-signal) -> rules -> report
 *
 * Note: AST analysis runs BEFORE classification, because several
 * classification signals depend on AST facts (JSX presence, navigator
 * factory calls, navigation hook usage, exports).
 */

export type Layer =
  | "screen"
  | "component"
  | "service"
  | "hook"
  | "util"
  | "config"
  | "state"
  | "navigation"
  | "unknown";

export type SourceExt = ".js" | ".jsx" | ".ts" | ".tsx";

export type Confidence = "high" | "medium" | "low";

/** A file as produced by the scanner, before layer assignment. */
export interface ScannedFile {
  path: string;
  absolutePath: string;
  content: string;
  ext: SourceExt;
  loc: number;
}

/** Source of one classification hint. */
export type SignalSource =
  | "folder"
  | "filename"
  | "content"
  | "navigation"
  | "userConfig";

export interface ClassificationSignal {
  source: SignalSource;
  layer: Layer;
  confidence: Confidence;
  /** Short human-readable reason, e.g. "path contains '/screens/'" */
  reason: string;
}

/** A scanned file enriched with classification info. */
export interface SourceFile extends ScannedFile {
  layer: Layer;
  layerConfidence: Confidence;
  /** All signals that fired, for transparency/debugging. */
  layerSignals: ClassificationSignal[];
}

/** A single Rules-of-Hooks violation detected during AST traversal. */
export interface HookViolation {
  line: number;
  hookName: string;
  reason:
    | "conditional"      // inside if / ternary / && / ||
    | "loop"             // inside for / while / do-while / for-in / for-of
    | "switch"           // inside switch case
    | "try-catch"        // inside try / catch / finally
    | "non-hook-caller"; // called from a non-component, non-hook function
}

/** Facts extracted from the AST of a single file. */
export interface AstFacts {
  path: string;
  parseError: boolean;

  /** Direct HTTP calls: fetch, axios, axios.get, aliased HTTP clients, etc. */
  networkCalls: Array<{ line: number; callee: string }>;

  /** True if any JSXElement or JSXFragment is present. */
  hasJsx: boolean;

  /** Import sources with line numbers (as written, unresolved). */
  imports: Array<{ source: string; line: number }>;

  // ---- classification signals, populated by the AST analyzer ----

  /** Calls to useNavigation()/useRoute()/useNavigationState(). */
  navigationHookCalls: number;

  /** Calls to createStackNavigator/createBottomTabNavigator/etc. */
  navigatorFactoryCalls: number;

  /** Imports from @react-navigation/*. */
  reactNavigationImports: number;

  /** Identifiers registered as screens in a navigator's JSX (component={X}). */
  navigationRegistrations: string[];

  /** Default-exported identifier's name (if it's an identifier). */
  defaultExportName: string | null;

  /**
   * createContext(...) calls — rough signal the file exposes a Context.
   * Not perfect, but enough to classify typical `XYZContext.tsx` files.
   */
  createContextCalls: number;

  /** Filename without extension, cached for signal logic. */
  basename: string;

  // ---- complexity signals, consumed by rule 3 ----

  /** Total number of `export` declarations (named + default). */
  exportCount: number;

  /** Count of `useState(...)` calls in the file. */
  useStateCalls: number;

  /** Count of `useEffect(...)` calls in the file. */
  useEffectCalls: number;

  /**
   * Deepest level of JSX nesting found in the file. A `<View>` containing
   * a `<View>` is depth 2, etc. Used by rule 3 to flag visually overloaded
   * components that should be split — even when the LOC count is fine.
   */
  maxJsxDepth: number;

  /** Total number of React-hook-style calls (anything matching /^use[A-Z]/). */
  hookCallCount: number;

  /** Rules-of-Hooks violations detected during traversal. */
  hookViolations: HookViolation[];

  /**
   * Lines where a JSX `style={{...}}` attribute uses an inline object literal
   * (or an array containing one). Consumed by rule 6 — inline style objects
   * allocate on every render and bypass StyleSheet.create's optimization.
   */
  inlineStyleLines: number[];

  /**
   * Recorded usages of React Native platform / device APIs (AsyncStorage,
   * Platform, NativeModules, Linking, etc.) — consumed by rule 8, which
   * flags any usage from a UI (screen / component) file.
   * Deduplicated to one entry per (line, name) inside a file.
   */
  nativeApiUsages: { line: number; name: string }[];
}

export interface Project {
  rootName: string;
  rootPath: string;
  files: SourceFile[];
  packageJson?: Record<string, unknown>;
  astFactsByPath: Map<string, AstFacts>;
  circularDependencies: string[][];
  userConfig?: EvaluatorConfig;
}

export interface EvaluatorConfig {
  layers?: Partial<Record<Layer, string[]>>;
}

export type RuleStatus = "pass" | "fail" | "not_applicable";
export type Severity = "minor" | "major" | "critical";

export interface Violation {
  file: string;
  line?: number;
  severity: Severity;
  message: string;
}

export interface RuleResult {
  ruleId: string;
  name: string;
  description: string;
  status: RuleStatus;
  confidence: Confidence;
  violationCount: number;
  violations: Violation[];
  affectedFiles: string[];
  explanation: string;
  weight: number;
  score: number;
  /**
   * Optional Claude-generated, project-aware explanation. Populated
   * when AI enrichment is requested (`--ai` flag). Frontend renders
   * it in addition to the deterministic `explanation` so the report
   * still works fully offline if AI is skipped.
   */
  aiExplanation?: string;
}

export interface ReportSummary {
  strongest: string[];
  weakest: string[];
}

export interface Report {
  project: {
    name: string;
    fileCount: number;
    totalLoc: number;
    layerBreakdown: Record<Layer, number>;
    /** How classification performed — useful to understand why a score looks high/low. */
    classificationStats: {
      byConfidence: Record<Confidence, number>;
      unknownRatio: number;
    };
  };
  overallScore: number;
  grade: string;
  rules: RuleResult[];
  summary: ReportSummary;
  generatedAt: string;
}
