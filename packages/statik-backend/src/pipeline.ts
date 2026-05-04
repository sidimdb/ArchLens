/**
 * Analysis pipeline orchestrator.
 *
 * Wires the stages together:
 *   input -> scanner -> ast -> classifier (multi-signal) -> dependency -> rules -> report
 *
 * AST runs BEFORE classification because several classification
 * signals (JSX presence, navigator factory calls, default exports,
 * createContext, navigation registrations) come from AST facts.
 *
 * Every input source hands us a `PreparedSource` with a temp directory.
 * We run the full pipeline against it and then clean the directory up
 * in `finally` so partial failures don't leak disk space.
 */

import * as fs from "fs";
import * as path from "path";
import { PreparedSource } from "./input/local-source";
import { scanProject } from "./scanner/file-scanner";
import {
  classifyFiles,
  classificationStats,
  countLayers,
} from "./classifier/layer-classifier";
import { analyzeFiles } from "./ast/ast-analyzer";
import { analyzeDependencies } from "./dependency/dep-analyzer";
import { RULES } from "./rules";
import { computeOverallScore, grade, summarize } from "./scoring/scorer";
import { toMarkdown } from "./reporting/markdown-reporter";
import { EvaluatorConfig, Project, Report } from "./types";

export interface AnalysisOutput {
  report: Report;
  markdown: string;
}

function loadUserConfig(rootPath: string): EvaluatorConfig | undefined {
  const candidates = [".evaluator.json", "evaluator.config.json"];
  for (const name of candidates) {
    const p = path.join(rootPath, name);
    if (!fs.existsSync(p)) continue;
    try {
      const raw = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw) as EvaluatorConfig;
      return parsed;
    } catch {
      // ignore malformed config, fall through
    }
  }
  return undefined;
}

export async function runAnalysis(source: PreparedSource): Promise<AnalysisOutput> {
  try {
    const scan = await scanProject(source.rootPath);

    if (scan.files.length === 0) {
      throw new Error(
        "No JavaScript/TypeScript source files found. " +
          "Make sure this is a React Native project and node_modules is excluded."
      );
    }

    // AST first — classification depends on it.
    const astFactsByPath = analyzeFiles(scan.files);

    const userConfig = loadUserConfig(source.rootPath);
    const files = classifyFiles(scan.files, astFactsByPath, userConfig);

    const dep = await analyzeDependencies(source.rootPath);

    const project: Project = {
      rootName: source.rootName,
      rootPath: source.rootPath,
      files,
      packageJson: scan.packageJson,
      astFactsByPath,
      circularDependencies: dep.circular,
      userConfig,
    };

    const ruleResults = RULES.map((rule) => rule(project));
    const overall = computeOverallScore(ruleResults);

    const report: Report = {
      project: {
        name: project.rootName,
        fileCount: project.files.length,
        totalLoc: project.files.reduce((s, f) => s + f.loc, 0),
        layerBreakdown: countLayers(project.files),
        classificationStats: classificationStats(project.files),
      },
      overallScore: overall,
      grade: grade(overall),
      rules: ruleResults,
      summary: summarize(ruleResults),
      generatedAt: new Date().toISOString(),
    };

    return { report, markdown: toMarkdown(report) };
  } finally {
    await source.cleanup();
  }
}
