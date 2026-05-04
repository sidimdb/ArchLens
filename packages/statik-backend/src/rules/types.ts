import { Project, RuleResult } from "../types";

/** Every rule is a pure function: Project -> RuleResult. */
export type Rule = (project: Project) => RuleResult;
