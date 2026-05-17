/**
 * Test fixtures for rule unit tests.
 *
 * Builds minimal SourceFile + AstFacts + Project objects without
 * actually parsing real source code. Each rule only reads a small
 * subset of AstFacts — the helper fills in safe defaults for
 * everything else so individual tests stay focused on what they're
 * verifying.
 */

import type {
  AstFacts,
  Confidence,
  HookViolation,
  Layer,
  Project,
  SourceFile,
} from "../src/types";

export interface FileFixture {
  /** Project-relative path, e.g. "src/screens/Home.tsx". */
  path: string;
  /** Layer assignment (what the classifier would have decided). */
  layer: Layer;
  /** Confidence the classifier had — defaults to "high". */
  confidence?: Confidence;
  /** Source content. Not actually parsed; some rules check loc. */
  content?: string;
  /** Partial AstFacts overrides — merged with safe defaults. */
  facts?: Partial<AstFacts>;
}

/** Build a SourceFile + AstFacts pair from a compact fixture spec. */
export function makeFile(spec: FileFixture): {
  file: SourceFile;
  facts: AstFacts;
} {
  const content = spec.content ?? "";
  const loc = content.length === 0 ? 1 : content.split(/\r?\n/).length;
  const basename = spec.path.split("/").pop()!.replace(/\.[^.]+$/, "");
  const ext = (spec.path.match(/\.[^.]+$/)?.[0] ?? ".tsx") as
    | ".js"
    | ".jsx"
    | ".ts"
    | ".tsx";

  const file: SourceFile = {
    path: spec.path,
    absolutePath: "/virtual/" + spec.path,
    content,
    ext,
    loc,
    layer: spec.layer,
    layerConfidence: spec.confidence ?? "high",
    layerSignals: [],
  };

  const facts: AstFacts = {
    path: spec.path,
    parseError: false,
    networkCalls: [],
    hasJsx: false,
    imports: [],
    navigatorFactoryCalls: 0,
    reactNavigationImports: 0,
    navigationRegistrations: [],
    defaultExportName: null,
    createContextCalls: 0,
    basename,
    exportCount: 0,
    useStateCalls: 0,
    useEffectCalls: 0,
    maxJsxDepth: 0,
    hookCallCount: 0,
    hookViolations: [],
    inlineStyleLines: [],
    nativeApiUsages: [],
    ...spec.facts,
  };

  return { file, facts };
}

/** Bundle a set of fixtures into a Project the rules can consume. */
export function makeProject(
  fixtures: FileFixture[],
  circularDependencies: string[][] = []
): Project {
  const files: SourceFile[] = [];
  const astFactsByPath = new Map<string, AstFacts>();

  for (const spec of fixtures) {
    const { file, facts } = makeFile(spec);
    files.push(file);
    astFactsByPath.set(file.path, facts);
  }

  return {
    rootName: "test-project",
    rootPath: "/virtual",
    files,
    astFactsByPath,
    circularDependencies,
  };
}

/** Shortcut: build a hook-violation entry without typing the union by hand. */
export function hookViolation(
  reason: HookViolation["reason"],
  hookName: string,
  line: number = 1
): HookViolation {
  return { reason, hookName, line };
}
