/**
 * JSON reporter — just an identity function today, but isolated here
 * so we can massage the report shape later (pretty-printing, stable
 * field ordering, schema versioning) without touching the pipeline.
 */

import { Report } from "../types";

export function toJson(report: Report): string {
  return JSON.stringify(report, null, 2);
}

export function asJsonObject(report: Report): Report {
  return report;
}
