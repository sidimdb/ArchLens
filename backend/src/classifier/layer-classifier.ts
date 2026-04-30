/**
 * Multi-signal layer classifier.
 *
 * Layer assignment used to be folder-names-only, which failed on
 * projects that don't follow the `/screens/` convention. This version
 * fuses five independent signals and picks the layer with the highest
 * weighted score.
 *
 *   Signal           Weight   Rationale
 *   ────────────────  ───────  ─────────────────────────────────────
 *   userConfig        10      Explicit override — always wins
 *   navigation         5      Ground truth from react-navigation
 *   folder             3      Very reliable when present
 *   content            2      AST-derived (createContext, JSX, …)
 *   filename           2      Heuristic (XxxScreen, useXxx, …)
 *
 *   Confidence weight: high=3, medium=2, low=1
 *   Final score per layer = Σ (sourceWeight × confWeight)
 *   Final confidence     : >10 = high, >5 = medium, else low
 *
 * A file can receive multiple signals (e.g. folder says screen,
 * content says component); the highest-scoring layer wins. All
 * signals are attached to the SourceFile so the report/UI can
 * explain the decision.
 */

import {
  AstFacts,
  ClassificationSignal,
  Confidence,
  EvaluatorConfig,
  Layer,
  ScannedFile,
  SignalSource,
  SourceFile,
} from "../types";
import { folderSignal } from "./signals/folder-signal";
import { filenameSignal } from "./signals/filename-signal";
import { contentSignal } from "./signals/content-signal";
import { collectNavigationSignals } from "./signals/navigation-signal";
import { userConfigSignal } from "./signals/user-config-signal";

const SOURCE_WEIGHT: Record<SignalSource, number> = {
  userConfig: 10,
  navigation: 5,
  folder: 3,
  content: 2,
  filename: 2,
};

const CONF_WEIGHT: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function scoreSignal(s: ClassificationSignal): number {
  return SOURCE_WEIGHT[s.source] * CONF_WEIGHT[s.confidence];
}

function confidenceFromScore(score: number): Confidence {
  if (score > 10) return "high";
  if (score > 5) return "medium";
  return "low";
}

interface Decision {
  layer: Layer;
  confidence: Confidence;
  signals: ClassificationSignal[];
}

function decide(signals: ClassificationSignal[]): Decision {
  if (signals.length === 0) {
    return { layer: "unknown", confidence: "low", signals };
  }

  // Sum scores per layer.
  const perLayer = new Map<Layer, number>();
  for (const s of signals) {
    perLayer.set(s.layer, (perLayer.get(s.layer) ?? 0) + scoreSignal(s));
  }

  let bestLayer: Layer = "unknown";
  let bestScore = -1;
  for (const [layer, score] of perLayer) {
    if (score > bestScore) {
      bestScore = score;
      bestLayer = layer;
    }
  }

  return {
    layer: bestLayer,
    confidence: confidenceFromScore(bestScore),
    signals,
  };
}

export function classifyFiles(
  files: ScannedFile[],
  astByPath: Map<string, AstFacts>,
  userConfig?: EvaluatorConfig
): SourceFile[] {
  // Pre-compute navigation signals — they depend on the whole project.
  const navSignals = collectNavigationSignals(astByPath);

  return files.map((file) => {
    const facts = astByPath.get(file.path);
    const collected: ClassificationSignal[] = [];

    const userSig = userConfigSignal(file, userConfig);
    if (userSig) collected.push(userSig);

    const navSig = navSignals.get(file.path);
    if (navSig) collected.push(navSig);

    const folderSig = folderSignal(file);
    if (folderSig) collected.push(folderSig);

    if (facts) {
      const contentSig = contentSignal(facts);
      if (contentSig) collected.push(contentSig);

      const nameSig = filenameSignal(facts);
      if (nameSig) collected.push(nameSig);
    }

    const decision = decide(collected);

    return {
      ...file,
      layer: decision.layer,
      layerConfidence: decision.confidence,
      layerSignals: decision.signals,
    };
  });
}

export function countLayers(files: SourceFile[]): Record<Layer, number> {
  const counts: Record<Layer, number> = {
    screen: 0,
    component: 0,
    service: 0,
    hook: 0,
    util: 0,
    state: 0,
    config: 0,
    navigation: 0,
    unknown: 0,
  };
  for (const f of files) counts[f.layer]++;
  return counts;
}

export function classificationStats(
  files: SourceFile[]
): { byConfidence: Record<Confidence, number>; unknownRatio: number } {
  const byConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 };
  let unknown = 0;
  for (const f of files) {
    byConfidence[f.layerConfidence]++;
    if (f.layer === "unknown") unknown++;
  }
  const unknownRatio = files.length === 0 ? 0 : unknown / files.length;
  return { byConfidence, unknownRatio };
}
